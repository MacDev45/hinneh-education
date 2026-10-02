import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { Layout } from '@/components/Layout';
import { DataTable, type Column } from '@/components/DataTable';
import { StatsCard, MetricCard } from '@/components/Stats';
import { PerformanceLineChart, StudentProgressChart } from '@/components/Charts';
import apiClient from '@/lib/apiClient';
import type { Evaluation, KPICard, Student, ClassRoom } from '@/lib/index';
import { formatStudentName } from '@/lib/index';
import { formatDate } from '@/lib/index';
import { printBulletins } from '@/lib/bulletinPrinter';
import {
  printAttendanceCertificate,
  printClassAttendanceCertificates,
  printTableauDHonneurKorhogo,
  printPlancheTableauxDHonneurKorhogo,
} from '@/lib/certificatePrinter';
import {
  exportMatrixToPdf,
  exportMatrixToExcel,
  exportMatrixToWord,
  exportPVToPdf,
  exportPVToExcel,
  exportPVToWord,
  exportTeacherSheetToPdf,
  exportTeacherSheetToExcel,
  exportTeacherSheetToWord,
  getTeacherSheetData,
} from '@/lib/gradeDocuments';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Save,
  Lock,
  Send,
  FileText,
  Eye,
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Printer,
  Award,
  ClipboardList,
  ArrowLeft,
} from 'lucide-react';

interface BulletinRecord {
  id: string;
  classId: string;
  className: string;
  trimester: 1 | 2 | 3;
  status: 'brouillon' | 'valide' | 'publie';
  generatedDate: Date;
  studentCount: number;
}

interface SubjectPerformance {
  subject: string;
  average: number;
  coefficient: number;
}

const subjects = [
  'Mathématiques',
  'Français',
  'Anglais',
  'Histoire-Géographie',
  'Sciences Physiques',
  'SVT',
  'Arabe',
  'Éducation Islamique',
  'Coran',
  'Tajwid',
  'EPS',
];

const getSubjectPerformance = (evaluationsList: Evaluation[]): SubjectPerformance[] => {
  return subjects.map((subject) => {
    const subjectEvals = evaluationsList.filter((e) => e.subject === subject);
    const average =
      subjectEvals.length > 0
        ? subjectEvals.reduce((sum, e) => sum + e.note, 0) / subjectEvals.length
        : 0;
    const coefficient = subjectEvals[0]?.coefficient || 2;
    return { subject, average, coefficient };
  });
};

const DEFAULT_COEFFS: Record<string, number> = {
  'Mathématiques': 4,
  'Français': 4,
  'Anglais': 3,
  'Histoire-Géographie': 2,
  'Sciences': 2,
  'Sciences de la Vie et de la Terre': 2,
  'Physique-Chimie': 2,
  'Arabe': 2,
  'Éducation Islamique': 2,
  'Coran / Tajwid': 3,
  'Coran': 3,
  'Tajwid': 3,
  'EPS': 1,
};

// mockHash function removed; no mock hash needed for fallback grades

const calculateStudentAverages = (
  student: Student,
  trimesterNum: number,
  evaluations: Evaluation[]
) => {
  const studentEvals = evaluations.filter(
    (e) => String(e.studentId) === String(student.id) && e.trimester === trimesterNum
  );
  
  const subjectsMap: Record<string, { total: number; count: number; coeff: number }> = {};
  
  if (studentEvals.length > 0) {
    studentEvals.forEach((e) => {
      const subject = e.subject;
      const coeff = e.coefficient || DEFAULT_COEFFS[subject] || 2;
      if (!subjectsMap[subject]) {
        subjectsMap[subject] = { total: 0, count: 0, coeff };
      }
      subjectsMap[subject].total += e.note;
      subjectsMap[subject].count += 1;
    });
  }
  
  const subjectAverages: Record<string, number> = {};
  let totalWeightedPoints = 0;
  let totalCoeffs = 0;
  
  Object.entries(subjectsMap).forEach(([subject, data]) => {
    const avg = data.total / data.count;
    subjectAverages[subject] = parseFloat(avg.toFixed(2));
    totalWeightedPoints += avg * data.coeff;
    totalCoeffs += data.coeff;
  });
  
  const generalAverage = totalCoeffs > 0 ? parseFloat((totalWeightedPoints / totalCoeffs).toFixed(2)) : 0;
  
  return { subjectAverages, generalAverage, totalCoeffs };
};

export const printMatrice = (
  className: string,
  trimester: number,
  subjects: string[],
  data: Array<{ 
    student: Student; 
    subjectAverages: Record<string, number>; 
    generalAverage: number; 
    rank: number;
    previousAverages?: Record<string, number>;
    annualAverage?: number;
  }>,
  schoolName: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  // Group subjects by discipline
  const disciplines: Record<string, string[]> = {};
  subjects.forEach(subject => {
    const discipline = subject.split(' ')[0] || 'Autres';
    if (!disciplines[discipline]) {
      disciplines[discipline] = [];
    }
    disciplines[discipline].push(subject);
  });
  
  // Build headers with discipline grouping
  let disciplineHeaders = '';
  let subjectHeaders = '';
  let disciplineColSpan = 0;
  
  Object.entries(disciplines).forEach(([discipline, subjs]) => {
    disciplineHeaders += `<th colspan="${subjs.length}" style="padding: 8px 5px; font-size: 11px; border: 1px solid #000; background-color: #e8e8e8;">${discipline}</th>`;
    disciplineColSpan += subjs.length;
    subjs.forEach(s => {
      subjectHeaders += `<th style="padding: 6px 3px; font-size: 9px; border: 1px solid #000;">${s}</th>`;
    });
  });
  
  const rows = data.map(item => {
    const gradesCells = subjects.map(s => {
      const grade = item.subjectAverages[s];
      const prevGrade = item.previousAverages?.[s];
      const val = grade !== undefined ? grade.toFixed(2) : '-';
      const color = grade !== undefined && grade < 10 ? 'red' : 'black';
      const prevVal = prevGrade !== undefined ? `(${prevGrade.toFixed(2)})` : '';
      return `<td style="border: 1px solid #000; text-align: center; font-weight: bold; color: ${color}; font-size: 9px;">${val}<br/><span style="font-size: 7px; color: #666;">${prevVal}</span></td>`;
    }).join('');
    
    const annualVal = item.annualAverage !== undefined ? item.annualAverage.toFixed(2) : '-';
    
    return `
      <tr>
        <td style="border: 1px solid #000; padding: 4px; font-size: 10px;">${item.rank}</td>
        <td style="border: 1px solid #000; padding: 4px; font-size: 9px; font-family: monospace;">${item.student.matricule}</td>
        <td style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold; text-align: left;">${item.student.lastName.toUpperCase()} ${item.student.firstName}</td>
        ${gradesCells}
        <td style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold; background-color: #f2f2f2; text-align: center;">${item.generalAverage.toFixed(2)}</td>
        <td style="border: 1px solid #000; padding: 4px; font-size: 10px; font-weight: bold; background-color: #e0e0e0; text-align: center;">${annualVal}</td>
      </tr>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Matrice des Résultats - ${className}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 15px; font-size: 9px; }
          @page { size: A4 landscape; margin: 8mm; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th, td { border: 1px solid #000; padding: 3px; text-align: center; }
          .header-box { display: flex; justify-content: space-between; margin-bottom: 15px; }
          .title { text-align: center; margin: 15px 0; font-size: 14px; font-weight: bold; text-transform: uppercase; }
          .subtitle { text-align: center; margin: 10px 0; font-size: 11px; font-weight: bold; }
          .legend { font-size: 8px; margin-top: 10px; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <strong>MINISTÈRE DE L'ÉDUCATION NATIONALE</strong><br/>
            <strong>DE L'ENSEIGNEMENT TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE</strong><br/>
            Établissement: ${schoolName}<br/>
            Classe: ${className}
          </div>
          <div style="text-align: right;">
            <strong>RÉPUBLIQUE DE CÔTE D'IVOIRE</strong><br/>
            Union - Discipline - Travail<br/>
            Année Scolaire: 2025 - 2026
          </div>
        </div>
        
        <div class="title">MATRICE DES RÉSULTATS - TRIMESTRE ${trimester}</div>
        <div class="subtitle">Moyennes par matière, discipline et annuelle</div>
        
        <table>
          <thead>
            <tr style="background-color: #d0d0d0;">
              <th rowspan="2" style="border: 1px solid #000; width: 3%;">Rang</th>
              <th rowspan="2" style="border: 1px solid #000; width: 10%;">Matricule</th>
              <th rowspan="2" style="border: 1px solid #000; text-align: left; width: 20%;">Nom & Prénoms</th>
              ${disciplineHeaders}
              <th rowspan="2" style="border: 1px solid #000; width: 6%;">Moy. Trim.<br/>${trimester}</th>
              <th rowspan="2" style="border: 1px solid #000; width: 6%;">Moy.<br/>Annuelle</th>
            </tr>
            <tr style="background-color: #e8e8e8;">
              ${subjectHeaders}
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        
        <div class="legend">
          * Les valeurs entre parenthèses indiquent les moyennes des trimestres précédents<br/>
          * Moyenne annuelle calculée sur la base des trimestres disponibles
        </div>
        
        <div style="margin-top: 25px; display: flex; justify-content: space-between; page-break-inside: avoid;">
          <div style="text-align: center; width: 30%;">
            <strong>Le Conseil d'Enseignement</strong>
          </div>
          <div style="text-align: center; width: 30%;">
            <strong>Le Professeur Principal</strong>
          </div>
          <div style="text-align: center; width: 30%;">
            <strong>Le Chef d'Établissement</strong>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export const printPV = (
  className: string,
  trimester: number,
  schoolName: string,
  stats: any,
  distinctions: any,
  sanctions: any,
  studentList: any[],
  decisions: Record<string, string>
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  // Calcul des statistiques avancées
  const averages = studentList.map(s => s.generalAverage).sort((a, b) => a - b);
  const mediane = averages.length > 0 ? averages[Math.floor(averages.length / 2)] : 0;
  const mode = stats.moyenneGenerale; // Simplifié
  const q1 = averages.length > 0 ? averages[Math.floor(averages.length * 0.25)] : 0;
  const q3 = averages.length > 0 ? averages[Math.floor(averages.length * 0.75)] : 0;
  
  const effectifClasse = studentList.length;
  const effectifClassé = studentList.filter(s => s.generalAverage >= 10).length;
  const effectifNonClasse = effectifClasse - effectifClassé;
  
  const studentRows = studentList.map(item => {
    const decision = decisions[item.student.id] || (item.generalAverage >= 12 ? 'Tableau d\'Honneur' : item.generalAverage >= 10 ? 'Admis' : 'Avertissement');
    const color = item.generalAverage < 10 ? 'red' : 'black';
    const redouble = (item.student as any).repeater ? 'Oui' : 'Non';
    const statut = item.student.status || 'Actif';
    const regime = (item.student as any).regime || 'Non';
    const interne = (item.student as any).boarding ? 'Oui' : 'Non';
    const affecte = (item.student as any).affected ? 'Oui' : 'Non';
    
    return `
      <tr>
        <td style="border: 1px solid #000; text-align: center; font-size: 9px;">${item.rank}</td>
        <td style="border: 1px solid #000; font-family: monospace; font-size: 9px; text-align: center;">${item.student.matricule}</td>
        <td style="border: 1px solid #000; text-align: left; font-size: 9px; font-weight: bold;">${item.student.lastName.toUpperCase()} ${item.student.firstName}</td>
        <td style="border: 1px solid #000; text-align: center; font-size: 9px;">${item.student.gender}</td>
        <td style="border: 1px solid #000; text-align: center; font-weight: bold; font-size: 9px; color: ${color};">${item.generalAverage.toFixed(2)}</td>
        <td style="border: 1px solid #000; text-align: center; font-size: 9px;">${redouble}</td>
        <td style="border: 1px solid #000; text-align: center; font-size: 9px;">${statut}</td>
        <td style="border: 1px solid #000; text-align: center; font-size: 9px;">${regime}</td>
        <td style="border: 1px solid #000; text-align: center; font-size: 9px;">${interne}</td>
        <td style="border: 1px solid #000; text-align: center; font-size: 9px;">${affecte}</td>
        <td style="border: 1px solid #000; text-align: left; font-size: 9px; font-style: italic;">${decision}</td>
      </tr>
    `;
  }).join('');

  const distinctionRows = distinctions.map((d: any) => `<li><strong>${d.name}</strong> (${d.average.toFixed(2)})</li>`).join('');
  const sanctionRows = sanctions.map((s: any) => `<li><strong>${s.name}</strong> (${s.average.toFixed(2)})</li>`).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>PV de Conseil de Classe - ${className}</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; padding: 20px; font-size: 10px; line-height: 1.3; }
          @page { size: A4 portrait; margin: 10mm; }
          table { border-collapse: collapse; width: 100%; margin-top: 8px; margin-bottom: 12px; }
          th, td { border: 1px solid #000; padding: 4px; }
          th { background-color: #f2f2f2; font-weight: bold; text-align: center; font-size: 9px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .title { text-align: center; font-size: 13px; font-weight: bold; text-transform: uppercase; text-decoration: underline; margin-bottom: 15px; }
          .section-title { font-weight: bold; text-transform: uppercase; margin-top: 12px; margin-bottom: 4px; border-bottom: 1px solid #000; font-size: 10px; }
          .grid-2 { display: flex; justify-content: space-between; gap: 15px; }
          .grid-2 > div { width: 48%; }
          .grid-3 { display: flex; justify-content: space-between; gap: 10px; }
          .grid-3 > div { width: 32%; }
          .signature { text-align: center; margin-top: 30px; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <strong>MINISTÈRE DE L'ÉDUCATION NATIONALE</strong><br/>
            <strong>DE L'ENSEIGNEMENT TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE</strong><br/>
            DIRECTION RÉGIONALE D'ABIDJAN 3<br/>
            Établissement: ${schoolName}<br/>
            Classe: ${className}
          </div>
          <div style="text-align: right;">
            <strong>RÉPUBLIQUE DE CÔTE D'IVOIRE</strong><br/>
            Union - Discipline - Travail<br/>
            Année Scolaire: 2025 - 2026
          </div>
        </div>
        
        <div class="title">PROCÈS-VERBAL DU CONSEIL DE CLASSE - TRIMESTRE ${trimester}</div>
        
        <div class="section-title">I. EFFECTIFS ET STATISTIQUES</div>
        <table style="width: 100%;">
          <tr>
            <td><strong>Effectif Total:</strong> ${effectifClasse}</td>
            <td><strong>Effectif Classé:</strong> ${effectifClassé}</td>
            <td><strong>Effectif Non Classé:</strong> ${effectifNonClasse}</td>
          </tr>
          <tr>
            <td><strong>Filles:</strong> ${stats.filles}</td>
            <td><strong>Garçons:</strong> ${stats.garcons}</td>
            <td><strong>Redoublants:</strong> ${stats.redoublants}</td>
          </tr>
        </table>
        
        <div class="section-title">II. STATISTIQUES AVANCÉES</div>
        <table style="width: 100%;">
          <tr>
            <td><strong>Médiane:</strong> ${mediane.toFixed(2)}</td>
            <td><strong>Mode:</strong> ${mode.toFixed(2)}</td>
            <td><strong>Q1 (25%):</strong> ${q1.toFixed(2)}</td>
            <td><strong>Q3 (75%):</strong> ${q3.toFixed(2)}</td>
          </tr>
          <tr>
            <td><strong>Moyenne Classe:</strong> ${stats.moyenneGenerale.toFixed(2)}/20</td>
            <td><strong>Taux Réussite:</strong> ${stats.tauxReussite}%</td>
            <td><strong>Max:</strong> ${stats.plusForteMoyenne.toFixed(2)}</td>
            <td><strong>Min:</strong> ${stats.plusFaibleMoyenne.toFixed(2)}</td>
          </tr>
        </table>
        
        <div class="section-title">III. LISTE NOMINATIVE DES ÉLÈVES AFFECTÉS</div>
        <table style="width: 100%; font-size: 9px;">
          <thead>
            <tr>
              <th style="width: 4%;">Rang</th>
              <th style="width: 10%;">Matricule</th>
              <th style="width: 18%;">Nom & Prénoms</th>
              <th style="width: 4%;">Sexe</th>
              <th style="width: 6%;">Moyenne</th>
              <th style="width: 5%;">Redouble</th>
              <th style="width: 6%;">Statut</th>
              <th style="width: 5%;">Régime</th>
              <th style="width: 5%;">Interne</th>
              <th style="width: 5%;">Affecté</th>
              <th style="width: 22%;">Décision</th>
            </tr>
          </thead>
          <tbody>
            ${studentRows}
          </tbody>
        </table>
        
        <div class="grid-2">
          <div>
            <div class="section-title">IV. DISTINCTIONS</div>
            <ul style="font-size: 9px; margin: 5px 0;">
              ${distinctionRows || '<li>Néant</li>'}
            </ul>
          </div>
          <div>
            <div class="section-title">V. SANCTIONS / AVERTISSEMENTS</div>
            <ul style="font-size: 9px; margin: 5px 0;">
              ${sanctionRows || '<li>Néant</li>'}
            </ul>
          </div>
        </div>
        
        <div class="section-title">VI. SIGNATURES</div>
        <div class="grid-3">
          <div class="signature">
            <strong>Le Directeur</strong><br/>
            <br/>
            <br/>
            <br/>
            <em>Signature</em>
          </div>
          <div class="signature">
            <strong>Le Professeur Principal</strong><br/>
            <br/>
            <br/>
            <br/>
            <em>Signature</em>
          </div>
          <div class="signature">
            <strong>Les Enseignants</strong><br/>
            <br/>
            <br/>
            <br/>
            <em>Signatures</em>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

// Fonction de calcul des distinctions selon les critères officiels
const calculateDistinctions = (studentList: any[]) => {
  const encouragements: any[] = [];
  const felicitations: any[] = [];
  const tableauHonneur: any[] = [];
  const tableauHonneurFelicitations: any[] = [];
  const tableauHonneurFelicitationsEncouragements: any[] = [];

  studentList.forEach(item => {
    const avg = item.generalAverage;
    const subjectAverages = item.subjectAverages || {};
    const allSubjectsAbove10 = Object.values(subjectAverages).every((grade: number) => grade >= 10);
    
    // Tableau d'honneur: moyenne >= 12 ET toutes les matières >= 10
    if (avg >= 12 && allSubjectsAbove10) {
      tableauHonneur.push(item);
      
      if (avg >= 16) {
        felicitations.push(item);
        tableauHonneurFelicitations.push(item);
        tableauHonneurFelicitationsEncouragements.push(item);
      } else if (avg >= 14) {
        tableauHonneurFelicitations.push(item);
        tableauHonneurFelicitationsEncouragements.push(item);
      } else {
        tableauHonneurFelicitationsEncouragements.push(item);
      }
    }
    // Félicitations: moyenne >= 14
    else if (avg >= 14) {
      felicitations.push(item);
    }
    // Encouragements: moyenne entre 10 et 12
    else if (avg >= 10 && avg < 12) {
      encouragements.push(item);
    }
  });

  return {
    encouragements,
    felicitations,
    tableauHonneur,
    tableauHonneurFelicitations,
    tableauHonneurFelicitationsEncouragements
  };
};

// Fonction de calcul du repêchage (points nécessaires par trimestre pour atteindre 10)
const calculateRepêchage = (studentsList: Student[], evaluationsList: any[], selectedClass: string) => {
  const repêchables: any[] = [];

  console.log('calculateRepêchage appelé avec:', { selectedClass, studentsCount: studentsList.length, evalsCount: evaluationsList.length });

  // Filtrer les élèves de la classe sélectionnée
  const classStudents = studentsList.filter(s => String(s.classId) === String(selectedClass) && s.status === 'actif');
  console.log('Élèves de la classe:', classStudents.length, classStudents.map(s => ({ id: s.id, name: s.lastName, classId: s.classId, status: s.status })));

  classStudents.forEach(student => {
    console.log('Traitement élève:', student.lastName, student.firstName);
    
    // Calcul des moyennes par trimestre pour cet élève
    const trimesterAverages: any[] = [];
    for (let t = 1; t <= 3; t++) {
      const trimesterRes = calculateStudentAverages(student, t, evaluationsList);
      console.log(`Trimestre ${t}:`, trimesterRes.generalAverage);
      // Inclure même si la moyenne est 0 (fallback grades)
      const trimesterPointsNeeded = Math.max(0, 10 - trimesterRes.generalAverage);
      trimesterAverages.push({
        trimester: t,
        average: trimesterRes.generalAverage,
        pointsNeeded: trimesterPointsNeeded.toFixed(2),
        subjectAverages: trimesterRes.subjectAverages,
        weakSubjects: Object.entries(trimesterRes.subjectAverages)
          .filter(([_, grade]: [string, number]) => grade < 10)
          .map(([subject, grade]) => ({ subject, grade, improvementNeeded: (10 - grade).toFixed(2) }))
      });
    }

    // Calcul de la moyenne annuelle (uniquement sur les trimestres avec évaluations réelles)
    const activeTrimesters = trimesterAverages.filter(ta => Object.keys(ta.subjectAverages).length > 0);
    const annualAverage = activeTrimesters.length > 0 
      ? (activeTrimesters.reduce((sum, val) => sum + val.average, 0) / activeTrimesters.length)
      : 0;

    console.log('Moyenne annuelle:', annualAverage, 'Trimestres évalués:', activeTrimesters.length);

    // Élèves repêchables: ont des notes réelles et une moyenne annuelle < 10
    const hasEvaluations = activeTrimesters.length > 0;
    if (hasEvaluations && annualAverage < 10) {
      const pointsNeeded = (10 - annualAverage).toFixed(2);
      
      // Calculer les moyennes globales pour identifier les matières faibles
      const allSubjectAverages: Record<string, number[]> = {};
      activeTrimesters.forEach(ta => {
        Object.entries(ta.subjectAverages).forEach(([subject, grade]: [string, number]) => {
          if (!allSubjectAverages[subject]) {
            allSubjectAverages[subject] = [];
          }
          allSubjectAverages[subject].push(grade);
        });
      });

      const weakSubjects = Object.entries(allSubjectAverages)
        .map(([subject, grades]: [string, number[]]) => ({
          subject,
          grade: grades.reduce((sum, val) => sum + val, 0) / grades.length,
          improvementNeeded: (10 - (grades.reduce((sum, val) => sum + val, 0) / grades.length)).toFixed(2)
        }))
        .filter(ws => ws.grade < 10);

      repêchables.push({
        student,
        currentAverage: annualAverage,
        annualAverage,
        pointsNeeded,
        weakSubjects,
        trimesterAverages,
        totalCoeffs: Object.keys(allSubjectAverages).length,
        trimesterCount: activeTrimesters.length
      });
    }
  });

  console.log('Repêchables trouvés:', repêchables.length);
  return repêchables;
};

// Fonction pour calculer les classes avec des élèves à moyenne < 10
const calculateClassesWithRepêchage = (studentsList: Student[], evaluationsList: any[], classesList: any[]) => {
  const result: any[] = [];

  console.log('calculateClassesWithRepêchage appelé avec:', { studentsCount: studentsList.length, classesCount: classesList.length, evalsCount: evaluationsList.length });

  classesList.forEach(cls => {
    console.log('Traitement classe:', cls.name, cls.id);
    // Calculer les repêchables pour cette classe
    const repêchables = calculateRepêchage(studentsList, evaluationsList, cls.id);
    
    if (repêchables.length > 0) {
      result.push({
        class: cls,
        repêchageCount: repêchables.length,
        repêchables
      });
      console.log(`Classe ${cls.name}: ${repêchables.length} élèves à repêcher`);
    }
  });

  console.log('Classes avec repêchage trouvées:', result.length);
  return result;
};

export default function Grades() {
  const userRole = typeof window !== 'undefined' ? (localStorage.getItem('user_role') || '').toLowerCase() : '';
  const isEducateur = userRole === 'educateur';

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedEvalType, setSelectedEvalType] = useState<string>('');
  const [selectedTrimester, setSelectedTrimester] = useState<string>('1');
  const [selectedProgressStudent, setSelectedProgressStudent] = useState<string>('');
  const [notesData, setNotesData] = useState<
    Record<string, { note: string; validated: boolean }>
  >({});
  const [councilDecisions, setCouncilDecisions] = useState<Record<string, string>>({});

  const [classesList, setClassesList] = useState<ClassRoom[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [evaluationsList, setEvaluationsList] = useState<Evaluation[]>([]);
  const [bulletinsList, setBulletinsList] = useState<BulletinRecord[]>([]);
  const [schoolsList, setSchoolsList] = useState<any[]>([]);

  // Dialog and form states
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genClassId, setGenClassId] = useState('');
  const [genTrimester, setGenTrimester] = useState('1');
  
  const [previewClassId, setPreviewClassId] = useState<string | null>(null);
  const [previewTrimester, setPreviewTrimester] = useState<number>(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const { toast } = useToast();

  const handlePrintClassBulletins = (classId: string, trimester: number) => {
    const classStudents = studentsList.filter((s) => String(s.classId) === String(classId) && s.status === 'actif');
    const classRoom = classesList.find((c) => String(c.id) === String(classId)) || null;
    const school = classRoom ? (schoolsList.find((s) => String(s.IDETABLISSEMENT || s.id) === String(classRoom.schoolId)) || schoolsList[0] || null) : (schoolsList[0] || null);
    
    if (classStudents.length === 0) {
      toast({
        title: "Impression impossible",
        description: "Aucun élève actif trouvé dans cette classe pour imprimer les bulletins.",
        variant: "destructive",
      });
      return;
    }
    
    printBulletins(classStudents, evaluationsList, classRoom, school, trimester);
  };

  const handleOpenPreview = (classId: string, trimester: number) => {
    setPreviewClassId(classId);
    setPreviewTrimester(trimester);
    setPreviewOpen(true);
  };

  const loadBulletins = async (classesData: ClassRoom[]) => {
    try {
      const bulletinsData = await apiClient.getBulletins();
      const mapped = bulletinsData.map((b: any) => {
        const cls = classesData.find((c) => String(c.id) === String(b.classe_id));
        return {
          id: String(b.id),
          classId: String(b.classe_id),
          className: cls ? cls.name : `Classe ${b.classe_id}`,
          trimester: b.trimestre as 1 | 2 | 3,
          status: b.statut === 'genere' ? 'publie' : b.statut || 'brouillon',
          generatedDate: new Date(b.date_generation),
          studentCount: cls ? cls.studentCount : 0,
        };
      });
      setBulletinsList(mapped);
    } catch (err) {
      console.error("Failed to load bulletins", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [classesData, studentsData, evaluationsData, schoolsData] = await Promise.all([
          apiClient.getClasses().catch<ClassRoom[]>((err) => {
            console.error("Failed to fetch classes from API", err);
            return [];
          }),
          apiClient.getStudents().catch<Student[]>((err) => {
            console.error("Failed to fetch students from API", err);
            return [];
          }),
          apiClient.getEvaluations().catch<Evaluation[]>((err) => {
            console.error("Failed to fetch evaluations from API", err);
            return [];
          }),
          apiClient.getSchools().catch<any[]>((err) => {
            console.error("Failed to fetch schools from API", err);
            return [];
          }),
        ]);
        setClassesList(classesData);
        setStudentsList(studentsData);
        setEvaluationsList(evaluationsData);
        setSchoolsList(schoolsData);

        if (classesData && classesData.length > 0) {
          await loadBulletins(classesData);
        }
      } catch (err) {
        console.error("Failed to fetch initial data", err);
      }
    };
    init();
  }, []);

  const classStudents = studentsList.filter(
    (s) => String(s.classId) === String(selectedClass) && s.status === 'actif'
  );

  const currentClass = classesList.find((c) => String(c.id) === String(selectedClass));
  const currentClassName = currentClass?.name || '';

  const handleNoteChange = (studentId: string, value: string) => {
    const numValue = parseFloat(value);
    if (value === '' || (numValue >= 0 && numValue <= 20)) {
      setNotesData((prev) => ({
        ...prev,
        [studentId]: { note: value, validated: false },
      }));
    }
  };

  const handleSaveNotes = async () => {
    const entries = Object.entries(notesData).filter(([_, data]) => data.note !== '');
    if (entries.length === 0) {
      toast({
        title: "Aucune note",
        description: "Veuillez saisir au moins une note avant d'enregistrer.",
        variant: "destructive",
      });
      return;
    }

    const promises = entries.map(async ([studentId, data]) => {
      const payload = {
        matiere: selectedSubject || 'Mathématiques',
        type: selectedEvalType || 'devoir',
        trimestre: parseInt(selectedTrimester, 10) || 1,
        note: parseFloat(data.note),
        coefficient: 1,
        date: new Date().toISOString().split('T')[0],
        appreciation: parseFloat(data.note) >= 18 ? 'Excellent' : parseFloat(data.note) >= 16 ? 'Très bien' : parseFloat(data.note) >= 14 ? 'Bien' : parseFloat(data.note) >= 12 ? 'Assez bien' : parseFloat(data.note) >= 10 ? 'Passable' : parseFloat(data.note) >= 8 ? 'Insuffisant' : 'Très insuffisant',
        classe_id: parseInt(selectedClass, 10) || 1,
        eleve_id: parseInt(studentId, 10)
      };
      try {
        await apiClient.createEvaluation(payload);
      } catch (err) {
        console.error("Failed to post evaluation", err);
      }
    });

    await Promise.all(promises);
    toast({
      title: "Notes enregistrées",
      description: "Les notes ont été enregistrées avec succès.",
    });

    apiClient.getEvaluations()
      .then(data => { if (data) setEvaluationsList(data); })
      .catch(err => console.warn(err));
  };

  const handleValidateAll = async () => {
    const entries = Object.entries(notesData).filter(([_, data]) => data.note !== '');
    if (entries.length === 0) {
      toast({
        title: "Aucune note",
        description: "Veuillez saisir au moins une note avant de valider.",
        variant: "destructive",
      });
      return;
    }

    const promises = entries.map(async ([studentId, data]) => {
      const payload = {
        matiere: selectedSubject || 'Mathématiques',
        type: selectedEvalType || 'devoir',
        trimestre: parseInt(selectedTrimester, 10) || 1,
        note: parseFloat(data.note),
        coefficient: 1,
        date: new Date().toISOString().split('T')[0],
        appreciation: parseFloat(data.note) >= 18 ? 'Excellent' : parseFloat(data.note) >= 16 ? 'Très bien' : parseFloat(data.note) >= 14 ? 'Bien' : parseFloat(data.note) >= 12 ? 'Assez bien' : parseFloat(data.note) >= 10 ? 'Passable' : parseFloat(data.note) >= 8 ? 'Insuffisant' : 'Très insuffisant',
        classe_id: parseInt(selectedClass, 10) || 1,
        eleve_id: parseInt(studentId, 10)
      };
      try {
        await apiClient.createEvaluation(payload);
      } catch (err) {
        console.error("Failed to post evaluation", err);
      }
    });

    await Promise.all(promises);
    toast({
      title: "Notes validées",
      description: "Toutes les notes ont été validées et verrouillées avec succès.",
    });

    apiClient.getEvaluations()
      .then(data => { if (data) setEvaluationsList(data); })
      .catch(err => console.warn(err));

    const updatedData = { ...notesData };
    Object.keys(updatedData).forEach((key) => {
      updatedData[key].validated = true;
    });
    setNotesData(updatedData);
  };

  const handleValidateNotes = handleValidateAll;

  const handleGenerateBulletin = async () => {
    if (!genClassId || !genTrimester) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez sélectionner une classe et un trimestre.",
      });
      return;
    }

    try {
      const response = await apiClient.generateBulletin({
        classe_id: parseInt(genClassId, 10),
        trimestre: parseInt(genTrimester, 10)
      });
      toast({
        title: "Bulletin généré",
        description: response.message || "Le bulletin a été généré avec succès.",
      });
      setGenerateOpen(false);
      
      // Reload bulletins
      if (classesList.length > 0) {
        await loadBulletins(classesList);
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Erreur de génération",
        description: "Une erreur est survenue lors de la génération du bulletin.",
      });
    }
  };

  const currentEvals = evaluationsList;

  const classAverage =
    currentEvals.length > 0
      ? (
          currentEvals.reduce((sum, e) => sum + e.note, 0) /
          currentEvals.length
        ).toFixed(2)
      : '0.00';

  const kpis: KPICard[] = [
    {
      id: 'kpi-grades-1',
      title: 'Moyenne générale',
      value: `${classAverage}/20`,
      trend: 0.5,
      trendDirection: 'up',
      period: 'ce trimestre',
      color: 'primary',
    },
    {
      id: 'kpi-grades-2',
      title: 'Notes saisies',
      value: evaluationsList.length,
      period: 'toutes classes',
      color: 'secondary',
    },
    {
      id: 'kpi-grades-3',
      title: 'Bulletins générés',
      value: bulletinsList.filter((b) => b.status !== 'brouillon').length,
      period: 'ce trimestre',
      color: 'accent',
    },
    {
      id: 'kpi-grades-4',
      title: 'Taux de réussite',
      value: '78.5%',
      trend: 2.3,
      trendDirection: 'up',
      period: 'moyenne réseau',
      color: 'muted',
    },
  ];

  const bulletinColumns: Column[] = [
    {
      key: 'className',
      label: 'Classe',
      sortable: true,
    },
    {
      key: 'trimester',
      label: 'Trimestre',
      sortable: true,
      render: (value: number) => `Trimestre ${value}`,
    },
    {
      key: 'studentCount',
      label: 'Élèves',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (value: string) => {
        const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
          brouillon: { label: 'Brouillon', variant: 'outline' },
          valide: { label: 'Validé', variant: 'secondary' },
          publie: { label: 'Publié', variant: 'default' },
        };
        const status = statusMap[value] || statusMap.brouillon;
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      key: 'generatedDate',
      label: 'Date génération',
      sortable: true,
      render: (value: Date) => formatDate(value),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: unknown, row: BulletinRecord) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleOpenPreview(row.classId, row.trimester)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Aperçu
          </Button>
          {row.status === 'brouillon' && (
            <Button size="sm" variant="default">
              <CheckCircle className="h-4 w-4 mr-1" />
              Valider
            </Button>
          )}
          {row.status === 'valide' && (
            <Button size="sm" variant="default">
              <Send className="h-4 w-4 mr-1" />
              Publier
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handlePrintClassBulletins(row.classId, row.trimester)}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const subjectPerformance = getSubjectPerformance(evaluationsList);

  const getRankDistribution = () => {
    const distribution = [
      { range: '0-5', count: 12 },
      { range: '6-10', count: 45 },
      { range: '11-15', count: 78 },
      { range: '16-20', count: 34 },
    ];
    return distribution;
  };

  const rankDistribution = getRankDistribution();

  // Matrice calculations
  const classAverages = useMemo(() => {
    if (!selectedClass || !selectedTrimester) return [];
    const trimesterNum = parseInt(selectedTrimester, 10);
    const students = studentsList.filter((s) => String(s.classId) === String(selectedClass) && s.status === 'actif');
    
    const computed = students.map((student) => {
      const res = calculateStudentAverages(student, trimesterNum, evaluationsList);
      return {
        student,
        subjectAverages: res.subjectAverages,
        generalAverage: res.generalAverage,
      };
    });
    
    const sorted = [...computed].sort((a, b) => b.generalAverage - a.generalAverage);
    return sorted.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [selectedClass, selectedTrimester, studentsList, evaluationsList]);

  const classSubjects = useMemo(() => {
    if (!selectedClass) return [];
    const trimesterNum = parseInt(selectedTrimester, 10);
    const classEvals = evaluationsList.filter(
      (e) => String(e.classId) === String(selectedClass) && e.trimester === trimesterNum
    );
    if (classEvals.length > 0) {
      return Array.from(new Set(classEvals.map((e) => e.subject)));
    }
    return [
      'Mathématiques',
      'Français',
      'Anglais',
      'Histoire-Géographie',
      'Sciences de la Vie et de la Terre',
      'Physique-Chimie',
      'Éducation Islamique',
      'Coran / Tajwid',
      'EPS',
    ];
  }, [selectedClass, selectedTrimester, evaluationsList]);

  const teacherSheetData = useMemo(() => {
    if (!selectedClass || !selectedSubject || !selectedTrimester) return { columns: [] as { key: string; label: string; coefficient: number }[], rows: [] as { student: Student; notes: Record<string, number | undefined>; average?: number }[] };
    const cls = classesList.find((c) => String(c.id) === String(selectedClass));
    if (!cls) return { columns: [] as { key: string; label: string; coefficient: number }[], rows: [] as { student: Student; notes: Record<string, number | undefined>; average?: number }[] };
    return getTeacherSheetData({
      classRoom: cls,
      subject: selectedSubject,
      trimester: parseInt(selectedTrimester, 10),
      schoolName: '',
      students: studentsList,
      evaluations: evaluationsList,
    });
  }, [selectedClass, selectedSubject, selectedTrimester, classesList, studentsList, evaluationsList]);

  // Majors calculations
  const majorsByLevel = useMemo(() => {
    const trimesterNum = parseInt(selectedTrimester, 10);
    const studentsByLevel: Record<string, Array<{ student: Student; generalAverage: number; className: string }>> = {};
    
    studentsList
      .filter((s) => s.status === 'actif')
      .forEach((student) => {
        const cls = classesList.find((c) => String(c.id) === String(student.classId));
        if (!cls) return;
        
        const level = cls.niveau || 'Autre';
        const res = calculateStudentAverages(student, trimesterNum, evaluationsList);
        
        if (!studentsByLevel[level]) {
          studentsByLevel[level] = [];
        }
        studentsByLevel[level].push({
          student,
          generalAverage: res.generalAverage,
          className: cls.name,
        });
      });
      
    const result: Record<string, Array<{ student: Student; generalAverage: number; className: string; rank: number }>> = {};
    Object.entries(studentsByLevel).forEach(([level, list]) => {
      const sorted = [...list].sort((a, b) => b.generalAverage - a.generalAverage);
      result[level] = sorted.slice(0, 3).map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
    });
    return result;
  }, [studentsList, classesList, evaluationsList, selectedTrimester]);

  // PV calculations
  const pvStats = useMemo(() => {
    if (!selectedClass) return { effectif: 0, filles: 0, garcons: 0, redoublants: 0, boursiers: 0, affectes: 0, moyenneGenerale: 0, plusForteMoyenne: 0, plusFaibleMoyenne: 20, tauxReussite: 0 };
    const students = studentsList.filter((s) => String(s.classId) === String(selectedClass) && s.status === 'actif');
    
    let totalMoy = 0;
    let high = 0;
    let low = 20;
    let passed = 0;
    
    classAverages.forEach(item => {
      totalMoy += item.generalAverage;
      if (item.generalAverage > high) high = item.generalAverage;
      if (item.generalAverage < low) low = item.generalAverage;
      if (item.generalAverage >= 10) passed += 1;
    });
    
    const filles = students.filter(s => s.gender === 'F').length;
    const garcons = students.filter(s => s.gender === 'M').length;
    const boursiers = students.filter(s => s.parentIds && s.parentIds.length > 0).length; // simple proxy
    
    return {
      effectif: students.length,
      filles,
      garcons,
      redoublants: Math.floor(students.length * 0.1), // mock redoublants
      boursiers,
      affectes: students.length - Math.floor(students.length * 0.2), // mock affectés
      moyenneGenerale: students.length > 0 ? totalMoy / students.length : 0,
      plusForteMoyenne: students.length > 0 ? high : 0,
      plusFaibleMoyenne: students.length > 0 ? low : 0,
      tauxReussite: students.length > 0 ? parseFloat(((passed / students.length) * 100).toFixed(1)) : 0,
    };
  }, [selectedClass, studentsList, classAverages]);

  const pvDistinctions = useMemo(() => {
    return classAverages
      .filter(item => item.generalAverage >= 12)
      .map(item => ({ name: `${item.student.lastName.toUpperCase()} ${item.student.firstName}`, average: item.generalAverage }));
  }, [classAverages]);

  const pvSanctions = useMemo(() => {
    return classAverages
      .filter(item => item.generalAverage < 10)
      .map(item => ({ name: `${item.student.lastName.toUpperCase()} ${item.student.firstName}`, average: item.generalAverage }));
  }, [classAverages]);

  // Calcul des distinctions
  const distinctions = useMemo(() => {
    return calculateDistinctions(classAverages);
  }, [classAverages]);

  // Calcul du repêchage
  const repêchage = useMemo(() => {
    return calculateRepêchage(studentsList, evaluationsList, selectedClass);
  }, [studentsList, evaluationsList, selectedClass]);

  // Calcul des classes avec repêchage
  const classesWithRepêchage = useMemo(() => {
    return calculateClassesWithRepêchage(studentsList, evaluationsList, classesList);
  }, [studentsList, evaluationsList, classesList]);

  // État pour les élèves retirés du repêchage
  const [removedFromRepêchage, setRemovedFromRepêchage] = useState<Set<string>>(new Set());

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Notes & Bulletins</h1>
              <p className="text-muted-foreground mt-2">
                Gestion des évaluations et génération des bulletins scolaires
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Exporter
              </Button>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Rapports
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {kpis.map((kpi) => (
              <StatsCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </motion.div>

        <Tabs defaultValue={isEducateur ? "matrice" : "saisie"} className="space-y-6">
          <TabsList className={`grid w-full max-w-6xl ${isEducateur ? 'grid-cols-9' : 'grid-cols-10'}`}>
            {!isEducateur && <TabsTrigger value="saisie">Saisie</TabsTrigger>}
            <TabsTrigger value="matrice">Matrice</TabsTrigger>
            <TabsTrigger value="fiche">Fiche</TabsTrigger>
            <TabsTrigger value="majors">Majors</TabsTrigger>
            <TabsTrigger value="pv">PV</TabsTrigger>
            <TabsTrigger value="bulletins">Bulletins</TabsTrigger>
            <TabsTrigger value="distinctions">Distinctions</TabsTrigger>
            <TabsTrigger value="repêchage">Repêchage</TabsTrigger>
            <TabsTrigger value="certificats">Certificats</TabsTrigger>
            <TabsTrigger value="progression">Progression</TabsTrigger>
          </TabsList>

          {!isEducateur && (
            <TabsContent value="saisie" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Saisie des notes</CardTitle>
                  <CardDescription>
                    Sélectionnez une classe, une matière et un type d'évaluation pour
                    saisir les notes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Classe</label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {classesList.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Matière</label>
                      <Select
                        value={selectedSubject}
                        onValueChange={setSelectedSubject}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type d'évaluation</label>
                      <Select
                        value={selectedEvalType}
                        onValueChange={setSelectedEvalType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="interrogation">Interrogation</SelectItem>
                          <SelectItem value="devoir">Devoir sur table</SelectItem>
                          <SelectItem value="composition">Composition</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Trimestre</label>
                      <Select
                        value={selectedTrimester}
                        onValueChange={setSelectedTrimester}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1er Trimestre</SelectItem>
                          <SelectItem value="2">2ème Trimestre</SelectItem>
                          <SelectItem value="3">3ème Trimestre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedClass && selectedSubject && selectedEvalType && (
                    <motion.div
                      variants={fadeInUp}
                      initial="initial"
                      animate="animate"
                      className="space-y-4"
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">
                          Liste des élèves - {currentClassName}
                        </h3>
                        <div className="space-x-2">
                          <Button
                            variant="outline"
                            onClick={handleValidateAll}
                            className="gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Valider tout
                          </Button>
                          <Button onClick={handleSaveNotes} className="gap-2">
                            <Save className="h-4 w-4" />
                            Enregistrer
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-3 text-left">Photo</th>
                              <th className="p-3 text-left">Matricule</th>
                              <th className="p-3 text-left">Nom & Prénoms</th>
                              <th className="p-3 text-left">Genre</th>
                              <th className="p-3 text-center">Statut Affecté</th>
                              <th className="p-3 text-center">Note /20</th>
                              <th className="p-3 text-center">État</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classStudents.map((student) => {
                              const noteInfo = notesData[student.id] || {
                                note: '',
                                validated: false,
                              };
                              const isAffecte = student.isAffecte || student.statutAffectation === 'affecte' || student.statut === 'affecte';
                              return (
                                <tr key={student.id} className="border-t hover:bg-muted/50">
                                  <td className="p-3">
                                    <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-primary overflow-hidden border">
                                      {student.photo ? (
                                        <img src={student.photo} alt="" className="h-full w-full object-cover" />
                                      ) : (
                                        `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 font-mono text-xs font-semibold text-muted-foreground">{student.matricule || 'N/A'}</td>
                                  <td className="p-3 font-semibold text-slate-900 dark:text-white">
                                    {formatStudentName(student)}
                                  </td>
                                  <td className="p-3 text-xs uppercase text-muted-foreground">
                                    {student.gender === 'F' || student.gender === 'feminin' ? 'Fille' : 'Garçon'}
                                  </td>
                                  <td className="p-3 text-center">
                                    <Badge variant="outline" className={`text-[10px] font-bold ${isAffecte ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-700 border-slate-300'}`}>
                                      {isAffecte ? 'AFFECTÉ' : 'NON AFFECTÉ'}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-center">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="20"
                                      step="0.25"
                                      value={noteInfo.note}
                                      onChange={(e) =>
                                        handleNoteChange(student.id, e.target.value)
                                      }
                                      className="w-24 mx-auto text-center font-bold"
                                      disabled={noteInfo.validated}
                                    />
                                  </td>
                                  <td className="p-3 text-center">
                                    {noteInfo.validated ? (
                                      <Badge variant="default" className="bg-green-500">
                                        Validé
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">En attente</Badge>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {(!selectedClass || !selectedSubject || !selectedEvalType) && (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Sélectionnez une classe, une matière et un type d'évaluation</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* TAB: MATRICE DES NOTES */}
          <TabsContent value="matrice" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Matrice des Notes</CardTitle>
                    <CardDescription>
                      Tableau synthétique de toutes les moyennes par matière et générale pour la classe sélectionnée
                    </CardDescription>
                  </div>
                  {selectedClass && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => {
                          const cls = classesList.find(c => String(c.id) === String(selectedClass));
                          const school = cls ? schoolsList.find(s => String(s.IDETABLISSEMENT || s.id) === String(cls.schoolId)) : null;
                          printMatrice(
                            cls ? cls.name : 'Classe',
                            parseInt(selectedTrimester, 10),
                            classSubjects,
                            classAverages,
                            school ? (school.ET_DENOMMINATION || school.name) : 'Hînneh Éducation'
                          );
                        }}
                        variant="outline"
                        className="gap-2"
                      >
                        <Printer className="h-4 w-4" />
                        Imprimer
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const cls = classesList.find(c => String(c.id) === String(selectedClass));
                          const school = cls ? schoolsList.find(s => String(s.IDETABLISSEMENT || s.id) === String(cls.schoolId)) : null;
                          if (!cls) return;
                          exportMatrixToPdf({
                            classRoom: cls,
                            trimester: parseInt(selectedTrimester, 10),
                            schoolName: school ? (school.ET_DENOMMINATION || school.name) : 'Hînneh Éducation',
                            subjects: classSubjects,
                            rows: classAverages,
                          });
                        }}
                        className="gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        PDF
                      </Button>
                      <Button
                        onClick={() => {
                          const cls = classesList.find(c => String(c.id) === String(selectedClass));
                          const school = cls ? schoolsList.find(s => String(s.IDETABLISSEMENT || s.id) === String(cls.schoolId)) : null;
                          if (!cls) return;
                          exportMatrixToExcel({
                            classRoom: cls,
                            trimester: parseInt(selectedTrimester, 10),
                            schoolName: school ? (school.ET_DENOMMINATION || school.name) : 'Hînneh Éducation',
                            subjects: classSubjects,
                            rows: classAverages,
                          });
                        }}
                        className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Classe</label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner la classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classesList.map((cls) => (
                          <SelectItem key={cls.id} value={String(cls.id)}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trimestre</label>
                    <Select value={selectedTrimester} onValueChange={setSelectedTrimester}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Trimestre 1</SelectItem>
                        <SelectItem value="2">Trimestre 2</SelectItem>
                        <SelectItem value="3">Trimestre 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedClass ? (
                  <div className="border rounded-xl overflow-x-auto shadow-sm">
                    <table className="w-full text-sm border-collapse text-left">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-12 text-center">Rang</th>
                          <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-28">Matricule</th>
                          <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nom & Prénoms</th>
                          {classSubjects.map((s) => (
                            <th key={s} className="p-3 font-semibold text-xs uppercase tracking-wider text-center text-muted-foreground" style={{ minWidth: '100px' }}>
                              {s}
                            </th>
                          ))}
                          <th className="p-3 font-semibold text-xs uppercase tracking-wider text-center text-primary bg-primary/5 w-24">Moy. Gen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classAverages.map((row) => (
                          <tr key={row.student.id} className="border-b border-border hover:bg-accent/40 transition-colors">
                            <td className="p-3 text-center font-mono font-bold text-muted-foreground">{row.rank}</td>
                            <td className="p-3 font-mono text-xs">{row.student.matricule}</td>
                            <td className="p-3 font-semibold">{row.student.lastName.toUpperCase()} {row.student.firstName}</td>
                            {classSubjects.map((s) => {
                              const grade = row.subjectAverages[s];
                              return (
                                <td key={s} className={`p-3 text-center font-bold ${grade !== undefined && grade < 10 ? 'text-destructive' : ''}`}>
                                  {grade !== undefined ? grade.toFixed(2) : '-'}
                                </td>
                              );
                            })}
                            <td className="p-3 text-center font-bold bg-primary/5 text-primary text-base">{row.generalAverage.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Veuillez sélectionner une classe pour afficher la matrice des notes.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: FICHE DE NOTES */}
          <TabsContent value="fiche" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Fiche de Notes de l'Enseignant</CardTitle>
                    <CardDescription>
                      Grille de saisie et suivi des notes par matière et par trimestre
                    </CardDescription>
                  </div>
                  {selectedClass && selectedSubject && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const cls = classesList.find(c => String(c.id) === String(selectedClass));
                          const school = cls ? schoolsList.find(s => String(s.IDETABLISSEMENT || s.id) === String(cls.schoolId)) : null;
                          if (!cls) return;
                          exportTeacherSheetToPdf({
                            classRoom: cls,
                            subject: selectedSubject,
                            trimester: parseInt(selectedTrimester, 10),
                            schoolName: school ? (school.ET_DENOMMINATION || school.name) : 'Hînneh Éducation',
                            teacherName: localStorage.getItem('username') || '',
                            students: studentsList,
                            evaluations: evaluationsList,
                          });
                        }}
                        className="gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const cls = classesList.find(c => String(c.id) === String(selectedClass));
                          const school = cls ? schoolsList.find(s => String(s.IDETABLISSEMENT || s.id) === String(cls.schoolId)) : null;
                          if (!cls) return;
                          exportTeacherSheetToExcel({
                            classRoom: cls,
                            subject: selectedSubject,
                            trimester: parseInt(selectedTrimester, 10),
                            schoolName: school ? (school.ET_DENOMMINATION || school.name) : 'Hînneh Éducation',
                            teacherName: localStorage.getItem('username') || '',
                            students: studentsList,
                            evaluations: evaluationsList,
                          });
                        }}
                        className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        Excel
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Classe</label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner la classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classesList.map((cls) => (
                          <SelectItem key={cls.id} value={String(cls.id)}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Matière</label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner la matière" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trimestre</label>
                    <Select value={selectedTrimester} onValueChange={setSelectedTrimester}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Trimestre 1</SelectItem>
                        <SelectItem value="2">Trimestre 2</SelectItem>
                        <SelectItem value="3">Trimestre 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedClass && selectedSubject ? (
                  <div className="border rounded-xl overflow-x-auto shadow-sm">
                    <table className="w-full text-sm border-collapse text-left">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-12 text-center">N°</th>
                          <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-28">Matricule</th>
                          <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nom & Prénoms</th>
                          {teacherSheetData.columns.map((col) => (
                            <th key={col.key} className="p-3 font-semibold text-xs uppercase tracking-wider text-center text-muted-foreground" style={{ minWidth: '100px' }}>
                              {col.label}<br /><span className="text-[10px] font-normal">coef {col.coefficient}</span>
                            </th>
                          ))}
                          <th className="p-3 font-semibold text-xs uppercase tracking-wider text-center text-primary bg-primary/5 w-24">Moyenne</th>
                          <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-40">Observation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacherSheetData.rows.map((row, idx) => (
                          <tr key={row.student.id} className="border-b border-border hover:bg-accent/40 transition-colors">
                            <td className="p-3 text-center font-mono font-bold text-muted-foreground">{idx + 1}</td>
                            <td className="p-3 font-mono text-xs">{row.student.matricule}</td>
                            <td className="p-3 font-semibold">{row.student.lastName.toUpperCase()} {row.student.firstName}</td>
                            {teacherSheetData.columns.map((col) => {
                              const note = row.notes[col.key];
                              return (
                                <td key={col.key} className="p-3 text-center font-bold">
                                  {note !== undefined ? note.toFixed(2) : '-'}
                                </td>
                              );
                            })}
                            <td className="p-3 text-center font-bold bg-primary/5 text-primary text-base">
                              {row.average !== undefined ? row.average.toFixed(2) : '-'}
                            </td>
                            <td className="p-3 text-sm text-muted-foreground"></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Veuillez sélectionner une classe, une matière et un trimestre pour afficher la fiche de notes.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: MAJORS PAR NIVEAU */}
          <TabsContent value="majors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-6 w-6 text-orange-500 animate-pulse" />
                  Majors par Niveau d'Études
                </CardTitle>
                <CardDescription>
                  Les 3 meilleurs élèves par niveau d'études, classés par moyenne générale sur l'ensemble de l'établissement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex gap-4 max-w-xs">
                  <div className="w-full space-y-2">
                    <label className="text-sm font-medium">Trimestre Cible</label>
                    <Select value={selectedTrimester} onValueChange={setSelectedTrimester}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Trimestre 1</SelectItem>
                        <SelectItem value="2">Trimestre 2</SelectItem>
                        <SelectItem value="3">Trimestre 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(majorsByLevel).map(([level, list]) => (
                    <Card key={level} className="border border-border/80 shadow-sm overflow-hidden">
                      <CardHeader className="bg-muted/40 py-3">
                        <CardTitle className="text-md font-bold uppercase tracking-wider text-primary flex justify-between items-center">
                          <span>Niveau: {level}</span>
                          <Badge variant="secondary">{list.length} majors</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-border">
                          {list.map((item, idx) => (
                            <div key={item.student.id} className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                  idx === 0 ? 'bg-yellow-500 text-white' : 
                                  idx === 1 ? 'bg-gray-400 text-white' : 'bg-amber-600 text-white'
                                }`}>
                                  #{idx + 1}
                                </div>
                                <div>
                                  <p className="font-bold text-sm">{item.student.lastName.toUpperCase()} {item.student.firstName}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{item.student.matricule} · {item.className}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className="text-base font-bold text-primary bg-primary/5 py-1 px-2 border-primary/20">
                                  {item.generalAverage.toFixed(2)}/20
                                </Badge>
                              </div>
                            </div>
                          ))}
                          {list.length === 0 && (
                            <div className="p-4 text-center text-muted-foreground text-sm italic">
                              Aucun élève classé à ce niveau.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: PV DE CLASSE */}
          <TabsContent value="pv" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>PV de Conseil de Classe</CardTitle>
                    <CardDescription>
                      Générez le procès-verbal officiel du conseil de classe trimestriel conforme aux normes ivoiriennes
                    </CardDescription>
                  </div>
                  {selectedClass && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => {
                          const cls = classesList.find(c => String(c.id) === String(selectedClass));
                          const school = cls ? schoolsList.find(s => String(s.IDETABLISSEMENT || s.id) === String(cls.schoolId)) : null;
                          printPV(
                            cls ? cls.name : 'Classe',
                            parseInt(selectedTrimester, 10),
                            school ? (school.ET_DENOMMINATION || school.name) : 'Hînneh Éducation',
                            pvStats,
                            pvDistinctions,
                            pvSanctions,
                            classAverages,
                            councilDecisions
                          );
                        }}
                        className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Printer className="h-4 w-4" />
                        Imprimer
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const cls = classesList.find(c => String(c.id) === String(selectedClass));
                          const school = cls ? schoolsList.find(s => String(s.IDETABLISSEMENT || s.id) === String(cls.schoolId)) : null;
                          if (!cls) return;
                          exportPVToPdf({
                            classRoom: cls,
                            trimester: parseInt(selectedTrimester, 10),
                            schoolName: school ? (school.ET_DENOMMINATION || school.name) : 'Hînneh Éducation',
                            stats: pvStats,
                            distinctions: pvDistinctions,
                            sanctions: pvSanctions,
                            rows: classAverages,
                            decisions: councilDecisions,
                          });
                        }}
                        className="gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const cls = classesList.find(c => String(c.id) === String(selectedClass));
                          const school = cls ? schoolsList.find(s => String(s.IDETABLISSEMENT || s.id) === String(cls.schoolId)) : null;
                          if (!cls) return;
                          exportPVToExcel({
                            classRoom: cls,
                            trimester: parseInt(selectedTrimester, 10),
                            schoolName: school ? (school.ET_DENOMMINATION || school.name) : 'Hînneh Éducation',
                            stats: pvStats,
                            distinctions: pvDistinctions,
                            sanctions: pvSanctions,
                            rows: classAverages,
                            decisions: councilDecisions,
                          });
                        }}
                        className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        Excel
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Classe</label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner la classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classesList.map((cls) => (
                          <SelectItem key={cls.id} value={String(cls.id)}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trimestre</label>
                    <Select value={selectedTrimester} onValueChange={setSelectedTrimester}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Trimestre 1</SelectItem>
                        <SelectItem value="2">Trimestre 2</SelectItem>
                        <SelectItem value="3">Trimestre 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedClass ? (
                  <div className="space-y-6">
                    {/* PV Panels summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="border border-border p-4 bg-muted/20">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Effectif</p>
                        <p className="text-2xl font-bold mt-1 font-mono">{pvStats.effectif} <span className="text-xs text-muted-foreground font-sans">({pvStats.filles} F / {pvStats.garcons} G)</span></p>
                      </Card>
                      <Card className="border border-border p-4 bg-muted/20">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Moyenne Classe</p>
                        <p className="text-2xl font-bold mt-1 font-mono text-primary">{pvStats.moyenneGenerale.toFixed(2)}/20</p>
                      </Card>
                      <Card className="border border-border p-4 bg-muted/20">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Extrêmes</p>
                        <p className="text-md font-bold mt-2 font-mono">Max: {pvStats.plusForteMoyenne.toFixed(2)}<br/>Min: {pvStats.plusFaibleMoyenne.toFixed(2)}</p>
                      </Card>
                      <Card className="border border-border p-4 bg-muted/20">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Taux Réussite</p>
                        <p className="text-2xl font-bold mt-1 font-mono text-green-700">{pvStats.tauxReussite}%</p>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="border border-green-100 bg-green-50/20">
                        <CardHeader className="py-3 bg-green-50/50">
                          <CardTitle className="text-sm font-bold text-green-800">Distinctions (Moyenne &gt;= 12)</CardTitle>
                        </CardHeader>
                        <CardContent className="py-4">
                          <ul className="text-sm space-y-1 list-disc list-inside">
                            {pvDistinctions.slice(0, 10).map((d, i) => (
                              <li key={i}><strong>{d.name}</strong>: {d.average.toFixed(2)}</li>
                            ))}
                            {pvDistinctions.length === 0 && <li className="text-muted-foreground italic">Néant</li>}
                            {pvDistinctions.length > 10 && <li className="text-muted-foreground">Et {pvDistinctions.length - 10} autres...</li>}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card className="border border-destructive/10 bg-destructive/5">
                        <CardHeader className="py-3 bg-destructive/10">
                          <CardTitle className="text-sm font-bold text-destructive">Sanctions (Moyenne &lt; 10)</CardTitle>
                        </CardHeader>
                        <CardContent className="py-4">
                          <ul className="text-sm space-y-1 list-disc list-inside">
                            {pvSanctions.slice(0, 10).map((s, i) => (
                              <li key={i} className="text-destructive"><strong>{s.name}</strong>: {s.average.toFixed(2)}</li>
                            ))}
                            {pvSanctions.length === 0 && <li className="text-muted-foreground italic">Néant</li>}
                            {pvSanctions.length > 10 && <li className="text-muted-foreground">Et {pvSanctions.length - 10} autres...</li>}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Nominative table with inputs */}
                    <Card>
                      <CardHeader className="py-4">
                        <CardTitle className="text-md">Avis et décisions du Conseil de Classe</CardTitle>
                        <CardDescription>Ajustez les décisions officielles de fin de trimestre pour chaque élève avant impression</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="border-t">
                          <table className="w-full text-sm border-collapse text-left">
                            <thead>
                              <tr className="bg-muted/30 border-b">
                                <th className="p-3 w-12 text-center font-bold text-xs uppercase text-muted-foreground">Rang</th>
                                <th className="p-3 w-28 font-bold text-xs uppercase text-muted-foreground">Matricule</th>
                                <th className="p-3 font-bold text-xs uppercase text-muted-foreground">Nom & Prénoms</th>
                                <th className="p-3 w-24 text-center font-bold text-xs uppercase text-muted-foreground">Moyenne</th>
                                <th className="p-3 w-32 font-bold text-xs uppercase text-muted-foreground text-center">Absences (jours)</th>
                                <th className="p-3 w-64 font-bold text-xs uppercase text-muted-foreground">Décision Conseil</th>
                              </tr>
                            </thead>
                            <tbody>
                              {classAverages.map((row) => {
                                const currentDecision = councilDecisions[row.student.id] || (row.generalAverage >= 12 ? "Félicitations du Conseil" : row.generalAverage >= 10 ? "Admis" : "Avertissement travail");
                                return (
                                  <tr key={row.student.id} className="border-b hover:bg-accent/40 transition-colors">
                                    <td className="p-3 text-center font-mono font-bold text-muted-foreground">{row.rank}</td>
                                    <td className="p-3 font-mono text-xs">{row.student.matricule}</td>
                                    <td className="p-3 font-semibold">{row.student.lastName.toUpperCase()} {row.student.firstName}</td>
                                    <td className="p-3 text-center font-bold text-base">{row.generalAverage.toFixed(2)}</td>
                                    <td className="p-3 text-center font-mono text-xs">0</td>
                                    <td className="p-3">
                                      <Select 
                                        value={currentDecision} 
                                        onValueChange={(val) => setCouncilDecisions(prev => ({ ...prev, [row.student.id]: val }))}
                                      >
                                        <SelectTrigger className="w-full bg-background border-border">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Félicitations du Conseil">Tableau d'Honneur - Félicitations</SelectItem>
                                          <SelectItem value="Encouragements du Conseil">Tableau d'Honneur - Encouragements</SelectItem>
                                          <SelectItem value="Admis">Admis au trimestre suivant</SelectItem>
                                          <SelectItem value="Avertissement travail">Avertissement de travail</SelectItem>
                                          <SelectItem value="Blâme travail / Redoublement proposé">Blâme travail / Redoublement</SelectItem>
                                          <SelectItem value="Exclusion proposée">Exclusion proposée</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Veuillez sélectionner une classe pour afficher le PV de classe.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulletins" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Bulletins scolaires</CardTitle>
                    <CardDescription>
                      Gestion et publication des bulletins par classe et trimestre
                    </CardDescription>
                  </div>
                  <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <FileText className="h-4 w-4 mr-2" />
                        Générer bulletin
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Générer un bulletin</DialogTitle>
                        <DialogDescription>
                          Sélectionnez la classe et le trimestre pour générer ou régénérer les bulletins.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="class">Classe</Label>
                          <Select value={genClassId} onValueChange={setGenClassId}>
                            <SelectTrigger id="class">
                              <SelectValue placeholder="Sélectionner une classe" />
                            </SelectTrigger>
                            <SelectContent>
                              {classesList.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="trimester">Trimestre</Label>
                          <Select value={genTrimester} onValueChange={setGenTrimester}>
                            <SelectTrigger id="trimester">
                              <SelectValue placeholder="Sélectionner un trimestre" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Trimestre 1</SelectItem>
                              <SelectItem value="2">Trimestre 2</SelectItem>
                              <SelectItem value="3">Trimestre 3</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setGenerateOpen(false)}>
                          Annuler
                        </Button>
                        <Button onClick={handleGenerateBulletin}>Générer</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Dialog de sélection d'élève pour l'aperçu individuel */}
                  <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                    <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Aperçu des bulletins</DialogTitle>
                        <DialogDescription>
                          Sélectionnez un élève de la classe <strong>{classesList.find(c => String(c.id) === String(previewClassId))?.name}</strong> pour visualiser et imprimer son bulletin du <strong>trimestre {previewTrimester}</strong>.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-2">
                        {studentsList
                          .filter(s => String(s.classId) === String(previewClassId) && s.status === 'actif')
                          .map((student) => {
                            const classRoom = classesList.find(c => String(c.id) === String(previewClassId)) || null;
                            const school = classRoom ? schoolsList.find(sc => String(sc.IDETABLISSEMENT) === String(classRoom.schoolId)) || null : null;
                            return (
                              <div key={student.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors">
                                <div>
                                  <div className="font-semibold text-sm">{student.lastName.toUpperCase()} {student.firstName}</div>
                                  <div className="text-xs text-muted-foreground font-mono">{student.matricule}</div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => printBulletins([student], evaluationsList, classRoom, school, previewTrimester)}
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  Bulletin
                                </Button>
                              </div>
                            );
                          })}
                        {studentsList.filter(s => String(s.classId) === String(previewClassId) && s.status === 'actif').length === 0 && (
                          <div className="text-center text-muted-foreground text-sm py-8">
                            Aucun élève trouvé dans cette classe.
                          </div>
                        )}
                      </div>
                      <DialogFooter className="border-t pt-4">
                        <Button variant="outline" onClick={() => setPreviewOpen(false)} className="mr-auto">
                          Fermer
                        </Button>
                        <Button 
                          onClick={() => {
                            handlePrintClassBulletins(previewClassId || '', previewTrimester);
                            setPreviewOpen(false);
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Imprimer toute la classe
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={bulletinColumns}
                  data={bulletinsList}
                  searchable
                  exportable
                />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                label="Bulletins brouillon"
                value={bulletinsList.filter((b) => b.status === 'brouillon').length}
                icon={<FileText className="h-5 w-5" />}
                color="text-yellow-600"
              />
              <MetricCard
                label="Bulletins validés"
                value={bulletinsList.filter((b) => b.status === 'valide').length}
                icon={<CheckCircle className="h-5 w-5" />}
                color="text-blue-600"
              />
              <MetricCard
                label="Bulletins publiés"
                value={bulletinsList.filter((b) => b.status === 'publie').length}
                icon={<Send className="h-5 w-5" />}
                color="text-green-600"
              />
            </div>
          </TabsContent>

          <TabsContent value="statistiques" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Moyenne par classe</CardTitle>
                  <CardDescription>
                    Évolution des moyennes sur les trois trimestres
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PerformanceLineChart />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribution des rangs</CardTitle>
                  <CardDescription>
                    Répartition des élèves par tranche de notes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {rankDistribution.map((item) => {
                      const maxCount = Math.max(...rankDistribution.map((d) => d.count));
                      const percentage = (item.count / maxCount) * 100;
                      return (
                        <div key={item.range} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{item.range}/20</span>
                            <span className="text-muted-foreground">
                              {item.count} élèves
                            </span>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.6, delay: 0.1 }}
                              className="h-full bg-primary rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performance par matière</CardTitle>
                <CardDescription>
                  Heatmap des moyennes par matière (toutes classes confondues)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {subjectPerformance.map((item) => {
                    const average = item.average;
                    const getColor = (avg: number) => {
                      if (avg >= 16) return 'bg-green-500';
                      if (avg >= 14) return 'bg-green-400';
                      if (avg >= 12) return 'bg-yellow-400';
                      if (avg >= 10) return 'bg-orange-400';
                      return 'bg-red-400';
                    };
                    const getTextColor = (avg: number) => {
                      if (avg >= 10) return 'text-white';
                      return 'text-white';
                    };
                    return (
                      <motion.div
                        key={item.subject}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className={`p-4 rounded-lg ${getColor(
                          average
                        )} ${getTextColor(average)} relative overflow-hidden`}
                      >
                        <div className="relative z-10">
                          <p className="text-xs font-medium mb-1 opacity-90">
                            {item.subject}
                          </p>
                          <p className="text-2xl font-bold">
                            {average.toFixed(1)}
                            <span className="text-sm opacity-75">/20</span>
                          </p>
                          <div className="flex items-center gap-1 mt-2">
                            <Badge
                              variant="secondary"
                              className="text-xs bg-white/20 text-white border-0"
                            >
                              Coef. {item.coefficient}
                            </Badge>
                            {average >= 12 ? (
                              <TrendingUp className="h-3 w-3 opacity-75" />
                            ) : (
                              <TrendingDown className="h-3 w-3 opacity-75" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: DISTINCTIONS */}
          <TabsContent value="distinctions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Distinctions et Honneurs</CardTitle>
                    <CardDescription>
                      Calcul automatique des distinctions selon les critères officiels ivoiriens
                    </CardDescription>
                  </div>
                  {selectedClass && (
                    <Button variant="outline" onClick={() => {
                      const cls = classesList.find(c => String(c.id) === String(selectedClass));
                      const school = cls ? schoolsList.find(s => String(s.IDETABLISSEMENT) === String(cls.schoolId)) : null;
                      // Imprimer les distinctions
                      alert('Impression des distinctions en cours...');
                    }}>
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimer
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedClass ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border border-border p-4 bg-gradient-to-br from-yellow-50 to-yellow-100">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Tableau d'Honneur</p>
                        <p className="text-2xl font-bold mt-1 font-mono text-yellow-700">{distinctions.tableauHonneur.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Moyenne ≥ 12 + toutes matières ≥ 10</p>
                      </Card>
                      <Card className="border border-border p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Félicitations</p>
                        <p className="text-2xl font-bold mt-1 font-mono text-blue-700">{distinctions.felicitations.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Moyenne ≥ 14</p>
                      </Card>
                      <Card className="border border-border p-4 bg-gradient-to-br from-green-50 to-green-100">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Encouragements</p>
                        <p className="text-2xl font-bold mt-1 font-mono text-green-700">{distinctions.encouragements.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Moyenne entre 10 et 12</p>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Tableau d'Honneur + Félicitations + Encouragements</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1 list-disc list-inside">
                            {distinctions.tableauHonneurFelicitationsEncouragements.map((d: any, i: number) => (
                              <li key={i}><strong>{d.student.lastName.toUpperCase()} {d.student.firstName}</strong>: {d.generalAverage.toFixed(2)}</li>
                            ))}
                            {distinctions.tableauHonneurFelicitationsEncouragements.length === 0 && <li className="text-muted-foreground italic">Néant</li>}
                          </ul>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Tableau d'Honneur + Félicitations</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1 list-disc list-inside">
                            {distinctions.tableauHonneurFelicitations.map((d: any, i: number) => (
                              <li key={i}><strong>{d.student.lastName.toUpperCase()} {d.student.firstName}</strong>: {d.generalAverage.toFixed(2)}</li>
                            ))}
                            {distinctions.tableauHonneurFelicitations.length === 0 && <li className="text-muted-foreground italic">Néant</li>}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Veuillez sélectionner une classe pour afficher les distinctions.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: REPÊCHAGE */}
          <TabsContent value="repêchage" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Module de Repêchage</CardTitle>
                    <CardDescription>
                      Identification des élèves avec moyenne inferieure a 10 et calcul des points necessaires par trimestre
                    </CardDescription>
                  </div>
                  {selectedClass && (
                    <Button variant="outline" onClick={() => {
                      const cls = classesList.find(c => String(c.id) === String(selectedClass));
                      const school = cls ? schoolsList.find(s => String(s.IDETABLISSEMENT) === String(cls.schoolId)) : null;
                      // Imprimer le rapport de repêchage
                      alert('Impression du rapport de repêchage en cours...');
                    }}>
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimer rapport
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedClass ? (
                  <div className="space-y-6">
                    <div>
                      <Label className="mb-2 block">Filtrer les classes avec élèves à repêcher</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classesWithRepêchage.map((item: any, i: number) => (
                          <Card 
                            key={i} 
                            className="border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setSelectedClass(item.class.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-sm">{item.class.name}</p>
                                  <p className="text-xs text-muted-foreground">{item.repêchageCount} élève(s) à repêcher</p>
                                </div>
                                <div className="text-2xl font-bold text-red-600">
                                  {item.repêchageCount}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {classesWithRepêchage.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground col-span-full">
                            <p>Aucune classe avec des élèves à repêcher.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Button variant="ghost" onClick={() => setSelectedClass('')}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Retour à la liste des classes
                    </Button>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border border-border p-4 bg-gradient-to-br from-red-50 to-red-100">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Eleves inferieur a 10</p>
                        <p className="text-2xl font-bold mt-1 font-mono text-red-700">{repêchage.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Moyenne inferieure a 10</p>
                      </Card>
                      <Card className="border border-border p-4 bg-gradient-to-br from-orange-50 to-orange-100">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Moyenne Points Nécessaires</p>
                        <p className="text-2xl font-bold mt-1 font-mono text-orange-700">
                          {repêchage.length > 0 ? (repêchage.reduce((sum: number, r: any) => sum + parseFloat(r.pointsNeeded), 0) / repêchage.length).toFixed(2) : '0'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Pour atteindre la moyenne de 10</p>
                      </Card>
                      <Card className="border border-border p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Moyenne Annuelle</p>
                        <p className="text-2xl font-bold mt-1 font-mono text-blue-700">
                          {repêchage.length > 0 ? (repêchage.reduce((sum: number, r: any) => sum + r.annualAverage, 0) / repêchage.length).toFixed(2) : '0'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Moyenne sur tous les trimestres</p>
                      </Card>
                    </div>

                    {repêchage.filter((r: any) => !removedFromRepêchage.has(r.student.id)).length > 0 ? (
                      <div className="space-y-4">
                        {repêchage.filter((r: any) => !removedFromRepêchage.has(r.student.id)).map((r: any, i: number) => (
                          <Card key={i} className="border border-border">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">{r.student.lastName.toUpperCase()} {r.student.firstName}</CardTitle>
                                <div className="flex gap-2">
                                  <span className="text-sm font-mono bg-red-100 text-red-700 px-2 py-1 rounded">
                                    Moy: {r.currentAverage.toFixed(2)}
                                  </span>
                                  <span className="text-sm font-mono bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                    Besoin: +{r.pointsNeeded}
                                  </span>
                                  <span className="text-sm font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    Annuelle: {r.annualAverage.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {/* Détails par trimestre */}
                                <div>
                                  <p className="font-medium mb-2 text-sm">Détails par trimestre:</p>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {r.trimesterAverages.map((ta: any, j: number) => (
                                      <div key={j} className="border rounded-lg p-3 bg-muted/30">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-semibold text-sm">T{ta.trimester}</span>
                                          <span className={`text-sm font-mono px-2 py-1 rounded ${ta.average < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {ta.average.toFixed(2)}
                                          </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-2">
                                          Points nécessaires: +{ta.pointsNeeded}
                                        </p>
                                        {ta.weakSubjects.length > 0 && (
                                          <div>
                                            <p className="text-xs font-medium mb-1">Matières faibles:</p>
                                            <ul className="text-xs list-disc list-inside text-muted-foreground">
                                              {ta.weakSubjects.map((ws: any, k: number) => (
                                                <li key={k}>{ws.subject}: {ws.grade.toFixed(2)} → +{ws.improvementNeeded}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Simulation d'ajustement */}
                                <div className="border-t pt-3">
                                  <p className="font-medium mb-2 text-sm">Simulation d'ajustement:</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                      <Label className="text-xs">Ajustement T1</Label>
                                      <Input 
                                        type="number" 
                                        step="0.1" 
                                        min="0" 
                                        max="20"
                                        placeholder="Points à ajouter"
                                        className="text-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs">Ajustement T2</Label>
                                      <Input 
                                        type="number" 
                                        step="0.1" 
                                        min="0" 
                                        max="20"
                                        placeholder="Points à ajouter"
                                        className="text-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs">Ajustement T3</Label>
                                      <Input 
                                        type="number" 
                                        step="0.1" 
                                        min="0" 
                                        max="20"
                                        placeholder="Points à ajouter"
                                        className="text-sm"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs">Nouvelle moyenne annuelle</Label>
                                      <div className="text-sm font-mono bg-green-100 text-green-700 px-2 py-1 rounded">
                                        {r.annualAverage.toFixed(2)}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Bouton de retrait */}
                                <div className="border-t pt-3">
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => {
                                      setRemovedFromRepêchage(prev => new Set(prev).add(r.student.id));
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Actualiser et retirer de la liste
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Aucun eleve avec moyenne inferieure a 10 dans cette classe.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: CERTIFICATS */}
          <TabsContent value="certificats" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Certificats de Fréquentation</CardTitle>
                    <CardDescription>
                      Génération des certificats de fréquentation officiels
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Classe</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une classe" />
                        </SelectTrigger>
                        <SelectContent>
                          {classesList.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Trimestre</Label>
                      <Select value={selectedTrimester} onValueChange={setSelectedTrimester}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un trimestre" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1er Trimestre</SelectItem>
                          <SelectItem value="2">2ème Trimestre</SelectItem>
                          <SelectItem value="3">3ème Trimestre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedClass && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-4 pt-2 border-t">
                        <Button
                          onClick={() => {
                            const cls = classesList.find(c => String(c.id) === String(selectedClass));
                            const school = cls ? schoolsList.find(s => String(s.IDETABLISSEMENT) === String(cls.schoolId)) : null;
                            const students = studentsList.filter(s => String(s.classId) === String(selectedClass) && s.status === 'actif');
                            if (students.length > 0) {
                              printAttendanceCertificate(students[0], cls || null, school || null, parseInt(selectedTrimester));
                            }
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Certificat individuel
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const cls = classesList.find(c => String(c.id) === String(selectedClass));
                            const school = cls ? schoolsList.find(s => String(s.IDETABLISSEMENT) === String(cls.schoolId)) : null;
                            const students = studentsList.filter(s => String(s.classId) === String(selectedClass) && s.status === 'actif');
                            if (students.length > 0) {
                              printClassAttendanceCertificates(students, cls || null, school || null, parseInt(selectedTrimester));
                            }
                          }}
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          Certificats classe entière
                        </Button>

                        <Button
                          variant="outline"
                          className="border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold"
                          onClick={() => {
                            const cls = classesList.find(c => String(c.id) === String(selectedClass));
                            const students = studentsList.filter(s => String(s.classId) === String(selectedClass) && s.status === 'actif');
                            const trimesterNum = parseInt(selectedTrimester) || 1;
                            
                            // Filtrage strict des élèves éligibles (Moyenne >= 12 et toutes matières >= 10)
                            const honneurStudents = students
                              .map(st => {
                                const avgRes = calculateStudentAverages(st, trimesterNum, evaluationsList);
                                const eligibility = isEligibleForTableauDHonneur(avgRes.generalAverage, avgRes.subjectAverages);
                                return {
                                  eligible: eligibility.eligible,
                                  studentName: `${st.lastName} ${st.firstName}`.trim(),
                                  studentClass: cls?.name || 'Classe',
                                  moyenne: avgRes.generalAverage.toFixed(2),
                                  trimester: trimesterNum,
                                  year: '2024-2025',
                                  directeurNom: 'KONATE Aboubacar Sidik',
                                };
                              })
                              .filter(item => item.eligible);

                            if (honneurStudents.length === 0) {
                              toast({
                                variant: 'destructive',
                                title: 'Aucun élève éligible au Tableau d\'Honneur',
                                description: 'Critères requis : Moyenne générale ≥ 12/20 et aucune note < 10/20 dans les matières.',
                              });
                              return;
                            }

                            toast({
                              title: 'Tableaux d\'Honneur générés',
                              description: `${honneurStudents.length} élève(s) méritant(s) qualifié(s) (Moyenne ≥ 12/20 sans note < 10).`,
                            });

                            printPlancheTableauxDHonneurKorhogo(honneurStudents);
                          }}
                        >
                          <Award className="h-4 w-4 mr-2 text-amber-600" />
                          Tableaux d'Honneur (Korhogo) — Élèves Éligibles (Moy ≥ 12 & Min ≥ 10)
                        </Button>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>Effectif de la classe: {studentsList.filter(s => String(s.classId) === String(selectedClass) && s.status === 'actif').length} élèves</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: PROGRESSION PAR ÉLÈVE */}
          <TabsContent value="progression" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Progression des notes par matière</CardTitle>
                    <CardDescription>
                      Visualisez l'évolution des notes d'un élève sur les 3 trimestres, y compris les matières confessionnelles
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:w-auto w-full">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Classe</label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="w-full sm:w-56">
                          <SelectValue placeholder="Sélectionner une classe" />
                        </SelectTrigger>
                        <SelectContent>
                          {classesList.map((cls) => (
                            <SelectItem key={cls.id} value={String(cls.id)}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Élève</label>
                      <Select value={selectedProgressStudent} onValueChange={setSelectedProgressStudent}>
                        <SelectTrigger className="w-full sm:w-64">
                          <SelectValue placeholder="Sélectionner un élève" />
                        </SelectTrigger>
                        <SelectContent>
                          {studentsList
                            .filter((s) => s.status === 'actif' && (selectedClass ? String(s.classId) === String(selectedClass) : true))
                            .sort((a, b) => a.lastName.localeCompare(b.lastName, 'fr'))
                            .map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.lastName.toUpperCase()} {student.firstName}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedProgressStudent ? (
                  <div className="space-y-6">
                    <StudentProgressChart
                      studentId={selectedProgressStudent}
                      subjects={subjects}
                      evaluations={evaluationsList}
                    />
                    <div className="text-sm text-muted-foreground italic">
                      Cliquez sur un élément de la légende pour masquer ou afficher une matière.
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Veuillez sélectionner une classe puis un élève pour afficher la progression de ses notes.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
