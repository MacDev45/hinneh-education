import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/Layout';
import apiClient from '@/lib/apiClient';
import type { School, Student, ClassRoom, Evaluation, Attendance } from '@/lib/index';
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
  Plus,
  Trash2,
  BookOpen,
  Users,
  Award,
} from 'lucide-react';
import { fadeInUp } from '@/lib/motion';
import { useToast } from '@/hooks/use-toast';

export default function RapportTrimestriel() {
  const { toast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedTrimester, setSelectedTrimester] = useState<string>('1'); // 1, 2, 3
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable administrative & operational variables
  const [drena, setDrena] = useState('DRENA Abidjan 1');
  const [iepp, setIepp] = useState('IEP Cocody-Plateau');
  const [anneeScolaire, setAnneeScolaire] = useState('2025-2026');
  const [signataire, setSignataire] = useState('Kadiatou Bamba');
  const [titreSignataire, setTitreSignataire] = useState("Directeur d'Établissement");
  const [activitesPedagogiques, setActivitesPedagogiques] = useState(
    "Réunions des Conseils d'Enseignement (CE) tenues. Lancement réussi des cours de soutien scolaire pour les élèves des classes d'examens (3ème). Évaluations harmonisées réalisées conformément au calendrier régional."
  );
  const [activitesCOGES, setActivitesCOGES] = useState(
    "Assemblée générale ordinaire du Comité de Gestion Scolaire (COGES) tenue. Validation du plan d'action annuel. Rencontre de sensibilisation avec l'association des parents d'élèves."
  );
  const [tauxRecouvrement, setTauxRecouvrement] = useState('78%');
  const [difficultesRencontrees, setDifficultesRencontrees] = useState(
    "Insuffisance de manuels scolaires au collège pour les classes scientifiques. Retard de paiement de la scolarité par certains parents d'élèves, affectant le budget de fonctionnement."
  );
  const [actionsCorrectives, setActionsCorrectives] = useState(
    "Sensibilisation continue des parents d'élèves. Demande d'appui en manuels auprès de la DRENA. Réaménagement des horaires pour optimiser les salles d'études."
  );

  // Extra states for the 33-page Canevas
  const [activeChapter, setActiveChapter] = useState("garde");
  const [introduction, setIntroduction] = useState("Conformément aux directives ministérielles, le présent rapport trimestriel dresse le bilan pédagogique, administratif et de la vie scolaire de notre établissement pour ce trimestre.");
  const [fondateur, setFondateur] = useState("Fondation Hinneh");
  const [directeurEtudes, setDirecteurEtudes] = useState("M. Sidibé");
  const [contactMail, setContactMail] = useState("contact@hinneh-education.org");
  const [conseilInterieur, setConseilInterieur] = useState("Le Conseil Intérieur s'est réuni régulièrement pour valider le climat de discipline de l'établissement et superviser le déroulement des évaluations.");
  const [conseilDiscipline, setConseilDiscipline] = useState("Le Conseil de Discipline s'est tenu à deux reprises ce trimestre pour statuer sur des cas de retards répétés et d'indiscipline mineure.");
  const [activitiesParaScolaires, setActivitiesParaScolaires] = useState("Lancement des activités du club d'anglais et du club littéraire. Organisation d'un tournoi de football inter-classes.");
  
  const [listTransferts, setListTransferts] = useState<any[]>([
    { name: "Koffi Amenan Marie", matricule: "HE20260102", classe: "3ème A", dateNais: "12/04/2011", decision: "Accordé", origine: "Collège Moderne de Bouaké" }
  ]);
  const [listBoursiers, setListBoursiers] = useState<any[]>([
    { niveau: "6ème", count: 12 },
    { niveau: "5ème", count: 8 },
    { niveau: "4ème", count: 15 },
    { niveau: "3ème", count: 10 }
  ]);
  const [repartAge, setRepartAge] = useState<any[]>([
    { annee: "2013", garcons1: 15, filles1: 20, garcons2: 0, filles2: 0 },
    { annee: "2012", garcons1: 34, filles1: 42, garcons2: 0, filles2: 0 },
    { annee: "2011", garcons1: 25, filles1: 30, garcons2: 12, filles2: 8 },
    { annee: "2010", garcons1: 5, filles1: 10, garcons2: 45, filles2: 38 }
  ]);
  const [listCasSociaux, setListCasSociaux] = useState<any[]>([
    { matricule: "HE20260341", name: "Bamba Fanta", classe: "4ème B", genre: "F", motif: "Maladie prolongée (traitée)" }
  ]);
  const [enseignantsPermanents, setEnseignantsPermanents] = useState(14);
  const [enseignantsVacataires, setEnseignantsVacataires] = useState(8);
  const [repartEnseignants, setRepartEnseignants] = useState<any[]>([
    { discipline: "Mathématiques", count: 3 },
    { discipline: "Français", count: 3 },
    { discipline: "Anglais", count: 2 },
    { discipline: "Histoire-Géographie", count: 2 },
    { discipline: "Physique-Chimie", count: 2 },
    { discipline: "SVT", count: 2 },
    { discipline: "Coran / Tajwid", count: 3 },
    { discipline: "EPS", count: 1 }
  ]);
  const [personnelAdministratif, setPersonnelAdministratif] = useState<any[]>([
    { fonction: "Directeur de l'école", nom: "M. Sidibé", cnps: "CNPS-10293" },
    { fonction: "Comptable", nom: "Mme Konan", cnps: "CNPS-20391" },
    { fonction: "Éducateur de niveau", nom: "M. Touré", cnps: "CNPS-30491" }
  ]);
  const [personnelService, setPersonnelService] = useState<any[]>([
    { fonction: "Infirmier", count: 1, cnps: "CNPS-49301" },
    { fonction: "Gardien", count: 2, cnps: "CNPS-59302" },
    { fonction: "Technicien de surface", count: 3, cnps: "CNPS-69303" }
  ]);

  // === NOUVEAUX STATES (conformes xlsx 16 feuilles) ===
  const [listMajors, setListMajors] = useState<any[]>([
    { rang: 1, nom: "COULIBALY Mariame", classe: "3ème A", moyenne: "17.25", genre: "F" },
    { rang: 2, nom: "BAMBA Issouf", classe: "3ème A", moyenne: "16.80", genre: "M" },
    { rang: 3, nom: "DIALLO Aminata", classe: "6ème B", moyenne: "16.50", genre: "F" }
  ]);
  const [visitesClasses, setVisitesClasses] = useState<any[]>([
    { enseignant: "M. Coulibaly", matiere: "Mathématiques", classe: "3ème A", date: "15/10/2025", observation: "Bonne maîtrise du programme" },
    { enseignant: "Mme Traoré", matiere: "Français", classe: "5ème B", date: "22/10/2025", observation: "Méthode participative appréciée" }
  ]);
  const [formations, setFormations] = useState<any[]>([
    { intitule: "Pédagogie différenciée", date: "08/10/2025", participants: 12, organisme: "DRENA Korhogo" },
    { intitule: "Évaluation par compétences", date: "25/10/2025", participants: 8, organisme: "IEPP Korhogo-Est" }
  ]);
  const [conclusionTexte, setConclusionTexte] = useState(
    "En définitive, ce premier trimestre a été marqué par une dynamique positive, tant sur le plan pédagogique qu'administratif. Les résultats encourageants obtenus témoignent de l'engagement de l'ensemble de la communauté éducative. Des efforts soutenus restent nécessaires pour consolider ces acquis et améliorer les taux de réussite lors des prochaines évaluations."
  );


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

  // Fetch school details and report when selected school, trimester or academic year changes
  useEffect(() => {
    if (!selectedSchoolId) return;

    setLoading(true);
    const ecoleId = parseInt(selectedSchoolId, 10);
    const trim = parseInt(selectedTrimester, 10);

    Promise.all([
      apiClient.getStudents({ ecole_id: ecoleId }),
      apiClient.getClasses({ ecole_id: ecoleId }),
      apiClient.getEvaluations(),
      apiClient.getAttendance(),
      apiClient.getRapportTrimestriel(ecoleId, trim, anneeScolaire).catch((_err: any): any => null),
    ])
      .then(([studentsData, classesData, evalData, attData, reportData]) => {
        setStudents(studentsData);
        setClasses(classesData);

        const classIds = classesData.map((c) => c.id);
        const filteredEvals = evalData.filter((ev) => classIds.includes(ev.classId));
        const filteredAtts = attData.filter((at) => classIds.includes(at.classId));

        setEvaluations(filteredEvals);
        setAttendance(filteredAtts);

        if (reportData) {
          setDrena(reportData.drena ?? '');
          setIepp(reportData.iepp ?? '');
          setSignataire(reportData.signataire ?? '');
          setTitreSignataire(reportData.titre_signataire ?? '');
          setActivitesPedagogiques(reportData.activites_pedagogiques ?? '');
          setActivitesCOGES(reportData.activites_coges ?? '');
          setTauxRecouvrement(reportData.taux_recouvrement ?? '');
          setDifficultesRencontrees(reportData.difficultes_rencontrees ?? '');
          setActionsCorrectives(reportData.actions_correctives ?? '');
          
          if (reportData.canevas_data) {
            let cd = reportData.canevas_data;
            if (typeof cd === 'string') {
              try {
                cd = JSON.parse(cd);
              } catch (e) {
                console.error("Failed to parse canevas_data JSON", e);
              }
            }
            if (cd && typeof cd === 'object') {
              if (cd.introduction) setIntroduction(cd.introduction);
              if (cd.fondateur) setFondateur(cd.fondateur);
              if (cd.directeurEtudes) setDirecteurEtudes(cd.directeurEtudes);
              if (cd.contactMail) setContactMail(cd.contactMail);
              if (cd.conseilInterieur) setConseilInterieur(cd.conseilInterieur);
              if (cd.conseilDiscipline) setConseilDiscipline(cd.conseilDiscipline);
              if (cd.activitiesParaScolaires) setActivitiesParaScolaires(cd.activitiesParaScolaires);
              if (cd.listTransferts) setListTransferts(cd.listTransferts);
              if (cd.listBoursiers) setListBoursiers(cd.listBoursiers);
              if (cd.repartAge) setRepartAge(cd.repartAge);
              if (cd.listCasSociaux) setListCasSociaux(cd.listCasSociaux);
              if (cd.enseignantsPermanents !== undefined) setEnseignantsPermanents(cd.enseignantsPermanents);
              if (cd.enseignantsVacataires !== undefined) setEnseignantsVacataires(cd.enseignantsVacataires);
              if (cd.repartEnseignants) setRepartEnseignants(cd.repartEnseignants);
              if (cd.personnelAdministratif) setPersonnelAdministratif(cd.personnelAdministratif);
              if (cd.personnelService) setPersonnelService(cd.personnelService);
              // Nouvelles données
              if (cd.listMajors) setListMajors(cd.listMajors);
              if (cd.visitesClasses) setVisitesClasses(cd.visitesClasses);
              if (cd.formations) setFormations(cd.formations);
              if (cd.conclusionTexte) setConclusionTexte(cd.conclusionTexte);
            }
          }
        } else {
          // Default fallbacks
          setDrena('DRENA Abidjan 1');
          setIepp('IEP Cocody-Plateau');
          setSignataire('Kadiatou Bamba');
          setTitreSignataire("Directeur d'Établissement");
          setActivitesPedagogiques(
            "Réunions des Conseils d'Enseignement (CE) tenues. Lancement réussi des cours de soutien scolaire pour les élèves des classes d'examens (3ème). Évaluations harmonisées réalisées conformément au calendrier régional."
          );
          setActivitesCOGES(
            "Assemblée générale ordinaire du Comité de Gestion Scolaire (COGES) tenue. Validation du plan d'action annuel. Rencontre de sensibilisation avec l'association des parents d'élèves."
          );
          setTauxRecouvrement('78%');
          setDifficultesRencontrees(
            "Insuffisance de manuels scolaires au collège pour les classes scientifiques. Retard de paiement de la scolarité par certains parents d'élèves, affectant le budget de fonctionnement."
          );
          setActionsCorrectives(
            "Sensibilisation continue des parents d'élèves. Demande d'appui en manuels auprès de la DRENA. Réaménagement des horaires pour optimiser les salles d'études."
          );
        }
      })
      .catch((err) => console.error("Error fetching trimester statistics", err))
      .finally(() => setLoading(false));
  }, [selectedSchoolId, selectedTrimester, anneeScolaire]);


  // Find currently selected school
  const currentSchool = useMemo(() => {
    return schools.find((s) => s.id === selectedSchoolId);
  }, [schools, selectedSchoolId]);

  // Compile academic and attendance statistics by class for the selected trimester
  const classReports = useMemo(() => {
    const trimesterNum = parseInt(selectedTrimester, 10);

    return classes.map((cls) => {
      // Find students in this class
      const classStudents = students.filter((s) => s.classId === cls.id);

      // Find evaluations for this class in this trimester
      const classEvals = evaluations.filter(
        (ev) => ev.classId === cls.id && ev.trimester === trimesterNum
      );

      // Group evaluations by student to compute average grade per student
      const studentGrades: Record<string, { totalPoints: number; totalCoeff: number }> = {};
      classStudents.forEach((stud) => {
        studentGrades[stud.id] = { totalPoints: 0, totalCoeff: 0 };
      });

      classEvals.forEach((ev) => {
        if (studentGrades[ev.studentId] !== undefined) {
          studentGrades[ev.studentId].totalPoints += ev.note * ev.coefficient;
          studentGrades[ev.studentId].totalCoeff += ev.coefficient;
        }
      });

      // Compute averages
      let totalMoyennePoints = 0;
      let ratedStudentsCount = 0;
      let studentsPassedCount = 0;
      let highestMoyenne = 0;
      let lowestMoyenne = 20;

      Object.entries(studentGrades).forEach(([_, data]) => {
        if (data.totalCoeff > 0) {
          const moyenne = data.totalPoints / data.totalCoeff;
          totalMoyennePoints += moyenne;
          ratedStudentsCount += 1;

          if (moyenne >= 10) {
            studentsPassedCount += 1;
          }

          if (moyenne > highestMoyenne) highestMoyenne = moyenne;
          if (moyenne < lowestMoyenne) lowestMoyenne = moyenne;
        }
      });

      const avgClass = ratedStudentsCount > 0 ? (totalMoyennePoints / ratedStudentsCount) : 0;
      const tauxReussite = ratedStudentsCount > 0 ? (studentsPassedCount / ratedStudentsCount) * 100 : 0;
      const displayLowest = ratedStudentsCount > 0 ? lowestMoyenne : 0;

      // Absences count in this class for the trimester
      // Here we filter attendance by status 'absent'
      const classAbsencesCount = attendance.filter(
        (at) => at.classId === cls.id && at.status === 'absent'
      ).length;

      return {
        classId: cls.id,
        className: cls.name,
        niveau: cls.niveau,
        effectif: classStudents.length,
        classés: ratedStudentsCount,
        moyenneGenerale: parseFloat(avgClass.toFixed(2)),
        tauxReussite: parseFloat(tauxReussite.toFixed(1)),
        plusForteMoyenne: parseFloat(highestMoyenne.toFixed(2)),
        plusFaibleMoyenne: parseFloat(displayLowest.toFixed(2)),
        absences: classAbsencesCount,
      };
    });
  }, [classes, students, evaluations, attendance, selectedTrimester]);

  const handleSaveReport = async () => {
    if (!selectedSchoolId) return;
    setSaving(true);
    try {
      const ecoleId = parseInt(selectedSchoolId, 10);
      const trim = parseInt(selectedTrimester, 10);
      const payload = {
        trimestre: trim,
        annee_scolaire: anneeScolaire,
        drena,
        iepp,
        signataire,
        titre_signataire: titreSignataire,
        activites_pedagogiques: activitesPedagogiques,
        activites_coges: activitesCOGES,
        taux_recouvrement: tauxRecouvrement,
        difficultes_rencontrees: difficultesRencontrees,
        actions_correctives: actionsCorrectives,
        canevas_data: {
          introduction,
          fondateur,
          directeurEtudes,
          contactMail,
          conseilInterieur,
          conseilDiscipline,
          activitiesParaScolaires,
          listTransferts,
          listBoursiers,
          repartAge,
          listCasSociaux,
          enseignantsPermanents,
          enseignantsVacataires,
          repartEnseignants,
          personnelAdministratif,
          personnelService,
          listMajors,
          visitesClasses,
          formations,
          conclusionTexte
        }
      };
      await apiClient.saveRapportTrimestriel(ecoleId, payload);
      toast({
        title: "Rapport enregistré",
        description: `Le rapport du trimestre ${trim} a été enregistré avec succès en base de données.`,
      });
    } catch (err) {
      console.error("Failed to save RapportTrimestriel", err);
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
    const title = `Rapport_Trimestriel_T${selectedTrimester}_${currentSchool?.name || 'Ecole'}_${anneeScolaire}`.replace(/\s+/g, '_');
    const tableHeader = `
      <tr>
        <th style="background-color: #f2f2f2; border: 1px solid #000; font-weight: bold; text-align: left; padding: 5px;">Classe</th>
        <th style="background-color: #f2f2f2; border: 1px solid #000; font-weight: bold; text-align: center; padding: 5px;">Niveau</th>
        <th style="background-color: #f2f2f2; border: 1px solid #000; font-weight: bold; text-align: center; padding: 5px;">Effectif</th>
        <th style="background-color: #f2f2f2; border: 1px solid #000; font-weight: bold; text-align: center; padding: 5px;">Classés</th>
        <th style="background-color: #f2f2f2; border: 1px solid #000; font-weight: bold; text-align: center; padding: 5px;">Moy. Générale</th>
        <th style="background-color: #f2f2f2; border: 1px solid #000; font-weight: bold; text-align: center; padding: 5px;">Taux Réussite (%)</th>
        <th style="background-color: #f2f2f2; border: 1px solid #000; font-weight: bold; text-align: center; padding: 5px;">Forte Moyenne</th>
        <th style="background-color: #f2f2f2; border: 1px solid #000; font-weight: bold; text-align: center; padding: 5px;">Faible Moyenne</th>
        <th style="background-color: #f2f2f2; border: 1px solid #000; font-weight: bold; text-align: center; padding: 5px;">Absences (jours)</th>
      </tr>
    `;

    const tableRows = classReports.map(cr => `
      <tr>
        <td style="border: 1px solid #000; padding: 5px;">${cr.className}</td>
        <td style="border: 1px solid #000; text-align: center; padding: 5px;">${cr.niveau}</td>
        <td style="border: 1px solid #000; text-align: center; padding: 5px;">${cr.effectif}</td>
        <td style="border: 1px solid #000; text-align: center; padding: 5px;">${cr.classés}</td>
        <td style="border: 1px solid #000; text-align: center; padding: 5px;">${cr.moyenneGenerale}</td>
        <td style="border: 1px solid #000; text-align: center; padding: 5px;">${cr.tauxReussite}%</td>
        <td style="border: 1px solid #000; text-align: center; padding: 5px;">${cr.plusForteMoyenne}</td>
        <td style="border: 1px solid #000; text-align: center; padding: 5px;">${cr.plusFaibleMoyenne}</td>
        <td style="border: 1px solid #000; text-align: center; padding: 5px;">${cr.absences}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      </head>
      <body>
        <h2>RAPPORT TRIMESTRIEL D'ACTIVITÉ (TRIMESTRE ${selectedTrimester})</h2>
        <h3>Etablissement: ${currentSchool?.name || '—'}</h3>
        <p>Année Scolaire: ${anneeScolaire} | DRENA: ${drena} | IEPP: ${iepp}</p>
        <br/>
        <table style="border-collapse: collapse; border: 1px solid #000;">
          <thead>
            ${tableHeader}
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <br/>
        <h3>III. Activités Pédagogiques</h3>
        <p>${activitesPedagogiques}</p>
        <br/>
        <h3>IV. Vie Scolaire & COGES</h3>
        <p>${activitesCOGES}</p>
        <p><b>Taux de recouvrement scolarité:</b> ${tauxRecouvrement}</p>
        <br/>
        <h3>V. Bilan opérationnel</h3>
        <p><b>Difficultés:</b> ${difficultesRencontrees}</p>
        <p><b>Actions Correctives:</b> ${actionsCorrectives}</p>
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
    const title = `Rapport_Trimestriel_T${selectedTrimester}_${currentSchool?.name || 'Ecole'}_${anneeScolaire}`.replace(/\s+/g, '_');
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
      {/* CSS overrides specific for printing this report as a multi-page book */}
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
            padding: 0;
            background: #fff !important;
            color: #000 !important;
            font-size: 11pt;
          }
          .print-page {
            page-break-after: always;
            min-height: 297mm;
            padding: 2.5cm 2cm;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
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
              Rapport Trimestriel d'Activité
            </h1>
            <p className="text-muted-foreground mt-1">
              Générez, éditez et imprimez l'intégralité du rapport trimestriel officiel du Ministère.
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
              Sélectionnez l'établissement, le trimestre cible et ajustez les variables régionales.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                <Label htmlFor="trimester-select" className="font-semibold text-sm">Trimestre Cible</Label>
                <Select value={selectedTrimester} onValueChange={setSelectedTrimester}>
                  <SelectTrigger id="trimester-select" className="w-full bg-background border-border">
                    <SelectValue placeholder="Choisir un trimestre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1er Trimestre</SelectItem>
                    <SelectItem value="2">2ème Trimestre</SelectItem>
                    <SelectItem value="3">3ème Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="drena-input" className="font-semibold text-sm">DRENA</Label>
                <Input
                  id="drena-input"
                  value={drena}
                  onChange={(e) => setDrena(e.target.value)}
                  placeholder="Ex: DRENA Abidjan 1"
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="iepp-input" className="font-semibold text-sm">IEPP</Label>
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
                L'aperçu compile les 4 chapitres de la maquette de 33 pages. Chaque chapitre débutera sur une nouvelle page à l'impression.
              </span>
            </div>

            {/* Document Print Area */}
            <div id="print-area" className="max-w-4xl mx-auto space-y-8">
              
              {/* PAGE 1: COVER PAGE */}
              <div className="print-page bg-card text-card-foreground border border-border/80 rounded-2xl shadow-xl p-12 font-serif min-h-[1050px] flex flex-col justify-between">
                <div className="flex justify-between items-start text-sm">
                  <div className="text-left space-y-1">
                    <p className="font-bold uppercase tracking-wider text-xs">Ministère de l'Éducation Nationale</p>
                    <p className="font-bold uppercase tracking-wider text-xs">et de l'Alphabétisation</p>
                    <p className="font-medium text-xs">----------------------------------------</p>
                    <p className="font-semibold">{drena}</p>
                    <p className="font-semibold">{iepp}</p>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-bold uppercase tracking-widest text-xs">République de Côte d'Ivoire</p>
                    <p className="italic text-xs font-medium">Union - Discipline - Travail</p>
                    <p className="font-medium text-xs">----------------------------------------</p>
                    <p className="font-semibold text-gray-700">Année Scolaire: <span className="font-bold">{anneeScolaire}</span></p>
                  </div>
                </div>

                <div className="text-center my-auto space-y-6 py-12">
                  <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Building2 className="h-12 w-12 text-primary" />
                  </div>
                  <h1 className="text-4xl font-extrabold uppercase tracking-wide border-y-2 border-black py-6 font-sans">
                    RAPPORT TRIMESTRIEL D'ACTIVITÉ
                  </h1>
                  <h2 className="text-2xl font-bold uppercase tracking-widest text-orange-600 font-sans">
                    {selectedTrimester === '1' ? '1er Trimestre' : `${selectedTrimester}ème Trimestre`}
                  </h2>
                  <div className="text-lg space-y-2 pt-6">
                    <p>Établissement : <strong className="font-bold">{currentSchool?.name || '—'}</strong></p>
                    <p>Code Établissement : <strong className="font-mono">{currentSchool?.code || '—'}</strong></p>
                    <p>Ville / Localité : <strong>{currentSchool?.city || '—'}</strong></p>
                  </div>
                </div>

                <div className="border-t pt-6 text-sm flex justify-between items-end">
                  <div>
                    <p>Fondateur : <strong>{fondateur}</strong></p>
                    <p>Directeur : <strong>{directeurEtudes}</strong></p>
                  </div>
                  <div className="text-right">
                    <p>Contact : <strong>{contactMail}</strong></p>
                    <p>Date d'édition : <strong>{formatDate(new Date())}</strong></p>
                  </div>
                </div>
              </div>

              {/* PAGE 2: SOMMAIRE & IDENTITÉ */}
              <div className="print-page bg-card text-card-foreground border border-border/80 rounded-2xl shadow-xl p-12 font-serif min-h-[1050px] space-y-8">
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold uppercase tracking-wider font-sans">Sommaire & Introduction</h2>
                </div>

                <div className="space-y-4">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">Sommaire du Document</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between"><span>IDENTITÉ DE L'ÉTABLISSEMENT</span><span className="font-mono">page 3</span></li>
                    <li className="flex justify-between"><span>INTRODUCTION GÉNÉRALE</span><span className="font-mono">page 4</span></li>
                    <li className="flex justify-between"><span>CHAPITRE I : VIE PÉDAGOGIQUE ET RÉSULTATS SCOLAIRES</span><span className="font-mono">page 5</span></li>
                    <li className="flex justify-between"><span>CHAPITRE II : EFFECTIFS ET PYRAMIDES</span><span className="font-mono">page 23</span></li>
                    <li className="flex justify-between"><span>CHAPITRE III : VIE SCOLAIRE</span><span className="font-mono">page 29</span></li>
                    <li className="flex justify-between"><span>CHAPITRE IV : PERSONNELS ENSEIGNANT ET ADMINISTRATIF</span><span className="font-mono">page 30</span></li>
                    <li className="flex justify-between"><span>CONCLUSION ET PERSPECTIVES</span><span className="font-mono">page 33</span></li>
                  </ul>
                </div>

                <div className="space-y-4 pt-6">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">Identité de l'Établissement</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-semibold">Dénomination :</span> {currentSchool?.name}</div>
                    <div><span className="font-semibold">Code officiel :</span> {currentSchool?.code}</div>
                    <div><span className="font-semibold">Région :</span> {currentSchool?.region}</div>
                    <div><span className="font-semibold">Ville :</span> {currentSchool?.city}</div>
                    <div><span className="font-semibold">Adresse Postale :</span> {currentSchool?.address || 'Non spécifiée'}</div>
                    <div><span className="font-semibold">Cycles autorisés :</span> <span className="capitalize">{currentSchool?.cycles.join(', ')}</span></div>
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">Introduction Générale</h3>
                  <p className="text-sm leading-relaxed text-justify italic">
                    "{introduction}"
                  </p>
                </div>
              </div>

              {/* PAGE 3: CHAPITRE I - VIE PEDAGOGIQUE */}
              <div className="print-page bg-card text-card-foreground border border-border/80 rounded-2xl shadow-xl p-12 font-serif min-h-[1050px] space-y-8">
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold uppercase tracking-wider font-sans">Chapitre I : Vie Pédagogique et Résultats Scolaires</h2>
                </div>

                <div className="space-y-4">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">A/ Vie Pédagogique</h3>
                  <p className="text-sm leading-relaxed text-justify">
                    {activitesPedagogiques}
                  </p>
                </div>

                <div className="space-y-4 pt-6">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">B/ Bilan Académique par Classe (Trimestre {selectedTrimester})</h3>
                  <table className="w-full text-xs border border-black border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-left font-bold">Classe</th>
                        <th className="border border-black p-2 text-center font-bold">G</th>
                        <th className="border border-black p-2 text-center font-bold">F</th>
                        <th className="border border-black p-2 text-center font-bold">Total</th>
                        <th className="border border-black p-2 text-center font-bold">Classés</th>
                        <th className="border border-black p-2 text-center font-bold">Moy. Classe</th>
                        <th className="border border-black p-2 text-center font-bold">% Admis</th>
                        <th className="border border-black p-2 text-center font-bold">% Refusés</th>
                        <th className="border border-black p-2 text-center font-bold">+ Forte Moy.</th>
                        <th className="border border-black p-2 text-center font-bold">+ Faible Moy.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classReports.map((cr) => {
                        const classStudents = students.filter(s => s.classId === cr.classId);
                        const garcons = classStudents.filter(s => (s.genre || s.gender || '').toUpperCase() === 'M' || (s.genre || s.gender || '').toUpperCase() === 'G').length;
                        const filles = classStudents.length - garcons;
                        const tauxRefus = cr.classés > 0 ? parseFloat((100 - cr.tauxReussite).toFixed(1)) : 0;
                        return (
                          <tr key={cr.classId}>
                            <td className="border border-black p-2 font-medium">{cr.className}</td>
                            <td className="border border-black p-2 text-center font-mono">{garcons}</td>
                            <td className="border border-black p-2 text-center font-mono">{filles}</td>
                            <td className="border border-black p-2 text-center font-bold font-mono">{cr.effectif}</td>
                            <td className="border border-black p-2 text-center font-mono">{cr.classés}</td>
                            <td className="border border-black p-2 text-center font-bold font-mono">{cr.moyenneGenerale}</td>
                            <td className="border border-black p-2 text-center font-bold font-mono text-green-700">{cr.tauxReussite}%</td>
                            <td className="border border-black p-2 text-center font-bold font-mono text-red-600">{tauxRefus}%</td>
                            <td className="border border-black p-2 text-center font-mono text-green-600">{cr.plusForteMoyenne}</td>
                            <td className="border border-black p-2 text-center font-mono text-red-600">{cr.plusFaibleMoyenne}</td>
                          </tr>
                        );
                      })}
                      {classReports.length > 0 && (
                        <tr className="bg-gray-100 font-bold">
                          <td className="border border-black p-2">TOTAL GÉNÉRAL</td>
                          <td className="border border-black p-2 text-center font-mono">
                            {classReports.reduce((acc, cr) => {
                              const cs = students.filter(s => s.classId === cr.classId);
                              return acc + cs.filter(s => (s.genre || s.gender || '').toUpperCase() === 'M' || (s.genre || s.gender || '').toUpperCase() === 'G').length;
                            }, 0)}
                          </td>
                          <td className="border border-black p-2 text-center font-mono">
                            {classReports.reduce((acc, cr) => {
                              const cs = students.filter(s => s.classId === cr.classId);
                              const g = cs.filter(s => (s.genre || s.gender || '').toUpperCase() === 'M' || (s.genre || s.gender || '').toUpperCase() === 'G').length;
                              return acc + (cs.length - g);
                            }, 0)}
                          </td>
                          <td className="border border-black p-2 text-center font-mono">{classReports.reduce((acc, cr) => acc + cr.effectif, 0)}</td>
                          <td className="border border-black p-2 text-center font-mono">{classReports.reduce((acc, cr) => acc + cr.classés, 0)}</td>
                          <td className="border border-black p-2 text-center">
                            {classReports.length > 0 ? parseFloat((classReports.reduce((acc, cr) => acc + cr.moyenneGenerale, 0) / classReports.length).toFixed(2)) : '—'}
                          </td>
                          <td className="border border-black p-2 text-center text-green-700">
                            {classReports.length > 0 ? parseFloat((classReports.reduce((acc, cr) => acc + cr.tauxReussite, 0) / classReports.length).toFixed(1) ) : '—'}%
                          </td>
                          <td className="border border-black p-2 text-center text-red-600">
                            {classReports.length > 0 ? parseFloat((classReports.reduce((acc, cr) => acc + (100 - cr.tauxReussite), 0) / classReports.length).toFixed(1)) : '—'}%
                          </td>
                          <td className="border border-black p-2 text-center">{Math.max(...classReports.map(cr => cr.plusForteMoyenne)) || '—'}</td>
                          <td className="border border-black p-2 text-center">{Math.min(...classReports.map(cr => cr.plusFaibleMoyenne)) || '—'}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* LISTE DES MAJORS */}
                <div className="space-y-4 pt-6">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">C/ Liste des Majors de Promotion (Trimestre {selectedTrimester})</h3>
                  <table className="w-full text-xs border border-black border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-center font-bold">Rang</th>
                        <th className="border border-black p-2 text-left font-bold">Nom et Prénoms</th>
                        <th className="border border-black p-2 text-center font-bold">Classe</th>
                        <th className="border border-black p-2 text-center font-bold">Genre</th>
                        <th className="border border-black p-2 text-center font-bold">Moyenne</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listMajors.map((m, idx) => (
                        <tr key={idx} className={idx === 0 ? 'bg-yellow-50' : ''}>
                          <td className="border border-black p-2 text-center font-bold font-mono">{m.rang}</td>
                          <td className="border border-black p-2 font-semibold uppercase">{m.nom}</td>
                          <td className="border border-black p-2 text-center">{m.classe}</td>
                          <td className="border border-black p-2 text-center">{m.genre}</td>
                          <td className="border border-black p-2 text-center font-bold font-mono text-green-700">{m.moyenne}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* VISITES DE CLASSES */}
                <div className="space-y-4 pt-6">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">D/ Visites de Classes Effectuées</h3>
                  <table className="w-full text-xs border border-black border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-left font-bold">Enseignant visité</th>
                        <th className="border border-black p-2 text-center font-bold">Matière</th>
                        <th className="border border-black p-2 text-center font-bold">Classe</th>
                        <th className="border border-black p-2 text-center font-bold">Date</th>
                        <th className="border border-black p-2 text-left font-bold">Observation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitesClasses.map((v, idx) => (
                        <tr key={idx}>
                          <td className="border border-black p-2 font-medium">{v.enseignant}</td>
                          <td className="border border-black p-2 text-center">{v.matiere}</td>
                          <td className="border border-black p-2 text-center">{v.classe}</td>
                          <td className="border border-black p-2 text-center font-mono">{v.date}</td>
                          <td className="border border-black p-2 italic text-gray-700">{v.observation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* FORMATIONS */}
                <div className="space-y-4 pt-6">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">E/ Formations et Perfectionnements</h3>
                  <table className="w-full text-xs border border-black border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-left font-bold">Intitulé de la Formation</th>
                        <th className="border border-black p-2 text-center font-bold">Date</th>
                        <th className="border border-black p-2 text-center font-bold">Participants</th>
                        <th className="border border-black p-2 text-left font-bold">Organisme</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formations.map((f, idx) => (
                        <tr key={idx}>
                          <td className="border border-black p-2 font-medium">{f.intitule}</td>
                          <td className="border border-black p-2 text-center font-mono">{f.date}</td>
                          <td className="border border-black p-2 text-center font-mono">{f.participants}</td>
                          <td className="border border-black p-2">{f.organisme}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PAGE 4: CHAPITRE II - EFFECTIFS & PYRAMIDES */}
              <div className="print-page bg-card text-card-foreground border border-border/80 rounded-2xl shadow-xl p-12 font-serif min-h-[1050px] space-y-8">
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold uppercase tracking-wider font-sans">Chapitre II : Effectifs et Pyramides</h2>
                </div>

                <div className="space-y-4">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">A/ Liste des Transferts d'Élèves (Entrées/Sorties)</h3>
                  <table className="w-full text-xs border border-black border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-left font-bold">Nom & Prénoms</th>
                        <th className="border border-black p-2 text-center font-bold">Matricule</th>
                        <th className="border border-black p-2 text-center font-bold">Classe</th>
                        <th className="border border-black p-2 text-center font-bold">Décision</th>
                        <th className="border border-black p-2 text-left font-bold">Établissement d'Origine</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listTransferts.map((t, idx) => (
                        <tr key={idx}>
                          <td className="border border-black p-2 font-medium">{t.name}</td>
                          <td className="border border-black p-2 text-center font-mono">{t.matricule}</td>
                          <td className="border border-black p-2 text-center">{t.classe}</td>
                          <td className="border border-black p-2 text-center font-bold">{t.decision}</td>
                          <td className="border border-black p-2">{t.origine}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4 pt-6">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">B/ Répartition des Effectifs par Année de Naissance</h3>
                  <table className="w-full text-xs border border-black border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-center font-bold">Année</th>
                        <th className="border border-black p-2 text-center font-bold">Premier Cycle (G)</th>
                        <th className="border border-black p-2 text-center font-bold">Premier Cycle (F)</th>
                        <th className="border border-black p-2 text-center font-bold">Second Cycle (G)</th>
                        <th className="border border-black p-2 text-center font-bold">Second Cycle (F)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repartAge.map((r, idx) => (
                        <tr key={idx}>
                          <td className="border border-black p-2 text-center font-bold font-mono">{r.annee}</td>
                          <td className="border border-black p-2 text-center font-mono">{r.garcons1}</td>
                          <td className="border border-black p-2 text-center font-mono">{r.filles1}</td>
                          <td className="border border-black p-2 text-center font-mono">{r.garcons2}</td>
                          <td className="border border-black p-2 text-center font-mono">{r.filles2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4 pt-6">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">C/ Liste des Boursiers de l'Établissement</h3>
                  <table className="w-full text-xs border border-black border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-left font-bold">Niveau</th>
                        <th className="border border-black p-2 text-center font-bold">Nombre de Boursiers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listBoursiers.map((b, idx) => (
                        <tr key={idx}>
                          <td className="border border-black p-2 font-medium">{b.niveau}</td>
                          <td className="border border-black p-2 text-center font-mono font-bold">{b.count} élèves</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PAGE 5: CHAPITRE III - VIE SCOLAIRE */}
              <div className="print-page bg-card text-card-foreground border border-border/80 rounded-2xl shadow-xl p-12 font-serif min-h-[1050px] space-y-8">
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold uppercase tracking-wider font-sans">Chapitre III : Vie Scolaire</h2>
                </div>

                <div className="space-y-4">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">A/ Activités de Discipline & Encadrement</h3>
                  <div className="space-y-3">
                    <p className="text-sm"><strong>Conseil Intérieur :</strong> {conseilInterieur}</p>
                    <p className="text-sm"><strong>Conseil de Discipline :</strong> {conseilDiscipline}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">B/ Cas Sociaux et Abandons Scolaires</h3>
                  <table className="w-full text-xs border border-black border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-left font-bold">Nom & Prénoms</th>
                        <th className="border border-black p-2 text-center font-bold">Matricule</th>
                        <th className="border border-black p-2 text-center font-bold">Classe</th>
                        <th className="border border-black p-2 text-center font-bold">Genre</th>
                        <th className="border border-black p-2 text-left font-bold">Motif / Observation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listCasSociaux.map((cs, idx) => (
                        <tr key={idx}>
                          <td className="border border-black p-2 font-medium">{cs.name}</td>
                          <td className="border border-black p-2 text-center font-mono">{cs.matricule}</td>
                          <td className="border border-black p-2 text-center">{cs.classe}</td>
                          <td className="border border-black p-2 text-center font-bold">{cs.genre}</td>
                          <td className="border border-black p-2 italic">{cs.motif}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4 pt-6">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">C/ Activités Parascolaires et d'Animation</h3>
                  <p className="text-sm leading-relaxed text-justify">
                    {activitiesParaScolaires}
                  </p>
                </div>
              </div>

              {/* PAGE 6: CHAPITRE IV - PERSONNELS & CONCLUSION */}
              <div className="print-page bg-card text-card-foreground border border-border/80 rounded-2xl shadow-xl p-12 font-serif min-h-[1050px] space-y-8">
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold uppercase tracking-wider font-sans">Chapitre IV : Personnels & Bilan</h2>
                </div>

                <div className="space-y-4">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">A/ Personnel Enseignant</h3>
                  <p className="text-sm">Permanents : <strong>{enseignantsPermanents}</strong> | Vacataires : <strong>{enseignantsVacataires}</strong> | Total : <strong>{enseignantsPermanents + enseignantsVacataires}</strong></p>
                  <table className="w-full text-xs border border-black border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-left font-bold">Discipline</th>
                        <th className="border border-black p-2 text-center font-bold">Nombre d'Enseignants</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repartEnseignants.map((re, idx) => (
                        <tr key={idx}>
                          <td className="border border-black p-2 font-medium">{re.discipline}</td>
                          <td className="border border-black p-2 text-center font-mono font-bold">{re.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4 pt-6">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">B/ Bilan Opérationnel – Difficultés & Actions Correctives</h3>
                  <div className="space-y-3 text-sm">
                    <p><strong>Difficultés Rencontrees :</strong> {difficultesRencontrees}</p>
                    <p><strong>Actions Correctives :</strong> {actionsCorrectives}</p>
                    <p><strong>Taux de Recouvrement Scolarité :</strong> <span className="font-mono font-bold text-green-700">{tauxRecouvrement}</span></p>
                  </div>
                </div>

                {/* CONCLUSION & PERSPECTIVES */}
                <div className="space-y-4 pt-8">
                  <h3 className="text-md font-bold uppercase border-b pb-1 font-sans">C/ Conclusion et Perspectives</h3>
                  <p className="text-sm leading-relaxed text-justify italic">{conclusionTexte}</p>
                </div>

                {/* SIGNATURES SECTION */}
                <div className="mt-16 flex justify-between items-center text-xs pt-8">
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

            </div>
          </TabsContent>

          {/* TAB 2: EDIT FORM (CHAPTER BY CHAPTER SIDEBAR) */}
          <TabsContent value="edit">
            <Card className="border border-border/80 shadow-md">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-lg">Éditeur du Canevas Trimestriel</CardTitle>
                <CardDescription>
                  Saisissez les données qualitatives et physiques dans les différents chapitres du canevas trimestriel.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left Navigation bar of Chapters */}
                  <div className="w-full md:w-64 shrink-0 flex flex-col gap-1 border-r pr-4">
                    <Button 
                      variant={activeChapter === "garde" ? "default" : "ghost"}
                      onClick={() => setActiveChapter("garde")}
                      className="justify-start font-semibold text-sm"
                    >
                      Page de Garde & Identité
                    </Button>
                    <Button 
                      variant={activeChapter === "chapitre1" ? "default" : "ghost"}
                      onClick={() => setActiveChapter("chapitre1")}
                      className="justify-start font-semibold text-sm animate-pulse"
                    >
                      Ch. I : Vie Pédagogique
                    </Button>
                    <Button 
                      variant={activeChapter === "chapitre2" ? "default" : "ghost"}
                      onClick={() => setActiveChapter("chapitre2")}
                      className="justify-start font-semibold text-sm"
                    >
                      Ch. II : Effectifs & Pyramides
                    </Button>
                    <Button 
                      variant={activeChapter === "chapitre3" ? "default" : "ghost"}
                      onClick={() => setActiveChapter("chapitre3")}
                      className="justify-start font-semibold text-sm"
                    >
                      Ch. III : Vie Scolaire
                    </Button>
                    <Button 
                      variant={activeChapter === "chapitre4" ? "default" : "ghost"}
                      onClick={() => setActiveChapter("chapitre4")}
                      className="justify-start font-semibold text-sm"
                    >
                      Ch. IV : Personnels Enseignants
                    </Button>
                    <Button 
                      variant={activeChapter === "conclusion" ? "default" : "ghost"}
                      onClick={() => setActiveChapter("conclusion")}
                      className="justify-start font-semibold text-sm"
                    >
                      Bilan & Conclusion
                    </Button>
                  </div>

                  {/* Right Form Fields Area */}
                  <div className="flex-1 space-y-6">
                    
                    {activeChapter === "garde" && (
                      <div className="space-y-4">
                        <h3 className="font-bold text-sm text-orange-600 uppercase tracking-wide">Page de Garde & Identité</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="school-year-input">Année Scolaire</Label>
                            <Input id="school-year-input" value={anneeScolaire} onChange={(e) => setAnneeScolaire(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="founder-input">Dénomination Fondateur</Label>
                            <Input id="founder-input" value={fondateur} onChange={(e) => setFondateur(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="director-input">Directeur</Label>
                            <Input id="director-input" value={directeurEtudes} onChange={(e) => setDirecteurEtudes(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contact-mail-input">Email Contact</Label>
                            <Input id="contact-mail-input" value={contactMail} onChange={(e) => setContactMail(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="signee-name-input">Signataire Principal</Label>
                            <Input id="signee-name-input" value={signataire} onChange={(e) => setSignataire(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="signee-title-input">Titre Signataire</Label>
                            <Input id="signee-title-input" value={titreSignataire} onChange={(e) => setTitreSignataire(e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="introduction-input">Introduction Générale du Rapport</Label>
                          <Textarea id="introduction-input" rows={4} value={introduction} onChange={(e) => setIntroduction(e.target.value)} />
                        </div>
                      </div>
                    )}

                    {activeChapter === "chapitre1" && (
                      <div className="space-y-4">
                        <h3 className="font-bold text-sm text-orange-600 uppercase tracking-wide">Chapitre I : Vie Pédagogique</h3>
                        <div className="space-y-2">
                          <Label htmlFor="pedagogy-activities">Activités Pédagogiques Réalisées (Réunions de CE, devoirs...)</Label>
                          <Textarea id="pedagogy-activities" rows={6} value={activitesPedagogiques} onChange={(e) => setActivitesPedagogiques(e.target.value)} />
                        </div>
                      </div>
                    )}

                    {activeChapter === "chapitre2" && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-bold text-sm text-orange-600 uppercase tracking-wide mb-3">A/ Liste des Transferts d'Élèves</h3>
                          <table className="w-full text-xs border border-collapse border-border">
                            <thead>
                              <tr className="bg-muted">
                                <th className="border p-2 text-left">Nom & Prénoms</th>
                                <th className="border p-2">Matricule</th>
                                <th className="border p-2">Classe</th>
                                <th className="border p-2">Origine</th>
                                <th className="border p-2 w-12">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {listTransferts.map((t, idx) => (
                                <tr key={idx}>
                                  <td className="border p-1">
                                    <Input value={t.name} onChange={(e) => {
                                      const updated = [...listTransferts];
                                      updated[idx].name = e.target.value;
                                      setListTransferts(updated);
                                    }} className="h-8 text-xs bg-background border-none" />
                                  </td>
                                  <td className="border p-1">
                                    <Input value={t.matricule} onChange={(e) => {
                                      const updated = [...listTransferts];
                                      updated[idx].matricule = e.target.value;
                                      setListTransferts(updated);
                                    }} className="h-8 text-xs bg-background border-none text-center" />
                                  </td>
                                  <td className="border p-1">
                                    <Input value={t.classe} onChange={(e) => {
                                      const updated = [...listTransferts];
                                      updated[idx].classe = e.target.value;
                                      setListTransferts(updated);
                                    }} className="h-8 text-xs bg-background border-none text-center" />
                                  </td>
                                  <td className="border p-1">
                                    <Input value={t.origine} onChange={(e) => {
                                      const updated = [...listTransferts];
                                      updated[idx].origine = e.target.value;
                                      setListTransferts(updated);
                                    }} className="h-8 text-xs bg-background border-none" />
                                  </td>
                                  <td className="border p-1 text-center">
                                    <Button variant="ghost" size="icon" onClick={() => setListTransferts(listTransferts.filter((_, i) => i !== idx))} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <Button size="sm" onClick={() => setListTransferts([...listTransferts, { name: "", matricule: "", classe: "", dateNais: "", decision: "Accordé", origine: "" }])} className="mt-2 gap-1 h-8">
                            <Plus className="h-4 w-4" /> Ajouter transfert
                          </Button>
                        </div>

                        <Separator />

                        <div>
                          <h3 className="font-bold text-sm text-orange-600 uppercase tracking-wide mb-3">B/ Nombre de Boursiers par niveau</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {listBoursiers.map((b, idx) => (
                              <div key={idx} className="space-y-1">
                                <Label className="text-xs">{b.niveau}</Label>
                                <Input type="number" value={b.count} onChange={(e) => {
                                  const updated = [...listBoursiers];
                                  updated[idx].count = parseInt(e.target.value, 10) || 0;
                                  setListBoursiers(updated);
                                }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeChapter === "chapitre3" && (
                      <div className="space-y-4">
                        <h3 className="font-bold text-sm text-orange-600 uppercase tracking-wide">Chapitre III : Vie Scolaire & Sociale</h3>
                        <div className="space-y-2">
                          <Label htmlFor="conseil-interieur-input">Bilan du Conseil Intérieur</Label>
                          <Textarea id="conseil-interieur-input" rows={3} value={conseilInterieur} onChange={(e) => setConseilInterieur(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="conseil-discipline-input">Bilan du Conseil de Discipline</Label>
                          <Textarea id="conseil-discipline-input" rows={3} value={conseilDiscipline} onChange={(e) => setConseilDiscipline(e.target.value)} />
                        </div>
                        
                        <div>
                          <Label className="font-semibold text-sm mb-2 block">Cas Sociaux de Fin de Trimestre</Label>
                          <table className="w-full text-xs border border-collapse border-border">
                            <thead>
                              <tr className="bg-muted">
                                <th className="border p-2 text-left">Nom & Prénoms</th>
                                <th className="border p-2">Matricule</th>
                                <th className="border p-2">Classe</th>
                                <th className="border p-2">Motif/Maladie</th>
                                <th className="border p-2 w-12">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {listCasSociaux.map((cs, idx) => (
                                <tr key={idx}>
                                  <td className="border p-1">
                                    <Input value={cs.name} onChange={(e) => {
                                      const updated = [...listCasSociaux];
                                      updated[idx].name = e.target.value;
                                      setListCasSociaux(updated);
                                    }} className="h-8 text-xs bg-background border-none" />
                                  </td>
                                  <td className="border p-1">
                                    <Input value={cs.matricule} onChange={(e) => {
                                      const updated = [...listCasSociaux];
                                      updated[idx].matricule = e.target.value;
                                      setListCasSociaux(updated);
                                    }} className="h-8 text-xs bg-background border-none text-center" />
                                  </td>
                                  <td className="border p-1">
                                    <Input value={cs.classe} onChange={(e) => {
                                      const updated = [...listCasSociaux];
                                      updated[idx].classe = e.target.value;
                                      setListCasSociaux(updated);
                                    }} className="h-8 text-xs bg-background border-none text-center" />
                                  </td>
                                  <td className="border p-1">
                                    <Input value={cs.motif} onChange={(e) => {
                                      const updated = [...listCasSociaux];
                                      updated[idx].motif = e.target.value;
                                      setListCasSociaux(updated);
                                    }} className="h-8 text-xs bg-background border-none" />
                                  </td>
                                  <td className="border p-1 text-center">
                                    <Button variant="ghost" size="icon" onClick={() => setListCasSociaux(listCasSociaux.filter((_, i) => i !== idx))} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <Button size="sm" onClick={() => setListCasSociaux([...listCasSociaux, { name: "", matricule: "", classe: "", genre: "F", motif: "" }])} className="mt-2 gap-1 h-8">
                            <Plus className="h-4 w-4" /> Ajouter cas social
                          </Button>
                        </div>

                        <div className="space-y-2 pt-2">
                          <Label htmlFor="extracurricular-activities">Activités Parascolaires (Clubs, Associations, Sports)</Label>
                          <Textarea id="extracurricular-activities" rows={3} value={activitiesParaScolaires} onChange={(e) => setActivitiesParaScolaires(e.target.value)} />
                        </div>
                      </div>
                    )}

                    {activeChapter === "chapitre4" && (
                      <div className="space-y-4">
                        <h3 className="font-bold text-sm text-orange-600 uppercase tracking-wide">Chapitre IV : Personnel Enseignant & Personnel de Service</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="teachers-permanent">Enseignants Permanents</Label>
                            <Input type="number" id="teachers-permanent" value={enseignantsPermanents} onChange={(e) => setEnseignantsPermanents(parseInt(e.target.value, 10) || 0)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="teachers-vacataire">Enseignants Vacataires</Label>
                            <Input type="number" id="teachers-vacataire" value={enseignantsVacataires} onChange={(e) => setEnseignantsVacataires(parseInt(e.target.value, 10) || 0)} />
                          </div>
                        </div>

                        <div>
                          <Label className="font-semibold text-xs mb-2 block">Répartition des Enseignants par Discipline</Label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {repartEnseignants.map((re, idx) => (
                              <div key={idx} className="space-y-1">
                                <Label className="text-xs">{re.discipline}</Label>
                                <Input type="number" value={re.count} onChange={(e) => {
                                  const updated = [...repartEnseignants];
                                  updated[idx].count = parseInt(e.target.value, 10) || 0;
                                  setRepartEnseignants(updated);
                                }} className="h-9" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeChapter === "conclusion" && (
                      <div className="space-y-4">
                        <h3 className="font-bold text-sm text-orange-600 uppercase tracking-wide">Bilan Opérationnel & Conclusion</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="recovery-rate-input">Taux de Recouvrement Scolarité</Label>
                            <Input id="recovery-rate-input" value={tauxRecouvrement} onChange={(e) => setTauxRecouvrement(e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="problems-input">Difficultés majeures rencontrées</Label>
                          <Textarea id="problems-input" rows={3} value={difficultesRencontrees} onChange={(e) => setDifficultesRencontrees(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="corrective-actions-input">Actions Correctives proposées / appliquées</Label>
                          <Textarea id="corrective-actions-input" rows={3} value={actionsCorrectives} onChange={(e) => setActionsCorrectives(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="conclusion-texte-input">Conclusion et Perspectives (texte officiel)</Label>
                          <Textarea id="conclusion-texte-input" rows={5} value={conclusionTexte} onChange={(e) => setConclusionTexte(e.target.value)} />
                        </div>

                        {/* Liste des Majors éditable */}
                        <div className="space-y-2 pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <Label className="font-semibold">Liste des Majors de Promotion</Label>
                            <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => setListMajors([...listMajors, { rang: listMajors.length + 1, nom: '', classe: '', moyenne: '', genre: 'M' }])}>
                              <Plus className="h-3 w-3" /> Ajouter
                            </Button>
                          </div>
                          {listMajors.map((m, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <Input className="w-16" placeholder="Rang" value={m.rang} onChange={e => { const n = [...listMajors]; n[idx] = {...n[idx], rang: e.target.value}; setListMajors(n); }} />
                              <Input className="flex-1" placeholder="Nom et Prénoms" value={m.nom} onChange={e => { const n = [...listMajors]; n[idx] = {...n[idx], nom: e.target.value}; setListMajors(n); }} />
                              <Input className="w-24" placeholder="Classe" value={m.classe} onChange={e => { const n = [...listMajors]; n[idx] = {...n[idx], classe: e.target.value}; setListMajors(n); }} />
                              <Input className="w-20" placeholder="Moy." value={m.moyenne} onChange={e => { const n = [...listMajors]; n[idx] = {...n[idx], moyenne: e.target.value}; setListMajors(n); }} />
                              <Button size="sm" variant="ghost" className="text-red-500 h-7 px-2" onClick={() => setListMajors(listMajors.filter((_, i) => i !== idx))}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          ))}
                        </div>

                        {/* Visites de classes éditables */}
                        <div className="space-y-2 pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <Label className="font-semibold">Visites de Classes</Label>
                            <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => setVisitesClasses([...visitesClasses, { enseignant: '', matiere: '', classe: '', date: '', observation: '' }])}>
                              <Plus className="h-3 w-3" /> Ajouter
                            </Button>
                          </div>
                          {visitesClasses.map((v, idx) => (
                            <div key={idx} className="flex gap-2 items-center flex-wrap">
                              <Input className="w-32" placeholder="Enseignant" value={v.enseignant} onChange={e => { const n = [...visitesClasses]; n[idx] = {...n[idx], enseignant: e.target.value}; setVisitesClasses(n); }} />
                              <Input className="w-28" placeholder="Matière" value={v.matiere} onChange={e => { const n = [...visitesClasses]; n[idx] = {...n[idx], matiere: e.target.value}; setVisitesClasses(n); }} />
                              <Input className="w-24" placeholder="Classe" value={v.classe} onChange={e => { const n = [...visitesClasses]; n[idx] = {...n[idx], classe: e.target.value}; setVisitesClasses(n); }} />
                              <Input className="w-24" placeholder="Date" value={v.date} onChange={e => { const n = [...visitesClasses]; n[idx] = {...n[idx], date: e.target.value}; setVisitesClasses(n); }} />
                              <Input className="flex-1 min-w-[150px]" placeholder="Observation" value={v.observation} onChange={e => { const n = [...visitesClasses]; n[idx] = {...n[idx], observation: e.target.value}; setVisitesClasses(n); }} />
                              <Button size="sm" variant="ghost" className="text-red-500 h-7 px-2" onClick={() => setVisitesClasses(visitesClasses.filter((_, i) => i !== idx))}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          ))}
                        </div>

                        {/* Formations éditables */}
                        <div className="space-y-2 pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <Label className="font-semibold">Formations et Perfectionnements</Label>
                            <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => setFormations([...formations, { intitule: '', date: '', participants: 0, organisme: '' }])}>
                              <Plus className="h-3 w-3" /> Ajouter
                            </Button>
                          </div>
                          {formations.map((f, idx) => (
                            <div key={idx} className="flex gap-2 items-center flex-wrap">
                              <Input className="flex-1 min-w-[150px]" placeholder="Intitulé" value={f.intitule} onChange={e => { const n = [...formations]; n[idx] = {...n[idx], intitule: e.target.value}; setFormations(n); }} />
                              <Input className="w-28" placeholder="Date" value={f.date} onChange={e => { const n = [...formations]; n[idx] = {...n[idx], date: e.target.value}; setFormations(n); }} />
                              <Input className="w-24" type="number" placeholder="Participants" value={f.participants} onChange={e => { const n = [...formations]; n[idx] = {...n[idx], participants: parseInt(e.target.value)||0}; setFormations(n); }} />
                              <Input className="flex-1" placeholder="Organisme" value={f.organisme} onChange={e => { const n = [...formations]; n[idx] = {...n[idx], organisme: e.target.value}; setFormations(n); }} />
                              <Button size="sm" variant="ghost" className="text-red-500 h-7 px-2" onClick={() => setFormations(formations.filter((_, i) => i !== idx))}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                <Separator className="my-6" />

                <div className="flex justify-end pt-2">
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
