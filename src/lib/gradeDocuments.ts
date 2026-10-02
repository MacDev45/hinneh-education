import type { Student, Evaluation, ClassRoom } from '@/lib/index';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  AlignmentType,
  BorderStyle,
  WidthType,
  VerticalAlign,
  PageOrientation,
  convertMillimetersToTwip,
  ShadingType,
} from 'docx';

const SCHOOL_YEAR = '2025 - 2026';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function escapeHtml(value: unknown): string {
  const str = String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadExcelHTML(htmlContent: string, filename: string) {
  const fullHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Feuille1</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; }
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; margin-bottom: 20px; }
        th, td { border: 1px solid #cccccc; padding: 6px 10px; text-align: left; }
        th { background-color: #f1f5f9; font-weight: bold; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;
  const blob = new Blob([fullHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const finalFilename = filename.endsWith('.xls') || filename.endsWith('.xlsx') ? filename : `${filename}.xls`;
  downloadBlob(blob, finalFilename);
}

function showPdfLoading() {
  const overlay = document.createElement('div');
  overlay.id = 'pdf-loading-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '99999';
  overlay.style.background = 'rgba(255,255,255,0.85)';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.fontFamily = 'Arial, sans-serif';
  overlay.innerHTML = `
    <div style="width:48px;height:48px;border:4px solid #e5e7eb;border-top-color:#1e3a8a;border-radius:50%;animation:spin 1s linear infinite;"></div>
    <div style="margin-top:16px;font-size:14px;color:#374151;font-weight:500;">Génération du PDF en cours...</div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  `;
  document.body.appendChild(overlay);
}

function hidePdfLoading() {
  const overlay = document.getElementById('pdf-loading-overlay');
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
  }
}

async function exportHtmlToPdf(
  html: string,
  filename: string,
  orientation: 'landscape' | 'portrait',
  callbacks?: { onStart?: () => void; onDone?: () => void }
) {
  callbacks?.onStart?.();
  showPdfLoading();

  // Délégation au prochain tick pour laisser l'UI afficher le chargement
  await new Promise((resolve) => setTimeout(resolve, 50));

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-12000px';
  iframe.style.top = '0';
  iframe.style.width = orientation === 'landscape' ? '1123px' : '794px';
  iframe.style.height = orientation === 'landscape' ? '794px' : '1123px';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Impossible d\'accéder au document de l\'iframe');
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    await new Promise((resolve) => setTimeout(resolve, 200));

    const html2pdf = (await import('html2pdf.js')).default;
    const worker = html2pdf();
    const opts = {
      margin: [8, 8, 8, 8],
      filename,
      image: { type: 'jpeg', quality: 0.85 },
      html2canvas: { scale: 1, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: orientation === 'landscape' ? 1123 : 794 },
      jsPDF: { unit: 'mm', format: 'a4', orientation },
      pagebreak: { mode: ['css'], avoid: 'tr' },
    } as unknown as Parameters<typeof worker.set>[0];
    worker.set(opts);
    await worker.from(iframeDoc.body).save();
  } finally {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
    hidePdfLoading();
    callbacks?.onDone?.();
  }
}

function docxCell(
  text: string,
  options: {
    bold?: boolean;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    width?: { size: number; type: (typeof WidthType)[keyof typeof WidthType] };
    bg?: string;
    colSpan?: number;
    rowSpan?: number;
  } = {}
): TableCell {
  const { bold, align = AlignmentType.LEFT, width, bg, colSpan, rowSpan } = options;
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 18, font: 'Arial' })],
        alignment: align,
      }),
    ],
    verticalAlign: VerticalAlign.CENTER,
    shading: bg ? { fill: bg, type: ShadingType.CLEAR } : undefined,
    width,
    columnSpan: colSpan,
    rowSpan,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    },
  });
}

function docxParagraph(text: string, options: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; size?: number; spacing?: { after?: number; before?: number } } = {}) {
  return new Paragraph({
    children: [new TextRun({ text, bold: options.bold, size: options.size ?? 20, font: 'Arial' })],
    alignment: options.align,
    spacing: options.spacing,
  });
}

// ─── MATRICE DES NOTES ───────────────────────────────────────────────────────

export interface MatrixRow {
  student: Student;
  subjectAverages: Record<string, number>;
  generalAverage: number;
  rank: number;
  annualAverage?: number;
}

export interface MatrixOptions {
  classRoom: ClassRoom;
  trimester: number;
  schoolName: string;
  subjects: string[];
  rows: MatrixRow[];
}

function buildMatrixHtml(opts: MatrixOptions): string {
  const { classRoom, trimester, schoolName, subjects, rows } = opts;
  const headerCells = subjects
    .map((s) => `<th style="padding:4px 2px;border:1px solid #000;font-size:9px;">${escapeHtml(s)}</th>`)
    .join('');
  const bodyRows = rows
    .map((row) => {
      const cells = subjects
        .map((s) => {
          const grade = row.subjectAverages[s];
          const val = grade !== undefined ? grade.toFixed(2) : '-';
          const color = grade !== undefined && grade < 10 ? 'color:red;' : '';
          return `<td style="border:1px solid #000;text-align:center;font-size:9px;font-weight:bold;${color}">${val}</td>`;
        })
        .join('');
      const annual = row.annualAverage !== undefined ? row.annualAverage.toFixed(2) : '-';
      return `
        <tr style="page-break-inside:avoid;">
          <td style="border:1px solid #000;text-align:center;font-size:9px;">${row.rank}</td>
          <td style="border:1px solid #000;text-align:center;font-family:monospace;font-size:9px;">${escapeHtml(row.student.matricule)}</td>
          <td style="border:1px solid #000;padding:3px 5px;font-size:9px;font-weight:bold;text-align:left;">${escapeHtml(row.student.lastName.toUpperCase())} ${escapeHtml(row.student.firstName)}</td>
          ${cells}
          <td style="border:1px solid #000;text-align:center;font-size:10px;font-weight:bold;background:#f2f2f2;">${row.generalAverage.toFixed(2)}</td>
          <td style="border:1px solid #000;text-align:center;font-size:10px;font-weight:bold;background:#e0e0e0;">${annual}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; padding: 10px; font-size: 10px; color: #000; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #000; padding: 3px; }
      .header { display: flex; justify-content: space-between; margin-bottom: 12px; }
      .title { text-align: center; margin: 12px 0; font-size: 14px; font-weight: bold; text-transform: uppercase; }
      .subtitle { text-align: center; margin-bottom: 8px; font-size: 11px; font-weight: bold; }
      .legend { font-size: 8px; margin-top: 8px; font-style: italic; }
      .signatures { display: flex; justify-content: space-between; margin-top: 25px; text-align: center; }
    </style>
    <div class="header">
      <div>
        <strong>MINISTÈRE DE L'ÉDUCATION NATIONALE</strong><br/>
        <strong>DE L'ENSEIGNEMENT TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE</strong><br/>
        Établissement: ${escapeHtml(schoolName)}<br/>
        Classe: ${escapeHtml(classRoom.name)}
      </div>
      <div style="text-align:right;">
        <strong>RÉPUBLIQUE DE CÔTE D'IVOIRE</strong><br/>
        Union - Discipline - Travail<br/>
        Année Scolaire: ${SCHOOL_YEAR}
      </div>
    </div>
    <div class="title">MATRICE DES RÉSULTATS - TRIMESTRE ${trimester}</div>
    <div class="subtitle">Moyennes par matière et moyenne générale</div>
    <table>
      <thead>
        <tr style="background-color:#d0d0d0;">
          <th rowspan="2" style="width:3%;font-size:9px;">Rang</th>
          <th rowspan="2" style="width:10%;font-size:9px;">Matricule</th>
          <th rowspan="2" style="width:22%;text-align:left;font-size:9px;">Nom & Prénoms</th>
          <th colspan="${subjects.length}" style="font-size:10px;">MATIÈRES</th>
          <th rowspan="2" style="width:6%;font-size:9px;">Moy.<br/>Trim.</th>
          <th rowspan="2" style="width:6%;font-size:9px;">Moy.<br/>Ann.</th>
        </tr>
        <tr style="background-color:#e8e8e8;">
          ${headerCells}
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
    <div class="legend">* Les valeurs en rouge sont inférieures à 10/20.</div>
    <div class="signatures">
      <div style="width:30%;"><strong>Le Conseil d'Enseignement</strong><br/><br/><em>Signature</em></div>
      <div style="width:30%;"><strong>Le Professeur Principal</strong><br/><br/><em>Signature</em></div>
      <div style="width:30%;"><strong>Le Chef d'Établissement</strong><br/><br/><em>Signature</em></div>
    </div>
  `;
}

function buildMatrixDocx(opts: MatrixOptions): Document {
  const { classRoom, trimester, schoolName, subjects, rows } = opts;

  const headerRow1 = [
    docxCell('Rang', { bold: true, align: AlignmentType.CENTER, bg: 'D9D9D9', rowSpan: 2 }),
    docxCell('Matricule', { bold: true, align: AlignmentType.CENTER, bg: 'D9D9D9', rowSpan: 2 }),
    docxCell('Nom & Prénoms', { bold: true, align: AlignmentType.CENTER, bg: 'D9D9D9', rowSpan: 2 }),
    ...subjects.map((s) => docxCell(s, { bold: true, align: AlignmentType.CENTER, bg: 'E8E8E8' })),
    docxCell('Moy. Trim.', { bold: true, align: AlignmentType.CENTER, bg: 'D9D9D9', rowSpan: 2 }),
    docxCell('Moy. Ann.', { bold: true, align: AlignmentType.CENTER, bg: 'D9D9D9', rowSpan: 2 }),
  ];

  const dataRows = rows.map((row) => [
    docxCell(String(row.rank), { align: AlignmentType.CENTER }),
    docxCell(row.student.matricule, { align: AlignmentType.CENTER }),
    docxCell(`${row.student.lastName.toUpperCase()} ${row.student.firstName}`, { bold: true }),
    ...subjects.map((s) => {
      const grade = row.subjectAverages[s];
      const text = grade !== undefined ? grade.toFixed(2) : '-';
      return docxCell(text, { bold: true, align: AlignmentType.CENTER, bg: grade !== undefined && grade < 10 ? 'FFC7CE' : undefined });
    }),
    docxCell(row.generalAverage.toFixed(2), { bold: true, align: AlignmentType.CENTER, bg: 'F2F2F2' }),
    docxCell(row.annualAverage !== undefined ? row.annualAverage.toFixed(2) : '-', { bold: true, align: AlignmentType.CENTER, bg: 'E0E0E0' }),
  ]);

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE, width: convertMillimetersToTwip(297), height: convertMillimetersToTwip(210) },
            margin: { top: convertMillimetersToTwip(10), right: convertMillimetersToTwip(10), bottom: convertMillimetersToTwip(10), left: convertMillimetersToTwip(10) },
          },
        },
        children: [
          docxParagraph('MATRICE DES RÉSULTATS', { bold: true, align: AlignmentType.CENTER, size: 22, spacing: { after: 100 } }),
          docxParagraph(`Trimestre ${trimester} - Classe : ${classRoom.name} - Établissement : ${schoolName}`, { align: AlignmentType.CENTER, size: 18, spacing: { after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({ children: headerRow1, tableHeader: true }), ...dataRows.map((cells) => new TableRow({ children: cells }))],
          }),
          docxParagraph('* Les valeurs en rouge (cellules colorées) sont inférieures à 10/20.', { size: 16, spacing: { after: 200 } }),
          docxParagraph('Le Professeur Principal : _______________________    Le Chef d\'Établissement : _______________________', { size: 16 }),
        ],
      },
    ],
  });
}

export function exportMatrixToPdf(opts: MatrixOptions, callbacks?: { onStart?: () => void; onDone?: () => void }) {
  return exportHtmlToPdf(
    buildMatrixHtml(opts),
    `matrice_notes_${opts.classRoom.name.replace(/\s+/g, '_')}_T${opts.trimester}.pdf`,
    'landscape',
    callbacks
  );
}

export function exportMatrixToExcel(opts: MatrixOptions) {
  const html = buildMatrixHtml(opts);
  downloadExcelHTML(html, `matrice_notes_${opts.classRoom.name.replace(/\s+/g, '_')}_T${opts.trimester}.xls`);
}

export async function exportMatrixToWord(opts: MatrixOptions) {
  exportMatrixToExcel(opts);
}

// ─── PV DE CLASSE ────────────────────────────────────────────────────────────

export interface PVStats {
  effectif: number;
  filles: number;
  garcons: number;
  redoublants: number;
  boursiers: number;
  affectes: number;
  moyenneGenerale: number;
  plusForteMoyenne: number;
  plusFaibleMoyenne: number;
  tauxReussite: number;
}

export interface PVOptions {
  classRoom: ClassRoom;
  trimester: number;
  schoolName: string;
  stats: PVStats;
  distinctions: { name: string; average: number }[];
  sanctions: { name: string; average: number }[];
  rows: MatrixRow[];
  decisions: Record<string, string>;
}

function defaultDecision(average: number): string {
  if (average >= 12) return "Tableau d'Honneur";
  if (average >= 10) return 'Admis';
  return 'Avertissement travail';
}

function buildPVHtml(opts: PVOptions): string {
  const { classRoom, trimester, schoolName, stats, distinctions, sanctions, rows, decisions } = opts;
  const averages = rows.map((r) => r.generalAverage).sort((a, b) => a - b);
  const mediane = averages.length > 0 ? averages[Math.floor(averages.length / 2)] : 0;
  const q1 = averages.length > 0 ? averages[Math.floor(averages.length * 0.25)] : 0;
  const q3 = averages.length > 0 ? averages[Math.floor(averages.length * 0.75)] : 0;

  const effectifClasse = rows.length;
  const effectifClasseCount = rows.filter((r) => r.generalAverage >= 10).length;
  const effectifNonClasse = effectifClasse - effectifClasseCount;

  const studentRows = rows
    .map((row) => {
      const decision = decisions[row.student.id] || defaultDecision(row.generalAverage);
      const color = row.generalAverage < 10 ? 'color:red;' : '';
      return `
        <tr style="page-break-inside:avoid;">
          <td style="border:1px solid #000;text-align:center;font-size:9px;">${row.rank}</td>
          <td style="border:1px solid #000;text-align:center;font-family:monospace;font-size:9px;">${escapeHtml(row.student.matricule)}</td>
          <td style="border:1px solid #000;padding:3px 5px;font-size:9px;font-weight:bold;text-align:left;">${escapeHtml(row.student.lastName.toUpperCase())} ${escapeHtml(row.student.firstName)}</td>
          <td style="border:1px solid #000;text-align:center;font-size:9px;">${row.student.gender}</td>
          <td style="border:1px solid #000;text-align:center;font-size:9px;font-weight:bold;${color}">${row.generalAverage.toFixed(2)}</td>
          <td style="border:1px solid #000;text-align:center;font-size:9px;">${row.student.moyenne ? (row.student.moyenne < 10 ? 'Oui' : 'Non') : 'Non'}</td>
          <td style="border:1px solid #000;text-align:center;font-size:9px;">${escapeHtml(row.student.status)}</td>
          <td style="border:1px solid #000;text-align:center;font-size:9px;">Non</td>
          <td style="border:1px solid #000;text-align:center;font-size:9px;">Non</td>
          <td style="border:1px solid #000;text-align:center;font-size:9px;">Non</td>
          <td style="border:1px solid #000;padding:3px 5px;font-size:9px;font-style:italic;">${escapeHtml(decision)}</td>
        </tr>
      `;
    })
    .join('');

  const distinctionRows = distinctions.map((d) => `<li><strong>${escapeHtml(d.name)}</strong> (${d.average.toFixed(2)})</li>`).join('') || '<li>Néant</li>';
  const sanctionRows = sanctions.map((s) => `<li><strong>${escapeHtml(s.name)}</strong> (${s.average.toFixed(2)})</li>`).join('') || '<li>Néant</li>';

  return `
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Times New Roman', Times, serif; padding: 15px; font-size: 10px; line-height: 1.3; color: #000; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0; }
      th, td { border: 1px solid #000; padding: 4px; }
      .header { display: flex; justify-content: space-between; margin-bottom: 15px; }
      .title { text-align: center; font-size: 14px; font-weight: bold; text-transform: uppercase; text-decoration: underline; margin: 12px 0; }
      .section-title { font-weight: bold; text-transform: uppercase; margin-top: 12px; margin-bottom: 4px; border-bottom: 1px solid #000; font-size: 11px; }
      .grid-2 { display: flex; justify-content: space-between; gap: 15px; }
      .grid-2 > div { width: 48%; }
      .signatures { display: flex; justify-content: space-between; margin-top: 25px; text-align: center; }
    </style>
    <div class="header">
      <div>
        <strong>MINISTÈRE DE L'ÉDUCATION NATIONALE</strong><br/>
        <strong>DE L'ENSEIGNEMENT TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE</strong><br/>
        Établissement: ${escapeHtml(schoolName)}<br/>
        Classe: ${escapeHtml(classRoom.name)}
      </div>
      <div style="text-align:right;">
        <strong>RÉPUBLIQUE DE CÔTE D'IVOIRE</strong><br/>
        Union - Discipline - Travail<br/>
        Année Scolaire: ${SCHOOL_YEAR}
      </div>
    </div>
    <div class="title">PROCÈS-VERBAL DU CONSEIL DE CLASSE - TRIMESTRE ${trimester}</div>

    <div class="section-title">I. EFFECTIFS ET STATISTIQUES</div>
    <table>
      <tr>
        <td><strong>Effectif Total:</strong> ${effectifClasse}</td>
        <td><strong>Effectif Classé:</strong> ${effectifClasseCount}</td>
        <td><strong>Effectif Non Classé:</strong> ${effectifNonClasse}</td>
      </tr>
      <tr>
        <td><strong>Filles:</strong> ${stats.filles}</td>
        <td><strong>Garçons:</strong> ${stats.garcons}</td>
        <td><strong>Redoublants:</strong> ${stats.redoublants}</td>
      </tr>
    </table>

    <div class="section-title">II. STATISTIQUES AVANCÉES</div>
    <table>
      <tr>
        <td><strong>Médiane:</strong> ${mediane.toFixed(2)}</td>
        <td><strong>Q1 (25%):</strong> ${q1.toFixed(2)}</td>
        <td><strong>Q3 (75%):</strong> ${q3.toFixed(2)}</td>
        <td><strong>Moyenne Classe:</strong> ${stats.moyenneGenerale.toFixed(2)}/20</td>
      </tr>
      <tr>
        <td><strong>Taux Réussite:</strong> ${stats.tauxReussite}%</td>
        <td><strong>Max:</strong> ${stats.plusForteMoyenne.toFixed(2)}</td>
        <td><strong>Min:</strong> ${stats.plusFaibleMoyenne.toFixed(2)}</td>
        <td><strong>Année Scolaire:</strong> ${SCHOOL_YEAR}</td>
      </tr>
    </table>

    <div class="section-title">III. LISTE NOMINATIVE DES ÉLÈVES</div>
    <table>
      <thead>
        <tr style="background:#f2f2f2;">
          <th style="width:4%;">Rang</th>
          <th style="width:10%;">Matricule</th>
          <th style="width:22%;">Nom & Prénoms</th>
          <th style="width:4%;">Sexe</th>
          <th style="width:6%;">Moyenne</th>
          <th style="width:6%;">Redouble</th>
          <th style="width:6%;">Statut</th>
          <th style="width:5%;">Régime</th>
          <th style="width:5%;">Interne</th>
          <th style="width:5%;">Affecté</th>
          <th style="width:22%;">Décision</th>
        </tr>
      </thead>
      <tbody>
        ${studentRows}
      </tbody>
    </table>

    <div class="grid-2">
      <div>
        <div class="section-title">IV. DISTINCTIONS</div>
        <ul style="font-size:9px;margin:5px 0;">${distinctionRows}</ul>
      </div>
      <div>
        <div class="section-title">V. SANCTIONS / AVERTISSEMENTS</div>
        <ul style="font-size:9px;margin:5px 0;">${sanctionRows}</ul>
      </div>
    </div>

    <div class="section-title">VI. SIGNATURES</div>
    <div class="signatures">
      <div style="width:30%;"><strong>Le Directeur</strong><br/><br/><em>Signature</em></div>
      <div style="width:30%;"><strong>Le Professeur Principal</strong><br/><br/><em>Signature</em></div>
      <div style="width:30%;"><strong>Les Enseignants</strong><br/><br/><em>Signatures</em></div>
    </div>
  `;
}

function buildPVDocx(opts: PVOptions): Document {
  const { classRoom, trimester, schoolName, stats, distinctions, sanctions, rows, decisions } = opts;
  const averages = rows.map((r) => r.generalAverage).sort((a, b) => a - b);
  const mediane = averages.length > 0 ? averages[Math.floor(averages.length / 2)] : 0;
  const q1 = averages.length > 0 ? averages[Math.floor(averages.length * 0.25)] : 0;
  const q3 = averages.length > 0 ? averages[Math.floor(averages.length * 0.75)] : 0;

  const effectifClasse = rows.length;
  const effectifClasseCount = rows.filter((r) => r.generalAverage >= 10).length;
  const effectifNonClasse = effectifClasse - effectifClasseCount;

  const statsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          docxCell(`Effectif Total: ${effectifClasse}`),
          docxCell(`Effectif Classé: ${effectifClasseCount}`),
          docxCell(`Effectif Non Classé: ${effectifNonClasse}`),
        ],
      }),
      new TableRow({
        children: [
          docxCell(`Filles: ${stats.filles}`),
          docxCell(`Garçons: ${stats.garcons}`),
          docxCell(`Redoublants: ${stats.redoublants}`),
        ],
      }),
    ],
  });

  const advancedTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          docxCell(`Médiane: ${mediane.toFixed(2)}`),
          docxCell(`Q1 (25%): ${q1.toFixed(2)}`),
          docxCell(`Q3 (75%): ${q3.toFixed(2)}`),
          docxCell(`Moyenne Classe: ${stats.moyenneGenerale.toFixed(2)}/20`),
        ],
      }),
      new TableRow({
        children: [
          docxCell(`Taux Réussite: ${stats.tauxReussite}%`),
          docxCell(`Max: ${stats.plusForteMoyenne.toFixed(2)}`),
          docxCell(`Min: ${stats.plusFaibleMoyenne.toFixed(2)}`),
          docxCell(`Année: ${SCHOOL_YEAR}`),
        ],
      }),
    ],
  });

  const studentTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: ['Rang', 'Matricule', 'Nom & Prénoms', 'Sexe', 'Moyenne', 'Redouble', 'Statut', 'Décision'].map((h) =>
          docxCell(h, { bold: true, align: AlignmentType.CENTER, bg: 'F2F2F2' })
        ),
      }),
      ...rows.map((row) => {
        const decision = decisions[row.student.id] || defaultDecision(row.generalAverage);
        return new TableRow({
          children: [
            docxCell(String(row.rank), { align: AlignmentType.CENTER }),
            docxCell(row.student.matricule, { align: AlignmentType.CENTER }),
            docxCell(`${row.student.lastName.toUpperCase()} ${row.student.firstName}`, { bold: true }),
            docxCell(row.student.gender, { align: AlignmentType.CENTER }),
            docxCell(row.generalAverage.toFixed(2), { bold: true, align: AlignmentType.CENTER }),
            docxCell('Non', { align: AlignmentType.CENTER }),
            docxCell(row.student.status, { align: AlignmentType.CENTER }),
            docxCell(decision, { bold: true }),
          ],
        });
      }),
    ],
  });

  const distinctionParagraphs = distinctions.length
    ? distinctions.map((d) => new Paragraph({ children: [new TextRun({ text: `${d.name} (${d.average.toFixed(2)})`, size: 18, font: 'Arial' })] }))
    : [new Paragraph({ children: [new TextRun({ text: 'Néant', size: 18, font: 'Arial' })] })];

  const sanctionParagraphs = sanctions.length
    ? sanctions.map((s) => new Paragraph({ children: [new TextRun({ text: `${s.name} (${s.average.toFixed(2)})`, size: 18, font: 'Arial' })] }))
    : [new Paragraph({ children: [new TextRun({ text: 'Néant', size: 18, font: 'Arial' })] })];

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT, width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
            margin: { top: convertMillimetersToTwip(12), right: convertMillimetersToTwip(12), bottom: convertMillimetersToTwip(12), left: convertMillimetersToTwip(12) },
          },
        },
        children: [
          docxParagraph('PROCÈS-VERBAL DU CONSEIL DE CLASSE', { bold: true, align: AlignmentType.CENTER, size: 24, spacing: { after: 100 } }),
          docxParagraph(`Trimestre ${trimester} - Classe : ${classRoom.name} - Établissement : ${schoolName}`, { align: AlignmentType.CENTER, size: 18, spacing: { after: 200 } }),
          docxParagraph('I. EFFECTIFS ET STATISTIQUES', { bold: true, size: 18 }),
          statsTable,
          docxParagraph('II. STATISTIQUES AVANCÉES', { bold: true, size: 18, spacing: { before: 200 } }),
          advancedTable,
          docxParagraph('III. LISTE NOMINATIVE DES ÉLÈVES', { bold: true, size: 18, spacing: { before: 200 } }),
          studentTable,
          docxParagraph('IV. DISTINCTIONS', { bold: true, size: 18, spacing: { before: 200 } }),
          ...distinctionParagraphs,
          docxParagraph('V. SANCTIONS / AVERTISSEMENTS', { bold: true, size: 18, spacing: { before: 200 } }),
          ...sanctionParagraphs,
          docxParagraph('VI. SIGNATURES', { bold: true, size: 18, spacing: { before: 300 } }),
          docxParagraph('Directeur : _______________________    Professeur Principal : _______________________', { size: 16 }),
        ],
      },
    ],
  });
}

export function exportPVToPdf(opts: PVOptions, callbacks?: { onStart?: () => void; onDone?: () => void }) {
  return exportHtmlToPdf(
    buildPVHtml(opts),
    `pv_classe_${opts.classRoom.name.replace(/\s+/g, '_')}_T${opts.trimester}.pdf`,
    'portrait',
    callbacks
  );
}

export function exportPVToExcel(opts: PVOptions) {
  const html = buildPVHtml(opts);
  downloadExcelHTML(html, `pv_classe_${opts.classRoom.name.replace(/\s+/g, '_')}_T${opts.trimester}.xls`);
}

export async function exportPVToWord(opts: PVOptions) {
  exportPVToExcel(opts);
}

// ─── FICHE DE NOTES ENSEIGNANT ───────────────────────────────────────────────

export interface TeacherSheetOptions {
  classRoom: ClassRoom;
  subject: string;
  trimester: number;
  schoolName: string;
  teacherName?: string;
  students: Student[];
  evaluations: Evaluation[];
}

export interface TeacherColumn {
  key: string;
  label: string;
  coefficient: number;
}

export interface TeacherRow {
  student: Student;
  notes: Record<string, number | undefined>;
  average?: number;
}

function buildTeacherSheetColumns(evaluations: Evaluation[], classId: string, subject: string, trimester: number): TeacherColumn[] {
  const classEvals = evaluations.filter(
    (e) => e.classId === String(classId) && e.subject === subject && e.trimester === trimester
  );

  const grouped = new Map<string, Evaluation[]>();
  classEvals.forEach((e) => {
    const key = `${e.type}-${e.devoir_numero || '1'}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  });

  if (grouped.size === 0) {
    return [
      { key: 'devoir-1', label: 'Devoir 1', coefficient: 1 },
      { key: 'devoir-2', label: 'Devoir 2', coefficient: 1 },
      { key: 'composition-1', label: 'Composition', coefficient: 2 },
    ];
  }

  const order = { devoir: 1, interrogation: 2, composition: 3, examen: 4 };
  return Array.from(grouped.entries())
    .sort(([a], [b]) => {
      const atype = a.split('-')[0];
      const btype = b.split('-')[0];
      return (order[atype as keyof typeof order] || 9) - (order[btype as keyof typeof order] || 9) || a.localeCompare(b);
    })
    .map(([key, evs]) => {
      const first = evs[0];
      const num = first.devoir_numero ? ` ${first.devoir_numero}` : '';
      const label = `${first.type.charAt(0).toUpperCase() + first.type.slice(1)}${num}`;
      return { key, label, coefficient: first.coefficient || 1 };
    });
}

function buildTeacherSheetRows(students: Student[], classId: string, evaluations: Evaluation[], columns: TeacherColumn[], subject: string, trimester: number): TeacherRow[] {
  return students
    .filter((s) => s.status === 'actif' && String(s.classId) === String(classId))
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'fr'))
    .map((student) => {
      const notes: Record<string, number | undefined> = {};
      let weightedSum = 0;
      let coeffSum = 0;
      columns.forEach((col) => {
        const ev = evaluations.find(
          (e) =>
            e.classId === String(classId) &&
            e.studentId === student.id &&
            e.subject === subject &&
            e.trimester === trimester &&
            `${e.type}-${e.devoir_numero || '1'}` === col.key
        );
        if (ev) {
          notes[col.key] = ev.note;
          weightedSum += ev.note * (ev.coefficient || col.coefficient);
          coeffSum += ev.coefficient || col.coefficient;
        }
      });
      return { student, notes, average: coeffSum > 0 ? weightedSum / coeffSum : undefined };
    });
}

function buildTeacherSheetHtml(opts: TeacherSheetOptions, columns: TeacherColumn[], rows: TeacherRow[]): string {
  const { classRoom, subject, trimester, schoolName, teacherName } = opts;
  const colHeaders = columns.map((c) => `<th style="border:1px solid #000;text-align:center;font-size:9px;padding:3px;">${escapeHtml(c.label)}<br/><span style="font-size:7px;font-weight:normal;">coef ${c.coefficient}</span></th>`).join('');
  const bodyRows = rows
    .map((row, idx) => {
      const cells = columns
        .map((col) => {
          const note = row.notes[col.key];
          return `<td style="border:1px solid #000;text-align:center;font-size:10px;font-weight:bold;">${note !== undefined ? note.toFixed(2) : ''}</td>`;
        })
        .join('');
      return `
        <tr style="page-break-inside:avoid;">
          <td style="border:1px solid #000;text-align:center;font-size:9px;">${idx + 1}</td>
          <td style="border:1px solid #000;text-align:center;font-family:monospace;font-size:9px;">${escapeHtml(row.student.matricule)}</td>
          <td style="border:1px solid #000;padding:3px 5px;font-size:9px;font-weight:bold;text-align:left;">${escapeHtml(row.student.lastName.toUpperCase())} ${escapeHtml(row.student.firstName)}</td>
          ${cells}
          <td style="border:1px solid #000;text-align:center;font-size:10px;font-weight:bold;background:#f2f2f2;">${row.average !== undefined ? row.average.toFixed(2) : ''}</td>
          <td style="border:1px solid #000;text-align:left;font-size:9px;"></td>
        </tr>
      `;
    })
    .join('');

  return `
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; padding: 12px; font-size: 10px; color: #000; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #000; padding: 3px; }
      .header { display: flex; justify-content: space-between; margin-bottom: 12px; }
      .title { text-align: center; font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 10px 0; }
      .meta { margin-bottom: 8px; }
      .signatures { display: flex; justify-content: space-between; margin-top: 25px; text-align: center; }
    </style>
    <div class="header">
      <div>
        <strong>MINISTÈRE DE L'ÉDUCATION NATIONALE</strong><br/>
        <strong>DE L'ENSEIGNEMENT TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE</strong><br/>
        Établissement: ${escapeHtml(schoolName)}
      </div>
      <div style="text-align:right;">
        <strong>RÉPUBLIQUE DE CÔTE D'IVOIRE</strong><br/>
        Union - Discipline - Travail<br/>
        Année Scolaire: ${SCHOOL_YEAR}
      </div>
    </div>
    <div class="title">FICHE DE NOTES - ${escapeHtml(subject.toUpperCase())}</div>
    <div class="meta">
      <strong>Classe :</strong> ${escapeHtml(classRoom.name)} &nbsp;&nbsp;
      <strong>Trimestre :</strong> ${trimester} &nbsp;&nbsp;
      <strong>Enseignant :</strong> ${escapeHtml(teacherName || '_____________________')}
    </div>
    <table>
      <thead>
        <tr style="background:#d0d0d0;">
          <th style="width:4%;font-size:9px;">N°</th>
          <th style="width:10%;font-size:9px;">Matricule</th>
          <th style="width:28%;font-size:9px;text-align:left;">Nom & Prénoms</th>
          ${colHeaders}
          <th style="width:8%;font-size:9px;">Moyenne</th>
          <th style="width:18%;font-size:9px;">Observation</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
    <div class="signatures">
      <div style="width:45%;text-align:left;"><strong>Date :</strong> _______________________</div>
      <div style="width:45%;"><strong>Signature de l'enseignant</strong><br/><br/><em>Signature</em></div>
    </div>
  `;
}

function buildTeacherSheetDocx(opts: TeacherSheetOptions, columns: TeacherColumn[], rows: TeacherRow[]): Document {
  const { classRoom, subject, trimester, schoolName, teacherName } = opts;

  const headerRow = [
    docxCell('N°', { bold: true, align: AlignmentType.CENTER, bg: 'D9D9D9' }),
    docxCell('Matricule', { bold: true, align: AlignmentType.CENTER, bg: 'D9D9D9' }),
    docxCell('Nom & Prénoms', { bold: true, align: AlignmentType.CENTER, bg: 'D9D9D9' }),
    ...columns.map((col) => docxCell(`${col.label}\ncoef ${col.coefficient}`, { bold: true, align: AlignmentType.CENTER, bg: 'D9D9D9' })),
    docxCell('Moyenne', { bold: true, align: AlignmentType.CENTER, bg: 'D9D9D9' }),
    docxCell('Observation', { bold: true, align: AlignmentType.CENTER, bg: 'D9D9D9' }),
  ];

  const dataRows = rows.map((row, idx) =>
    new TableRow({
      children: [
        docxCell(String(idx + 1), { align: AlignmentType.CENTER }),
        docxCell(row.student.matricule, { align: AlignmentType.CENTER }),
        docxCell(`${row.student.lastName.toUpperCase()} ${row.student.firstName}`, { bold: true }),
        ...columns.map((col) => {
          const note = row.notes[col.key];
          return docxCell(note !== undefined ? note.toFixed(2) : '', { align: AlignmentType.CENTER, bold: true });
        }),
        docxCell(row.average !== undefined ? row.average.toFixed(2) : '', { bold: true, align: AlignmentType.CENTER, bg: 'F2F2F2' }),
        docxCell(''),
      ],
    })
  );

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE, width: convertMillimetersToTwip(297), height: convertMillimetersToTwip(210) },
            margin: { top: convertMillimetersToTwip(10), right: convertMillimetersToTwip(10), bottom: convertMillimetersToTwip(10), left: convertMillimetersToTwip(10) },
          },
        },
        children: [
          docxParagraph(`FICHE DE NOTES - ${subject.toUpperCase()}`, { bold: true, align: AlignmentType.CENTER, size: 22, spacing: { after: 100 } }),
          docxParagraph(`Trimestre ${trimester} - Classe : ${classRoom.name} - Établissement : ${schoolName} - Enseignant : ${teacherName || '_____________________'}`, { align: AlignmentType.CENTER, size: 18, spacing: { after: 200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({ children: headerRow, tableHeader: true }), ...dataRows],
          }),
          docxParagraph('Date : _______________________    Signature de l\'enseignant : _______________________', { size: 16, spacing: { before: 300 } }),
        ],
      },
    ],
  });
}

export function getTeacherSheetData(opts: TeacherSheetOptions) {
  const columns = buildTeacherSheetColumns(opts.evaluations, opts.classRoom.id, opts.subject, opts.trimester);
  const rows = buildTeacherSheetRows(opts.students, opts.classRoom.id, opts.evaluations, columns, opts.subject, opts.trimester);
  return { columns, rows };
}

export function exportTeacherSheetToPdf(opts: TeacherSheetOptions, callbacks?: { onStart?: () => void; onDone?: () => void }) {
  const { columns, rows } = getTeacherSheetData(opts);
  return exportHtmlToPdf(
    buildTeacherSheetHtml(opts, columns, rows),
    `fiche_notes_${opts.classRoom.name.replace(/\s+/g, '_')}_${opts.subject.replace(/\s+/g, '_')}_T${opts.trimester}.pdf`,
    'landscape',
    callbacks
  );
}

export function exportTeacherSheetToExcel(opts: TeacherSheetOptions) {
  const { columns, rows } = getTeacherSheetData(opts);
  const html = buildTeacherSheetHtml(opts, columns, rows);
  downloadExcelHTML(
    html,
    `fiche_notes_${opts.classRoom.name.replace(/\s+/g, '_')}_${opts.subject.replace(/\s+/g, '_')}_T${opts.trimester}.xls`
  );
}

export async function exportTeacherSheetToWord(opts: TeacherSheetOptions) {
  exportTeacherSheetToExcel(opts);
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. FICHE DE NOTE OFFICIELLE (Format N1..N5, Moyenne, Moy. Coef, Rang)
// ═════════════════════════════════════════════════════════════════════════════

export interface FicheNotesOfficialOptions {
  classRoom: ClassRoom;
  subject: string;
  coefficient?: number;
  trimester: string | number;
  schoolName?: string;
  city?: string;
  teacherName?: string;
  teacherContact?: string;
  students: Student[];
  evaluations: Evaluation[];
}

export function buildFicheNotesOfficialHtml(opts: FicheNotesOfficialOptions): string {
  const coeff = opts.coefficient || 1;
  const schoolName = opts.schoolName || 'GROUPE SCOLAIRE CONFESSIONNEL HÎNNEH';
  const city = opts.city || 'KORHOGO';
  const classStudents = opts.students.filter(s => String(s.classId) === String(opts.classRoom.id));
  
  // Extraire les 5 premières notes de devoirs/évals pour chaque élève
  const rows = classStudents.map((s, idx) => {
    const studentEvals = opts.evaluations.filter(e => 
      String(e.studentId) === String(s.id) &&
      String(e.classId) === String(opts.classRoom.id) &&
      (String(e.trimester) === String(opts.trimester) || String(opts.trimester) === 'all') &&
      (!opts.subject || (e.matiere || '').toLowerCase() === opts.subject.toLowerCase() || (e.subject || '').toLowerCase() === opts.subject.toLowerCase())
    );

    const n1 = studentEvals[0]?.note !== undefined && studentEvals[0]?.note !== null ? Number(studentEvals[0].note) : null;
    const n2 = studentEvals[1]?.note !== undefined && studentEvals[1]?.note !== null ? Number(studentEvals[1].note) : null;
    const n3 = studentEvals[2]?.note !== undefined && studentEvals[2]?.note !== null ? Number(studentEvals[2].note) : null;
    const n4 = studentEvals[3]?.note !== undefined && studentEvals[3]?.note !== null ? Number(studentEvals[3].note) : null;
    const n5 = studentEvals[4]?.note !== undefined && studentEvals[4]?.note !== null ? Number(studentEvals[4].note) : null;

    const validNotes = [n1, n2, n3, n4, n5].filter((n): n is number => n !== null);
    const avg = validNotes.length > 0 ? validNotes.reduce((a, b) => a + b, 0) / validNotes.length : null;
    const avgCoef = avg !== null ? avg * coeff : null;

    return {
      index: idx + 1,
      id: s.id,
      name: `${s.lastName || s.nom || ''} ${s.firstName || s.prenom || ''}`.trim(),
      matricule: s.matricule || s.id || '',
      n1: n1 !== null ? n1.toFixed(2) : '',
      n2: n2 !== null ? n2.toFixed(2) : '',
      n3: n3 !== null ? n3.toFixed(2) : '',
      n4: n4 !== null ? n4.toFixed(2) : '',
      n5: n5 !== null ? n5.toFixed(2) : '',
      avg: avg !== null ? avg : -1,
      avgStr: avg !== null ? avg.toFixed(2) : '',
      avgCoefStr: avgCoef !== null ? avgCoef.toFixed(2) : '',
      rank: ''
    };
  });

  // Calcul du rang
  const sorted = [...rows].filter(r => r.avg >= 0).sort((a, b) => b.avg - a.avg);
  sorted.forEach((item, rIdx) => {
    const orig = rows.find(r => r.id === item.id);
    if (orig) orig.rank = rIdx === 0 ? '1er' : `${rIdx + 1}e`;
  });

  const trs = rows.map(r => `
    <tr>
      <td style="text-align:center;font-weight:bold;padding:5px;">${r.index}</td>
      <td style="font-weight:600;padding:5px 8px;text-align:left;">${escapeHtml(r.name)}</td>
      <td style="text-align:center;font-family:monospace;padding:5px;">${escapeHtml(r.matricule)}</td>
      <td style="text-align:center;padding:5px;">${r.n1}</td>
      <td style="text-align:center;padding:5px;">${r.n2}</td>
      <td style="text-align:center;padding:5px;">${r.n3}</td>
      <td style="text-align:center;padding:5px;">${r.n4}</td>
      <td style="text-align:center;padding:5px;">${r.n5}</td>
      <td style="text-align:center;font-weight:bold;background-color:#f1f5f9;padding:5px;">${r.avgStr}</td>
      <td style="text-align:center;font-weight:bold;background-color:#e2e8f0;padding:5px;">${r.avgCoefStr}</td>
      <td style="text-align:center;font-weight:bold;color:#0284c7;padding:5px;">${r.rank}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;padding:15px;max-width:100%;">
      <div style="text-align:center;margin-bottom:12px;border:2px solid #0f172a;padding:8px;background-color:#f8fafc;">
        <h2 style="margin:0;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">
          FICHE DE NOTE ${escapeHtml(opts.classRoom.name.toUpperCase())}
        </h2>
      </div>

      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:10px;font-weight:bold;background:#f1f5f9;padding:8px 12px;border-radius:6px;">
        <div>
          <span>CLASSE : <u>${escapeHtml(opts.classRoom.name)}</u></span> &nbsp;|&nbsp;
          <span>TRIMESTRE : <u>${opts.trimester}</u></span> &nbsp;|&nbsp;
          <span>MATIÈRE : <u>${escapeHtml(opts.subject)}</u></span> &nbsp;|&nbsp;
          <span>COEFFICIENT : <u>${coeff}</u></span>
        </div>
        <div>
          <span>PROFESSEUR : <u>${escapeHtml(opts.teacherName || '_____________________')}</u></span> &nbsp;|&nbsp;
          <span>CONTACTS : <u>${escapeHtml(opts.teacherContact || '_____________________')}</u></span>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:15px;" border="1" cellpadding="4">
        <thead>
          <tr style="background-color:#0f172a;color:#ffffff;text-align:center;font-weight:bold;">
            <th style="width:35px;padding:6px;">N°</th>
            <th style="padding:6px;text-align:left;">NOM ET PRÉNOMS</th>
            <th style="width:90px;padding:6px;">MAT.</th>
            <th style="width:45px;padding:6px;">N1</th>
            <th style="width:45px;padding:6px;">N2</th>
            <th style="width:45px;padding:6px;">N3</th>
            <th style="width:45px;padding:6px;">N4</th>
            <th style="width:45px;padding:6px;">N5</th>
            <th style="width:55px;padding:6px;background-color:#334155;">MOY.</th>
            <th style="width:65px;padding:6px;background-color:#1e293b;">MOY. COEF</th>
            <th style="width:50px;padding:6px;background-color:#0369a1;">RANG</th>
          </tr>
        </thead>
        <tbody>
          ${trs}
        </tbody>
      </table>

      <div style="display:flex;justify-content:space-between;margin-top:25px;font-size:11px;font-weight:bold;">
        <div>Fait à ${escapeHtml(city)}, le ${new Date().toLocaleDateString('fr-FR')}</div>
        <div style="text-align:center;margin-right:40px;">
          Signature Professeur<br/><br/><br/>
          ___________________________
        </div>
      </div>
    </div>
  `;
}

export function exportFicheNotesOfficialPdf(opts: FicheNotesOfficialOptions, callbacks?: { onStart?: () => void; onDone?: () => void }) {
  const html = buildFicheNotesOfficialHtml(opts);
  return exportHtmlToPdf(
    html,
    `Fiche_Note_${opts.classRoom.name.replace(/\s+/g, '_')}_${opts.subject.replace(/\s+/g, '_')}_T${opts.trimester}.pdf`,
    'portrait',
    callbacks
  );
}

export function exportFicheNotesOfficialExcel(opts: FicheNotesOfficialOptions) {
  const html = buildFicheNotesOfficialHtml(opts);
  downloadExcelHTML(
    html,
    `Fiche_Note_${opts.classRoom.name.replace(/\s+/g, '_')}_${opts.subject.replace(/\s+/g, '_')}_T${opts.trimester}.xls`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. FICHE DE SUIVI DES NOTES ET DEVOIRS (I1..I5 + DEV 1..DEV 4, Moyenne, Rang)
// ═════════════════════════════════════════════════════════════════════════════

export interface FicheSuiviNotesDevoirsOptions {
  classRoom: ClassRoom;
  subject: string;
  trimester: string | number;
  schoolName?: string;
  city?: string;
  teacherName?: string;
  students: Student[];
  evaluations: Evaluation[];
}

export function buildFicheSuiviNotesDevoirsHtml(opts: FicheSuiviNotesDevoirsOptions): string {
  const schoolName = opts.schoolName || 'GROUPE SCOLAIRE CONFESSIONNEL HÎNNEH';
  const city = opts.city || 'KORHOGO';
  const classStudents = opts.students.filter(s => String(s.classId) === String(opts.classRoom.id));

  const rows = classStudents.map((s, idx) => {
    const evals = opts.evaluations.filter(e => 
      String(e.studentId) === String(s.id) &&
      String(e.classId) === String(opts.classRoom.id) &&
      (String(e.trimester) === String(opts.trimester) || String(opts.trimester) === 'all') &&
      (!opts.subject || (e.matiere || '').toLowerCase() === opts.subject.toLowerCase() || (e.subject || '').toLowerCase() === opts.subject.toLowerCase())
    );

    // Séparer interrogations et devoirs
    const interros = evals.filter(e => (e.type || '').toLowerCase().includes('interro') || (e.type || '').toLowerCase().includes('i'));
    const devoirs = evals.filter(e => (e.type || '').toLowerCase().includes('devoir') || (e.type || '').toLowerCase().includes('dev') || !(e.type || '').toLowerCase().includes('interro'));

    const i1 = interros[0]?.note !== undefined && interros[0]?.note !== null ? Number(interros[0].note) : null;
    const i2 = interros[1]?.note !== undefined && interros[1]?.note !== null ? Number(interros[1].note) : null;
    const i3 = interros[2]?.note !== undefined && interros[2]?.note !== null ? Number(interros[2].note) : null;
    const i4 = interros[3]?.note !== undefined && interros[3]?.note !== null ? Number(interros[3].note) : null;
    const i5 = interros[4]?.note !== undefined && interros[4]?.note !== null ? Number(interros[4].note) : null;

    const d1 = devoirs[0]?.note !== undefined && devoirs[0]?.note !== null ? Number(devoirs[0].note) : null;
    const d2 = devoirs[1]?.note !== undefined && devoirs[1]?.note !== null ? Number(devoirs[1].note) : null;
    const d3 = devoirs[2]?.note !== undefined && devoirs[2]?.note !== null ? Number(devoirs[2].note) : null;
    const d4 = devoirs[3]?.note !== undefined && devoirs[3]?.note !== null ? Number(devoirs[3].note) : null;

    const allNotes = [...interros, ...devoirs].map(e => Number(e.note)).filter(n => !isNaN(n));
    const avg = allNotes.length > 0 ? allNotes.reduce((a, b) => a + b, 0) / allNotes.length : null;

    return {
      index: idx + 1,
      id: s.id,
      name: `${s.lastName || s.nom || ''} ${s.firstName || s.prenom || ''}`.trim(),
      i1: i1 !== null ? i1.toFixed(2) : '',
      i2: i2 !== null ? i2.toFixed(2) : '',
      i3: i3 !== null ? i3.toFixed(2) : '',
      i4: i4 !== null ? i4.toFixed(2) : '',
      i5: i5 !== null ? i5.toFixed(2) : '',
      d1: d1 !== null ? d1.toFixed(2) : '',
      d2: d2 !== null ? d2.toFixed(2) : '',
      d3: d3 !== null ? d3.toFixed(2) : '',
      d4: d4 !== null ? d4.toFixed(2) : '',
      avg: avg !== null ? avg : -1,
      avgStr: avg !== null ? avg.toFixed(2) : '',
      rank: ''
    };
  });

  const sorted = [...rows].filter(r => r.avg >= 0).sort((a, b) => b.avg - a.avg);
  sorted.forEach((item, rIdx) => {
    const orig = rows.find(r => r.id === item.id);
    if (orig) orig.rank = rIdx === 0 ? '1er' : `${rIdx + 1}e`;
  });

  const trs = rows.map(r => `
    <tr>
      <td style="text-align:center;font-weight:bold;padding:5px;">${r.index}</td>
      <td style="font-weight:600;padding:5px 8px;text-align:left;">${escapeHtml(r.name)}</td>
      <td style="text-align:center;padding:5px;">${r.i1}</td>
      <td style="text-align:center;padding:5px;">${r.i2}</td>
      <td style="text-align:center;padding:5px;">${r.i3}</td>
      <td style="text-align:center;padding:5px;">${r.i4}</td>
      <td style="text-align:center;padding:5px;">${r.i5}</td>
      <td style="text-align:center;padding:5px;background-color:#f8fafc;">${r.d1}</td>
      <td style="text-align:center;padding:5px;background-color:#f8fafc;">${r.d2}</td>
      <td style="text-align:center;padding:5px;background-color:#f8fafc;">${r.d3}</td>
      <td style="text-align:center;padding:5px;background-color:#f8fafc;">${r.d4}</td>
      <td style="text-align:center;font-weight:bold;background-color:#e2e8f0;padding:5px;">${r.avgStr}</td>
      <td style="text-align:center;font-weight:bold;color:#0284c7;padding:5px;">${r.rank}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;padding:15px;max-width:100%;">
      <div style="text-align:center;margin-bottom:12px;">
        <div style="font-size:11px;font-weight:800;color:#0369a1;text-transform:uppercase;">${escapeHtml(schoolName)}</div>
        <h2 style="margin:4px 0 0 0;font-size:15px;font-weight:900;text-transform:uppercase;color:#0f172a;">
          FICHE DE SUIVI DES NOTES ET DEVOIRS
        </h2>
        <div style="font-size:11px;color:#475569;margin-top:2px;">
          Classe : <strong>${escapeHtml(opts.classRoom.name)}</strong> &nbsp;|&nbsp;
          Matière : <strong>${escapeHtml(opts.subject)}</strong> &nbsp;|&nbsp;
          Trimestre : <strong>${opts.trimester}</strong> &nbsp;|&nbsp;
          Enseignant : <strong>${escapeHtml(opts.teacherName || 'Non assigné')}</strong>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:15px;" border="1" cellpadding="4">
        <thead>
          <tr style="background-color:#1e293b;color:#ffffff;text-align:center;font-weight:bold;">
            <th style="width:30px;padding:6px;">N°</th>
            <th style="padding:6px;text-align:left;">NOM ET PRÉNOMS</th>
            <th style="width:38px;padding:6px;">I1</th>
            <th style="width:38px;padding:6px;">I2</th>
            <th style="width:38px;padding:6px;">I3</th>
            <th style="width:38px;padding:6px;">I4</th>
            <th style="width:38px;padding:6px;">I5</th>
            <th style="width:42px;padding:6px;background-color:#334155;">DEV 1</th>
            <th style="width:42px;padding:6px;background-color:#334155;">DEV 2</th>
            <th style="width:42px;padding:6px;background-color:#334155;">DEV 3</th>
            <th style="width:42px;padding:6px;background-color:#334155;">DEV 4</th>
            <th style="width:55px;padding:6px;background-color:#0f172a;">MOYENNE</th>
            <th style="width:45px;padding:6px;background-color:#0284c7;">RANG</th>
          </tr>
        </thead>
        <tbody>
          ${trs}
        </tbody>
      </table>

      <div style="display:flex;justify-content:space-between;margin-top:20px;font-size:11px;font-weight:bold;">
        <div>Fait à ${escapeHtml(city)}, le ${new Date().toLocaleDateString('fr-FR')}</div>
        <div style="text-align:center;margin-right:30px;">
          Visa du Directeur des Études<br/><br/><br/>
          ___________________________
        </div>
      </div>
    </div>
  `;
}

export function exportFicheSuiviNotesDevoirsPdf(opts: FicheSuiviNotesDevoirsOptions, callbacks?: { onStart?: () => void; onDone?: () => void }) {
  const html = buildFicheSuiviNotesDevoirsHtml(opts);
  return exportHtmlToPdf(
    html,
    `Fiche_Suivi_Notes_${opts.classRoom.name.replace(/\s+/g, '_')}_${opts.subject.replace(/\s+/g, '_')}_T${opts.trimester}.pdf`,
    'landscape',
    callbacks
  );
}

export function exportFicheSuiviNotesDevoirsExcel(opts: FicheSuiviNotesDevoirsOptions) {
  const html = buildFicheSuiviNotesDevoirsHtml(opts);
  downloadExcelHTML(
    html,
    `Fiche_Suivi_Notes_${opts.classRoom.name.replace(/\s+/g, '_')}_${opts.subject.replace(/\s+/g, '_')}_T${opts.trimester}.xls`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. FICHE STATISTIQUE ENSEIGNANT / MATIÈRE (Modèle FICHES STATISTIQUES.docx)
// ═════════════════════════════════════════════════════════════════════════════

export interface FicheStatistiqueMatiereOptions {
  classRoom: ClassRoom;
  subject: string;
  trimester: string | number;
  schoolName?: string;
  city?: string;
  teacherName?: string;
  students: Student[];
  evaluations: Evaluation[];
  appreciation?: string;
}

export function buildFicheStatistiqueMatiereHtml(opts: FicheStatistiqueMatiereOptions): string {
  const schoolName = opts.schoolName || 'COLLEGE PRIVE HINNEH KATIOFI';
  const city = opts.city || 'KORHOGO';
  const classStudents = opts.students.filter(s => String(s.classId) === String(opts.classRoom.id));
  const totalEffectif = classStudents.length;

  // Calcul des moyennes par élève dans cette matière
  const studentAverages: { name: string; avg: number }[] = [];
  let nonClassesCount = 0;

  classStudents.forEach(s => {
    const evals = opts.evaluations.filter(e =>
      String(e.studentId) === String(s.id) &&
      String(e.classId) === String(opts.classRoom.id) &&
      (String(e.trimester) === String(opts.trimester) || String(opts.trimester) === 'all') &&
      (!opts.subject || (e.matiere || '').toLowerCase() === opts.subject.toLowerCase() || (e.subject || '').toLowerCase() === opts.subject.toLowerCase())
    );
    const validNotes = evals.map(e => Number(e.note)).filter(n => !isNaN(n));
    if (validNotes.length > 0) {
      const avg = validNotes.reduce((a, b) => a + b, 0) / validNotes.length;
      studentAverages.push({
        name: `${s.lastName || s.nom || ''} ${s.firstName || s.prenom || ''}`.trim(),
        avg
      });
    } else {
      nonClassesCount++;
    }
  });

  const classesCount = studentAverages.length;
  const countSup10 = studentAverages.filter(s => s.avg >= 10).length;
  const countBetween85And10 = studentAverages.filter(s => s.avg >= 8.5 && s.avg < 10).length;
  const countInf85 = studentAverages.filter(s => s.avg < 8.5).length;

  const pctSup10 = classesCount > 0 ? ((countSup10 / classesCount) * 100).toFixed(2) : '0.00';
  const pctBetween = classesCount > 0 ? ((countBetween85And10 / classesCount) * 100).toFixed(2) : '0.00';
  const pctInf85 = classesCount > 0 ? ((countInf85 / classesCount) * 100).toFixed(2) : '0.00';

  const sorted = [...studentAverages].sort((a, b) => b.avg - a.avg);
  const maxObj = sorted[0];
  const minObj = sorted[sorted.length - 1];
  const classAvg = classesCount > 0 ? (studentAverages.reduce((acc, s) => acc + s.avg, 0) / classesCount).toFixed(2) : '0.00';

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;padding:15px;max-width:800px;margin:0 auto;">
      <div style="text-align:center;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:12px;">
        <div style="font-size:12px;font-weight:800;color:#0369a1;text-transform:uppercase;">${escapeHtml(schoolName)}</div>
        <div style="font-size:11px;font-weight:700;color:#475569;margin-top:2px;">TRIMESTRE ${opts.trimester}</div>
        <h2 style="margin:4px 0 0 0;font-size:16px;font-weight:900;text-transform:uppercase;">FICHE STATISTIQUE</h2>
      </div>

      <div style="font-size:11.5px;line-height:1.6;margin-bottom:12px;background:#f8fafc;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;">
        <div><strong>PROFESSEUR :</strong> ${escapeHtml(opts.teacherName || '___________________________')} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>MATIÈRE :</strong> ${escapeHtml(opts.subject)} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>CLASSE :</strong> ${escapeHtml(opts.classRoom.name)}</div>
        <div style="margin-top:3px;"><strong>EFFECTIF TOTAL :</strong> ${totalEffectif} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>CLASSÉ(S) :</strong> ${classesCount} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>NON CLASSÉ(S) :</strong> ${nonClassesCount}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;text-align:center;" border="1" cellpadding="6">
        <thead>
          <tr style="background-color:#f1f5f9;">
            <th colspan="2" style="background-color:#dcfce7;color:#166534;font-weight:bold;width:33%;">MOY &ge; 10</th>
            <th colspan="2" style="background-color:#fef9c3;color:#854d0e;font-weight:bold;width:33%;">10 &gt; MOY &ge; 08.50</th>
            <th colspan="2" style="background-color:#fee2e2;color:#991b1b;font-weight:bold;width:33%;">MOY &lt; 08.50</th>
          </tr>
          <tr style="background-color:#f8fafc;font-weight:bold;">
            <th>NOMBRE</th><th>%</th>
            <th>NOMBRE</th><th>%</th>
            <th>NOMBRE</th><th>%</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:bold;font-size:13px;">${countSup10}</td>
            <td style="font-weight:bold;">${pctSup10} %</td>
            <td style="font-weight:bold;font-size:13px;">${countBetween85And10}</td>
            <td style="font-weight:bold;">${pctBetween} %</td>
            <td style="font-weight:bold;font-size:13px;">${countInf85}</td>
            <td style="font-weight:bold;">${pctInf85} %</td>
          </tr>
        </tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:15px;text-align:center;" border="1" cellpadding="6">
        <thead>
          <tr style="background-color:#1e293b;color:#ffffff;">
            <th>MOYENNE LA PLUS FORTE</th>
            <th>OBTENUE PAR</th>
            <th>MOY LA PLUS FAIBLE</th>
            <th>OBTENUE PAR</th>
            <th style="background-color:#0284c7;">MOY CLASSE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:bold;font-size:12px;color:#16a34a;">${maxObj ? maxObj.avg.toFixed(2) : '-'}</td>
            <td style="font-weight:600;">${maxObj ? escapeHtml(maxObj.name) : '-'}</td>
            <td style="font-weight:bold;font-size:12px;color:#dc2626;">${minObj ? minObj.avg.toFixed(2) : '-'}</td>
            <td style="font-weight:600;">${minObj ? escapeHtml(minObj.name) : '-'}</td>
            <td style="font-weight:bold;font-size:13px;background-color:#f0f9ff;color:#0369a1;">${classAvg}</td>
          </tr>
        </tbody>
      </table>

      <div style="border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;margin-bottom:20px;min-height:70px;background:#fafafa;">
        <div style="font-weight:bold;font-size:11px;color:#334155;margin-bottom:4px;">APPRÉCIATION ET SUGGESTIONS DU PROFESSEUR :</div>
        <div style="font-size:11px;color:#0f172a;">${escapeHtml(opts.appreciation || 'Bon travail d\'ensemble. Poursuivre les efforts et renforcer les révisions régulières.')}</div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:20px;font-size:11px;font-weight:bold;">
        <div>Fait à ${escapeHtml(city)}, le ${new Date().toLocaleDateString('fr-FR')}</div>
        <div style="text-align:center;margin-right:30px;">
          Signature du Professeur<br/><br/><br/>
          ___________________________
        </div>
      </div>
    </div>
  `;
}

export function exportFicheStatistiqueMatierePdf(opts: FicheStatistiqueMatiereOptions, callbacks?: { onStart?: () => void; onDone?: () => void }) {
  const html = buildFicheStatistiqueMatiereHtml(opts);
  return exportHtmlToPdf(
    html,
    `Fiche_Statistique_${opts.classRoom.name.replace(/\s+/g, '_')}_${opts.subject.replace(/\s+/g, '_')}_T${opts.trimester}.pdf`,
    'portrait',
    callbacks
  );
}

export function exportFicheStatistiqueMatiereExcel(opts: FicheStatistiqueMatiereOptions) {
  const html = buildFicheStatistiqueMatiereHtml(opts);
  downloadExcelHTML(
    html,
    `Fiche_Statistique_${opts.classRoom.name.replace(/\s+/g, '_')}_${opts.subject.replace(/\s+/g, '_')}_T${opts.trimester}.xls`
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. FICHE PROFIL POUR CONSEIL DE CLASSE (Modèle FICHES STATISTIQUES.docx)
// ═════════════════════════════════════════════════════════════════════════════

export interface FicheProfilConseilClasseOptions {
  classRoom: ClassRoom;
  trimester: string | number;
  schoolName?: string;
  city?: string;
  drena?: string;
  iepp?: string;
  profPrincipal?: string;
  students: Student[];
  evaluations: Evaluation[];
  travailProfil?: string;
  conduiteProfil?: string;
  tableauxHonneur?: number;
  avertissements?: number;
  blames?: number;
  appreciation?: string;
}

export function buildFicheProfilConseilClasseHtml(opts: FicheProfilConseilClasseOptions): string {
  const schoolName = opts.schoolName || 'GROUPE SCOLAIRE CONFESSIONNEL ISLAMIQUE HINNEH DE KORHOGO';
  const city = opts.city || 'KORHOGO';
  const drena = opts.drena || 'DRENA KORHOGO';
  const iepp = opts.iepp || 'IEPP KORHOGO-EST';
  const classStudents = opts.students.filter(s => String(s.classId) === String(opts.classRoom.id));
  const totalEffectif = classStudents.length;

  // Calcul des moyennes générales par élève
  const studentAverages: { name: string; avg: number }[] = [];
  let nonClassesCount = 0;

  classStudents.forEach(s => {
    const evals = opts.evaluations.filter(e =>
      String(e.studentId) === String(s.id) &&
      String(e.classId) === String(opts.classRoom.id) &&
      (String(e.trimester) === String(opts.trimester) || String(opts.trimester) === 'all')
    );
    const validNotes = evals.map(e => Number(e.note)).filter(n => !isNaN(n));
    if (validNotes.length > 0) {
      const avg = validNotes.reduce((a, b) => a + b, 0) / validNotes.length;
      studentAverages.push({
        name: `${s.lastName || s.nom || ''} ${s.firstName || s.prenom || ''}`.trim(),
        avg
      });
    } else {
      nonClassesCount++;
    }
  });

  const classesCount = studentAverages.length;
  const countSup10 = studentAverages.filter(s => s.avg >= 10).length;
  const countBetween85And10 = studentAverages.filter(s => s.avg >= 8.5 && s.avg < 10).length;
  const countInf85 = studentAverages.filter(s => s.avg < 8.5).length;

  const pctSup10 = classesCount > 0 ? ((countSup10 / classesCount) * 100).toFixed(2) : '0.00';
  const pctBetween = classesCount > 0 ? ((countBetween85And10 / classesCount) * 100).toFixed(2) : '0.00';
  const pctInf85 = classesCount > 0 ? ((countInf85 / classesCount) * 100).toFixed(2) : '0.00';

  const sorted = [...studentAverages].sort((a, b) => b.avg - a.avg);
  const maxObj = sorted[0];
  const minObj = sorted[sorted.length - 1];
  const classAvg = classesCount > 0 ? (studentAverages.reduce((acc, s) => acc + s.avg, 0) / classesCount).toFixed(2) : '0.00';

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;padding:15px;max-width:850px;margin:0 auto;">
      <!-- En-tête Institutionnel -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:12px;">
        <div style="line-height:1.3;font-size:10px;">
          <div><strong>MINISTÈRE DE L’ÉDUCATION NATIONALE ET DE L’ALPHABÉTISATION</strong></div>
          <div>${escapeHtml(drena)} / ${escapeHtml(iepp)}</div>
          <div style="font-weight:bold;color:#0369a1;margin-top:2px;">${escapeHtml(schoolName)}</div>
          <div>ANNÉE SCOLAIRE 2025-2026</div>
        </div>
        <div style="text-align:right;font-size:10px;">
          <div style="font-weight:bold;">RÉPUBLIQUE DE CÔTE D’IVOIRE</div>
          <div style="font-style:italic;color:#64748b;">Union - Discipline - Travail</div>
        </div>
      </div>

      <div style="text-align:center;background:#f1f5f9;border:1.5px solid #0f172a;padding:6px;margin-bottom:12px;">
        <h2 style="margin:0;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;">
          FICHE PROFIL POUR CONSEIL DE CLASSE — TRIMESTRE ${opts.trimester}
        </h2>
      </div>

      <div style="font-size:11px;margin-bottom:10px;background:#f8fafc;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px;line-height:1.6;">
        <div><strong>PROFESSEUR PRINCIPAL :</strong> ${escapeHtml(opts.profPrincipal || '___________________________')} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>CLASSE :</strong> ${escapeHtml(opts.classRoom.name)}</div>
        <div><strong>EFFECTIF TOTAL :</strong> ${totalEffectif} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>CLASSÉ(S) :</strong> ${classesCount} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>NON CLASSÉ(S) :</strong> ${nonClassesCount}</div>
      </div>

      <!-- PROFIL DE LA CLASSE -->
      <div style="border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;margin-bottom:12px;background:#ffffff;">
        <div style="font-weight:bold;font-size:11px;color:#0369a1;margin-bottom:4px;text-transform:uppercase;">1. PROFIL DE LA CLASSE</div>
        <div style="font-size:11px;margin-bottom:3px;"><strong>Le travail :</strong> ${escapeHtml(opts.travailProfil || 'Ensemble satisfaisant avec une bonne participation générale.')}</div>
        <div style="font-size:11px;"><strong>La conduite :</strong> ${escapeHtml(opts.conduiteProfil || 'Climat de classe serein et propice aux apprentissages.')}</div>
      </div>

      <!-- STATISTIQUES DES RESULTATS SCOLAIRES -->
      <div style="font-weight:bold;font-size:11px;color:#0369a1;margin-bottom:4px;text-transform:uppercase;">2. STATISTIQUES DES RÉSULTATS SCOLAIRES</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px;text-align:center;" border="1" cellpadding="5">
        <thead>
          <tr style="background-color:#f1f5f9;">
            <th colspan="2" style="background-color:#dcfce7;color:#166534;font-weight:bold;width:33%;">MOY &ge; 10</th>
            <th colspan="2" style="background-color:#fef9c3;color:#854d0e;font-weight:bold;width:33%;">10 &gt; MOY &ge; 08.50</th>
            <th colspan="2" style="background-color:#fee2e2;color:#991b1b;font-weight:bold;width:33%;">MOY &lt; 08.50</th>
          </tr>
          <tr style="background-color:#f8fafc;font-weight:bold;">
            <th>NOMBRE</th><th>%</th>
            <th>NOMBRE</th><th>%</th>
            <th>NOMBRE</th><th>%</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:bold;font-size:12px;">${countSup10}</td>
            <td style="font-weight:bold;">${pctSup10} %</td>
            <td style="font-weight:bold;font-size:12px;">${countBetween85And10}</td>
            <td style="font-weight:bold;">${pctBetween} %</td>
            <td style="font-weight:bold;font-size:12px;">${countInf85}</td>
            <td style="font-weight:bold;">${pctInf85} %</td>
          </tr>
        </tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;text-align:center;" border="1" cellpadding="5">
        <thead>
          <tr style="background-color:#1e293b;color:#ffffff;">
            <th>MOYENNE LA PLUS FORTE</th>
            <th>OBTENUE PAR</th>
            <th>MOY LA PLUS FAIBLE</th>
            <th>OBTENUE PAR</th>
            <th style="background-color:#0284c7;">MOY CLASSE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:bold;color:#16a34a;">${maxObj ? maxObj.avg.toFixed(2) : '-'}</td>
            <td style="font-weight:600;">${maxObj ? escapeHtml(maxObj.name) : '-'}</td>
            <td style="font-weight:bold;color:#dc2626;">${minObj ? minObj.avg.toFixed(2) : '-'}</td>
            <td style="font-weight:600;">${minObj ? escapeHtml(minObj.name) : '-'}</td>
            <td style="font-weight:bold;background-color:#f0f9ff;color:#0369a1;">${classAvg}</td>
          </tr>
        </tbody>
      </table>

      <!-- DISTINCTIONS -->
      <div style="border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;margin-bottom:12px;background:#ffffff;font-size:11px;">
        <div style="font-weight:bold;color:#0369a1;margin-bottom:4px;text-transform:uppercase;">3. DISTINCTIONS & DISCIPLINE</div>
        <div style="display:flex;gap:25px;">
          <div><strong>Tableaux d'honneur :</strong> <u>${opts.tableauxHonneur ?? countSup10}</u></div>
          <div><strong>Avertissements travail/conduite :</strong> <u>${opts.avertissements ?? countInf85}</u></div>
          <div><strong>Blâmes :</strong> <u>${opts.blames ?? 0}</u></div>
        </div>
      </div>

      <!-- APPRÉCIATIONS ET SUGGESTIONS -->
      <div style="border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;margin-bottom:15px;background:#fafafa;font-size:11px;">
        <div style="font-weight:bold;color:#334155;margin-bottom:3px;">APPRÉCIATION ET SUGGESTIONS DU CONSEIL :</div>
        <div>${escapeHtml(opts.appreciation || 'Félicitations pour les progrès accomplis. Encouragements vifs à maintenir cette dynamique d\'excellence.')}</div>
      </div>

      <!-- SIGNATURES -->
      <div style="display:flex;justify-content:space-between;margin-top:20px;font-size:11px;font-weight:bold;text-align:center;">
        <div>
          Le Professeur Principal<br/><br/><br/>
          ___________________________
        </div>
        <div>
          Les Membres du Conseil<br/><br/><br/>
          ___________________________
        </div>
        <div>
          Le Chef d'Établissement / Dir. Études<br/><br/><br/>
          ___________________________
        </div>
      </div>
    </div>
  `;
}

export function exportFicheProfilConseilClassePdf(opts: FicheProfilConseilClasseOptions, callbacks?: { onStart?: () => void; onDone?: () => void }) {
  const html = buildFicheProfilConseilClasseHtml(opts);
  return exportHtmlToPdf(
    html,
    `Fiche_Profil_Conseil_${opts.classRoom.name.replace(/\s+/g, '_')}_T${opts.trimester}.pdf`,
    'portrait',
    callbacks
  );
}

export function exportFicheProfilConseilClasseExcel(opts: FicheProfilConseilClasseOptions) {
  const html = buildFicheProfilConseilClasseHtml(opts);
  downloadExcelHTML(
    html,
    `Fiche_Profil_Conseil_${opts.classRoom.name.replace(/\s+/g, '_')}_T${opts.trimester}.xls`
  );
}

