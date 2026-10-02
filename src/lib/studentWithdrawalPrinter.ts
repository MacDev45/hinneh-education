/**
 * studentWithdrawalPrinter.ts
 * Module officiel d'exportation PDF et d'impression du Registre des Élèves Retirés (Radiations).
 * Respecte les normes officielles du Ministère de l'Éducation Nationale et de l'Alphabétisation de Côte d'Ivoire.
 */

import { resolveEnteteEtablissement } from './ecoleIdentite';

export interface WithdrawnStudentReportItem {
  id?: string | number;
  eleve_id?: number | string;
  matricule: string;
  nom: string;
  prenom: string;
  nom_complet?: string;
  classe?: string;
  nom_classe?: string;
  ecole?: string;
  nom_ecole?: string;
  motif?: string;
  motif_retrait?: string;
  dateRetrait?: string;
  date_retrait?: string;
  etablissementAccueil?: string;
  etablissement_accueil?: string;
  observations?: string;
  statut?: string;
}

export interface WithdrawnRegisterOptions {
  schoolName?: string;
  schoolCode?: string;
  drena?: string;
  city?: string;
  anneeScolaire?: string;
  logoUrl?: string;
  titre?: string;
  subTitre?: string;
}

/**
 * Génère le code HTML complet du Registre Officiel des Radiations / Retraits d'Élèves au format A4 Paysage
 */
export function generateWithdrawnStudentsHtml(
  items: WithdrawnStudentReportItem[],
  options?: WithdrawnRegisterOptions
): string {
  const today = new Date();
  const todayStr = today.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const anneeScolaire = options?.anneeScolaire || '2026-2027';
  const entete = resolveEnteteEtablissement({});

  const schoolName = options?.schoolName || entete.fullName || 'GROUPE SCOLAIRE HÎNNEH';
  const schoolCode = options?.schoolCode || entete.code || 'ETAB-HINNEH';
  const city = (options?.city || entete.city || 'ABIDJAN').toUpperCase();
  const drena = options?.drena || `DRENA ${city} 4`;
  const logo = options?.logoUrl || entete.logo || '/images/hinneh_logo_20260507_234919.png';

  const totalCount = items.length;
  const actifsCount = items.filter((i) => i.statut !== 'restaure').length;
  const restauresCount = items.filter((i) => i.statut === 'restaure').length;

  const rowsHtml = items.map((item, idx) => {
    const nomUpper = (item.nom || '').trim().toUpperCase();
    const prenomVal = (item.prenom || '').trim();
    const classeName = item.nom_classe || item.classe || 'Non assignée';
    const ecoleName = item.nom_ecole || item.ecole || 'Établissement';
    const motifStr = item.motif_retrait || item.motif || 'Non précisé';
    const dateStr = item.date_retrait || item.dateRetrait || '—';
    const accueilStr = item.etablissement_accueil || item.etablissementAccueil || '';
    const obsStr = item.observations || '';
    const isRestored = item.statut === 'restaure';

    const detailsStr = [accueilStr ? `Accueil: ${accueilStr}` : '', obsStr ? `Obs: ${obsStr}` : '']
      .filter(Boolean)
      .join(' | ') || '—';

    return `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: 700; color: #0284c7;">${item.matricule}</td>
        <td style="font-weight: 800; color: #0f172a; text-transform: uppercase;">${nomUpper}</td>
        <td style="font-weight: 600; color: #334155;">${prenomVal}</td>
        <td style="font-weight: 700; color: #4338ca;">${classeName}</td>
        <td style="color: #475569; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ecoleName}</td>
        <td style="color: #b91c1c; font-weight: 600;">${motifStr}</td>
        <td style="font-family: monospace; color: #475569; white-space: nowrap;">${dateStr}</td>
        <td style="font-size: 8px; color: #64748b; max-width: 140px; overflow: hidden; text-overflow: ellipsis;">${detailsStr}</td>
        <td style="text-align: center;">
          ${
            isRestored
              ? '<span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 8px; font-weight: 700; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">Restauré</span>'
              : '<span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 8px; font-weight: 700; background: #fff1f2; color: #be123c; border: 1px solid #fecdd3;">Retiré</span>'
          }
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Registre_Eleves_Retires_${anneeScolaire}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 8mm 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-size: 9.5px;
          line-height: 1.35;
        }
        .page-container {
          width: 100%;
          padding: 4px;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
        }
        .header-table td {
          vertical-align: top;
          padding: 2px 4px;
        }
        .ministry-block {
          width: 32%;
          font-size: 8.5px;
          line-height: 1.25;
          text-align: left;
          color: #1e293b;
        }
        .logo-block {
          width: 36%;
          text-align: center;
        }
        .logo-img {
          height: 48px;
          max-width: 120px;
          object-fit: contain;
          margin-bottom: 2px;
        }
        .school-title {
          margin: 0;
          font-size: 13px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .school-sub {
          margin: 1px 0 0 0;
          font-size: 8.5px;
          font-weight: 600;
          color: #475569;
        }
        .meta-right-block {
          width: 32%;
          text-align: right;
          font-size: 8.5px;
          line-height: 1.3;
          color: #334155;
        }
        .divider {
          border: none;
          border-top: 2px solid #0f172a;
          margin: 4px 0 8px 0;
        }
        .doc-badge {
          background: #991b1b;
          color: #ffffff;
          padding: 5px 12px;
          border-radius: 4px;
          text-align: center;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .stats-bar {
          display: flex;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-left: 4px solid #b91c1c;
          border-radius: 4px;
          padding: 4px 10px;
          margin-bottom: 8px;
          font-size: 8.5px;
          color: #334155;
        }
        .stats-bar strong {
          color: #0f172a;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }
        .report-table th {
          background: #0f172a;
          color: #ffffff;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 5px 6px;
          border: 1px solid #334155;
          text-align: left;
        }
        .report-table td {
          padding: 4px 6px;
          border: 1px solid #e2e8f0;
          font-size: 8.5px;
          vertical-align: middle;
        }
        .signatures-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          page-break-inside: avoid;
        }
        .sig-card {
          border: 1px dashed #94a3b8;
          border-radius: 4px;
          padding: 6px 10px;
          text-align: center;
          background: #fafafa;
          min-height: 65px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .sig-title {
          font-size: 8.5px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
        }
        .sig-sub {
          font-size: 7.5px;
          color: #64748b;
          font-style: italic;
        }
        .footer-legal {
          margin-top: 8px;
          text-align: center;
          font-size: 7.5px;
          color: #94a3b8;
          border-top: 1px solid #f1f5f9;
          padding-top: 4px;
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <!-- En-tête Officiel -->
        <table class="header-table">
          <tr>
            <td class="ministry-block">
              <strong>RÉPUBLIQUE DE CÔTE D'IVOIRE</strong><br/>
              <em>Union – Discipline – Travail</em><br/>
              --------------------------------<br/>
              MINISTÈRE DE L'ÉDUCATION NATIONALE<br/>
              ET DE L'ALPHABÉTISATION<br/>
              <strong>${drena}</strong>
            </td>
            <td class="logo-block">
              <img class="logo-img" src="${logo}" alt="Logo" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
              <h1 class="school-title">${schoolName}</h1>
              <p class="school-sub">SERVICE DE LA VIE SCOLAIRE & DE LA SCOLARITÉ</p>
            </td>
            <td class="meta-right-block">
              <strong>Année Scolaire :</strong> ${anneeScolaire}<br/>
              <strong>Code Établissement :</strong> ${schoolCode}<br/>
              <strong>Ville :</strong> ${city}<br/>
              <strong>Date d'édition :</strong> ${todayStr}
            </td>
          </tr>
        </table>

        <hr class="divider" />

        <!-- Titre du document -->
        <div class="doc-badge">
          REGISTRE OFFICIEL DES RADIATIONS & RETRAITS D'ÉLÈVES
        </div>

        <!-- Barre de statistiques et métadonnées -->
        <div class="stats-bar">
          <div>
            <strong>Effectif total archivé :</strong> ${totalCount} élève(s) retiré(s)
          </div>
          <div>
            <strong>Statut actif du registre :</strong> ${actifsCount} radiation(s) définitive(s) | ${restauresCount} réintégration(s)
          </div>
          <div>
            <strong>Document certifié conforme :</strong> Registre d'archives officiel
          </div>
        </div>

        <!-- Tableau des élèves -->
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">N°</th>
              <th style="width: 80px;">Matricule</th>
              <th style="width: 140px;">Nom</th>
              <th style="width: 130px;">Prénoms</th>
              <th style="width: 90px;">Classe</th>
              <th style="width: 120px;">Établissement</th>
              <th style="width: 140px;">Motif du Retrait</th>
              <th style="width: 80px;">Date Effective</th>
              <th>Accueil / Observations</th>
              <th style="width: 60px; text-align: center;">Statut</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;">Aucun élève retiré dans ce registre.</td></tr>'}
          </tbody>
        </table>

        <!-- Signatures Officielles -->
        <div class="signatures-grid">
          <div class="sig-card">
            <div class="sig-title">Le Responsable de la Vie Scolaire</div>
            <div class="sig-sub">(Visa & Vérification des effectifs)</div>
          </div>
          <div class="sig-card">
            <div class="sig-title">Le Directeur des Études / Censeur</div>
            <div class="sig-sub">(Contrôle des radiations académiques)</div>
          </div>
          <div class="sig-card">
            <div class="sig-title">Le Chef d'Établissement</div>
            <div class="sig-sub">(Signature, Date & Cachet Officiel)</div>
          </div>
        </div>

        <!-- Note légale de bas de page -->
        <div class="footer-legal">
          Document administratif officiel généré par le Système de Gestion Scolaire Hinneh Éducation • Les données ont été archivées conformément à la réglementation scolaire en vigueur.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Télécharge directement le Registre Officiel des Élèves Retirés sous format PDF (.pdf)
 */
export async function downloadWithdrawnStudentsPDF(
  items: WithdrawnStudentReportItem[],
  options?: WithdrawnRegisterOptions
): Promise<void> {
  const anneeScolaire = options?.anneeScolaire || '2026-2027';
  const filename = `Registre_Eleves_Retires_${anneeScolaire}_${new Date().toISOString().split('T')[0]}.pdf`;

  const htmlContent = generateWithdrawnStudentsHtml(items, options);

  // Utiliser un iframe temporaire isolé pour éviter tout conflit de rendu CSS Tailwind
  const iframe = document.createElement('iframe');
  iframe.id = 'temp-pdf-withdrawn-frame';
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '1123px'; // A4 Paysage à 96dpi (~297mm)
  iframe.style.height = '794px';  // A4 Paysage à 96dpi (~210mm)
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error("Impossible d'accéder au document de l'iframe temporaire.");
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Laisser le temps au rendu de l'iframe et aux styles de s'appliquer
    await new Promise((resolve) => setTimeout(resolve, 350));

    const targetElement = iframeDoc.querySelector('.page-container') || iframeDoc.body;

    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = (html2pdfModule as any).default || html2pdfModule;

    const opt = {
      margin: [5, 5, 5, 5],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1123,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
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
 * Ouvre la fenêtre d'impression pour le Registre Officiel des Élèves Retirés
 */
export function printWithdrawnStudentsRegister(
  items: WithdrawnStudentReportItem[],
  options?: WithdrawnRegisterOptions
): void {
  const htmlContent = generateWithdrawnStudentsHtml(items, options);
  const printWin = window.open('', '_blank', 'width=1100,height=800');

  if (!printWin) {
    alert("Veuillez autoriser les fenêtres surgissantes (pop-ups) pour imprimer le registre des élèves retirés.");
    return;
  }

  printWin.document.open();
  printWin.document.write(htmlContent);
  printWin.document.close();

  printWin.focus();
  setTimeout(() => {
    try {
      printWin.print();
    } catch (e) {
      console.error(e);
    }
  }, 400);
}
