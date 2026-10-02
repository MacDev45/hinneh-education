import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Layout } from "@/components/Layout";
import { useToast } from "@/components/ui/use-toast";
import apiClient from "@/lib/apiClient";
import { Calendar, FileText, Plus, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const RHDemandesSpace: React.FC = () => {
  const { toast } = useToast();
  const [absences, setAbsences] = useState<any[]>([]);
  const [conges, setConges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [showCongeForm, setShowCongeForm] = useState(false);

  // Formulaires
  const [absenceForm, setAbsenceForm] = useState({
    date_debut: "",
    date_fin: "",
    motif: "",
    justification: "",
  });

  const [congeForm, setCongeForm] = useState({
    date_debut: "",
    date_fin: "",
    type_conge: "conge_annuel",
    motif: "",
  });

  useEffect(() => {
    chargerDemandes();
  }, []);

  const chargerDemandes = async () => {
    try {
      const [absRes, conRes] = await Promise.all([
        apiClient.get("/rh/absence/mes-demandes").catch(() => ({ data: [] })),
        apiClient.get("/rh/conge/mes-demandes").catch(() => ({ data: [] })),
      ]);
      setAbsences(absRes.data || []);
      setConges(conRes.data || []);
    } catch (err) {
      console.error("Erreur chargement demandes:", err);
    } finally {
      setLoading(false);
    }
  };

  const creerAbsence = async () => {
    if (!absenceForm.date_debut || !absenceForm.date_fin || !absenceForm.motif) {
      toast({
        variant: "destructive",
        title: "Champs obligatoires",
        description: "Remplissez tous les champs.",
      });
      return;
    }

    try {
      await apiClient.post("/rh/absence/creer", absenceForm);
      toast({ title: "Demande créée", description: "Votre demande a été enregistrée." });
      setAbsenceForm({ date_debut: "", date_fin: "", motif: "", justification: "" });
      setShowAbsenceForm(false);
      chargerDemandes();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible de créer la demande.",
      });
    }
  };

  const creerConge = async () => {
    if (!congeForm.date_debut || !congeForm.date_fin) {
      toast({
        variant: "destructive",
        title: "Champs obligatoires",
        description: "Remplissez tous les champs.",
      });
      return;
    }

    try {
      await apiClient.post("/rh/conge/creer", congeForm);
      toast({ title: "Demande créée", description: "Votre demande de congé a été enregistrée." });
      setCongeForm({ date_debut: "", date_fin: "", type_conge: "conge_annuel", motif: "" });
      setShowCongeForm(false);
      chargerDemandes();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible de créer la demande.",
      });
    }
  };

  const genererAttestation = async (motif: string) => {
    try {
      const res = await apiClient.get(`/rh/attestation/me?motif=${motif}`);
      // Dans une app réelle, il faudrait générer un PDF
      console.log("Attestation:", res.data);
      toast({ title: "Attestation", description: "Attestation générée (voir la console)." });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible de générer l'attestation.",
      });
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case "approuvee":
        return "bg-green-100 text-green-800";
      case "rejetee":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading) {
    return (
      <Layout
        loading={true}
        loadingMessage="Chargement de l'espace demandes RH..."
        loadingSubmessage="Récupération de vos demandes et autorisations"
      >
        <div />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Gestion RH - Mes Demandes</h1>
        </div>

        <Tabs defaultValue="absence" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="absence">Absences</TabsTrigger>
            <TabsTrigger value="conge">Congés</TabsTrigger>
            <TabsTrigger value="attestation">Attestations</TabsTrigger>
          </TabsList>

          {/* Tab Absences */}
          <TabsContent value="absence" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowAbsenceForm(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Nouvelle Demande
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {absences.length > 0 ? (
                absences.map((abs) => (
                  <Card key={abs.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{abs.motif}</CardTitle>
                          <CardDescription className="text-xs">
                            Du {abs.date_debut} au {abs.date_fin}
                          </CardDescription>
                        </div>
                        <Badge className={getStatutColor(abs.statut)}>{abs.statut}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm">
                      {abs.justification && <p className="text-slate-600">{abs.justification}</p>}
                      <p className="text-xs text-slate-500 mt-2">Demandée le {abs.date_demande}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-slate-500 text-center py-8">Aucune demande d'absence</p>
              )}
            </div>

            {/* Dialog créer absence */}
            <Dialog open={showAbsenceForm} onOpenChange={setShowAbsenceForm}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle Demande d'Absence</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Date de début</Label>
                    <Input
                      type="date"
                      value={absenceForm.date_debut}
                      onChange={(e) =>
                        setAbsenceForm({ ...absenceForm, date_debut: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Date de fin</Label>
                    <Input
                      type="date"
                      value={absenceForm.date_fin}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, date_fin: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Motif</Label>
                    <Input
                      placeholder="Maladie, rendez-vous médical..."
                      value={absenceForm.motif}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, motif: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Justification (optionnel)</Label>
                    <Textarea
                      placeholder="Détails supplémentaires..."
                      value={absenceForm.justification}
                      onChange={(e) =>
                        setAbsenceForm({ ...absenceForm, justification: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAbsenceForm(false)}>
                    Annuler
                  </Button>
                  <Button onClick={creerAbsence}>Créer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Tab Congés */}
          <TabsContent value="conge" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCongeForm(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Nouvelle Demande
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {conges.length > 0 ? (
                conges.map((conge) => (
                  <Card key={conge.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{conge.type_conge}</CardTitle>
                          <CardDescription className="text-xs">
                            Du {conge.date_debut} au {conge.date_fin} ({conge.jours_utilises} jours)
                          </CardDescription>
                        </div>
                        <Badge className={getStatutColor(conge.statut)}>{conge.statut}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm">
                      {conge.motif && <p className="text-slate-600">{conge.motif}</p>}
                      <p className="text-xs text-slate-500 mt-2">Demandée le {conge.date_demande}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-slate-500 text-center py-8">Aucune demande de congé</p>
              )}
            </div>

            {/* Dialog créer congé */}
            <Dialog open={showCongeForm} onOpenChange={setShowCongeForm}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle Demande de Congé</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Type de congé</Label>
                    <Select value={congeForm.type_conge} onValueChange={(v) =>
                      setCongeForm({ ...congeForm, type_conge: v })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conge_annuel">Congé annuel</SelectItem>
                        <SelectItem value="conge_maladie">Congé maladie</SelectItem>
                        <SelectItem value="conge_maternite">Congé maternité</SelectItem>
                        <SelectItem value="conge_paternite">Congé paternité</SelectItem>
                        <SelectItem value="conge_exceptionnel">Congé exceptionnel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date de début</Label>
                    <Input
                      type="date"
                      value={congeForm.date_debut}
                      onChange={(e) =>
                        setCongeForm({ ...congeForm, date_debut: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Date de fin</Label>
                    <Input
                      type="date"
                      value={congeForm.date_fin}
                      onChange={(e) => setCongeForm({ ...congeForm, date_fin: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Motif (optionnel)</Label>
                    <Textarea
                      placeholder="Détails du congé..."
                      value={congeForm.motif}
                      onChange={(e) => setCongeForm({ ...congeForm, motif: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCongeForm(false)}>
                    Annuler
                  </Button>
                  <Button onClick={creerConge}>Créer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Tab Attestations */}
          <TabsContent value="attestation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Attestations de Travail
                </CardTitle>
                <CardDescription>Générer une attestation pour vos besoins administratifs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => genererAttestation("pour_obtenir_emploi")}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" /> Pour obtenir un emploi
                </Button>
                <Button
                  onClick={() => genererAttestation("pour_credit")}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" /> Pour crédit bancaire
                </Button>
                <Button
                  onClick={() => genererAttestation("pour_administrative")}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" /> Pour démarches administratives
                </Button>
                <Button
                  onClick={() => genererAttestation("autre")}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" /> Autre motif
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};
