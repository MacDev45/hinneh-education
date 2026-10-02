import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout';
import apiClient from '@/lib/apiClient';
import type { School, Student, Staff, ClassRoom } from '@/lib/index';
import { formatDate } from '@/lib/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Printer,
  Building2,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { fadeInUp } from '@/lib/motion';
import { useToast } from '@/hooks/use-toast';

export default function RapportRentree() {
  const { toast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states for non-DB infrastructure variables
  const [sallesClasse, setSallesClasse] = useState('12');
  const [tablesBancs, setTablesBancs] = useState('280');
  const [hasBibliotheque, setHasBibliotheque] = useState('oui');
  const [hasCloture, setHasCloture] = useState('oui');
  const [pointsEau, setPointsEau] = useState('3');
  const [latrinesCount, setLatrinesCount] = useState('8');
  const [drena, setDrena] = useState('DRENA Abidjan 1');
  const [iepp, setIepp] = useState('IEP Cocody-Plateau');
  const [anneeScolaire, setAnneeScolaire] = useState('2025-2026');
  const [signataire, setSignataire] = useState('Kadiatou Bamba');
  const [titreSignataire, setTitreSignataire] = useState("Directeur d'Établissement");
  const [besoinsUrgents, setBesoinsUrgents] = useState(
    'Besoins additionnels de tables-bancs pour les effectifs de 3ème. Demande urgente de manuels de Français et de Mathématiques de la collection nationale MENA.'
  );
  const [observations, setObservations] = useState(
    "La rentrée scolaire s'est déroulée de manière sereine. Les élèves ont repris les cours dès le premier jour de la rentrée officielle, les effectifs sont conformes aux prévisions et l'équipe pédagogique est au complet."
  );

  // Fetch schools on mount
  useEffect(() => {
    apiClient.getSchools()
      .then((data) => {
        if (data && data.length > 0) {
          setSchools(data);
          const userEcoleId = localStorage.getItem('user_ecole_id');
          const matchingSchool = userEcoleId ? data.find((s) => String(s.id) === String(userEcoleId)) : null;
          setSelectedSchoolId(matchingSchool ? matchingSchool.id : data[0].id);
        }
      })
      .catch((err) => console.error("Failed to load schools", err));
  }, []);

  // Fetch school details and report when selected school or academic year changes
  useEffect(() => {
    if (!selectedSchoolId) return;

    setLoading(true);
    const ecoleId = parseInt(selectedSchoolId, 10);

    Promise.all([
      apiClient.getStudents({ ecole_id: ecoleId }),
      apiClient.getClasses({ ecole_id: ecoleId }),
      apiClient.getStaff({ ecole_id: ecoleId }),
      apiClient.getRapportRentree(ecoleId, anneeScolaire).catch((_err: any): any => null),
    ])
      .then(([studentsData, classesData, staffData, reportData]) => {
        setStudents(studentsData);
        setClasses(classesData);
        setStaff(staffData);

        if (reportData) {
          setSallesClasse(String(reportData.salles_classe ?? ''));
          setTablesBancs(String(reportData.tables_bancs ?? ''));
          setHasBibliotheque(reportData.has_bibliotheque ?? 'oui');
          setHasCloture(reportData.has_cloture ?? 'oui');
          setPointsEau(String(reportData.points_eau ?? ''));
          setLatrinesCount(String(reportData.latrines_count ?? ''));
          setDrena(reportData.drena ?? '');
          setIepp(reportData.iepp ?? '');
          setSignataire(reportData.signataire ?? '');
          setTitreSignataire(reportData.titre_signataire ?? '');
          setBesoinsUrgents(reportData.besoins_urgents ?? '');
          setObservations(reportData.observations ?? '');
        } else {
          // Pre-fill some defaults based on DB counts or static values
          setSallesClasse(String(classesData.length || 10));
          setTablesBancs(String((classesData.length || 10) * 25));
          setHasBibliotheque('oui');
          setHasCloture('oui');
          setPointsEau('3');
          setLatrinesCount('8');
          setDrena('DRENA Abidjan 1');
          setIepp('IEP Cocody-Plateau');
          setSignataire('Kadiatou Bamba');
          setTitreSignataire("Directeur d'Établissement");
          setBesoinsUrgents(
            'Besoins additionnels de tables-bancs pour les effectifs de 3ème. Demande urgente de manuels de Français et de Mathématiques de la collection nationale MENA.'
          );
          setObservations(
            "La rentrée scolaire s'est déroulée de manière sereine. Les élèves ont repris les cours dès le premier jour de la rentrée officielle, les effectifs sont conformes aux prévisions et l'équipe pédagogique est au complet."
          );
        }
      })
      .catch((err) => console.error("Error fetching school statistics", err))
      .finally(() => setLoading(false));
  }, [selectedSchoolId, anneeScolaire]);


  // Find currently selected school
  const currentSchool = useMemo(() => {
    return schools.find((s) => s.id === selectedSchoolId);
  }, [schools, selectedSchoolId]);

  // Group students by Level / Grade and gender
  const statisticsByLevel = useMemo(() => {
    const stats: Record<string, { g: number; f: number; total: number; classes: string[] }> = {};

    // Initialize all known levels from the classes
    classes.forEach((c) => {
      const levelKey = c.niveau || 'Autre';
      if (!stats[levelKey]) {
        stats[levelKey] = { g: 0, f: 0, total: 0, classes: [] };
      }
      if (!stats[levelKey].classes.includes(c.name)) {
        stats[levelKey].classes.push(c.name);
      }
    });

    // Populate counts from student records
    students.forEach((s) => {
      const matchingClass = classes.find((c) => c.id === s.classId);
      const levelKey = matchingClass?.niveau || 'Sans niveau';

      if (!stats[levelKey]) {
        stats[levelKey] = { g: 0, f: 0, total: 0, classes: [] };
      }

      if (s.gender === 'M') {
        stats[levelKey].g += 1;
      } else {
        stats[levelKey].f += 1;
      }
      stats[levelKey].total += 1;
    });

    return Object.entries(stats).map(([niveau, data]) => ({
      niveau,
      ...data,
    }));
  }, [students, classes]);

  // Personnel count breakdown
  const staffBreakdown = useMemo(() => {
    const teachers = staff.filter((s) => s.fonction === 'enseignant' || s.fonction?.toLowerCase().includes('prof') || s.fonction?.toLowerCase().includes('maitre'));
    const administrative = staff.filter((s) => !teachers.includes(s));
    return {
      total: staff.length,
      teachers: teachers.length,
      admin: administrative.length,
    };
  }, [staff]);

  const handleSaveReport = async () => {
    if (!selectedSchoolId) return;
    setSaving(true);
    try {
      const ecoleId = parseInt(selectedSchoolId, 10);
      const payload = {
        annee_scolaire: anneeScolaire,
        drena,
        iepp,
        salles_classe: parseInt(sallesClasse, 10) || 0,
        tables_bancs: parseInt(tablesBancs, 10) || 0,
        has_bibliotheque: hasBibliotheque,
        has_cloture: hasCloture,
        points_eau: parseInt(pointsEau, 10) || 0,
        latrines_count: parseInt(latrinesCount, 10) || 0,
        signataire,
        titre_signataire: titreSignataire,
        besoins_urgents: besoinsUrgents,
        observations: observations,
      };
      await apiClient.saveRapportRentree(ecoleId, payload);
      toast({
        title: "Rapport enregistré",
        description: "Le rapport de rentrée a été enregistré avec succès en base de données.",
      });
    } catch (err) {
      console.error("Failed to save RapportRentree", err);
      toast({
        title: "Erreur d'enregistrement",
        description: "Une erreur est survenue lors de l'enregistrement du rapport.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };


  const exportToExcel = () => {
    const title = `Rapport_Rentree_${currentSchool?.name || 'Ecole'}_${anneeScolaire}`.replace(/\s+/g, '_');
    const tableHeader = `
      <tr>
        <th style="background-color: #f2f2f2; border: 1px solid #000; font-weight: bold; text-align: left; padding: 5px;">Niveau d'Etudes</th>
        <th style="background-color: #f2f2f2; border: 1px solid #000; font-weight: bold; text-align: center; padding: 5px;">Filles (F)</th>
        <th style="background-color: #f2f2f2; border: 1px solid #000; font-weight: bold; text-align: center; padding: 5px;">Garçons (G)</th>
        <th style="background-color: #f2f2f2; border: 1px solid #000; font-weight: bold; text-align: center; padding: 5px;">Effectif Total</th>
        <th style="background-color: #f2f2f2; border: 1px solid #000; font-weight: bold; text-align: left; padding: 5px;">Classes concernées</th>
      </tr>
    `;
    const tableRows = statisticsByLevel.map(lvl => `
      <tr>
        <td style="border: 1px solid #000; padding: 5px;">${lvl.niveau}</td>
        <td style="border: 1px solid #000; text-align: center; padding: 5px;">${lvl.f}</td>
        <td style="border: 1px solid #000; text-align: center; padding: 5px;">${lvl.g}</td>
        <td style="border: 1px solid #000; text-align: center; font-weight: bold; padding: 5px;">${lvl.total}</td>
        <td style="border: 1px solid #000; padding: 5px;">${lvl.classes.join(', ')}</td>
      </tr>
    `).join('');

    const totalF = students.filter(s => s.gender === 'F').length;
    const totalG = students.filter(s => s.gender === 'M').length;

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      </head>
      <body>
        <h2>RAPPORT DE RENTRÉE SCOLAIRE ${anneeScolaire}</h2>
        <h3>Etablissement: ${currentSchool?.name || '—'}</h3>
        <h4>Code Etablissement: ${currentSchool?.code || '—'}</h4>
        <p>DRENA: ${drena} | IEPP: ${iepp}</p>
        <br/>
        <table style="border-collapse: collapse; border: 1px solid #000;">
          <thead>
            ${tableHeader}
          </thead>
          <tbody>
            ${tableRows}
            <tr style="font-weight: bold; background-color: #e6e6e6;">
              <td style="border: 1px solid #000; padding: 5px;">TOTAL GENERAL</td>
              <td style="border: 1px solid #000; text-align: center; padding: 5px;">${totalF}</td>
              <td style="border: 1px solid #000; text-align: center; padding: 5px;">${totalG}</td>
              <td style="border: 1px solid #000; text-align: center; padding: 5px;">${students.length}</td>
              <td style="border: 1px solid #000; padding: 5px;">${classes.length} classe(s)</td>
            </tr>
          </tbody>
        </table>
        <br/>
        <h3>III. Personnel</h3>
        <ul>
          <li>Enseignants: ${staffBreakdown.teachers}</li>
          <li>Administratifs: ${staffBreakdown.admin}</li>
          <li>Total Agents: ${staffBreakdown.total}</li>
        </ul>
        <br/>
        <h3>IV. Infrastructures</h3>
        <ul>
          <li>Salles de classe: ${sallesClasse}</li>
          <li>Tables-bancs: ${tablesBancs}</li>
          <li>Bibliothèque: ${hasBibliotheque.toUpperCase()}</li>
          <li>Clôture de Sécurité: ${hasCloture.toUpperCase()}</li>
          <li>Points d'eau fonctionnels: ${pointsEau}</li>
          <li>Nombre de cabines de latrines: ${latrinesCount}</li>
        </ul>
        <br/>
        <h3>V. Besoins et Observations</h3>
        <p><b>Besoins Urgents:</b> ${besoinsUrgents}</p>
        <p><b>Observations:</b> ${observations}</p>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToWord = () => {
    const title = `Rapport_Rentree_${currentSchool?.name || 'Ecole'}_${anneeScolaire}`.replace(/\s+/g, '_');
    const printElement = document.getElementById('print-area');
    if (!printElement) return;

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <style>
          body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 10px; }
          table, th, td { border: 1px solid #000; }
          th, td { padding: 8px; text-align: left; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
        </style>
      </head>
      <body>
        ${printElement.innerHTML}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout>
      {/* CSS overrides specific for printing this report */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 1.5cm;
            font-size: 11pt;
            line-height: 1.5;
            color: #000 !important;
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          table, th, td {
            border: 1px solid #000 !important;
          }
          th, td {
            padding: 6px 10px;
          }
          h1, h2, h3 {
            color: #000 !important;
          }
        }
      `}} />

      <div className="space-y-6">
        {/* Header Block */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
              Rapport de Rentrée Scolaire
            </h1>
            <p className="text-muted-foreground mt-1">
              Générez automatiquement le rapport officiel de début d'année pour le MENA de Côte d'Ivoire.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePrint} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium">
              <Printer className="h-4 w-4" />
              Imprimer / PDF
            </Button>

            <Button onClick={exportToExcel} variant="outline" className="gap-2 border-green-200 hover:bg-green-50 text-green-700 font-medium">
              <FileSpreadsheet className="h-4 w-4" />
              Exporter Excel
            </Button>
          </div>
        </motion.div>

        {/* Selection & Controls */}
        <Card className="no-print border border-border/80 shadow-md">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-600" />
              Configuration du Rapport
            </CardTitle>
            <CardDescription>
              Sélectionnez l'établissement et ajustez les variables d'infrastructures.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="school-select" className="font-semibold text-sm">Établissement Scolaire</Label>
                <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger id="school-select" className="w-full bg-background border-border">
                    <SelectValue placeholder="Choisir un établissement" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((sch) => (
                      <SelectItem key={sch.id} value={sch.id}>
                        {sch.name} ({sch.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="drena-input" className="font-semibold text-sm">DRENA (Direction Régionale)</Label>
                <Input
                  id="drena-input"
                  value={drena}
                  onChange={(e) => setDrena(e.target.value)}
                  placeholder="Ex: DRENA Abidjan 1"
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="iepp-input" className="font-semibold text-sm">IEPP (Inspection)</Label>
                <Input
                  id="iepp-input"
                  value={iepp}
                  onChange={(e) => setIepp(e.target.value)}
                  placeholder="Ex: IEP Cocody-Plateau"
                  className="bg-background border-border"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workspace Panels */}
        <Tabs defaultValue="preview" className="no-print w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px] bg-muted mb-4 border border-border">
            <TabsTrigger value="preview" className="font-medium">Aperçu & Impression</TabsTrigger>
            <TabsTrigger value="edit" className="font-medium">Édition Données</TabsTrigger>
          </TabsList>

          {/* TAB 1: PREVIEW */}
          <TabsContent value="preview" className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl mb-2 text-sm">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-orange-600 flex-shrink-0" />
                L'en-tête officiel et la mise en page administrative ivoirienne sont optimisés pour l'impression A4 standard.
              </span>
            </div>

            {/* Document Print Area */}
            <div id="print-area" className="bg-card text-card-foreground border border-border/80 rounded-2xl shadow-xl p-8 md:p-12 max-w-4xl mx-auto font-serif min-h-[1100px]">
              {/* Ivorian MENA Official Header */}
              <div className="flex justify-between items-start mb-8 text-sm">
                <div className="text-left space-y-1">
                  <p className="font-bold uppercase tracking-wider text-xs">Ministère de l'Éducation Nationale</p>
                  <p className="font-bold uppercase tracking-wider text-xs">et de l'Alphabétisation</p>
                  <p className="font-medium text-xs">----------------------------------------</p>
                  <p className="font-semibold">{drena}</p>
                  <p className="font-semibold">{iepp}</p>
                  <p className="font-semibold text-gray-700">Nom Établissement : <span className="font-serif italic font-bold">{currentSchool?.name || 'N/A'}</span></p>
                  <p className="font-semibold text-gray-700">Code Établissement : <span className="font-mono">{currentSchool?.code || 'N/A'}</span></p>
                </div>

                <div className="text-center space-y-1">
                  <p className="font-bold uppercase tracking-widest text-xs">République de Côte d'Ivoire</p>
                  <p className="italic text-xs font-medium">Union - Discipline - Travail</p>
                  <p className="font-medium text-xs">----------------------------------------</p>
                  <p className="font-semibold text-gray-700">Année Scolaire : <span className="font-bold">{anneeScolaire}</span></p>
                  <p className="font-semibold text-gray-700">Date d'édition : <span>{formatDate(new Date())}</span></p>
                </div>
              </div>

              <div className="text-center my-10 space-y-2">
                <h2 className="text-2xl font-bold uppercase tracking-wide border-y border-black py-3 font-sans">
                  RAPPORT DE RENTRÉE SCOLAIRE {anneeScolaire}
                </h2>
                <p className="text-xs italic text-gray-600">
                  (Rapport périodique obligatoire destiné aux autorités de la DRENA et de l'IEPP)
                </p>
              </div>

              {/* SECTION I: IDENTIFICATION */}
              <div className="space-y-4 mb-8">
                <h3 className="text-md font-bold uppercase border-b border-gray-400 pb-1 font-sans">
                  I. Identification de l'Établissement
                </h3>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div><span className="font-semibold">Région Administrative :</span> {currentSchool?.region || '—'}</div>
                  <div><span className="font-semibold">Ville / Localité :</span> {currentSchool?.city || '—'}</div>
                  <div><span className="font-semibold">Adresse Postale :</span> {currentSchool?.address || 'Non spécifiée'}</div>
                  <div><span className="font-semibold">Téléphone / Contact :</span> {currentSchool?.contacts || '—'}</div>
                  <div><span className="font-semibold">Email :</span> {currentSchool?.email || '—'}</div>
                  <div>
                    <span className="font-semibold">Cycles Autorisés :</span>{' '}
                    <span className="capitalize">{currentSchool?.cycles.join(', ') || '—'}</span>
                  </div>
                </div>
              </div>

              {/* SECTION II: STRUCTURE ET EFFECTIFS */}
              <div className="space-y-4 mb-8">
                <h3 className="text-md font-bold uppercase border-b border-gray-400 pb-1 font-sans">
                  II. Structure Pédagogique et Effectifs d'Élèves
                </h3>
                <p className="text-xs italic text-gray-600 mb-2">
                  Statistiques issues en temps réel des fiches d'inscription validées en base de données.
                </p>

                <table className="w-full text-sm border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-2 text-left font-bold">Niveau d'Études</th>
                      <th className="border border-black p-2 text-center font-bold">Filles (F)</th>
                      <th className="border border-black p-2 text-center font-bold">Garçons (G)</th>
                      <th className="border border-black p-2 text-center font-bold">Effectif Total</th>
                      <th className="border border-black p-2 text-left font-bold">Classes concernées</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statisticsByLevel.map((lvl) => (
                      <tr key={lvl.niveau}>
                        <td className="border border-black p-2 font-medium">{lvl.niveau}</td>
                        <td className="border border-black p-2 text-center font-mono">{lvl.f}</td>
                        <td className="border border-black p-2 text-center font-mono">{lvl.g}</td>
                        <td className="border border-black p-2 text-center font-bold font-mono">{lvl.total}</td>
                        <td className="border border-black p-2 text-xs">{lvl.classes.join(', ')}</td>
                      </tr>
                    ))}
                    {statisticsByLevel.length === 0 && (
                      <tr>
                        <td colSpan={5} className="border border-black p-4 text-center text-muted-foreground italic">
                          Aucun élève ni classe enregistré en base de données pour cet établissement.
                        </td>
                      </tr>
                    )}
                    <tr className="bg-gray-50 font-bold">
                      <td className="border border-black p-2 uppercase">Total Général</td>
                      <td className="border border-black p-2 text-center font-mono">
                        {students.filter(s => s.gender === 'F').length}
                      </td>
                      <td className="border border-black p-2 text-center font-mono">
                        {students.filter(s => s.gender === 'M').length}
                      </td>
                      <td className="border border-black p-2 text-center font-mono text-lg underline">
                        {students.length}
                      </td>
                      <td className="border border-black p-2 text-xs">
                        {classes.length} classe(s) physique(s)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SECTION III: PERSONNEL */}
              <div className="space-y-4 mb-8">
                <h3 className="text-md font-bold uppercase border-b border-gray-400 pb-1 font-sans">
                  III. Personnel de l'Établissement
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="border border-black p-3 rounded-lg">
                    <p className="text-xs uppercase font-medium">Personnel Enseignant</p>
                    <p className="text-xl font-bold font-mono mt-1">{staffBreakdown.teachers}</p>
                  </div>
                  <div className="border border-black p-3 rounded-lg">
                    <p className="text-xs uppercase font-medium">Personnel Administratif</p>
                    <p className="text-xl font-bold font-mono mt-1">{staffBreakdown.admin}</p>
                  </div>
                  <div className="border border-black p-3 rounded-lg">
                    <p className="text-xs uppercase font-medium">Effectif Total Agents</p>
                    <p className="text-xl font-bold font-mono mt-1">{staffBreakdown.total}</p>
                  </div>
                </div>
              </div>

              {/* SECTION IV: INFRASTRUCTURES */}
              <div className="space-y-4 mb-8">
                <h3 className="text-md font-bold uppercase border-b border-gray-400 pb-1 font-sans">
                  IV. Infrastructures & Équipements Scolaires
                </h3>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div><span className="font-semibold">Salles de classe fonctionnelles :</span> {sallesClasse}</div>
                  <div><span className="font-semibold">Tables-bancs fonctionnels :</span> {tablesBancs}</div>
                  <div><span className="font-semibold">Bibliothèque Scolaire :</span> <span className="uppercase font-medium">{hasBibliotheque}</span></div>
                  <div><span className="font-semibold">Clôture de Sécurité :</span> <span className="uppercase font-medium">{hasCloture}</span></div>
                  <div><span className="font-semibold">Points d'eau potables fonctionnels :</span> {pointsEau}</div>
                  <div><span className="font-semibold">Nombre de cabines de latrines :</span> {latrinesCount}</div>
                </div>
              </div>

              {/* SECTION V: BESOINS ET OBSERVATIONS */}
              <div className="space-y-4 mb-12">
                <h3 className="text-md font-bold uppercase border-b border-gray-400 pb-1 font-sans">
                  V. Besoins prioritaires & Observations du Chef d'Établissement
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="p-3 border border-gray-300 rounded-lg bg-gray-50/50">
                    <p className="font-semibold text-xs uppercase mb-1">Besoins Urgents du Directeur :</p>
                    <p className="italic">{besoinsUrgents || 'Néant.'}</p>
                  </div>
                  <div className="p-3 border border-gray-300 rounded-lg bg-gray-50/50">
                    <p className="font-semibold text-xs uppercase mb-1">Observations Générales :</p>
                    <p className="italic">{observations || 'Aucune observation particulière.'}</p>
                  </div>
                </div>
              </div>

              {/* SIGNATURES SECTION */}
              <div className="mt-16 flex justify-between items-center text-sm pt-8">
                <div className="text-center w-1/3">
                  <p className="font-bold underline uppercase text-xs">Le Comité des Parents (COGES)</p>
                  <p className="mt-16 text-xs text-gray-500 font-serif italic">(Nom & Signature)</p>
                </div>

                <div className="text-center w-1/3">
                  <p className="font-bold underline uppercase text-xs">Visa de l'Inspection (IEPP)</p>
                  <p className="mt-16 text-xs text-gray-500 font-serif italic">(Signature & Cachet)</p>
                </div>

                <div className="text-center w-1/3">
                  <p className="font-bold underline uppercase text-xs">Le Chef d'Établissement</p>
                  <p className="font-semibold mt-1 font-sans text-xs">{signataire}</p>
                  <p className="text-xs text-muted-foreground italic font-sans">{titreSignataire}</p>
                  <p className="mt-10 text-xs text-gray-500 font-serif italic">(Signature & Cachet)</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: EDIT FORM */}
          <TabsContent value="edit">
            <Card className="border border-border/80 shadow-md">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-lg">Données administratives & matérielles</CardTitle>
                <CardDescription>
                  Saisissez les informations non stockées en base de données pour compléter le rapport de rentrée.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Administrative Variables */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-orange-600 uppercase tracking-wide">Variables Administratives</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="school-year" className="font-medium text-xs">Année Scolaire</Label>
                        <Input
                          id="school-year"
                          value={anneeScolaire}
                          onChange={(e) => setAnneeScolaire(e.target.value)}
                          placeholder="Ex: 2025-2026"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signee-name" className="font-medium text-xs">Chef d'Établissement</Label>
                        <Input
                          id="signee-name"
                          value={signataire}
                          onChange={(e) => setSignataire(e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="signee-title" className="font-medium text-xs">Titre exact</Label>
                        <Input
                          id="signee-title"
                          value={titreSignataire}
                          onChange={(e) => setTitreSignataire(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Infrastructure Variables */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-orange-600 uppercase tracking-wide">Infrastructures & Matériels</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="classrooms-count" className="font-medium text-xs">Salles de classe</Label>
                        <Input
                          id="classrooms-count"
                          type="number"
                          value={sallesClasse}
                          onChange={(e) => setSallesClasse(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="desks-count" className="font-medium text-xs">Tables-bancs</Label>
                        <Input
                          id="desks-count"
                          type="number"
                          value={tablesBancs}
                          onChange={(e) => setTablesBancs(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="library-select" className="font-medium text-xs">Bibliothèque</Label>
                        <Select value={hasBibliotheque} onValueChange={setHasBibliotheque}>
                          <SelectTrigger id="library-select"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="oui">Oui, fonctionnelle</SelectItem>
                            <SelectItem value="non">Non disponible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fence-select" className="font-medium text-xs">Clôture de sécurité</Label>
                        <Select value={hasCloture} onValueChange={setHasCloture}>
                          <SelectTrigger id="fence-select"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="oui">Oui</SelectItem>
                            <SelectItem value="non">Non, terrain ouvert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="water-count" className="font-medium text-xs">Points d'eau</Label>
                        <Input
                          id="water-count"
                          type="number"
                          value={pointsEau}
                          onChange={(e) => setPointsEau(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="latrines-count" className="font-medium text-xs">Nombre de latrines</Label>
                        <Input
                          id="latrines-count"
                          type="number"
                          value={latrinesCount}
                          onChange={(e) => setLatrinesCount(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Observations & Needs */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-orange-600 uppercase tracking-wide">Besoins & Remarques du Directeur</h3>
                  <div className="space-y-2">
                    <Label htmlFor="needs-input" className="font-semibold text-xs">Besoins Urgents du Directeur</Label>
                    <Textarea
                      id="needs-input"
                      rows={3}
                      value={besoinsUrgents}
                      onChange={(e) => setBesoinsUrgents(e.target.value)}
                      placeholder="Saisissez les besoins critiques en manuels, enseignants, bâtiments..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comments-input" className="font-semibold text-xs">Observations / Remarques générales de rentrée</Label>
                    <Textarea
                      id="comments-input"
                      rows={3}
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Commentaires généraux sur la rentrée, le climat scolaire, etc..."
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveReport}
                    disabled={saving || loading}
                    className="gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-sm transition-all"
                  >
                    {saving ? 'Enregistrement en cours...' : 'Enregistrer le Rapport'}
                  </Button>
                </div>
              </CardContent>

            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
