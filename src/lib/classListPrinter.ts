/**
 * classListPrinter.ts
 * Module officiel d'impression et d'export (PDF & Excel) des listes de classe Hinneh Éducation.
 * Respecte les règles de dénomination d'école selon le cycle/niveau et la ville de l'utilisateur connecté.
 */

import * as XLSX from 'xlsx';
import { formatDate, calculateAge, type Student, type ClassRoom, type School, type Staff, formatStudentName } from '@/lib/index';

export interface ClassListInfo {
  classe: ClassRoom;
  students: Student[];
  school?: School | null;
  teacher?: Staff | null;
  userCity?: string | null;
  anneeScolaire?: string;
}

/**
 * Résout le nom officiel de l'école selon le niveau de la classe et la ville de l'utilisateur connecté.
 * Règles demandées :
 * - Maternelle (MPS, MGS, MMS, TPS, PS, MS, GS...) : ECOLE MATERNELLE HINNEH [VILLE]
 * - Primaire (CP, CE, CM, CP1, CP2, CE1, CE2, CM1, CM2...) : ECOLE PRIMAIRE HINNEH [VILLE]
 * - Secondaire (6e à la terminale / TLE, 5e, 4e, 3e, 2nde, 1ere...) : COLLEGE PRIVEE HINNEH [VILLE]
 * - Villes : Abidjan, Yamoussoukro, Daloa, Bouake, Korgho (Korhogo)
 */
export function resolveSchoolDetailsForClass(
  className?: string | null,
  niveauName?: string | null,
  cycleName?: string | null,
  schoolObj?: any,
  userCityOverride?: string | null
): {
  schoolName: string;
  establishmentType: string;
  cycleLabel: string;
  city: string;
  logo: string;
  codeEtablissement: string;
  drena: string;
} {
  // 1. Détection et normalisation de la ville
  let rawCity = (
    userCityOverride ||
    localStorage.getItem('user_city') ||
    localStorage.getItem('user_ville') ||
    localStorage.getItem('ville') ||
    schoolObj?.city ||
    schoolObj?.ville ||
    schoolObj?.region ||
    'Abidjan'
  ).trim();

  const cClean = rawCity.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let city = 'ABIDJAN';
  let drena = 'DRENA ABIDJAN 4';

  if (cClean.includes('KOR') || cClean.includes('KORGHO') || cClean.includes('KORHOGO')) {
    city = cClean.includes('KORGHO') ? 'KORGHO' : 'KORHOGO';
    drena = 'DRENA KORHOGO';
  } else if (cClean.includes('BOUAK')) {
    city = 'BOUAKE';
    drena = 'DRENA BOUAKE 1';
  } else if (cClean.includes('DALOA')) {
    city = 'DALOA';
    drena = 'DRENA DALOA';
  } else if (cClean.includes('YAM') || cClean.includes('YAMOUSSOUKRO')) {
    city = 'YAMOUSSOUKRO';
    drena = 'DRENA YAMOUSSOUKRO';
  } else {
    city = 'ABIDJAN';
    drena = 'DRENA ABIDJAN 4';
  }

  // 2. Détection du niveau et du cycle
  const textToScan = `${className || ''} ${niveauName || ''} ${cycleName || ''}`.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const isMaternelle =
    textToScan.includes('MPS') ||
    textToScan.includes('MMS') ||
    textToScan.includes('MGS') ||
    textToScan.includes('TPS') ||
    /\bPS\b/.test(textToScan) ||
    /\bMS\b/.test(textToScan) ||
    /\bGS\b/.test(textToScan) ||
    textToScan.includes('MATERNELLE') ||
    textToScan.includes('PETITE SECTION') ||
    textToScan.includes('MOYENNE SECTION') ||
    textToScan.includes('GRANDE SECTION');

  const isPrimaire =
    !isMaternelle && (
      textToScan.includes('CP1') ||
      textToScan.includes('CP2') ||
      textToScan.includes('CE1') ||
      textToScan.includes('CE2') ||
      textToScan.includes('CM1') ||
      textToScan.includes('CM2') ||
      /\bCP\b/.test(textToScan) ||
      /\bCE\b/.test(textToScan) ||
      /\bCM\b/.test(textToScan) ||
      textToScan.includes('PRIMAIRE')
    );

  let schoolName = '';
  let establishmentType = '';
  let cycleLabel = '';

  if (isMaternelle) {
    schoolName = `ECOLE MATERNELLE HINNEH ${city}`;
    establishmentType = 'ENSEIGNEMENT PRÉSCOLAIRE / MATERNELLE';
    cycleLabel = 'Cycle Maternelle';
  } else if (isPrimaire) {
    schoolName = `ECOLE PRIMAIRE HINNEH ${city}`;
    establishmentType = 'ENSEIGNEMENT PRIMAIRE';
    cycleLabel = 'Cycle Primaire';
  } else {
    schoolName = `COLLEGE PRIVEE HINNEH ${city}`;
    establishmentType = 'ENSEIGNEMENT SECONDAIRE GÉNÉRAL';
    cycleLabel = 'Cycle Secondaire';
  }

  const logo = schoolObj?.logo || '/images/hinneh_logo_20260507_234919.png';
  const codeEtablissement = schoolObj?.code || schoolObj?.ET_CODEETABLISSEMENT || 'FHA-01';

  return {
    schoolName,
    establishmentType,
    cycleLabel,
    city,
    logo,
    codeEtablissement,
    drena,
  };
}

/**
 * Construit le template HTML officiel de la liste de classe pour Impression et PDF
 */
export function generateClassListHtml(info: ClassListInfo): string {
  const { classe, students, school, teacher, userCity, anneeScolaire = '2026-2027' } = info;
  const schoolInfo = resolveSchoolDetailsForClass(classe.name, classe.niveau, classe.cycle, school, userCity);

  const todayStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const boysCount = students.filter((s) => s.gender === 'M').length;
  const girlsCount = students.filter((s) => s.gender === 'F').length;
  const totalCount = students.length;
  const profName = teacher ? formatStudentName(teacher) : 'Non assigné';

  const rowsHtml = students.map((s, idx) => {
    const matricule = s.matricule || 'N/A';
    const nomMaj = (s.lastName || '').toUpperCase();
    const prenom = s.firstName || '';
    const genre = s.gender === 'M' ? 'M' : s.gender === 'F' ? 'F' : (s.gender || 'M');
    const dateNaiss = s.dateOfBirth ? formatDate(s.dateOfBirth) : 'N/C';
    const age = calculateAge(s.dateOfBirth);
    const ageStr = age ? `${age} ans` : '-';
    const statut = s.status || 'Inscrit';
    const contact = s.parentPhone || s.emergencyPhone || '-';

    return `
      <tr>
        <td class="text-center font-bold">${idx + 1}</td>
        <td class="font-mono">${matricule}</td>
        <td class="font-bold uppercase">${nomMaj} <span class="capitalize font-normal">${prenom}</span></td>
        <td class="text-center font-bold ${genre === 'M' ? 'genre-m' : 'genre-f'}">${genre}</td>
        <td class="text-center">${dateNaiss}</td>
        <td class="text-center">${ageStr}</td>
        <td class="text-center"><span class="badge-status">${statut}</span></td>
        <td class="text-center font-mono">${contact}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Liste de classe - ${classe.name} - ${schoolInfo.schoolName}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.35;
        }
        .page-container {
          padding: 4px;
          display: flex;
          flex-direction: column;
          min-height: 98vh;
          justify-content: space-between;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }
        .header-table td {
          vertical-align: middle;
          padding: 2px 4px;
        }
        .ministry-block {
          text-align: left;
          font-size: 8.5px;
          font-weight: 700;
          color: #334155;
          line-height: 1.25;
          text-transform: uppercase;
          width: 33%;
        }
        .logo-block {
          text-align: center;
          width: 34%;
        }
        .logo-img {
          width: 60px;
          height: 60px;
          object-fit: contain;
          margin-bottom: 2px;
        }
        .school-title {
          font-size: 14px;
          font-weight: 900;
          color: #1e3a8a;
          margin: 0;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .school-sub {
          font-size: 8.5px;
          font-weight: 700;
          color: #475569;
          margin: 1px 0 0 0;
          text-transform: uppercase;
        }
        .meta-right-block {
          text-align: right;
          font-size: 9px;
          color: #334155;
          line-height: 1.3;
          width: 33%;
        }
        .divider {
          border: none;
          border-top: 2px solid #1e3a8a;
          margin: 4px 0 8px 0;
        }
        .doc-badge {
          background: #1e3a8a;
          color: #ffffff;
          font-size: 11px;
          font-weight: 900;
          text-align: center;
          padding: 4px 10px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 8px;
        }
        .class-meta-card {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-left: 5px solid #2563eb;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .class-meta-item {
          display: flex;
          flex-direction: column;
        }
        .class-meta-label {
          font-size: 8.5px;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
        }
        .class-meta-value {
          font-size: 11.5px;
          color: #0f172a;
          font-weight: 800;
        }
        .class-meta-highlight {
          color: #1d4ed8;
          font-size: 13.5px;
        }
        .stats-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .roster-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
          margin-bottom: 8px;
        }
        .roster-table th {
          background: #1e293b;
          color: #ffffff;
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 5px 6px;
          border: 1px solid #1e293b;
          text-align: left;
        }
        .roster-table td {
          padding: 4px 6px;
          border: 1px solid #e2e8f0;
          font-size: 9px;
        }
        .roster-table tbody tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .font-bold { font-weight: 700; }
        .uppercase { text-transform: uppercase; }
        .capitalize { text-transform: capitalize; }
        .genre-m { color: #1d4ed8; }
        .genre-f { color: #db2777; }
        .badge-status {
          background: #e0f2fe;
          color: #0369a1;
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 8px;
          font-weight: 700;
        }
        .signatures-section {
          margin-top: 10px;
          page-break-inside: avoid;
          border-top: 1px dashed #94a3b8;
          padding-top: 8px;
        }
        .signatures-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          text-align: center;
        }
        .sig-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px;
          min-height: 70px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .sig-title {
          font-size: 8.5px;
          font-weight: 800;
          color: #1e3a8a;
          text-transform: uppercase;
        }
        .sig-sub {
          font-size: 8px;
          color: #94a3b8;
          font-style: italic;
        }
        .footer-note {
          font-size: 7.5px;
          color: #64748b;
          text-align: center;
          margin-top: 6px;
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <div>
          <!-- En-tête Officiel -->
          <table class="header-table">
            <tr>
              <td class="ministry-block">
                RÉPUBLIQUE DE CÔTE D'IVOIRE<br/>
                <em>Union – Discipline – Travail</em><br/>
                ------------------------<br/>
                MINISTÈRE DE L'ÉDUCATION NATIONALE<br/>
                ET DE L'ALPHABÉTISATION<br/>
                <strong>${schoolInfo.drena}</strong>
              </td>
              <td class="logo-block">
                <img class="logo-img" src="${schoolInfo.logo}" alt="Logo Hinneh" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
                <h1 class="school-title">${schoolInfo.schoolName}</h1>
                <p class="school-sub">${schoolInfo.establishmentType}</p>
              </td>
              <td class="meta-right-block">
                <strong>Année Scolaire :</strong> ${anneeScolaire}<br/>
                <strong>Code Établissement :</strong> ${schoolInfo.codeEtablissement}<br/>
                <strong>Ville :</strong> ${schoolInfo.city}<br/>
                <strong>Date d'édition :</strong> ${todayStr}
              </td>
            </tr>
          </table>

          <hr class="divider" />

          <!-- Titre du document -->
          <div class="doc-badge">
            LISTE OFFICIELLE DES ÉLÈVES PAR CLASSE
          </div>

          <!-- Métadonnées de la classe -->
          <div class="class-meta-card">
            <div class="class-meta-item">
              <span class="class-meta-label">Classe</span>
              <span class="class-meta-value class-meta-highlight">${classe.name}</span>
            </div>
            <div class="class-meta-item">
              <span class="class-meta-label">Niveau / Cycle</span>
              <span class="class-meta-value">${classe.niveau || schoolInfo.cycleLabel}</span>
            </div>
            <div class="class-meta-item">
              <span class="class-meta-label">Professeur Principal / Titulaire</span>
              <span class="class-meta-value">${profName}</span>
            </div>
            <div class="class-meta-item">
              <span class="class-meta-label">Effectifs</span>
              <div class="stats-badge">
                <span>Total : <strong>${totalCount}</strong></span>
                <span>•</span>
                <span class="genre-m">G : <strong>${boysCount}</strong></span>
                <span>•</span>
                <span class="genre-f">F : <strong>${girlsCount}</strong></span>
              </div>
            </div>
          </div>

          <!-- Tableau des élèves -->
          <table class="roster-table">
            <thead>
              <tr>
                <th style="width: 4%; text-align: center;">N°</th>
                <th style="width: 14%;">Matricule</th>
                <th style="width: 32%;">Nom & Prénoms</th>
                <th style="width: 6%; text-align: center;">Sexe</th>
                <th style="width: 12%; text-align: center;">Date Naiss.</th>
                <th style="width: 6%; text-align: center;">ge</th>
                <th style="width: 12%; text-align: center;">Statut</th>
                <th style="width: 14%; text-align: center;">Contact Parent</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Section Signatures & Footer -->
        <div class="signatures-section">
          <div class="signatures-grid">
            <div class="sig-box">
              <span class="sig-title">Le Titulaire / Prof. Principal</span>
              <span class="sig-sub">${profName}</span>
            </div>
            <div class="sig-box">
              <span class="sig-title">L'Éducateur / Vie Scolaire</span>
              <span class="sig-sub">Visa & Contrôle</span>
            </div>
            <div class="sig-box">
              <span class="sig-title">Le Chef d'Établissement</span>
              <span class="sig-sub">Signature & Cachet Officiel</span>
            </div>
          </div>
          <div class="footer-note">
            Document généré officiellement par le Système Intégré Hînneh Éducation le ${todayStr}. Fait foi pour l'administration scolaire.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Télécharge la liste de classe sous forme de document PDF propre (A4 Portrait)
 */
export async function downloadClassListPDF(info: ClassListInfo): Promise<void> {
  const { classe, school, userCity } = info;
  const schoolInfo = resolveSchoolDetailsForClass(classe.name, classe.niveau, classe.cycle, school, userCity);
  const cleanClassName = (classe.name || 'Classe').replace(/\s+/g, '_');
  const cleanSchoolName = schoolInfo.schoolName.replace(/\s+/g, '_');
  const filename = `Liste_Classe_${cleanClassName}_${cleanSchoolName}.pdf`;

  const htmlContent = generateClassListHtml(info);

  // Utiliser un iframe temporaire isolé afin d'éviter que html2canvas n'analyse les styles globaux oklch de Tailwind v4
  const iframe = document.createElement('iframe');
  iframe.id = 'temp-pdf-roster-frame';
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '794px'; // ~210mm à 96dpi
  iframe.style.height = '1123px'; // ~297mm à 96dpi
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Impossible d\'accéder au document de l\'iframe');
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Attendre le rendu du DOM de l'iframe
    await new Promise((resolve) => setTimeout(resolve, 300));

    const targetElement = iframeDoc.querySelector('.page-container') || iframeDoc.body;

    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = (html2pdfModule as any).default || html2pdfModule;

    const opt = {
      margin: [6, 6, 6, 6],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' },
    };

    await html2pdf().set(opt).from(targetElement).save();
  } finally {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }
}

/**
 * Télécharge la liste de classe sous forme de fichier Excel (.xlsx) structuré
 */
export function downloadClassListExcel(info: ClassListInfo): void {
  const { classe, students, school, teacher, userCity, anneeScolaire = '2026-2027' } = info;
  const schoolInfo = resolveSchoolDetailsForClass(classe.name, classe.niveau, classe.cycle, school, userCity);
  const cleanClassName = (classe.name || 'Classe').replace(/\s+/g, '_');
  const cleanSchoolName = schoolInfo.schoolName.replace(/\s+/g, '_');
  const filename = `Liste_Classe_${cleanClassName}_${cleanSchoolName}.xlsx`;

  const boysCount = students.filter((s) => s.gender === 'M').length;
  const girlsCount = students.filter((s) => s.gender === 'F').length;
  const totalCount = students.length;
  const profName = teacher ? formatStudentName(teacher) : 'Non assigné';

  // Lignes d'en-tête du fichier Excel
  const aoa: any[][] = [
    ['RÉPUBLIQUE DE CÔTE D\'IVOIRE — MINISTÈRE DE L\'ÉDUCATION NATIONALE ET DE L\'ALPHABÉTISATION'],
    [schoolInfo.schoolName],
    [`ÉTABLISSEMENT : ${schoolInfo.establishmentType} | DRENA : ${schoolInfo.drena}`],
    [`LISTE OFFICIELLE DE CLASSE : ${classe.name} (Année Scolaire : ${anneeScolaire})`],
    [`Niveau / Cycle : ${classe.niveau || schoolInfo.cycleLabel} | Titulaire : ${profName}`],
    [`Effectif Total : ${totalCount} élèves (Garçons : ${boysCount}, Filles : ${girlsCount})`],
    [], // Ligne vide
    [
      'N°',
      'Matricule',
      'Nom',
      'Prénoms',
      'Genre',
      'Date de Naissance',
      'ge',
      'Statut',
      'Parent / Tuteur',
      'Téléphone Parent',
      'Email Parent',
    ],
  ];

  students.forEach((s, idx) => {
    aoa.push([
      idx + 1,
      s.matricule || 'N/A',
      (s.lastName || '').toUpperCase(),
      s.firstName || '',
      s.gender === 'M' ? 'Masculin' : s.gender === 'F' ? 'Féminin' : (s.gender || 'M'),
      s.dateOfBirth ? formatDate(s.dateOfBirth) : 'N/C',
      calculateAge(s.dateOfBirth) ? `${calculateAge(s.dateOfBirth)} ans` : '-',
      s.status || 'Inscrit',
      s.parentName || 'Parent d\'élève',
      s.parentPhone || s.emergencyPhone || '-',
      s.parentEmail || '-',
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Définition de largeurs de colonnes confortables
  ws['!cols'] = [
    { wch: 5 },  // N°
    { wch: 16 }, // Matricule
    { wch: 22 }, // Nom
    { wch: 25 }, // Prénoms
    { wch: 12 }, // Genre
    { wch: 16 }, // Date Naiss
    { wch: 10 }, // ge
    { wch: 14 }, // Statut
    { wch: 24 }, // Parent
    { wch: 18 }, // Tel Parent
    { wch: 26 }, // Email Parent
  ];

  XLSX.utils.book_append_sheet(wb, ws, cleanClassName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

/**
 * Ouvre la fenêtre d'impression native avec le template officiel A4
 */
export function printClassList(info: ClassListInfo): void {
  const htmlContent = generateClassListHtml(info);
  const printWin = window.open('', '_blank', 'width=950,height=1000');
  if (!printWin) {
    alert('Veuillez autoriser les fenêtres surgissantes (pop-ups) pour imprimer la liste de classe.');
    return;
  }
  printWin.document.open();
  printWin.document.write(htmlContent);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => {
    printWin.print();
  }, 500);
}
