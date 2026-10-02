import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { DataTable, type Column } from '@/components/DataTable';
import apiClient from '@/lib/apiClient';
import type { Student } from '@/lib/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen, Plus, Search, CheckCircle2, Clock, AlertTriangle,
  Library, BookPlus, RefreshCw, BookmarkCheck, ArrowRight, User, Pencil, Trash2
} from 'lucide-react';

export interface LivreItem {
  id: number;
  titre: string;
  auteur: string;
  isbn?: string;
  categorie: string;
  nombre_exemplaires: number;
  disponibles: number;
  emplacement?: string;
}

export interface EmpruntItem {
  id: number;
  livre_id: number;
  titre_livre: string;
  emprunteur_nom: string;
  type_emprunteur: 'eleve' | 'personnel';
  date_emprunt: string;
  date_retour_prevue: string;
  date_retour_effective?: string;
  statut: 'en_cours' | 'retourne' | 'en_retard';
}

const INITIAL_LIVRES: LivreItem[] = [
  { id: 1, titre: "Le Pagne Noir", auteur: "Bernard Dadié", isbn: "978-2708701234", categorie: "Littérature Ivoirienne", nombre_exemplaires: 10, disponibles: 7, emplacement: "Rayon A1" },
  { id: 2, titre: "L'Aventure Ambiguë", auteur: "Cheikh Hamidou Kane", isbn: "978-2266023456", categorie: "Roman Africain", nombre_exemplaires: 8, disponibles: 5, emplacement: "Rayon A2" },
  { id: 3, titre: "Mathématiques 3ème Collection Pythagore", auteur: "EDICEF", isbn: "978-2753109876", categorie: "Manuel Scolaire", nombre_exemplaires: 25, disponibles: 18, emplacement: "Rayon M3" },
  { id: 4, titre: "SVT 1ère D Collection Savanes", auteur: "NEI CEDA", isbn: "978-2844871234", categorie: "Manuel Scolaire", nombre_exemplaires: 15, disponibles: 12, emplacement: "Rayon S1" },
  { id: 5, titre: "Les Soleils des Indépendances", auteur: "Ahmadou Kourouma", isbn: "978-2020239871", categorie: "Roman Africain", nombre_exemplaires: 12, disponibles: 4, emplacement: "Rayon A3" },
];

const INITIAL_EMPRUNTS: EmpruntItem[] = [
  { id: 101, livre_id: 1, titre_livre: "Le Pagne Noir", emprunteur_nom: "KOUASSI Yao Jean (3ème A)", type_emprunteur: "eleve", date_emprunt: "2026-08-01", date_retour_prevue: "2026-08-15", statut: "en_cours" },
  { id: 102, livre_id: 5, titre_livre: "Les Soleils des Indépendances", emprunteur_nom: "KONAN Amenan Marie (1ère C)", type_emprunteur: "eleve", date_emprunt: "2026-07-20", date_retour_prevue: "2026-08-03", statut: "en_retard" },
  { id: 103, livre_id: 3, titre_livre: "Mathématiques 3ème", emprunteur_nom: "M. Coulibaly (Prof. Math)", type_emprunteur: "personnel", date_emprunt: "2026-08-10", date_retour_prevue: "2026-08-24", statut: "en_cours" },
];

export default function BibliothequeSpace() {
  const { toast } = useToast();

  const [livres, setLivres] = useState<LivreItem[]>(() => {
    const saved = localStorage.getItem("hinneh_livres_cache");
    return saved ? JSON.parse(saved) : INITIAL_LIVRES;
  });

  const [emprunts, setEmprunts] = useState<EmpruntItem[]>(() => {
    const saved = localStorage.getItem("hinneh_emprunts_cache");
    return saved ? JSON.parse(saved) : INITIAL_EMPRUNTS;
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<string>('catalogue');

  // Search States
  const [searchLivre, setSearchLivre] = useState<string>('');

  // Modals
  const [showAddLivreModal, setShowAddLivreModal] = useState<boolean>(false);
  const [editingLivre, setEditingLivre] = useState<LivreItem | null>(null);
  const [showEmpruntModal, setShowEmpruntModal] = useState<boolean>(false);

  // New/Edit Livre Form State
  const [newTitre, setNewTitre] = useState<string>('');
  const [newAuteur, setNewAuteur] = useState<string>('');
  const [newIsbn, setNewIsbn] = useState<string>('');
  const [newCategorie, setNewCategorie] = useState<string>('Roman Africain');
  const [newExemplaires, setNewExemplaires] = useState<string>('5');
  const [newEmplacement, setNewEmplacement] = useState<string>('Rayon B1');

  // New Emprunt Form State
  const [selectedLivreId, setSelectedLivreId] = useState<string>('');
  const [emprunteurName, setEmprunteurName] = useState<string>('');
  const [dateRetour, setDateRetour] = useState<string>('2026-08-28');

  // Save state to localStorage whenever changed
  useEffect(() => {
    localStorage.setItem("hinneh_livres_cache", JSON.stringify(livres));
  }, [livres]);

  useEffect(() => {
    localStorage.setItem("hinneh_emprunts_cache", JSON.stringify(emprunts));
  }, [emprunts]);

  const fetchBibliothequeData = async () => {
    setLoading(true);
    try {
      const [lList, eList] = await Promise.all([
        apiClient.getLivres().catch(() => null),
        apiClient.getEmprunts().catch(() => null),
      ]);

      if (lList && Array.isArray(lList) && lList.length > 0) {
        setLivres(lList);
      }
      if (eList && Array.isArray(eList) && eList.length > 0) {
        setEmprunts(eList);
      }
    } catch (err) {
      console.warn("Notice: Mode hors ligne actif pour la bibliothèque.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBibliothequeData();
    apiClient.getStudents().then((st) => setStudents(st || [])).catch(() => {});
  }, []);

  const handleOpenAddLivreModal = () => {
    setEditingLivre(null);
    setNewTitre('');
    setNewAuteur('');
    setNewIsbn('');
    setNewCategorie('Roman Africain');
    setNewExemplaires('5');
    setNewEmplacement('Rayon B1');
    setShowAddLivreModal(true);
  };

  const handleOpenEditLivreModal = (livre: LivreItem) => {
    setEditingLivre(livre);
    setNewTitre(livre.titre);
    setNewAuteur(livre.auteur);
    setNewIsbn(livre.isbn || '');
    setNewCategorie(livre.categorie || 'Général');
    setNewExemplaires(String(livre.nombre_exemplaires));
    setNewEmplacement(livre.emplacement || 'Rayon A1');
    setShowAddLivreModal(true);
  };

  const handleSaveLivre = async () => {
    if (!newTitre.trim() || !newAuteur.trim()) {
      toast({ title: '⚠️ Champs manquants', description: 'Veuillez saisir au moins le titre et l\'auteur.', variant: 'destructive' });
      return;
    }
    const qte = parseInt(newExemplaires) || 1;

    if (editingLivre) {
      // Local Update
      setLivres((prev) =>
        prev.map((l) =>
          l.id === editingLivre.id
            ? {
                ...l,
                titre: newTitre,
                auteur: newAuteur,
                isbn: newIsbn,
                categorie: newCategorie,
                nombre_exemplaires: qte,
                emplacement: newEmplacement,
              }
            : l
        )
      );

      // Backend API call async
      apiClient.updateLivre(editingLivre.id, {
        titre: newTitre,
        auteur: newAuteur,
        isbn: newIsbn,
        categorie: newCategorie,
        nombre_exemplaires: qte,
        emplacement: newEmplacement,
      }).catch(() => {});

      toast({ title: '✅ Livre mis à jour', description: `L'ouvrage "${newTitre}" a été modifié.` });
    } else {
      // Local Add
      const newBook: LivreItem = {
        id: Date.now(),
        titre: newTitre,
        auteur: newAuteur,
        isbn: newIsbn,
        categorie: newCategorie,
        nombre_exemplaires: qte,
        disponibles: qte,
        emplacement: newEmplacement,
      };
      setLivres((prev) => [newBook, ...prev]);

      // Backend API call async
      apiClient.createLivre({
        titre: newTitre,
        auteur: newAuteur,
        isbn: newIsbn,
        categorie: newCategorie,
        nombre_exemplaires: qte,
        disponibles: qte,
        emplacement: newEmplacement,
      }).catch(() => {});

      toast({ title: '✅ Livre ajouté', description: `L'ouvrage "${newTitre}" a été enregistré.` });
    }

    setShowAddLivreModal(false);
  };

  const handleDeleteLivre = async (id: number, titre: string) => {
    if (window.confirm(`Voulez-vous vraiment supprimer le livre "${titre}" ?`)) {
      setLivres((prev) => prev.filter((l) => l.id !== id));
      apiClient.deleteLivre(id).catch(() => {});
      toast({ title: '🗑️ Livre supprimé', description: `L'ouvrage "${titre}" a été retiré.` });
    }
  };

  const handleNewEmprunt = async () => {
    if (!selectedLivreId || !emprunteurName.trim()) {
      toast({ title: '⚠️ Sélection incomplète', description: 'Veuillez choisir un livre et saisir le nom de l\'emprunteur.', variant: 'destructive' });
      return;
    }
    const book = livres.find((l) => String(l.id) === String(selectedLivreId));
    if (!book || book.disponibles <= 0) {
      toast({ title: '❌ Indisponible', description: 'Ce livre n\'a aucun exemplaire disponible.', variant: 'destructive' });
      return;
    }

    // Local Update
    setLivres((prev) =>
      prev.map((l) => (l.id === book.id ? { ...l, disponibles: Math.max(0, l.disponibles - 1) } : l))
    );

    const newEmp: EmpruntItem = {
      id: Date.now(),
      livre_id: book.id,
      titre_livre: book.titre,
      emprunteur_nom: emprunteurName,
      type_emprunteur: 'eleve',
      date_emprunt: new Date().toISOString().split('T')[0],
      date_retour_prevue: dateRetour,
      statut: 'en_cours',
    };
    setEmprunts((prev) => [newEmp, ...prev]);

    // Backend API call async
    apiClient.createEmprunt({
      livre_id: book.id,
      emprunteur_nom: emprunteurName,
      date_retour_prevue: dateRetour,
    }).catch(() => {});

    setShowEmpruntModal(false);
    setEmprunteurName('');
    toast({ title: '📚 Emprunt enregistré', description: `Emprunt du livre "${book.titre}" validé.` });
  };

  const handleRetourLivre = async (empId: number, livreId: number) => {
    setEmprunts((prev) =>
      prev.map((e) =>
        e.id === empId
          ? { ...e, statut: 'retourne', date_retour_effective: new Date().toISOString().split('T')[0] }
          : e
      )
    );
    setLivres((prev) =>
      prev.map((l) => (l.id === livreId ? { ...l, disponibles: l.disponibles + 1 } : l))
    );

    apiClient.retourEmprunt(empId).catch(() => {});
    toast({ title: '✅ Restitution enregistrée', description: 'Le livre a été réintégré au stock disponible.' });
  };

  const filteredLivres = useMemo(() => {
    if (!searchLivre) return livres;
    const q = searchLivre.toLowerCase();
    return livres.filter(
      (l) =>
        l.titre.toLowerCase().includes(q) ||
        l.auteur.toLowerCase().includes(q) ||
        (l.categorie && l.categorie.toLowerCase().includes(q))
    );
  }, [livres, searchLivre]);

  const columnsLivres: Column[] = [
    {
      key: 'titre',
      label: 'Titre de l\'Ouvrage',
      sortable: true,
      render: (_v, row: LivreItem) => (
        <div>
          <p className="font-extrabold text-xs text-slate-900 dark:text-white">{row.titre}</p>
          <p className="text-[10px] text-muted-foreground">Auteur: {row.auteur} {row.isbn ? `| ISBN: ${row.isbn}` : ''}</p>
        </div>
      ),
    },
    { key: 'categorie', label: 'Catégorie', sortable: true, render: (v) => <Badge variant="outline" className="font-bold text-[10px]">{v}</Badge> },
    { key: 'emplacement', label: 'Emplacement', sortable: true, render: (v) => <span className="font-mono text-xs font-semibold">{v || 'N/C'}</span> },
    { key: 'nombre_exemplaires', label: 'Exemplaires', sortable: true, render: (v) => <span className="font-bold text-xs">{v}</span> },
    {
      key: 'disponibles',
      label: 'Disponibles',
      sortable: true,
      render: (v) => (
        <span className={`font-black text-xs px-2 py-0.5 rounded ${v > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
          {v} dispo
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_v, row: LivreItem) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            disabled={row.disponibles <= 0}
            onClick={() => {
              setSelectedLivreId(String(row.id));
              setShowEmpruntModal(true);
            }}
            className="text-[11px] h-7 px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            <BookPlus className="w-3.5 h-3.5 mr-1" /> Emprunter
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenEditLivreModal(row)}
            className="text-[11px] h-7 px-1.5 border-slate-300 hover:bg-slate-100 text-slate-700"
            title="Modifier le livre"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDeleteLivre(row.id, row.titre)}
            className="text-[11px] h-7 px-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
            title="Supprimer du catalogue"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const columnsEmprunts: Column[] = [
    { key: 'titre_livre', label: 'Ouvrage Emprunté', sortable: true, render: (v) => <span className="font-extrabold text-xs text-indigo-900 dark:text-indigo-200">{v}</span> },
    { key: 'emprunteur_nom', label: 'Emprunteur', sortable: true, render: (v) => <span className="font-bold text-xs">{v}</span> },
    { key: 'date_emprunt', label: 'Date Emprunt', sortable: true, render: (v) => <span className="font-mono text-xs">{v}</span> },
    { key: 'date_retour_prevue', label: 'Date Retour Prévue', sortable: true, render: (v) => <span className="font-mono text-xs font-bold">{v}</span> },
    {
      key: 'statut',
      label: 'Statut',
      sortable: true,
      render: (_v, row: EmpruntItem) => {
        if (row.statut === 'retourne') return <Badge className="bg-emerald-600 text-white font-bold text-[10px]">Restitué ✅</Badge>;
        if (row.statut === 'en_retard') return <Badge className="bg-rose-600 text-white font-bold text-[10px]">En Retard 🚨</Badge>;
        return <Badge className="bg-amber-500 text-white font-bold text-[10px]">En Cours ⏳</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Restitution',
      render: (_v, row: EmpruntItem) => (
        row.statut !== 'retourne' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRetourLivre(row.id, row.livre_id)}
            className="text-[11px] h-7 px-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold"
          >
            <BookmarkCheck className="w-3.5 h-3.5 mr-1" /> Marquer Restitué
          </Button>
        ) : (
          <span className="text-[10px] text-muted-foreground font-bold">Le {row.date_retour_effective || 'Restitué'}</span>
        )
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-indigo-950 dark:text-white flex items-center gap-2">
              <Library className="h-8 w-8 text-indigo-600" />
              Gestion de la Bibliothèque Scolaire
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Catalogue complet des ouvrages, gestion des emprunts et suivi des restitutions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchBibliothequeData} className="gap-1 text-xs font-bold">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </Button>
            <Button onClick={handleOpenAddLivreModal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-xs">
              <Plus className="w-4 h-4" /> Ajouter un Livre
            </Button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Total Ouvrages</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{livres.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Disponibles</p>
                <p className="text-2xl font-black text-emerald-600">{livres.reduce((acc, l) => acc + (l.disponibles || 0), 0)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Emprunts en Cours</p>
                <p className="text-2xl font-black text-amber-600">{emprunts.filter((e) => e.statut === 'en_cours').length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">En Retard</p>
                <p className="text-2xl font-black text-rose-600">{emprunts.filter((e) => e.statut === 'en_retard').length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 max-w-md">
            <TabsTrigger value="catalogue" className="font-bold text-xs">📖 Catalogue ({livres.length})</TabsTrigger>
            <TabsTrigger value="emprunts" className="font-bold text-xs">📚 Emprunts en cours ({emprunts.length})</TabsTrigger>
          </TabsList>

          {/* CATALOGUE TAB */}
          <TabsContent value="catalogue" className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader className="p-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold">Catalogue Général des Ouvrages</CardTitle>
                  <CardDescription className="text-xs">Recherche, consultation du stock et enregistrement des livres.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <DataTable columns={columnsLivres} data={filteredLivres} searchable={true} exportable={true} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* EMPRUNTS TAB */}
          <TabsContent value="emprunts" className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base font-bold">Historique & Suivi des Emprunts</CardTitle>
                <CardDescription className="text-xs">Liste des livres en prêt et validation des restitutions.</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <DataTable columns={columnsEmprunts} data={emprunts} searchable={true} exportable={true} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal Ajouter / Modifier Livre */}
        <Dialog open={showAddLivreModal} onOpenChange={setShowAddLivreModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                {editingLivre ? 'Modifier l\'Ouvrage' : 'Ajouter un Livre au Catalogue'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Renseignez les détails du livre pour le catalogue de la bibliothèque.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="font-bold mb-1 block">Titre de l'Ouvrage *</Label>
                <Input value={newTitre} onChange={(e) => setNewTitre(e.target.value)} placeholder="ex: Le Pagne Noir" className="text-xs" />
              </div>
              <div>
                <Label className="font-bold mb-1 block">Auteur *</Label>
                <Input value={newAuteur} onChange={(e) => setNewAuteur(e.target.value)} placeholder="ex: Bernard Dadié" className="text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="font-bold mb-1 block">Catégorie</Label>
                  <Select value={newCategorie} onValueChange={setNewCategorie}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Roman Africain">Roman Africain</SelectItem>
                      <SelectItem value="Littérature Ivoirienne">Littérature Ivoirienne</SelectItem>
                      <SelectItem value="Manuel Scolaire">Manuel Scolaire</SelectItem>
                      <SelectItem value="Sciences & Techniques">Sciences & Techniques</SelectItem>
                      <SelectItem value="Général">Général</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-bold mb-1 block">Code ISBN</Label>
                  <Input value={newIsbn} onChange={(e) => setNewIsbn(e.target.value)} placeholder="978-..." className="text-xs font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="font-bold mb-1 block">Nombre d'Exemplaires</Label>
                  <Input type="number" value={newExemplaires} onChange={(e) => setNewExemplaires(e.target.value)} className="text-xs" />
                </div>
                <div>
                  <Label className="font-bold mb-1 block">Emplacement</Label>
                  <Input value={newEmplacement} onChange={(e) => setNewEmplacement(e.target.value)} placeholder="ex: Rayon B1" className="text-xs" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddLivreModal(false)} className="text-xs">Annuler</Button>
              <Button onClick={handleSaveLivre} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                {editingLivre ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Enregistrer Emprunt */}
        <Dialog open={showEmpruntModal} onOpenChange={setShowEmpruntModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <BookPlus className="w-5 h-5 text-emerald-600" /> Enregistrer un Emprunt
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Sélectionnez le livre et l'emprunteur pour enregistrer le prêt.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="font-bold mb-1 block">Choisir un Livre *</Label>
                <Select value={selectedLivreId} onValueChange={setSelectedLivreId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner l'ouvrage..." /></SelectTrigger>
                  <SelectContent>
                    {livres.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)} disabled={l.disponibles <= 0}>
                        {l.titre} ({l.disponibles} dispo)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-bold mb-1 block">Emprunteur (Nom, Prénom & Classe) *</Label>
                <Input value={emprunteurName} onChange={(e) => setEmprunteurName(e.target.value)} placeholder="ex: KOUASSI Jean (3ème A)" className="text-xs" />
              </div>

              <div>
                <Label className="font-bold mb-1 block">Date Limite de Retour *</Label>
                <Input type="date" value={dateRetour} onChange={(e) => setDateRetour(e.target.value)} className="text-xs font-mono" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEmpruntModal(false)} className="text-xs">Annuler</Button>
              <Button onClick={handleNewEmprunt} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">Valider l'Emprunt</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
