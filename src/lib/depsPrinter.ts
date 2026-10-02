import * as XLSX from 'xlsx';
import type { Student, School, ClassRoom, Evaluation } from '@/lib/index';
import { ARMOIRIES_CI_BASE64, LOGO_HINNEH_BASE64 } from './ficheNotesManuelleAssets';

export interface DepsReportOptions {
  school?: School | null;
  classRoom?: ClassRoom | null;
  trimester: number;
  students: Student[];
  evaluations: Evaluation[];
  anneeScolaire?: string;
  drena?: string;
  typePeriode?: 'trimestre' | 'semestre';
}

export interface StudentDepsData {
  id: string | number;
  matricule: string;
  nom: string;
  prenoms: string;
  sexe: string;
  dateNaissance: string;
  statutAffecte: string;
  statutScolaire: string;
  moyenne: number;
  rang: number;
  decision: string;
}

export function computeStudentDepsList(
  students: Student[],
  evaluations: Evaluation[],
  trimester: number
): { list: StudentDepsData[]; stats: any } {
  const listRaw = students.map((s) => {
    const sEvals = evaluations.filter(
      (e) => String(e.studentId) === String(s.id) && e.trimester === trimester
    );

    let moyenne = 0;
    if (sEvals.length > 0) {
      let totalPond = 0;
      let totalCoeff = 0;
      sEvals.forEach((ev) => {
        const coef = ev.coefficient || 1;
        totalPond += ev.note * coef;
        totalCoeff += coef;
      });
      moyenne = totalCoeff > 0 ? Number((totalPond / totalCoeff).toFixed(2)) : 0;
    }

    const sAny = s as any;
    const isAffecte = sAny.affected !== false && sAny.affecte !== false && (sAny.statutAffectation || 'AFFECTE').toUpperCase().includes('AFF');
    const isRedoublant = sAny.repeater === true || sAny.redoublant === true;

    return {
      id: s.id,
      matricule: s.matricule || `MENA-${s.id}`,
      nom: (s.lastName || sAny.nom || '').toUpperCase(),
      prenoms: s.firstName || sAny.prenom || '',
      sexe: (s.gender || sAny.sexe || 'M').toUpperCase().startsWith('F') ? 'F' : 'M',
      dateNaissance: s.dateOfBirth || sAny.dateNaissance || '01/01/2012',
      statutAffecte: isAffecte ? 'Affecté' : 'Non Affecté',
      statutScolaire: isRedoublant ? 'Redoublant' : 'Passant',
      moyenne,
      rang: 1,
      decision: '',
    };
  });

  // Tri par moyenne décroissante pour calcul des rangs
  listRaw.sort((a, b) => b.moyenne - a.moyenne);
  listRaw.forEach((item, index) => {
    item.rang = index + 1;
    if (item.moyenne >= 16) item.decision = "Tableau d'Honneur avec Félicitations";
    else if (item.moyenne >= 14) item.decision = "Tableau d'Honneur avec Encouragements";
    else if (item.moyenne >= 12) item.decision = "Tableau d'Honneur";
    else if (item.moyenne >= 10) item.decision = 'Admis / Satisfaisant';
    else if (item.moyenne >= 8.5) item.decision = 'Avertissement Travail';
    else item.decision = 'Blâme Travail';
  });

  // Calcul statistiques globales
  const total = listRaw.length;
  const garcons = listRaw.filter((s) => s.sexe === 'M').length;
  const filles = listRaw.filter((s) => s.sexe === 'F').length;
  const classesAvecNote = listRaw.filter((s) => s.moyenne > 0);
  const admis = listRaw.filter((s) => s.moyenne >= 10);
  const garconsAdmis = admis.filter((s) => s.sexe === 'M').length;
  const fillesAdmis = admis.filter((s) => s.sexe === 'F').length;

  const sommeMoy = listRaw.reduce((sum, s) => sum + s.moyenne, 0);
  const moyGenerale = total > 0 ? (sommeMoy / total).toFixed(2) : '0.00';
  const plusForte = listRaw.length > 0 ? Math.max(...listRaw.map((s) => s.moyenne)).toFixed(2) : '0.00';
  const plusFaible = listRaw.length > 0 ? Math.min(...listRaw.map((s) => s.moyenne)).toFixed(2) : '0.00';
  const tauxReussite = total > 0 ? ((admis.length / total) * 100).toFixed(1) : '0.0';

  const stats = {
    total,
    garcons,
    filles,
    admis: admis.length,
    garconsAdmis,
    fillesAdmis,
    tauxReussite,
    moyGenerale,
    plusForte,
    plusFaible,
  };

  return { list: listRaw, stats };
}

export function printBordereauDEPS(options: DepsReportOptions): void {
  const {
    school,
    classRoom,
    trimester,
    students,
    evaluations,
    anneeScolaire = '2024-2025',
    drena = 'DRENA KORHOGO / IEPP KORHOGO-EST',
    typePeriode = 'trimestre',
  } = options;

  const { list, stats } = computeStudentDepsList(students, evaluations, trimester);
  const className = classRoom?.name || 'Classe';
  const schoolName = school?.name || 'GROUPE SCOLAIRE CONFESSIONNEL ISLAMIQUE HINNEH';
  const schoolCode = (school as any)?.code || (school as any)?.ET_CODEETABLISSEMENT || '000000';
  const periodeLabel = typePeriode === 'semestre' ? `${trimester}er Semestre` : `${trimester}er Trimestre`;

  const rowsHtml = list
    .map(
      (item) => `
      <tr>
        <td style="text-align: center; font-weight: bold;">${item.rang}</td>
        <td style="text-align: center; font-family: monospace; font-weight: 600;">${item.matricule}</td>
        <td style="text-align: left; font-weight: bold;">${item.nom}</td>
        <td style="text-align: left;">${item.prenoms}</td>
        <td style="text-align: center;">${item.sexe}</td>
        <td style="text-align: center;">${item.dateNaissance}</td>
        <td style="text-align: center; font-size: 8.5px;">${item.statutAffecte}</td>
        <td style="text-align: center; font-size: 8.5px;">${item.statutScolaire}</td>
        <td style="text-align: center; font-weight: bold; ${item.moyenne < 10 ? 'color: #dc2626;' : 'color: #0f2444;'}">
          ${item.moyenne.toFixed(2)}
        </td>
        <td style="text-align: center; font-weight: bold;">${item.rang}<sup>${item.rang === 1 ? 'er' : 'e'}</sup></td>
        <td style="text-align: left; font-size: 8.5px;">${item.decision}</td>
      </tr>
    `
    )
    .join('');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Veuillez autoriser l'ouverture des popups pour imprimer le bordereau DEPS.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>Remontée DEPS - ${className} - ${periodeLabel}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 10mm 8mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
            color: #111827;
            background: #fff;
            padding: 10px;
            font-size: 9.5px;
          }
          .header-table {
            width: 100%;
            margin-bottom: 8px;
            border: none;
          }
          .header-table td {
            border: none;
            vertical-align: middle;
          }
          .title-banner {
            border: 1.5px solid #0f2444;
            background-color: #f1f5f9;
            padding: 6px;
            text-align: center;
            margin-bottom: 10px;
            border-radius: 4px;
          }
          .title-banner h1 {
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0f2444;
            letter-spacing: 0.5px;
          }
          .title-banner p {
            font-size: 9.5px;
            margin-top: 2px;
            color: #334155;
            font-weight: 600;
          }
          .kpi-grid {
            display: flex;
            justify-content: space-between;
            gap: 6px;
            margin-bottom: 10px;
          }
          .kpi-card {
            flex: 1;
            border: 1px solid #cbd5e1;
            padding: 5px;
            border-radius: 4px;
            background: #fafafa;
            text-align: center;
          }
          .kpi-title {
            font-size: 7.5px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: bold;
          }
          .kpi-val {
            font-size: 12px;
            font-weight: 800;
            color: #0f2444;
            margin-top: 1px;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }
          table.data-table th, table.data-table td {
            border: 1px solid #334155;
            padding: 4px 5px;
          }
          table.data-table th {
            background-color: #e2e8f0;
            color: #0f2444;
            font-size: 8.5px;
            font-weight: 700;
            text-align: center;
          }
          table.data-table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            page-break-inside: avoid;
          }
          .sig-box {
            width: 30%;
            text-align: center;
            border-top: 1px dashed #475569;
            padding-top: 4px;
            font-size: 8.5px;
            font-weight: bold;
          }
          .no-print-bar {
            max-width: 900px;
            margin: 0 auto 12px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #0f2444;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
          }
          @media print {
            .no-print-bar {
              display: none !important;
            }
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <span style="font-weight: bold; font-size: 12px;">📊 Bordereau Officiel de Remontée des Moyennes (DEPS / MENA)</span>
          <button onclick="window.print()" style="background: #22c55e; color: white; border: none; padding: 6px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px;">
            🖨️ Imprimer le Bordereau
          </button>
        </div>

        <table class="header-table">
          <tr>
            <td style="width: 20%; text-align: left;">
              <img src="${LOGO_HINNEH_BASE64}" style="max-height: 52px; object-fit: contain;" alt="Logo Hinneh" />
            </td>
            <td style="width: 60%; text-align: center;">
              <div style="font-size: 9px; font-style: italic; color: #374151;">RÉPUBLIQUE DE CÔTE D'IVOIRE</div>
              <div style="font-size: 8px; font-style: italic; color: #4b5563;">Union - Discipline - Travail</div>
              <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; margin-top: 2px;">MINISTÈRE DE L'ÉDUCATION NATIONALE ET DE L'ALPHABÉTISATION</div>
              <div style="font-size: 8.5px; font-weight: bold; color: #1e3a8a;">DIRECTION DE L'ENSEIGNEMENT PRIVÉ ET SCOLAIRE (DEPS)</div>
              <div style="font-size: 8.5px; font-weight: 600;">${drena}</div>
              <div style="font-size: 9px; font-weight: 800; color: #0f2444; margin-top: 2px;">${schoolName.toUpperCase()} (Code : ${schoolCode})</div>
            </td>
            <td style="width: 20%; text-align: right;">
              <img src="${ARMOIRIES_CI_BASE64}" style="max-height: 50px; object-fit: contain;" alt="Armoiries CI" />
            </td>
          </tr>
        </table>

        <div class="title-banner">
          <h1>BORDEREAU OFFICIEL DE REMONTÉE DES MOYENNES — ${periodeLabel.toUpperCase()}</h1>
          <p>CLASSE : <strong>${className}</strong> &nbsp;|&nbsp; ANNÉE SCOLAIRE : <strong>${anneeScolaire}</strong> &nbsp;|&nbsp; EFFECTIF : <strong>${stats.total} élèves (${stats.garcons} G, ${stats.filles} F)</strong></p>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-title">Effectif Classé</div>
            <div class="kpi-val">${stats.admis} / ${stats.total}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Taux de Réussite</div>
            <div class="kpi-val" style="color: ${Number(stats.tauxReussite) >= 50 ? '#059669' : '#dc2626'};">${stats.tauxReussite}%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Moyenne Classe</div>
            <div class="kpi-val">${stats.moyGenerale} / 20</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Plus Forte Moyenne</div>
            <div class="kpi-val" style="color: #059669;">${stats.plusForte}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Plus Faible Moyenne</div>
            <div class="kpi-val" style="color: #dc2626;">${stats.plusFaible}</div>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 24px;">N°</th>
              <th style="width: 85px;">Matricule MENA</th>
              <th>Nom</th>
              <th>Prénoms</th>
              <th style="width: 24px;">Sexe</th>
              <th style="width: 65px;">Né(e) le</th>
              <th style="width: 65px;">Statut</th>
              <th style="width: 65px;">Régime</th>
              <th style="width: 50px;">Moyenne</th>
              <th style="width: 35px;">Rang</th>
              <th>Décision / Mention</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            L'Éducateur de Niveau / Référent<br /><br /><br />
            (Signature & Date)
          </div>
          <div class="sig-box">
            Le Professeur Principal<br /><br /><br />
            (Signature & Date)
          </div>
          <div class="sig-box">
            Le Chef d'Établissement / DEPS<br /><br /><br />
            (Cachet & Signature)
          </div>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
}

export function exportExcelDEPS(options: DepsReportOptions): void {
  const {
    school,
    classRoom,
    trimester,
    students,
    evaluations,
    anneeScolaire = '2024-2025',
    drena = 'DRENA KORHOGO',
    typePeriode = 'trimestre',
  } = options;

  const { list, stats } = computeStudentDepsList(students, evaluations, trimester);
  const className = classRoom?.name || 'Classe';
  const schoolName = school?.name || 'GROUPE SCOLAIRE CONFESSIONNEL ISLAMIQUE HINNEH';
  const periodeLabel = typePeriode === 'semestre' ? `Semestre ${trimester}` : `Trimestre ${trimester}`;

  // Construction des lignes du classeur Excel
  const aoa: any[][] = [
    ['MINISTÈRE DE L’ÉDUCATION NATIONALE ET DE L’ALPHABÉTISATION (MENA)'],
    ['DIRECTION DE L’ENSEIGNEMENT PRIVÉ ET SCOLAIRE (DEPS)'],
    [`ÉTABLISSEMENT : ${schoolName}`],
    [`DRENA / INSPECTION : ${drena}`],
    [`CLASSE : ${className}`, `ANNÉE SCOLAIRE : ${anneeScolaire}`, `PÉRIODE : ${periodeLabel}`],
    [
      `EFFECTIF : ${stats.total}`,
      `GARÇONS : ${stats.garcons}`,
      `FILLES : ${stats.filles}`,
      `ADMIS (>=10) : ${stats.admis}`,
      `TAUX RÉUSSITE : ${stats.tauxReussite}%`,
      `MOYENNE CLASSE : ${stats.moyGenerale}`,
    ],
    [], // Ligne vide
    [
      'N°',
      'Matricule MENA',
      'Nom',
      'Prénoms',
      'Sexe',
      'Date de Naissance',
      'Statut Élève',
      'Statut Scolaire',
      'Classe',
      'Période',
      'Moyenne Trimestrielle',
      'Rang',
      'Décision du Conseil',
    ],
  ];

  list.forEach((item) => {
    aoa.push([
      item.rang,
      item.matricule,
      item.nom,
      item.prenoms,
      item.sexe,
      item.dateNaissance,
      item.statutAffecte,
      item.statutScolaire,
      className,
      periodeLabel,
      item.moyenne,
      item.rang,
      item.decision,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Largeurs de colonnes recommandées
  ws['!cols'] = [
    { wch: 5 }, // N°
    { wch: 16 }, // Matricule
    { wch: 22 }, // Nom
    { wch: 25 }, // Prénoms
    { wch: 6 }, // Sexe
    { wch: 14 }, // Date Nais
    { wch: 14 }, // Affecté
    { wch: 12 }, // Passant/Redoublant
    { wch: 12 }, // Classe
    { wch: 14 }, // Période
    { wch: 12 }, // Moyenne
    { wch: 6 }, // Rang
    { wch: 30 }, // Décision
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `DEPS_${className}`.substring(0, 31));

  const filename = `REMONTEE_DEPS_${className.replace(/\s+/g, '_')}_${periodeLabel.replace(/\s+/g, '_')}_${anneeScolaire}.xlsx`;
  XLSX.writeFile(wb, filename);
}
