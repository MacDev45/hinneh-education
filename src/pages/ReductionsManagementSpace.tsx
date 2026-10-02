import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/Layout";
import { useToast } from "@/components/ui/use-toast";
import apiClient from "@/lib/apiClient";
import { Plus, Edit2, Trash2, Check } from "lucide-react";

interface Reduction {
  id: number;
  eleve_id: number;
  type_reduction: "montant" | "pourcentage" | "bourse" | "subvention";
  montant_reduction?: number;
  pourcentage_reduction?: number;
  motif?: string;
  date_debut?: string;
  date_fin?: string;
  statut: "actif" | "expire" | "supprime";
  appliquee_aux_echeances: boolean;
  service_type?: string;
  date_creation: string;
}

export const ReductionsManagementSpace: React.FC = () => {
  const { eleve_id } = useParams<{ eleve_id: string }>();
  const { toast } = useToast();
  const [reductions, setReductions] = useState<Reduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    type_reduction: "montant" as const,
    montant_reduction: "",
    pourcentage_reduction: "",
    motif: "",
    date_debut: "",
    date_fin: "",
    service_type: "",
  });

  useEffect(() => {
    chargerReductions();
  }, [eleve_id]);

  const chargerReductions = async () => {
    if (!eleve_id) return;
    try {
      const res = await apiClient.get(`/api/reductions/${eleve_id}`);
      setReductions(res.data);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible de charger les réductions.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReduction = async () => {
    if (!eleve_id) return;

    const payload = {
      eleve_id: parseInt(eleve_id),
      type_reduction: formData.type_reduction,
      montant_reduction: formData.montant_reduction ? parseFloat(formData.montant_reduction) : null,
      pourcentage_reduction: formData.pourcentage_reduction ? parseFloat(formData.pourcentage_reduction) : null,
      motif: formData.motif || null,
      date_debut: formData.date_debut || null,
      date_fin: formData.date_fin || null,
      service_type: formData.service_type || null,
    };

    try {
      await apiClient.post("/api/reductions/", payload);
      toast({
        title: "Succès",
        description: "Réduction créée avec succès.",
      });
      setShowForm(false);
      setFormData({
        type_reduction: "montant",
        montant_reduction: "",
        pourcentage_reduction: "",
        motif: "",
        date_debut: "",
        date_fin: "",
        service_type: "",
      });
      chargerReductions();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible de créer la réduction.",
      });
    }
  };

  const handleDisperseReduction = async (reductionId: number) => {
    try {
      const res = await apiClient.post(`/api/reductions/${reductionId}/disperse`);
      toast({
        title: "Succès",
        description: res.data.message || "Réduction dispersée sur les échéanciers.",
      });
      chargerReductions();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible de disperser la réduction.",
      });
    }
  };

  const handleDeleteReduction = async (reductionId: number) => {
    if (!confirm("Êtes-vous sûr ?")) return;
    try {
      await apiClient.delete(`/api/reductions/${reductionId}`);
      toast({
        title: "Succès",
        description: "Réduction supprimée.",
      });
      chargerReductions();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible de supprimer la réduction.",
      });
    }
  };

  if (loading) {
    return (
      <Layout
        loading={true}
        loadingMessage="Chargement des réductions..."
        loadingSubmessage="Récupération du registre des réductions et bourses"
      >
        <div />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Gestion des Réductions</h1>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" /> Nouvelle Réduction
          </Button>
        </div>

        {showForm && (
          <Card className="bg-blue-50 dark:bg-blue-950/20">
            <CardHeader>
              <CardTitle>Créer une Réduction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type_reduction}
                  onChange={(e) => setFormData({ ...formData, type_reduction: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-slate-800 dark:border-slate-600"
                >
                  <option value="montant">Montant fixe</option>
                  <option value="pourcentage">Pourcentage</option>
                  <option value="bourse">Bourse d'étude</option>
                  <option value="subvention">Subvention</option>
                </select>
              </div>

              {formData.type_reduction === "montant" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Montant (XOF)</label>
                  <Input
                    type="number"
                    value={formData.montant_reduction}
                    onChange={(e) => setFormData({ ...formData, montant_reduction: e.target.value })}
                    placeholder="50000"
                  />
                </div>
              )}

              {formData.type_reduction === "pourcentage" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Pourcentage (%)</label>
                  <Input
                    type="number"
                    value={formData.pourcentage_reduction}
                    onChange={(e) => setFormData({ ...formData, pourcentage_reduction: e.target.value })}
                    placeholder="10"
                    step="0.01"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Motif</label>
                <Input
                  value={formData.motif}
                  onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                  placeholder="Ex: Bourse d'étude, Aide familiale"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date début</label>
                  <Input
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date fin</label>
                  <Input
                    type="date"
                    value={formData.date_fin}
                    onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Service (optionnel)</label>
                <select
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-slate-800 dark:border-slate-600"
                >
                  <option value="">Tous les services</option>
                  <option value="scolarite">Scolarité</option>
                  <option value="transport">Transport</option>
                  <option value="cantine">Cantine</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateReduction} className="flex-1">
                  Créer
                </Button>
                <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1">
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {reductions.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Aucune réduction enregistrée</p>
          ) : (
            reductions.map((reduction) => (
              <Card key={reduction.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">
                          {reduction.type_reduction === "montant"
                            ? `${reduction.montant_reduction?.toLocaleString()} XOF`
                            : `${reduction.pourcentage_reduction}%`}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          reduction.statut === "actif"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
                        }`}>
                          {reduction.statut}
                        </span>
                        {reduction.appliquee_aux_echeances && (
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            ✓ Appliquée
                          </span>
                        )}
                      </div>
                      {reduction.motif && <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{reduction.motif}</p>}
                      {reduction.date_debut && (
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          {reduction.date_debut} → {reduction.date_fin || "Pas de fin"}
                        </p>
                      )}
                      {reduction.service_type && (
                        <p className="text-xs text-slate-500 dark:text-slate-500">Service: {reduction.service_type}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {reduction.statut === "actif" && !reduction.appliquee_aux_echeances && (
                        <Button
                          onClick={() => handleDisperseReduction(reduction.id)}
                          size="sm"
                          className="gap-1"
                          title="Appliquer la réduction aux échéanciers"
                        >
                          <Check className="w-3 h-3" /> Appliquer
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDeleteReduction(reduction.id)}
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};
