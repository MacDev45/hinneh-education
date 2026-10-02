import { formatCurrency } from './index';
import { getEcoleCourante } from '@/lib/ecoleIdentite';

export interface RelancePrintItem {
  matricule: string;
  nom: string;
  prenom: string;
  classe: string;
  parentNom: string;
  parentPhone: string;
  parentAdresse?: string;
  serviceType?: string; // 'scolarite' | 'transport' | 'cantine' | 'tous'
  trancheLibelle?: string;
  dateEcheance: string; // e.g. '2026-10-05'
  montantAPayer: number;
  montantVerse: number;
  soldeRestant: number;
  anneeScolaire?: string;
  isPreventive?: bool; // True if J-7 reminder before the 5th of the month
  daysRemaining?: number;
}

export function printRelanceLetter(item: RelancePrintItem) {
  printRelanceLetters([item]);
}

export function printRelanceLetters(items: RelancePrintItem[]) {
  if (!items || items.length === 0) return;

  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres surgissantes (pop-ups) pour imprimer les relances.");
    return;
  }

  const todayStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // En-tête pris sur la fiche « Profil École » de l'établissement de l'utilisateur.
  const ecole = getEcoleCourante();
  const enTeteNom = (ecole?.name || '').toUpperCase();
  const enTeteAdresse = ecole?.address || ecole?.city || '';
  const contactsParts = [
    ecole?.contacts ? `Tél: ${ecole.contacts}` : '',
    ecole?.email ? `Email: ${ecole.email}` : '',
  ].filter(Boolean);
  const villeEmission = ecole?.city || '';

  const pagesHtml = items.map((item, index) => {
    const isPreventive = item.isPreventive || (item.daysRemaining !== undefined && item.daysRemaining >= 0);
    const titleText = isPreventive
      ? "AVIS DE RAPPEL D'ÉCHÉANCE PRÉVENTIF (RAPPEL À J-7)"
      : "LETTRE DE RELANCE D'IMPAYÉ ET MISE EN DEMEURE DE RÈGLEMENT";

    const subtitleText = isPreventive
      ? "Rappel préalable d'échéance de paiement — Échéance fixée au 5 du mois"
      : "Rappel formel de régularisation des arriérés scolaires";

    const serviceLabel = item.serviceType === 'transport'
      ? 'Frais de Transport Scolaire'
      : item.serviceType === 'cantine'
      ? 'Frais de Cantine / Restauration'
      : 'Scolarité & Frais Annexes';

    return `
      <div class="letter-page ${index < items.length - 1 ? 'page-break' : ''}">
        <!-- HEADER -->
        <div class="header flex-between">
          <div class="brand">
            ${enTeteNom ? `<h1 class="school-title">${enTeteNom}</h1>` : ''}
            ${enTeteAdresse ? `<p class="school-sub">${enTeteAdresse}</p>` : ''}
            <p class="school-contacts">République de Côte d'Ivoire — Ministère de l'Éducation Nationale</p>
            ${contactsParts.length ? `<p class="school-contacts">${contactsParts.join(' | ')}</p>` : ''}
          </div>
          <div class="stamp-badge ${isPreventive ? 'badge-warning' : 'badge-danger'}">
            ${isPreventive ? 'RAPPEL J-7' : 'IMPAYÉ ÉCHU'}
          </div>
        </div>

        <hr class="divider" />

        <!-- METADATA STRIP -->
        <div class="flex-between meta-strip">
          <div>
            <p><strong>N/Réf :</strong> REL-${new Date().getFullYear()}-${String(index + 1).padStart(4, '0')}</p>
            <p><strong>Date d'émission :</strong> ${villeEmission ? `${villeEmission}, le` : 'Le'} ${todayStr}</p>
          </div>
          <div class="dest-box">
            <p class="dest-title">À L'ATTENTION DE :</p>
            <p class="dest-name">M. / Mme ${item.parentNom || "Tuteur Légale / Parent d'élève"}</p>
            <p class="dest-sub">Contact Tuteur : <strong>${item.parentPhone || 'N/C'}</strong></p>
            <p class="dest-sub">Élève : <strong>${item.nom.toUpperCase()} ${item.prenom}</strong></p>
            <p class="dest-sub">Matricule : <code>${item.matricule}</code> | Classe : <strong>${item.classe}</strong></p>
          </div>
        </div>

        <!-- SUBJECT -->
        <div class="subject-box ${isPreventive ? 'bg-amber-light' : 'bg-red-light'}">
          <h2>${titleText}</h2>
          <p>${subtitleText} — Année Scolaire ${item.anneeScolaire || '2026-2027'}</p>
        </div>

        <!-- BODY TEXT -->
        <div class="body-text">
          <p>Madame, Monsieur, Cher Parent,</p>
          <p>
            ${
              isPreventive
                ? `Nous vous rappelons avec amabilité que l'échéance de paiement pour les prestations scolaires de votre enfant <strong>${item.nom.toUpperCase()} ${item.prenom}</strong> inscrite en classe de <strong>${item.classe}</strong> est prévue pour le <strong>${item.dateEcheance || '05 du mois'}</strong>.`
                : `Sauf erreur de notre part, nous constatons qu'à ce jour le compte scolaire de votre enfant <strong>${item.nom.toUpperCase()} ${item.prenom}</strong> (Matricule: <code>${item.matricule}</code>, Classe: <strong>${item.classe}</strong>) présente un solde d'arriérés impayés qui a dépassé la date limite d'exigibilité fixée au <strong>${item.dateEcheance}</strong>.`
            }
          </p>
          <p>Voici le récapitulatif détaillé du solde comptable de l'élève à ce jour :</p>
        </div>

        <!-- RECAP TABLE -->
        <table class="data-table">
          <thead>
            <tr>
              <th>Désignation du Service</th>
              <th>Échéance Limite</th>
              <th class="text-right">Montant Total Dû</th>
              <th class="text-right">Montant Réglé</th>
              <th class="text-right highlight-col">Solde Restant à Régler</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>${serviceLabel}</strong><br/>
                <span class="sub-detail">${item.trancheLibelle || 'Tranche / Échéance Régulière'}</span>
              </td>
              <td><span class="badge-date">${item.dateEcheance}</span></td>
              <td class="text-right font-mono">${formatCurrency(item.montantAPayer)}</td>
              <td class="text-right font-mono text-green">${formatCurrency(item.montantVerse)}</td>
              <td class="text-right font-mono highlight-cell">${formatCurrency(item.soldeRestant)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" class="text-right"><strong>NET À PAYER AVANT LA DATE LIMITE :</strong></td>
              <td class="text-right net-total">${formatCurrency(item.soldeRestant)}</td>
            </tr>
          </tfoot>
        </table>

        <!-- INSTRUCTIONS -->
        <div class="instructions-box">
          <h3>📌 MODALITÉS & REMARQUES IMPORTANTES :</h3>
          <ul>
            <li><strong>Port de la Relance au 5 du mois :</strong> Conformément au règlement intérieur de l'établissement, les échéances de scolarité, transport et cantine doivent être réglées impérativement au plus tard le 5 de chaque mois.</li>
            <li><strong>Moyens de paiement acceptés :</strong> Guichet Caisse de l'école (Espèces / Chèque certifié), Plateforme Bancaire de la Fondation, ou Mobile Money officiel.</li>
            <li>Si vous avez déjà procédé au règlement au moment de la réception de cette lettre, nous vous prions de bien vouloir ne pas tenir compte de ce rappel.</li>
          </ul>
        </div>

        <!-- FOOTER SIGNATURES -->
        <div class="footer-signatures flex-between">
          <div class="sig-block">
            <p><strong>Visa de la Caisse</strong></p>
            <p class="sig-note">Date de remise : ____/____/2026</p>
            <div class="sig-space"></div>
          </div>
          <div class="sig-block text-right">
            <p><strong>La Direction Financière & Comptabilité</strong></p>
            <p class="sig-note">Groupe Scolaire Hînneh Éducation</p>
            <div class="sig-space"></div>
          </div>
        </div>

        <div class="footer-notice">
          Document officiel généré automatiquement par le Système d'Information HÎNNEH ÉDUCATION — Certifié Conforme.
        </div>
      </div>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Relances d'Impayés & Avis d'Échéances - HÎNNEH ÉDUCATION</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #1e293b;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 13px;
          line-height: 1.5;
        }
        .letter-page {
          padding: 10px 5px;
          box-sizing: border-box;
          min-height: 98vh;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .page-break {
          page-break-after: always;
        }
        .flex-between {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .school-title {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 2px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .school-sub {
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          margin: 0 0 2px 0;
        }
        .school-contacts {
          font-size: 10px;
          color: #64748b;
          margin: 0;
        }
        .stamp-badge {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .badge-warning {
          background-color: #fef3c7;
          color: #92400e;
          border: 2px solid #f59e0b;
        }
        .badge-danger {
          background-color: #ffe4e6;
          color: #9f1239;
          border: 2px solid #e11d48;
        }
        .divider {
          border: none;
          border-top: 2px solid #e2e8f0;
          margin: 12px 0;
        }
        .meta-strip {
          margin-bottom: 15px;
        }
        .dest-box {
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 14px;
          width: 320px;
        }
        .dest-title {
          font-size: 10px;
          font-weight: 800;
          color: #64748b;
          margin: 0 0 4px 0;
          letter-spacing: 0.5px;
        }
        .dest-name {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
        }
        .dest-sub {
          font-size: 11px;
          margin: 2px 0;
          color: #334155;
        }
        code {
          background: #e2e8f0;
          padding: 1px 5px;
          border-radius: 4px;
          font-family: monospace;
          font-weight: bold;
        }
        .subject-box {
          padding: 10px 16px;
          border-radius: 8px;
          margin-bottom: 15px;
          text-align: center;
        }
        .bg-amber-light {
          background-color: #fffbeeb3;
          border: 1.5px solid #fcd34d;
        }
        .bg-red-light {
          background-color: #fff1f2b3;
          border: 1.5px solid #fecdd3;
        }
        .subject-box h2 {
          margin: 0;
          font-size: 14px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0.5px;
        }
        .subject-box p {
          margin: 3px 0 0 0;
          font-size: 11px;
          color: #475569;
          font-weight: 600;
        }
        .body-text {
          font-size: 12px;
          line-height: 1.6;
          margin-bottom: 15px;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 18px;
        }
        .data-table th {
          background-color: #0f172a;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 8px 10px;
          text-align: left;
        }
        .data-table td {
          padding: 10px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 12px;
        }
        .sub-detail {
          font-size: 10px;
          color: #64748b;
        }
        .badge-date {
          background-color: #e2e8f0;
          color: #1e293b;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 4px;
          font-size: 11px;
        }
        .text-right {
          text-align: right;
        }
        .font-mono {
          font-family: monospace;
          font-size: 13px;
        }
        .text-green {
          color: #166534;
          font-weight: bold;
        }
        .highlight-col {
          background-color: #be123c;
          color: #ffffff;
        }
        .highlight-cell {
          background-color: #ffe4e6;
          color: #9f1239;
          font-weight: 900;
        }
        .net-total {
          font-size: 16px;
          font-weight: 900;
          color: #9f1239;
          background: #fff1f2;
          padding: 8px;
        }
        .instructions-box {
          background-color: #f8fafc;
          border-left: 4px solid #3b82f6;
          padding: 10px 14px;
          border-radius: 0 8px 8px 0;
          margin-bottom: 20px;
        }
        .instructions-box h3 {
          margin: 0 0 6px 0;
          font-size: 11px;
          font-weight: 900;
          color: #1e3a8a;
        }
        .instructions-box ul {
          margin: 0;
          padding-left: 18px;
          font-size: 11px;
          color: #334155;
        }
        .instructions-box li {
          margin-bottom: 4px;
        }
        .footer-signatures {
          margin-top: 20px;
          margin-bottom: 10px;
        }
        .sig-block {
          width: 45%;
        }
        .sig-space {
          height: 65px;
        }
        .sig-note {
          font-size: 10px;
          color: #64748b;
          margin: 2px 0;
        }
        .footer-notice {
          border-top: 1px solid #e2e8f0;
          padding-top: 6px;
          text-align: center;
          font-size: 9px;
          color: #94a3b8;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
