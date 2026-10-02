/**
 * ficheNotesManuellePrinter.ts
 * Module officiel d'impression et d'export (A4 Portrait/Paysage, PDF, Excel)
 * des fiches de relevé de notes vierges pour la saisie manuelle des enseignants.
 *
 * Reproduit fidèlement le modèle officiel :
 * - Logo établissement à gauche
 * - En-tête institutionnel au centre (Ministère, DRENA/IEPP, Établissement, Année, Titre souligné)
 * - Armoiries de la République de Côte d'Ivoire à droite (Union - Discipline - Travail)
 * - Tableau quadrillé avec N°, NOM ET PRENOMS, INTERROGATIONS (5 colonnes vierges) et DEVOIRS (4 colonnes vierges)
 */

import * as XLSX from 'xlsx';
import type { Student, ClassRoom, School } from '@/lib/index';
import { ARMOIRIES_CI_BASE64, LOGO_HINNEH_BASE64 } from './ficheNotesManuelleAssets';
import { resolveEnteteEtablissement } from './ecoleIdentite';

export { ARMOIRIES_CI_BASE64, LOGO_HINNEH_BASE64 };

export interface FicheNotesManuelleOptions {
  classRoom: ClassRoom;
  students: Student[];
  school?: School | any;
  anneeScolaire?: string;
  drena?: string;
  schoolName?: string;
  titre?: string;
  nbInterrogations?: number; // Défaut : 5 (selon modèle)
  nbDevoirs?: number;        // Défaut : 4 (selon modèle)
  extraEmptyRows?: number;   // Lignes vierges d'appoint (ex: 2 ou 5)
  orientation?: 'portrait' | 'landscape';
  subject?: string;          // Optionnel : mention de la matière
  teacherName?: string;      // Optionnel : mention du professeur
  showSubjectHeader?: boolean; // Afficher sous-titre matière/professeur si renseignés
}

/** Formate le nom d'un élève selon le style du modèle officiel (ex: "Coulibaly Fatoumata Abdou") */
export function formatNomEleveModele(student: Student): string {
  const rawNom = (student.lastName || (student as any).nom || '').trim();
  const rawPrenom = (student.firstName || (student as any).prenom || '').trim();

  const toTitleCaseWord = (w: string) => {
    if (!w) return '';
    if (w.includes("'")) {
      return w.split("'").map(part => part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '').join("'");
    }
    if (w.includes("-")) {
      return w.split("-").map(part => part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '').join("-");
    }
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  };

  const toTitleCase = (str: string) => str.split(/\s+/).map(toTitleCaseWord).join(' ');

  const nom = toTitleCase(rawNom);
  const prenom = toTitleCase(rawPrenom);

  return `${nom} ${prenom}`.trim();
}

/**
 * Résout les métadonnées institutionnelles (DRENA, Nom école, Année, Titre)
 */
export function resolveFicheMetadata(options: FicheNotesManuelleOptions) {
  const { classRoom, school } = options;

  const entete = resolveEnteteEtablissement({
    ecoleId: school?.id || (classRoom as any)?.ecole_id,
    code: school?.code || (classRoom as any)?.ET_CODEETABLISSEMENT,
    schoolName: school?.name || school?.ET_DENOMMINATION,
    className: classRoom?.name,
  });

  const city = (entete.city || 'KORHOGO').toUpperCase();
  let defaultDrena = 'DRENA KORHOGO / IEPP KORHOGO-EST';

  if (city.includes('ABIDJAN')) {
    defaultDrena = 'DRENA ABIDJAN 4 / IEPP ABIDJAN';
  } else if (city.includes('BOUAKE')) {
    defaultDrena = 'DRENA BOUAKE 1 / IEPP BOUAKE';
  } else if (city.includes('DALOA')) {
    defaultDrena = 'DRENA DALOA / IEPP DALOA';
  } else if (city.includes('YAM')) {
    defaultDrena = 'DRENA YAMOUSSOUKRO / IEPP YAMOUSSOUKRO';
  }

  const drena = options.drena?.trim() || defaultDrena;
  const schoolName = options.schoolName?.trim() || entete.fullName || 'Groupe Scolaire Confessionnel Islamique Hinneh de Korhogo';
  const anneeScolaire = options.anneeScolaire?.trim() || '2024-2025';

  const rawClassName = classRoom?.name || '6ème';
  const titre = options.titre?.trim() || `LISTE DE CLASSE ${rawClassName}`;

  const nbInterrogations = Math.max(1, Math.min(10, options.nbInterrogations ?? 5));
  const nbDevoirs = Math.max(1, Math.min(8, options.nbDevoirs ?? 4));
  const extraEmptyRows = Math.max(0, Math.min(20, options.extraEmptyRows ?? 0));
  const orientation = options.orientation || 'portrait';

  return {
    entete,
    drena,
    schoolName,
    anneeScolaire,
    titre,
    nbInterrogations,
    nbDevoirs,
    extraEmptyRows,
    orientation,
    logoUrl: entete.logo || LOGO_HINNEH_BASE64,
  };
}

/**
 * Génère le code HTML complet de la fiche de notes conforme au modèle fourni
 */
export function generateFicheNotesManuelleHtml(options: FicheNotesManuelleOptions): string {
  const meta = resolveFicheMetadata(options);
  const { students } = options;

  // Tri alphabétique des élèves par Nom puis Prénoms
  const sortedStudents = [...students].sort((a, b) => {
    const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase();
    const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase();
    return nameA.localeCompare(nameB, 'fr');
  });

  // Construction des lignes élèves
  const rowsHtml: string[] = [];

  sortedStudents.forEach((student, index) => {
    const formattedName = formatNomEleveModele(student);
    const interrogationCells = Array.from({ length: meta.nbInterrogations })
      .map(() => '<td class="col-interro"></td>')
      .join('');
    const devoirCells = Array.from({ length: meta.nbDevoirs })
      .map(() => '<td class="col-devoir"></td>')
      .join('');

    rowsHtml.push(`
      <tr>
        <td class="col-num">${index + 1}</td>
        <td class="col-name">${formattedName}</td>
        ${interrogationCells}
        ${devoirCells}
      </tr>
    `);
  });

  // Lignes vierges d'appoint si demandées
  if (meta.extraEmptyRows > 0) {
    const startIndex = sortedStudents.length;
    for (let i = 0; i < meta.extraEmptyRows; i++) {
      const interrogationCells = Array.from({ length: meta.nbInterrogations })
        .map(() => '<td class="col-interro"></td>')
        .join('');
      const devoirCells = Array.from({ length: meta.nbDevoirs })
        .map(() => '<td class="col-devoir"></td>')
        .join('');

      rowsHtml.push(`
        <tr class="empty-row">
          <td class="col-num">${startIndex + i + 1}</td>
          <td class="col-name">&nbsp;</td>
          ${interrogationCells}
          ${devoirCells}
        </tr>
      `);
    }
  }

  // Sous-barre optionnelle matière / professeur
  let subInfoHtml = '';
  if (options.showSubjectHeader && (options.subject || options.teacherName)) {
    subInfoHtml = `
      <div class="sub-info-bar">
        ${options.subject ? `<span><strong>Matière :</strong> ${options.subject}</span>` : ''}
        ${options.teacherName ? `<span><strong>Enseignant :</strong> ${options.teacherName}</span>` : ''}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>${meta.titre} - Fiche de notes</title>
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        @page {
          size: A4 ${meta.orientation};
          margin: 10mm 8mm 8mm 8mm;
        }

        body {
          font-family: 'Times New Roman', Times, serif;
          color: #000;
          background: #fff;
          padding: ${meta.orientation === 'landscape' ? '6px 12px' : '8px 12px'};
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* ── EN-TÊTE INSTITUTIONNEL CONFORME AU MODÈLE ── */
        .fiche-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 12px;
        }

        .header-left {
          width: 18%;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .school-logo-img {
          width: 82px;
          height: 82px;
          object-fit: contain;
        }

        .header-center {
          width: 64%;
          text-align: center;
          line-height: 1.35;
        }

        .header-ministry {
          font-size: 13px;
          font-style: italic;
          color: #000;
          margin-bottom: 2px;
        }

        .header-drena {
          font-size: 13.5px;
          font-weight: bold;
          font-style: italic;
          color: #000;
          letter-spacing: 0.3px;
          margin-bottom: 2px;
        }

        .header-school {
          font-size: 14.5px;
          font-weight: bold;
          font-style: italic;
          color: #000;
          margin-bottom: 2px;
        }

        .header-year {
          font-size: 13.5px;
          font-weight: bold;
          font-style: italic;
          color: #000;
          margin-bottom: 8px;
        }

        .header-title-box {
          margin-top: 4px;
        }

        .header-title {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 17px;
          font-weight: bold;
          text-transform: uppercase;
          text-decoration: underline;
          letter-spacing: 0.5px;
          color: #000;
          display: inline-block;
        }

        .header-right {
          width: 18%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .armoiries-img {
          width: 78px;
          height: 68px;
          object-fit: contain;
          margin-bottom: 2px;
        }

        .motto-text {
          font-size: 7.5px;
          font-weight: 600;
          color: #333;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          margin-top: 1px;
        }

        .sub-info-bar {
          display: flex;
          justify-content: space-around;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          margin-bottom: 10px;
          padding: 4px 10px;
          background: #f8fafc;
          border: 1px solid #000;
        }

        /* ── TABLEAU QUADRILLÉ CONFORME AU MODÈLE ── */
        table.fiche-table {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid #000;
          font-family: Arial, Helvetica, sans-serif;
          margin-bottom: 8px;
        }

        table.fiche-table th,
        table.fiche-table td {
          border: 1.5px solid #000;
          vertical-align: middle;
        }

        table.fiche-table thead tr th {
          background-color: #fff;
          font-weight: bold;
          font-size: 12px;
          text-transform: uppercase;
          color: #000;
          padding: 7px 4px;
          text-align: center;
          letter-spacing: 0.3px;
        }

        /* Largeurs de colonnes */
        .col-num {
          width: 38px;
          text-align: center;
          font-weight: bold;
          font-size: 11.5px;
        }

        .col-name {
          text-align: center;
          font-size: 11.5px;
          font-weight: 500;
          padding: 0 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .col-interro {
          width: 44px;
          min-width: 40px;
        }

        .col-devoir {
          width: 48px;
          min-width: 42px;
        }

        table.fiche-table tbody tr {
          height: 34px;
        }

        table.fiche-table tbody tr td {
          height: 34px;
          padding: 2px 4px;
        }

        table.fiche-table tbody tr:nth-child(even) {
          background-color: #ffffff;
        }

        @media print {
          body {
            padding: 0;
          }
          table.fiche-table {
            page-break-inside: auto;
          }
          table.fiche-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          table.fiche-table thead {
            display: table-header-group;
          }
          table.fiche-table tfoot {
            display: table-footer-group;
          }
        }
      </style>
    </head>
    <body>
      <!-- EN-TÊTE -->
      <div class="fiche-header">
        <div class="header-left">
          <img
            class="school-logo-img"
            src="${meta.logoUrl}"
            alt="Logo Établissement"
            onerror="this.onerror=null; this.src='${LOGO_HINNEH_BASE64}';"
          />
        </div>

        <div class="header-center">
          <div class="header-ministry">Ministère de l'Education Nationale et de l'Alphabétisation</div>
          <div class="header-drena">${meta.drena}</div>
          <div class="header-school">${meta.schoolName}</div>
          <div class="header-year">ANNEE SCOLAIRE ${meta.anneeScolaire}</div>
          <div class="header-title-box">
            <span class="header-title">${meta.titre}</span>
          </div>
        </div>

        <div class="header-right">
          <img
            class="armoiries-img"
            src="${ARMOIRIES_CI_BASE64}"
            alt="Armoiries République de Côte d'Ivoire"
          />
          <div class="motto-text">Union - Discipline - Travail</div>
        </div>
      </div>

      ${subInfoHtml}

      <!-- TABLEAU DE NOTES VIERGE -->
      <table class="fiche-table">
        <thead>
          <tr>
            <th class="col-num" rowspan="1">N°</th>
            <th class="col-name" rowspan="1" style="width: ${meta.orientation === 'landscape' ? '320px' : '260px'};">NOM ET PRENOMS</th>
            <th colspan="${meta.nbInterrogations}">INTERROGATIONS</th>
            <th colspan="${meta.nbDevoirs}">DEVOIRS</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

/**
 * Lance l'impression de la fiche de notes (A4)
 */
export function printFicheNotesManuelle(options: FicheNotesManuelleOptions): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up pour imprimer la fiche de notes.");
    return;
  }

  const html = generateFicheNotesManuelleHtml(options);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Déclenchement automatique après chargement des images
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };
}

/**
 * Télécharge la fiche de notes au format PDF via html2pdf
 */
export async function exportFicheNotesManuellePdf(options: FicheNotesManuelleOptions): Promise<void> {
  const meta = resolveFicheMetadata(options);
  const html = generateFicheNotesManuelleHtml(options);

  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  document.body.appendChild(container);

  try {
    const html2pdf = (await import('html2pdf.js')).default;
    const cleanClassName = (options.classRoom.name || 'Classe').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Fiche_de_notes_${cleanClassName}_${meta.anneeScolaire.replace(/[^0-9-]/g, '')}.pdf`;

    const opt = {
      margin: meta.orientation === 'landscape' ? [6, 8, 6, 8] : [8, 8, 8, 8],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: meta.orientation },
    };

    await html2pdf().set(opt).from(container).save();
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Exporte la grille de notation au format Excel (.xlsx)
 */
export function exportFicheNotesManuelleExcel(options: FicheNotesManuelleOptions): void {
  const meta = resolveFicheMetadata(options);
  const { students } = options;

  const sortedStudents = [...students].sort((a, b) => {
    const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase();
    const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase();
    return nameA.localeCompare(nameB, 'fr');
  });

  // Construction de la grille Excel
  const wsData: any[][] = [];

  // Lignes d'en-tête
  wsData.push([`MINISTÈRE DE L'ÉDUCATION NATIONALE ET DE L'ALPHABÉTISATION`]);
  wsData.push([meta.drena]);
  wsData.push([meta.schoolName]);
  wsData.push([`ANNÉE SCOLAIRE ${meta.anneeScolaire}`]);
  wsData.push([meta.titre]);
  if (options.subject || options.teacherName) {
    wsData.push([
      options.subject ? `Matière : ${options.subject}` : '',
      options.teacherName ? `Enseignant : ${options.teacherName}` : ''
    ]);
  }
  wsData.push([]); // Ligne vide

  // En-tête des colonnes
  const headers = ['N°', 'NOM ET PRENOMS'];
  for (let i = 1; i <= meta.nbInterrogations; i++) {
    headers.push(`INTERRO ${i}`);
  }
  for (let d = 1; d <= meta.nbDevoirs; d++) {
    headers.push(`DEVOIR ${d}`);
  }
  wsData.push(headers);

  // Lignes élèves
  sortedStudents.forEach((student, index) => {
    const row = [index + 1, formatNomEleveModele(student)];
    for (let i = 0; i < meta.nbInterrogations + meta.nbDevoirs; i++) {
      row.push('');
    }
    wsData.push(row);
  });

  // Lignes vierges d'appoint
  for (let k = 0; k < meta.extraEmptyRows; k++) {
    const row = [sortedStudents.length + k + 1, ''];
    for (let i = 0; i < meta.nbInterrogations + meta.nbDevoirs; i++) {
      row.push('');
    }
    wsData.push(row);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Largeurs de colonnes
  const colWidths = [{ wch: 6 }, { wch: 38 }];
  for (let i = 0; i < meta.nbInterrogations; i++) {
    colWidths.push({ wch: 11 });
  }
  for (let d = 0; d < meta.nbDevoirs; d++) {
    colWidths.push({ wch: 11 });
  }
  ws['!cols'] = colWidths;

  const cleanClassName = (options.classRoom.name || 'Classe').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.utils.book_append_sheet(wb, ws, cleanClassName.substring(0, 31));
  XLSX.writeFile(wb, `Fiche_de_notes_${cleanClassName}_${meta.anneeScolaire.replace(/[^0-9-]/g, '')}.xlsx`);
}

/**
 * Imprime en lot les fiches de notes de plusieurs classes
 */
export function printMultipleFichesNotesManuelles(optionsList: FicheNotesManuelleOptions[]): void {
  if (!optionsList || optionsList.length === 0) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up.");
    return;
  }

  const pagesHtml = optionsList.map((opts, index) => {
    const innerHtml = generateFicheNotesManuelleHtml(opts);
    const bodyContent = innerHtml.substring(
      innerHtml.indexOf('<body>') + 6,
      innerHtml.lastIndexOf('</body>')
    );
    return `
      <div class="sheet-page" style="${index < optionsList.length - 1 ? 'page-break-after: always;' : ''}">
        ${bodyContent}
      </div>
    `;
  }).join('');

  const firstMeta = resolveFicheMetadata(optionsList[0]);

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Fiches de notes - Lot de classes</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @page { size: A4 ${firstMeta.orientation}; margin: 8mm; }
        body { font-family: 'Times New Roman', Times, serif; color: #000; background: #fff; }
        .sheet-page { padding: 8px 12px; }
        @media print {
          .sheet-page { page-break-after: always; }
          .sheet-page:last-child { page-break-after: avoid; }
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };
}
