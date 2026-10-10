/**
 * Module d'import de données
 * Import Excel/CSV : élèves, personnel, classes, salles
 */
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import {
  Upload,
  Download,
  FileSpreadsheet,
  Users,
  UserCog,
  School,
  DoorOpen,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Table2,
  Play,
  FileDown,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

type ImportType = "eleves" | "personnel" | "classes" | "salles" | "impayes" | "paiements";

interface ImportConfig {
  key: ImportType;
  label: string;
  icon: React.ElementType;
  apiMethod: (file: File) => Promise<any>;
  description: string;
  columns: string[];
  sampleRows: string[][];
}

const IMPORTS: ImportConfig[] = [
  {
    key: "eleves",
    label: "Élèves",
    icon: Users,
    apiMethod: (file: File) => apiClient.importStudentsCsv(file),
    description:
      "Importer la liste des élèves avec nom, prénom, classe, date de naissance, sexe, parents, etc.",
    columns: [
      "matricule",
      "nom",
      "prenom",
      "date_naissance",
      "sexe",
      "classe",
      "nom_parent",
      "telephone_parent",
      "email_parent",
      "adresse",
    ],
    sampleRows: [
      [
        "ELV001",
        "KOUASSI",
        "Marie",
        "15/03/2012",
        "F",
        "CM2 A",
        "KOUASSI Aya",
        "07 12 34 56 78",
        "aya@email.com",
        "Cocody",
      ],
      [
        "ELV002",
        "YAO",
        "Paul",
        "22/07/2011",
        "M",
        "CM2 A",
        "YAO Koffi",
        "07 98 76 54 32",
        "koffi@email.com",
        "Bingerville",
      ],
    ],
  },
  {
    key: "personnel",
    label: "Personnel",
    icon: UserCog,
    apiMethod: (file: File) => apiClient.importStaffCsv(file),
    description:
      "Importer le personnel (enseignants, administratifs, agents) avec poste, contact, rôle.",
    columns: [
      "matricule",
      "nom",
      "prenom",
      "poste",
      "role",
      "telephone",
      "email",
      "date_embauche",
      "salaire_base",
    ],
    sampleRows: [
      [
        "EMP001",
        "KONÉ",
        "Amadou",
        "Enseignant Mathématiques",
        "enseignant",
        "07 11 22 33 44",
        "amadou@ecole.ci",
        "01/09/2023",
        "250000",
      ],
      [
        "EMP002",
        "BAKAYOKO",
        "Fatou",
        "Secrétaire",
        "administratif",
        "07 55 66 77 88",
        "fatou@ecole.ci",
        "15/01/2022",
        "200000",
      ],
    ],
  },
  {
    key: "classes",
    label: "Classes",
    icon: School,
    apiMethod: (file: File) => apiClient.importClassesCsv(file),
    description:
      "Importer les classes avec nom, niveau, capacité, professeur principal, salle.",
    columns: [
      "nom",
      "niveau",
      "cycle",
      "capacite",
      "professeur_principal",
      "salle",
      "annee_scolaire",
    ],
    sampleRows: [
      [
        "CM2 A",
        "CM2",
        "primaire",
        "35",
        "KONÉ Amadou",
        "Salle 101",
        "2025-2026",
      ],
      [
        "6ème B",
        "6ème",
        "college",
        "30",
        "Bakayoko Fatou",
        "Salle 205",
        "2025-2026",
      ],
    ],
  },
  {
    key: "salles",
    label: "Salles",
    icon: DoorOpen,
    apiMethod: (file: File) => apiClient.importSallesCsv(file),
    description: "Importer les salles avec nom, capacité, type et équipements.",
    columns: ["nom", "capacite", "type", "batiment", "etage", "equipements"],
    sampleRows: [
      ["Salle 101", "35", "classe", "Bâtiment A", "RDC", "Tableau, projecteur"],
      ["Salle 205", "30", "classe", "Bâtiment B", "1er", "Tableau"],
    ],
  },
  {
    key: "impayes",
    label: "Arriérés",
    icon: AlertTriangle,
    apiMethod: (file: File) => apiClient.importImpayesCsv(file),
    description:
      "Importer les arriérés (soldes débiteurs) depuis un fichier Excel, CSV ou PDF. Crée ou met à jour les tranches et les soldes restants pour chaque élève.",
    columns: [
      "matricule",
      "nom",
      "prenom",
      "classe_id",
      "statut",
      "montant_a_payer",
      "montant_verse",
      "solde_restant",
      "annee_scolaire",
    ],
    sampleRows: [
      [
        "25046078Q",
        "SIDIBE",
        "Salimata",
        "54",
        "AFF",
        "126 600",
        "56 000",
        "70 600",
        "2025-2026",
      ],
      [
        "25046136C",
        "TRAORE",
        "Zéïnab",
        "54",
        "AFF",
        "126 600",
        "99 000",
        "27 600",
        "2025-2026",
      ],
    ],
  },
  {
    key: "paiements",
    label: "Paiements Excel",
    icon: Receipt,
    apiMethod: (file: File) => apiClient.importPaymentsExcel(file),
    description:
      "Importer les paiements depuis le fichier Excel (Date, Caissier, Reçu, Nom complet, Classe, Rubrique, Montant). Uniquement les élèves des établissements d'Abidjan, rapprochés par Nom, Prénom et Classe. Les élèves introuvables ne sont pas créés : leurs paiements sont listés dans le rapport.",
    columns: [
      "Date",
      "Caissier",
      "numero reçu",
      "Nom Complet",
      "Classe",
      "Statut",
      "Filière",
      "Rubrique",
      "Montant",
    ],
    sampleRows: [
      [
        "2026-10-03 09:30:04",
        "yahkouyate",
        "RC-06873",
        "SIDIBE SOULEYMANE",
        "4EME B",
        "AFF",
        "GENERAL",
        "CANT",
        "30000",
      ],
      [
        "2026-10-03 09:30:04",
        "yahkouyate",
        "RC-06873",
        "SIDIBE SOULEYMANE",
        "4EME B",
        "AFF",
        "GENERAL",
        "SCO",
        "15000",
      ],
      [
        "2026-10-02 15:16:45",
        "yahkouyate",
        "RC-06872",
        "BAMBA MARIAME NOURRAH SAKINA",
        "2ND A1",
        "AFF",
        "GENERAL",
        "SCO",
        "40600",
      ],
    ],
  },
];

export default function ImportData() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ImportType>("eleves");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [schoolYear, setSchoolYear] = useState("2025-2026");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayFileName, setDisplayFileName] = useState<string>("");
  const activeImport = IMPORTS.find((i) => i.key === activeTab)!;

  const parseFile = async (f: File) => {
    setDisplayFileName(f.name);
    if (f.name.toLowerCase().endsWith(".pdf")) {
      setHeaders([]);
      setPreview([]);
      setFile(f);
      return;
    }
    try {
      const data = await f.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
      }) as any[];
      if (json.length === 0) {
        toast({ variant: "destructive", title: "Fichier vide" });
        return;
      }
      const hdrs = json[0].map((h: any) => String(h).trim().toLowerCase());
      const rows = json
        .slice(1)
        .filter((r) => r.some((c: any) => String(c).trim() !== ""));
      setHeaders(hdrs);
      setPreview(rows.slice(0, 10));

      setFile(f);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erreur de lecture du fichier",
        description: err.message,
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) parseFile(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  };

  const downloadTemplate = (type: ImportType) => {
    const cfg = IMPORTS.find((i) => i.key === type)!;
    const ws = XLSX.utils.aoa_to_sheet([cfg.columns, ...cfg.sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, cfg.label);
    XLSX.writeFile(wb, `modele_import_${type}.xlsx`);
  };

  const handleImport = async () => {
    if (!file) {
      toast({ variant: "destructive", title: "Aucun fichier sélectionné" });
      return;
    }
    setLoading(true);
    try {
      const res = await activeImport.apiMethod(file);
      console.log("Import response:", res);
      const importedCount = (res.imported || 0) + (res.updated || 0);
      const errors = (res.errors || []).filter(
        (e: string) => e && e.trim().length > 0,
      );

      if (activeTab === "paiements") {
        if (res.success || (res.paiements_inseres !== undefined)) {
          toast({
            title: "Import des paiements terminé",
            variant: "default",
            description: (
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-green-600">
                  {res.paiements_inseres || 0} paiement(s) inséré(s) en base ({res.paiements_deja_existants || 0} déjà existants ignorés).
                </p>
                <p className="text-muted-foreground">
                  {res.eleves_trouves || 0} élève(s) réconcilié(s) | {res.nouveaux_eleves_crees || 0} nouveau(x) élève(s) créé(s) avec matricule temporaire.
                </p>
                <p className="text-muted-foreground">
                  Total : {res.total_lignes_fichier || 0} lignes lues ({res.total_recus_distincts || 0} reçus distincts).
                </p>
              </div>
            ) as any,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Échec de l'import des paiements",
            description: res.erreurs?.join(", ") || "Une erreur est survenue lors de l'import.",
          });
        }
      } else if (res.success || importedCount > 0) {
        toast({
          title: "Import terminé avec succès",
          variant: "default",
          description: (
            <div className="space-y-1">
              <p className="text-green-500">
                {importedCount} ligne(s) traitée(s) ({res.imported || 0}{" "}
                nouvelle(s), {res.updated || 0} mise(s) à jour).{" "}
                {errors.length > 0 ? `${errors.length} erreur(s).` : ""}
              </p>
              {errors.length > 0 && (
                <>
                  <p className="font-bold mb-1 text-red-500">
                    {errors.length} erreur(s) détectée(s) :
                  </p>
                  {errors.slice(0, 7).map((e: string, i: number) => (
                    <p key={i} className="mb-1 text-red-500">
                      • {e}
                    </p>
                  ))}
                  {errors.length > 10 && (
                    <p className="text-muted-foreground text-red-500">
                      ... et {errors.length - 10} autres erreurs
                    </p>
                  )}
                </>
              )}
            </div>
          ) as any,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Échec de l'import",
          description:
            errors.length > 0
              ? errors.join(", ")
              : "Aucune donnée n'a pu être importée.",
        });
      }
      setFile(null);
      setPreview([]);
      setHeaders([]);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Échec de l'import",
        description:
          err.response?.data?.detail || err.message || "Erreur inconnue",
      });
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6 max-w-5xl mx-auto"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Upload className="h-7 w-7 text-primary" />
            Import de données
          </h1>
          <p className="text-muted-foreground mt-1">
            Importer des listes d&apos;élèves, de personnel, de classes ou de
            salles depuis Excel ou CSV.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as ImportType);
            setFile(null);
            setPreview([]);
            setHeaders([]);
          }}
        >
          <TabsList className="flex-wrap h-auto gap-1">
            {IMPORTS.map((i) => {
              const Icon = i.icon;
              return (
                <TabsTrigger
                  key={i.key}
                  value={i.key}
                  className="gap-1 text-xs"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {i.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {IMPORTS.map((cfg) => (
            <TabsContent
              key={cfg.key}
              value={cfg.key}
              className="mt-4 space-y-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <cfg.icon className="h-4 w-4" />
                    Import {cfg.label}
                  </CardTitle>
                  <CardDescription>{cfg.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2 justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => downloadTemplate(cfg.key)}
                    >
                      <FileDown className="h-4 w-4" />
                      Télécharger le modèle Excel
                    </Button>
                    {cfg.key === "eleves" && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Année scolaire :
                        </span>
                        <Select
                          value={schoolYear}
                          onValueChange={setSchoolYear}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2024-2025">2024-2025</SelectItem>
                            <SelectItem value="2025-2026">2025-2026</SelectItem>
                            <SelectItem value="2026-2027">2026-2027</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium">
                      Glissez-déposez un fichier Excel, CSV ou PDF
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      .xlsx, .xls, .csv, .pdf — maximum 5 Mo
                    </p>
                    {file && (
                      <div className="mt-3 inline-flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        {displayFileName}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            setPreview([]);
                            setHeaders([]);
                          }}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {preview.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm flex items-center gap-1">
                          <Table2 className="h-4 w-4" />
                          Aperçu ({preview.length} lignes)
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {headers.length} colonnes détectées
                        </Badge>
                      </div>
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/80 border-b">
                            <tr>
                              {headers.map((h, i) => (
                                <th
                                  key={i}
                                  className="p-2 text-left font-medium whitespace-nowrap"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {preview.map((row, i) => (
                              <tr
                                key={i}
                                className="border-b hover:bg-muted/20"
                              >
                                {row.map((cell: any, j: number) => (
                                  <td key={j} className="p-2 whitespace-nowrap">
                                    {String(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 bg-amber-50 text-amber-900 p-3 rounded-lg text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>
                      Les fichiers doivent contenir une ligne d&apos;en-tête.
                      Respectez le modèle fourni pour éviter les erreurs
                      d&apos;import.
                    </p>
                  </div>

                  <Button
                    className="w-full gap-2"
                    disabled={!file || loading}
                    onClick={handleImport}
                  >
                    {loading ? (
                      <Upload className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Lancer l&apos;import
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>
    </Layout>
  );
}
