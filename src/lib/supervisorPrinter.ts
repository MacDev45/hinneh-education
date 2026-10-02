// ============================================================================
// SUPERVISOR PRINTER - IMPRESSION & EXPORTATION DE BILANS DU JOUR SUPERVISEUR
// ============================================================================

export interface DailyInscriptionItem {
  id: string | number;
  matricule: string;
  studentName: string;
  studentClass: string;
  level: string;
  dateInscription: string;
  status: "valide" | "en_cours" | "rejete";
  modePaiement: string;
  montantFraisAnnexe: number;
  montantFraisInscription: number;
}

export interface DailyServicePaymentItem {
  id: string | number;
  date: string;
  matricule: string;
  studentName: string;
  studentClass: string;
  serviceType: "cantine" | "transport" | "uniforme" | "autre";
  periodOrMonth: string;
  amount: number;
  modePaiement: string;
  numeroRecu: string;
}

const getHeaderHTML = (schoolName: string, reportTitle: string, reportSubtitle: string) => {
  const formattedDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedTime = new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 50px; height: 50px; border-radius: 50%; background: #0284c7; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px;">
            H
          </div>
          <div>
            <h1 style="margin: 0; font-size: 18px; font-weight: bold; color: #0f172a;">${schoolName.toUpperCase()}</h1>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">RÉPUBLIQUE DE CÔTE D'IVOIRE • MINISTÈRE DE L'ÉDUCATION NATIONALE</p>
          </div>
        </div>
        <div style="text-align: right; font-size: 11px; color: #475569;">
          <p style="margin: 0; font-weight: bold; color: #0284c7;">ESPACE SUPERVISEUR</p>
          <p style="margin: 2px 0 0 0;">Édité le : ${formattedDate} à ${formattedTime}</p>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h2 style="margin: 0; font-size: 16px; font-weight: bold; color: #0369a1; text-transform: uppercase;">${reportTitle}</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${reportSubtitle}</p>
      </div>
  `;
};

const getFooterHTML = () => {
  return `
      <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #475569;">
        <div style="text-align: center; width: 45%;">
          <p style="margin-bottom: 50px; font-weight: bold;">Visa du Responsable des Inscriptions</p>
          <p style="margin: 0; border-top: 1px dashed #94a3b8; padding-top: 4px;">Signature & Cachet</p>
        </div>
        <div style="text-align: center; width: 45%;">
          <p style="margin-bottom: 50px; font-weight: bold;">Le Superviseur Général</p>
          <p style="margin: 0; border-top: 1px dashed #94a3b8; padding-top: 4px;">Signature & Cachet</p>
        </div>
      </div>
      <div style="margin-top: 20px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px;">
        Document Officiel d'Audit Superviseur — Plateforme de Gestion Scolaire Hinneh Education
      </div>
    </div>
  `;
};

// ============================================================================
// 1. BILAN QUOTIDIEN DES INSCRIPTIONS (PAR CLASSE ET PAR NIVEAU)
// ============================================================================
export const printDailyInscriptionsReport = (params: {
  date: string;
  inscriptions: DailyInscriptionItem[];
  selectedClass?: string;
  selectedLevel?: string;
  schoolName?: string;
}) => {
  const { date, inscriptions, selectedClass, selectedLevel, schoolName = "ÉCOLE CONFESSIONNELLE HÎNNEH" } = params;

  const totalInscriptions = inscriptions.length;
  const totalValide = inscriptions.filter((i) => i.status === "valide").length;
  const totalEnCours = inscriptions.filter((i) => i.status === "en_cours").length;
  const totalFraisAnnexe = inscriptions.reduce((sum, i) => sum + i.montantFraisAnnexe, 0);
  const totalFraisInsc = inscriptions.reduce((sum, i) => sum + i.montantFraisInscription, 0);
  const grandTotalRecouvre = totalFraisAnnexe + totalFraisInsc;

  const subtitle = `Journée du ${date} • Niveau : ${selectedLevel || "Tous les Niveaux"} • Classe : ${selectedClass || "Toutes les Classes"}`;

  let rowsHTML = "";
  inscriptions.forEach((item, index) => {
    const statusLabel = item.status === "valide" ? "Validé" : "En cours";
    const statusColor = item.status === "valide" ? "#166534" : "#b45309";
    const statusBg = item.status === "valide" ? "#dcfce7" : "#fef3c7";

    rowsHTML += `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px; text-align: center; color: #64748b;">${index + 1}</td>
        <td style="padding: 8px; font-weight: bold; font-family: monospace;">${item.matricule}</td>
        <td style="padding: 8px; font-weight: bold; color: #0f172a;">${item.studentName}</td>
        <td style="padding: 8px; text-align: center;">${item.studentClass}</td>
        <td style="padding: 8px; text-align: center;">${item.level}</td>
        <td style="padding: 8px; text-align: center;">
          <span style="background: ${statusBg}; color: ${statusColor}; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">
            ${statusLabel}
          </span>
        </td>
        <td style="padding: 8px; text-align: right;">${item.montantFraisAnnexe.toLocaleString()} F</td>
        <td style="padding: 8px; text-align: right;">${item.montantFraisInscription.toLocaleString()} F</td>
        <td style="padding: 8px; text-align: right; font-weight: bold; color: #0284c7;">${(item.montantFraisAnnexe + item.montantFraisInscription).toLocaleString()} F CFA</td>
      </tr>
    `;
  });

  const fullHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bilan des Inscriptions - ${date}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { margin: 0; padding: 0; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #0f172a; color: white; padding: 8px; font-size: 11px; text-align: left; }
        </style>
      </head>
      <body>
        ${getHeaderHTML(schoolName, "BILAN DU JOUR DES INSCRIPTIONS & RÉINSCRIPTIONS", subtitle)}
        
        <!-- SUMMARY KPI CARDS -->
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <div style="flex: 1; background: #f1f5f9; padding: 10px; border-radius: 6px; border-left: 4px solid #0284c7;">
            <p style="margin: 0; font-size: 10px; color: #64748b;">TOTAL INSCRIPTION DU JOUR</p>
            <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold; color: #0284c7;">${totalInscriptions} dossier(s)</p>
          </div>
          <div style="flex: 1; background: #f0fdf4; padding: 10px; border-radius: 6px; border-left: 4px solid #16a34a;">
            <p style="margin: 0; font-size: 10px; color: #166534;">INSCRIPTIONS VALIDÉES</p>
            <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold; color: #16a34a;">${totalValide}</p>
          </div>
          <div style="flex: 1; background: #fffbeb; padding: 10px; border-radius: 6px; border-left: 4px solid #d97706;">
            <p style="margin: 0; font-size: 10px; color: #b45309;">DOSSIERS EN COURS</p>
            <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold; color: #d97706;">${totalEnCours}</p>
          </div>
          <div style="flex: 1; background: #eff6ff; padding: 10px; border-radius: 6px; border-left: 4px solid #2563eb;">
            <p style="margin: 0; font-size: 10px; color: #1e40af;">TOTAL ENCAISSÉ</p>
            <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold; color: #2563eb;">${grandTotalRecouvre.toLocaleString()} F CFA</p>
          </div>
        </div>

        <!-- INSCRIPTIONS TABLE -->
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 100px;">Matricule</th>
              <th>Nom & Prénoms de l'Élève</th>
              <th style="width: 80px; text-align: center;">Classe</th>
              <th style="width: 90px; text-align: center;">Niveau</th>
              <th style="width: 80px; text-align: center;">Statut</th>
              <th style="width: 90px; text-align: right;">Frais Annexes</th>
              <th style="width: 90px; text-align: right;">Frais Inscription</th>
              <th style="width: 100px; text-align: right;">Total Versé</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML || `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #64748b;">Aucune inscription enregistrée pour les critères sélectionnés.</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1;">
              <td colspan="6" style="padding: 10px; text-align: right;">TOTAUX CUMULÉS DU JOUR :</td>
              <td style="padding: 10px; text-align: right; color: #0284c7;">${totalFraisAnnexe.toLocaleString()} F</td>
              <td style="padding: 10px; text-align: right; color: #0284c7;">${totalFraisInsc.toLocaleString()} F</td>
              <td style="padding: 10px; text-align: right; color: #16a34a; font-size: 13px;">${grandTotalRecouvre.toLocaleString()} F CFA</td>
            </tr>
          </tfoot>
        </table>

        ${getFooterHTML()}
      </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(fullHTML);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 400);
  }
};

// ============================================================================
// 2. BILAN QUOTIDIEN DES PAIEMENTS DE SERVICES (CANTINE, CAR / TRANSPORT, ETC.)
// ============================================================================
export const printDailyServicesReport = (params: {
  date: string;
  servicePayments: DailyServicePaymentItem[];
  selectedService?: string;
  selectedLevel?: string;
  schoolName?: string;
}) => {
  const { date, servicePayments, selectedService, selectedLevel, schoolName = "ÉCOLE CONFESSIONNELLE HÎNNEH" } = params;

  const totalPayments = servicePayments.length;
  const totalCantine = servicePayments.filter((s) => s.serviceType === "cantine").reduce((sum, s) => sum + s.amount, 0);
  const totalTransport = servicePayments.filter((s) => s.serviceType === "transport").reduce((sum, s) => sum + s.amount, 0);
  const totalAutres = servicePayments.filter((s) => s.serviceType !== "cantine" && s.serviceType !== "transport").reduce((sum, s) => sum + s.amount, 0);
  const grandTotal = totalCantine + totalTransport + totalAutres;

  const subtitle = `Journée du ${date} • Service : ${selectedService ? selectedService.toUpperCase() : "Tous les Services Annexes"} • Niveau : ${selectedLevel || "Tous les Niveaux"}`;

  let rowsHTML = "";
  servicePayments.forEach((item, index) => {
    const serviceLabel = item.serviceType === "cantine" ? "🍱 Cantine" : item.serviceType === "transport" ? "🚌 Car / Transport" : "📌 Autre";
    const serviceBadgeColor = item.serviceType === "cantine" ? "#0284c7" : item.serviceType === "transport" ? "#16a34a" : "#6b21a8";

    rowsHTML += `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px; text-align: center; color: #64748b;">${index + 1}</td>
        <td style="padding: 8px; font-weight: bold; font-family: monospace;">${item.numeroRecu}</td>
        <td style="padding: 8px; font-weight: bold; color: #0f172a;">${item.studentName}</td>
        <td style="padding: 8px; text-align: center;">${item.studentClass}</td>
        <td style="padding: 8px; text-align: center; font-weight: bold; color: ${serviceBadgeColor};">${serviceLabel}</td>
        <td style="padding: 8px; text-align: center;">${item.periodOrMonth}</td>
        <td style="padding: 8px; text-align: center;">${item.modePaiement.toUpperCase()}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold; color: #0f172a;">${item.amount.toLocaleString()} F CFA</td>
      </tr>
    `;
  });

  const fullHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bilan des Services Annexes - ${date}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { margin: 0; padding: 0; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #0f172a; color: white; padding: 8px; font-size: 11px; text-align: left; }
        </style>
      </head>
      <body>
        ${getHeaderHTML(schoolName, "BILAN DU JOUR DES SERVICES ANNEXES (CANTINE & CAR/TRANSPORT)", subtitle)}
        
        <!-- SUMMARY KPI CARDS -->
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <div style="flex: 1; background: #e0f2fe; padding: 10px; border-radius: 6px; border-left: 4px solid #0284c7;">
            <p style="margin: 0; font-size: 10px; color: #0369a1;">TOTAL CANTINE DU JOUR</p>
            <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold; color: #0284c7;">${totalCantine.toLocaleString()} F CFA</p>
          </div>
          <div style="flex: 1; background: #dcfce7; padding: 10px; border-radius: 6px; border-left: 4px solid #16a34a;">
            <p style="margin: 0; font-size: 10px; color: #15803d;">TOTAL CAR / TRANSPORT</p>
            <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold; color: #16a34a;">${totalTransport.toLocaleString()} F CFA</p>
          </div>
          <div style="flex: 1; background: #f3e8ff; padding: 10px; border-radius: 6px; border-left: 4px solid #7e22ce;">
            <p style="margin: 0; font-size: 10px; color: #6b21a8;">AUTRES SERVICES</p>
            <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold; color: #7e22ce;">${totalAutres.toLocaleString()} F CFA</p>
          </div>
          <div style="flex: 1; background: #0f172a; color: white; padding: 10px; border-radius: 6px;">
            <p style="margin: 0; font-size: 10px; color: #94a3b8;">GRAND TOTAL ENCAISSÉ</p>
            <p style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold; color: #38bdf8;">${grandTotal.toLocaleString()} F CFA</p>
          </div>
        </div>

        <!-- SERVICES TABLE -->
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 120px;">N° Reçu</th>
              <th>Élève</th>
              <th style="width: 80px; text-align: center;">Classe</th>
              <th style="width: 110px; text-align: center;">Service</th>
              <th style="width: 110px; text-align: center;">Mois / Période</th>
              <th style="width: 90px; text-align: center;">Mode</th>
              <th style="width: 110px; text-align: right;">Montant Encaissé</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML || `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #64748b;">Aucun encaissement de service enregistré pour cette période.</td></tr>`}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1;">
              <td colspan="7" style="padding: 10px; text-align: right;">CUMUL ENCAISSEMENTS SERVICES DU JOUR :</td>
              <td style="padding: 10px; text-align: right; color: #0284c7; font-size: 13px;">${grandTotal.toLocaleString()} F CFA</td>
            </tr>
          </tfoot>
        </table>

        ${getFooterHTML()}
      </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(fullHTML);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 400);
  }
};
