import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { DataTable, type Column } from '@/components/DataTable';
import { StatsCard, MetricCard } from '@/components/Stats';
import apiClient from '@/lib/apiClient';
import { ROUTE_PATHS, type School, getStatusBadgeColor } from '@/lib/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Grid3x3,
  List,
  MapPin,
  Users,
  Building2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 35,
    },
  },
};

const hoverLift = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -4,
    scale: 1.02,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
};

export default function Schools() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [centreFilter, setCentreFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [schoolsList, setSchoolsList] = useState<School[]>([]);

  const [createSchoolOpen, setCreateSchoolOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [contacts, setContacts] = useState('');
  const [email, setEmail] = useState('');
  const [cyclesSelected, setCyclesSelected] = useState<string[]>([]);

  // Edit/Delete state
  const [editSchoolOpen, setEditSchoolOpen] = useState(false);
  const [deleteSchoolOpen, setDeleteSchoolOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editRegion, setEditRegion] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editContacts, setEditContacts] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStatut, setEditStatut] = useState('');
  const [editCycles, setEditCycles] = useState<string[]>([]);

  const [villesList, setVillesList] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [data, villes] = await Promise.all([
        apiClient.getAllSchools(),
        apiClient.getVilles().catch(() => [])
      ]);
      if (data) {
        setSchoolsList(data);
      }
      if (villes && villes.length > 0) {
        setVillesList(villes);
      }
    } catch (err) {
      console.error("Failed to fetch schools from API", err);
      toast({
        variant: "destructive",
        title: "Erreur de chargement",
        description: "Impossible de charger la liste des établissements. Le serveur backend doit être démarré.",
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleCycle = (cycle: string) => {
    setCyclesSelected(prev =>
      prev.includes(cycle) ? prev.filter(c => c !== cycle) : [...prev, cycle]
    );
  };

  const handleCreateSchool = async () => {
    if (!name || !code || !region || !city || !address || !contacts || !email || cyclesSelected.length === 0) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs et sélectionner au moins un cycle.",
      });
      return;
    }

    try {
      const payload = {
        ET_DENOMMINATION: name,
        ET_CODEETABLISSEMENT: code,
        ET_REGION: region,
        ET_VILLE: city,
        ET_ADRESSE_POSTALE: address,
        ET_CONTACTS: contacts,
        ET_EMAIL: email,
        ET_CYCLES: cyclesSelected,
        ET_STATUT: "actif"
      };

      await apiClient.createSchool(payload);

      toast({
        title: "Établissement créé",
        description: `L'établissement ${name} a été créé avec succès.`,
      });

      // Clear fields
      setName('');
      setCode('');
      setRegion('');
      setCity('');
      setAddress('');
      setContacts('');
      setEmail('');
      setCyclesSelected([]);
      setCreateSchoolOpen(false);

      await loadData();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || "Impossible de créer l'établissement.";
      toast({
        variant: "destructive",
        title: "Erreur de création",
        description: typeof detail === "string" ? detail : JSON.stringify(detail),
      });
    }
  };

  const handleEditSchool = (row: unknown) => {
    const school = row as School;
    setSelectedSchool(school);
    setEditName(school.name || '');
    setEditCode(school.code || '');
    setEditRegion(school.region || '');
    setEditCity(school.city || '');
    setEditAddress(school.address || '');
    setEditContacts(school.contacts || '');
    setEditEmail(school.email || '');
    setEditStatut(school.status || 'actif');
    setEditCycles(school.cycles || []);
    setEditSchoolOpen(true);
  };

  const handleUpdateSchool = async () => {
    if (!selectedSchool) return;
    try {
      const payload = {
        ET_DENOMMINATION: editName,
        ET_CODEETABLISSEMENT: editCode,
        ET_REGION: editRegion,
        ET_VILLE: editCity,
        ET_ADRESSE_POSTALE: editAddress,
        ET_CONTACTS: editContacts,
        ET_EMAIL: editEmail,
        ET_CYCLES: editCycles,
        ET_STATUT: editStatut,
      };
      await apiClient.updateSchool(selectedSchool.id, payload);
      toast({ title: "Établissement modifié", description: `L'établissement ${editName} a été mis à jour.` });
      setEditSchoolOpen(false);
      setSelectedSchool(null);
      await loadData();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Impossible de modifier l'établissement.";
      toast({ variant: "destructive", title: "Erreur", description: typeof detail === 'string' ? detail : JSON.stringify(detail) });
    }
  };

  const handleDeletePrompt = (row: unknown) => {
    setSelectedSchool(row as School);
    setDeleteSchoolOpen(true);
  };

  const handleDeleteSchool = async () => {
    if (!selectedSchool) return;
    try {
      await apiClient.deleteSchool(selectedSchool.id);
      toast({ title: "Établissement supprimé", description: "L'établissement a été supprimé avec succès." });
      setDeleteSchoolOpen(false);
      setSelectedSchool(null);
      await loadData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err.response?.data?.detail || "Impossible de supprimer l'établissement." });
    }
  };

  const handleToggleEditCycle = (cycle: string) => {
    setEditCycles(prev => prev.includes(cycle) ? prev.filter(c => c !== cycle) : [...prev, cycle]);
  };

  const userEcoleId = localStorage.getItem('user_ecole_id');
  const userRole = localStorage.getItem('user_role');
  const isSchoolRestricted = Boolean(
    userEcoleId &&
    userEcoleId !== 'null' &&
    userEcoleId !== 'undefined' &&
    !['admin', 'superuser', 'direction_fondation'].includes(userRole || '')
  );

  const centres = Array.from(new Set(schoolsList.map((s) => s.city).filter(Boolean)));
  const regions = Array.from(new Set(schoolsList.map((s) => s.region).filter(Boolean)));
  const cycles = ['maternelle', 'primaire', 'college', 'lycee'];

  const filteredSchools = schoolsList.filter((school) => {
    // School-level restricted user (e.g. Abidjan user) should only see their assigned school
    if (isSchoolRestricted && String(school.id) !== String(userEcoleId)) {
      return false;
    }
    const matchesSearch =
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCentre =
      centreFilter === 'all' ||
      school.city.toLowerCase() === centreFilter.toLowerCase() ||
      school.name.toLowerCase().includes(centreFilter.toLowerCase());
    const matchesRegion = regionFilter === 'all' || school.region === regionFilter;
    const matchesStatus = statusFilter === 'all' || school.status === statusFilter;
    const matchesCycle =
      cycleFilter === 'all' || school.cycles.includes(cycleFilter as School['cycles'][0]);

    return matchesSearch && matchesCentre && matchesRegion && matchesStatus && matchesCycle;
  });

  const totalSchools = schoolsList.length;
  const activeSchools = schoolsList.filter((s) => s.status === 'actif').length;
  const totalStudents = 0; // Données chargées depuis la page Élèves

  const columns: Column[] = [
    {
      key: 'name',
      label: 'Établissement',
      sortable: true,
    },
    {
      key: 'city',
      label: 'Ville',
      sortable: true,
    },
    {
      key: 'region',
      label: 'Région',
      sortable: true,
    },
    {
      key: 'cycles',
      label: 'Cycles',
      render: (value: School['cycles']) => (
        <div className="flex gap-1 flex-wrap">
          {value.map((cycle) => (
            <Badge key={cycle} variant="outline" className="text-xs">
              {cycle}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'effectif',
      label: 'Effectif',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (value: School['status']) => (
        <Badge variant={getStatusBadgeColor(value)}>
          {value === 'actif' ? 'Actif' : value === 'suspendu' ? 'Suspendu' : 'En création'}
        </Badge>
      ),
    },
    {
      key: 'performanceScore',
      label: 'Performance',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{value}%</span>
          {value >= 80 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : value >= 70 ? (
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </div>
      ),
    },
  ];

  const handleSchoolClick = (schoolId: string) => {
    navigate(ROUTE_PATHS.SCHOOL_DETAIL.replace(':id', schoolId));
  };

  return (
    <Layout>
      <div className="space-y-6">
          <Dialog open={createSchoolOpen} onOpenChange={setCreateSchoolOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Nouvel établissement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Nouvel Établissement</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouvel établissement scolaire au réseau.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="grid gap-2">
                  <Label htmlFor="name">Dénomination *</Label>
                  <Input id="name" placeholder="ex: Fondation Hinneh Abidjan" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor="code">Code Établissement *</Label>
                    <Input id="code" placeholder="ex: HIN-01" value={code} onChange={(e) => setCode(e.target.value)} />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" placeholder="ecole@hinneh.ci" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor="region">Région *</Label>
                    <Input id="region" placeholder="ex: Lagunes" value={region} onChange={(e) => setRegion(e.target.value)} />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="city">Ville *</Label>
                    <Select value={city} onValueChange={setCity}>
                      <SelectTrigger id="city">
                        <SelectValue placeholder="Sélectionner une ville" />
                      </SelectTrigger>
                      <SelectContent>
                        {villesList.length > 0 ? (
                          villesList.map((v) => (
                            <SelectItem key={v.id} value={v.libelle}>
                              {v.libelle} ({v.region || 'CI'})
                            </SelectItem>
                          ))
                        ) : (
                          ['Abidjan', 'Bouaké', 'Yamoussoukro', 'Korhogo', 'San-Pédro', 'Daloa', 'Man', 'Gagnoa'].map((v) => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contacts">Contacts / Téléphone *</Label>
                  <Input id="contacts" placeholder="ex: +225 27 22 44 55" value={contacts} onChange={(e) => setContacts(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Adresse Postale *</Label>
                  <Input id="address" placeholder="ex: BP 456 Abidjan" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Cycles scolaires proposés *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {['maternelle', 'primaire', 'college', 'lycee'].map((cycle) => (
                      <div key={cycle} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cycle-${cycle}`}
                          checked={cyclesSelected.includes(cycle)}
                          onCheckedChange={() => handleToggleCycle(cycle)}
                        />
                        <Label htmlFor={`cycle-${cycle}`} className="capitalize cursor-pointer">
                          {cycle}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateSchoolOpen(false)}>Annuler</Button>
                <Button onClick={handleCreateSchool}>Créer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total établissements"
            value={totalSchools}
            icon={<Building2 className="h-5 w-5 text-primary" />}
          />
          <MetricCard
            label="Établissements actifs"
            value={activeSchools}
            icon={<Building2 className="h-5 w-5 text-green-600" />}
          />
          <MetricCard
            label="Total élèves"
            value={totalStudents}
            icon={<Users className="h-5 w-5 text-accent" />}
          />
          <Button variant="outline" className="h-full gap-2">
            <MapPin className="h-5 w-5" />
            Carte de couverture
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <CardTitle>Établissements</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un établissement..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={centreFilter} onValueChange={setCentreFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Centre / Ville" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les centres</SelectItem>
                  {centres.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Région" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les régions</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="suspendu">Suspendu</SelectItem>
                  <SelectItem value="en_creation">En création</SelectItem>
                </SelectContent>
              </Select>
              <Select value={cycleFilter} onValueChange={setCycleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les cycles</SelectItem>
                  {cycles.map((cycle) => (
                    <SelectItem key={cycle} value={cycle}>
                      {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {viewMode === 'grid' ? (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6"
              >
                {filteredSchools.map((school) => (
                  <motion.div key={school.id} variants={staggerItem}>
                    <motion.div
                      variants={hoverLift}
                      initial="rest"
                      whileHover="hover"
                      className="cursor-pointer"
                      onClick={() => handleSchoolClick(school.id)}
                    >
                      <Card className="h-full hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                                <Building2 className="h-6 w-6 text-primary" />
                              </div>
                              <CardTitle className="text-lg line-clamp-2">
                                {school.name}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                {school.city}, {school.region}
                              </p>
                            </div>
                            <Badge variant={getStatusBadgeColor(school.status)}>
                              {school.status === 'actif'
                                ? 'Actif'
                                : school.status === 'suspendu'
                                ? 'Suspendu'
                                : 'En création'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex flex-wrap gap-1">
                            {school.cycles.map((cycle) => (
                              <Badge key={cycle} variant="secondary" className="text-xs">
                                {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                              </Badge>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Effectif</p>
                              <p className="font-semibold text-lg">{school.effectif}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Performance</p>
                              <div className="flex items-center gap-1">
                                <p className="font-semibold text-lg">{school.performanceScore}%</p>
                                {school.performanceScore >= 80 ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : school.performanceScore >= 70 ? (
                                  <TrendingUp className="h-4 w-4 text-yellow-600" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-destructive" />
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredSchools}
                searchable={false}
                exportable
                onEdit={handleEditSchool}
                onDelete={handleDeletePrompt}
              />
            )}
          </CardContent>
        </Card>

        {/* Edit School Dialog */}
        <Dialog open={editSchoolOpen} onOpenChange={setEditSchoolOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Modifier l'établissement</DialogTitle>
              <DialogDescription>Modifiez les informations de l'établissement sélectionné.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label>Nom</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label>Code</Label>
                  <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label>Région</Label>
                  <Input value={editRegion} onChange={(e) => setEditRegion(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label>Ville *</Label>
                  <Select value={editCity} onValueChange={setEditCity}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner une ville" />
                    </SelectTrigger>
                    <SelectContent>
                      {villesList.length > 0 ? (
                        villesList.map((v) => (
                          <SelectItem key={v.id} value={v.libelle}>
                            {v.libelle} ({v.region || 'CI'})
                          </SelectItem>
                        ))
                      ) : (
                        ['Abidjan', 'Bouaké', 'Yamoussoukro', 'Korhogo', 'San-Pédro', 'Daloa', 'Man', 'Gagnoa'].map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Adresse</Label>
                <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Contacts</Label>
                <Input value={editContacts} onChange={(e) => setEditContacts(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select value={editStatut} onValueChange={setEditStatut}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="suspendu">Suspendu</SelectItem>
                    <SelectItem value="en_creation">En création</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Cycles</Label>
                <div className="flex flex-wrap gap-4">
                  {cycles.map((cycle) => (
                    <div key={cycle} className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-cycle-${cycle}`}
                        checked={editCycles.includes(cycle)}
                        onCheckedChange={() => handleToggleEditCycle(cycle)}
                      />
                      <label htmlFor={`edit-cycle-${cycle}`} className="text-sm capitalize cursor-pointer">{cycle}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditSchoolOpen(false)}>Annuler</Button>
              <Button onClick={handleUpdateSchool}>Enregistrer les modifications</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteSchoolOpen} onOpenChange={setDeleteSchoolOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer <strong>{selectedSchool?.name}</strong> ? Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteSchoolOpen(false)}>Annuler</Button>
              <Button variant="destructive" onClick={handleDeleteSchool}>Supprimer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
