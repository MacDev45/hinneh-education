import type { Student, School, ClassRoom } from '@/lib/index';
import { generateQRCodeDataURI } from '@/lib/qrHelper';
import { loadEcoles, findEcole, resolveEnteteEtablissement } from '@/lib/ecoleIdentite';
export { printTableauDHonneurKorhogo, printPlancheTableauxDHonneurKorhogo, isEligibleForTableauDHonneur } from '@/lib/tableauHonneurKorhogoPrinter';
export type { TableauHonneurOptions } from '@/lib/tableauHonneurKorhogoPrinter';

/**
 * Résout le nom réel de l'établissement d'un élève à partir de son ecole_id
 * (schoolId), en s'appuyant sur la fiche renseignée dans Profil École — au lieu
 * de deviner l'école à partir du nom de la classe.
 */
export async function getRealSchoolName(ecoleId?: string | number | null): Promise<string> {
  if (!ecoleId) return '';
  try {
    await loadEcoles();
    return findEcole({ ecoleId })?.name || '';
  } catch {
    return '';
  }
}

/**
 * Imprime un certificat de fréquentation pour un élève
 */
export const printAttendanceCertificate = (
  student: Student,
  classRoom: ClassRoom | null,
  school: School | null,
  trimester: number,
  year: string = '2025 - 2026'
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const formattedDate = new Date().toLocaleDateString('fr-FR');
  const formattedBirthDate = student.dateOfBirth
    ? new Date(student.dateOfBirth).toLocaleDateString('fr-FR')
    : 'Non renseignée';

  // Identité de l'établissement telle qu'elle est saisie dans Profil École.
  const entete = resolveEnteteEtablissement({
    ecoleId: school?.id || (student as any).schoolId || (student as any).ecole_id,
    code: school?.code || student.codeEtablissement,
    schoolName: school?.name,
    className: classRoom?.name || student.className,
  });
  const villeCertificat = entete.city;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Certificat de Fréquentation - ${student.lastName} ${student.firstName}</title>
        <style>
          body { 
            font-family: 'Times New Roman', Times, serif; 
            padding: 40px; 
            font-size: 12px; 
            line-height: 1.6;
            background: #f5f5f5;
          }
          @page { size: A4 portrait; margin: 20mm; }
          .certificate {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 60px 50px;
            border: 3px solid #1e3a8a;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            position: relative;
          }
          .certificate::before {
            content: '';
            position: absolute;
            top: 10px;
            left: 10px;
            right: 10px;
            bottom: 10px;
            border: 1px solid #1e3a8a;
            pointer-events: none;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 20px;
          }
          .ministry {
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            color: #1e3a8a;
          }
          .school-name {
            font-size: 18px;
            font-weight: bold;
            margin: 15px 0;
            color: #1e3a8a;
            text-transform: uppercase;
          }
          .title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
            color: #1e3a8a;
            margin: 40px 0;
            text-decoration: underline;
          }
          .content {
            text-align: center;
            margin: 30px 0;
            font-size: 14px;
          }
          .student-info {
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
            color: #333;
          }
          .details {
            margin: 30px 0;
            text-align: left;
            font-size: 13px;
          }
          .details p {
            margin: 10px 0;
          }
          .details strong {
            color: #1e3a8a;
          }
          .footer {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .signature {
            text-align: center;
            width: 45%;
            border-top: 1px solid #333;
            padding-top: 10px;
          }
          .signature-title {
            font-weight: bold;
            margin-bottom: 40px;
          }
          .date {
            text-align: center;
            margin-top: 40px;
            font-style: italic;
          }
          .stamp {
            text-align: center;
            margin-top: 30px;
            font-size: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <div class="ministry">
              MINISTÈRE DE L'ÉDUCATION NATIONALE, DE L'ALPHABÉTISATION ET DE L'ENSEIGNEMENT TECHNIQUE
            </div>
            <div class="school-name">
              ${entete.fullName}
            </div>
            <div style="font-size: 11px; margin-top: 5px;">
              ${entete.addressLine}${entete.addressLine && entete.phoneLine ? '<br/>' : ''}
              ${entete.phoneLine ? `Tél: ${entete.phoneLine}` : ''}
            </div>
          </div>
          
          <div class="title">
            CERTIFICAT DE FRÉQUENTATION
          </div>
          
          <div class="content">
            <p>Le soussigné, Chef d'Établissement, certifie par la présente que :</p>
          </div>
          
          <div class="student-info">
            ${student.lastName.toUpperCase()} ${student.firstName}
          </div>
          
          <div class="details">
            <p><strong>Né(e) le :</strong> ${formattedBirthDate}</p>
            <p><strong>Matricule :</strong> ${student.matricule}</p>
            <p><strong>Classe :</strong> ${classRoom?.name || 'Non définie'}</p>
            <p><strong>A régulièrement fréquenté les cours du </strong> ${trimester === 1 ? '1er' : trimester === 2 ? '2ème' : '3ème'} trimestre</p>
            <p><strong>de l'année scolaire</strong> ${year}</p>
            <p><strong>avec assiduité et a participé aux travaux dirigés et exercices pratiques.</strong></p>
          </div>
          
          <div class="content">
            <p>Ce certificat est délivré pour servir et valoir ce que de droit.</p>
          </div>
          
          <div class="date">
            Fait${villeCertificat ? ` à ${villeCertificat}` : ''}, le ${formattedDate}
          </div>
          
          <div class="footer">
            <div class="signature">
              <div class="signature-title">Le Chef d'Établissement</div>
              ${((villeCertificat || '').toLowerCase().includes('korhogo') || (entete.fullName || '').toLowerCase().includes('korhogo') || (student.className || (student as any).classe_nom || '').toLowerCase().includes('korhogo')) ? `
                <div style="height: 55px; display: flex; align-items: center; justify-content: center; margin-top: 4px;">
                  <img src="/images/signature_direction_korhogo_transparent.png" alt="Signature & Cachet Korhogo" style="max-height: 55px; max-width: 100%; object-fit: contain; mix-blend-mode: multiply;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
                </div>
              ` : `
                <em>Signature et Cachet</em>
              `}
            </div>
            <div class="signature">
              <div class="signature-title">Le Professeur Principal</div>
              <em>Signature</em>
            </div>
          </div>
          
          <div class="stamp">
            Document officiel${entete.fullName ? ` - ${entete.fullName}` : ''}<br/>
            ${entete.code ? `Code Établissement: ${entete.code}` : ''}
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

/**
 * En-tête d'établissement d'un élève. Le nom, l'adresse et les téléphones sont
 * ceux saisis dans Profil École pour cet établissement précis — plus aucun nom
 * n'est déduit du niveau de la classe ni écrit en dur.
 */
export function resolveSchoolNameForStudent(
  schoolNameCandidate?: string | null,
  classNameCandidate?: string | null,
  ecoleId?: string | number | null,
  code?: string | null,
  cityCandidate?: string | null,
) {
  return resolveEnteteEtablissement({
    ecoleId,
    code,
    schoolName: schoolNameCandidate,
    className: classNameCandidate,
    city: cityCandidate,
  });
}

/**
 * Imprime le Billet d'Entrée officiel (2 billets par fiche A4 : Souche École + Coupon Parent)
 * avec QR Code. Le nom, l'adresse, les téléphones et le logo sont ceux renseignés
 * dans Profil École pour l'établissement de l'élève.
 */
export const printBilletEntree = (
  student: Student,
  classRoom: ClassRoom | null,
  school: School | null,
  billetNumber?: string,
  year: string = '2026 - 2027',
  parentTel?: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const formattedDate = new Date().toLocaleDateString('fr-FR', { timeZone: 'Africa/Abidjan' });
  const studentClassName = classRoom?.name || student.className || (student as any).CE_LIBELLE || '';
  const resolvedSchool = resolveSchoolNameForStudent(
    school?.name || student.codeEtablissement,
    studentClassName,
    school?.id || (student as any).schoolId || (student as any).ecole_id,
    school?.code || student.codeEtablissement,
  );
  const billetNo = billetNumber || `BE-${new Date().getFullYear()}-${String(student.id).padStart(5, '0')}`;

  const logoUrl = resolvedSchool.logo;
  const villeEcole = resolvedSchool.city || '';
  const directeurNom = resolvedSchool.directeurNom || (school as any)?.directeurNom || (school as any)?.directeur_nom || '';

  const parentPhoneStr = parentTel || (student as any).parentTel || (student as any).AU_CONTACTS || 'Non renseigné';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hinneh-education.ci';
  const qrDataText = `${baseUrl}/#/student-public/${student.id}?matricule=${encodeURIComponent(student.matricule || '')}&nom=${encodeURIComponent(student.lastName || '')}&prenom=${encodeURIComponent(student.firstName || '')}&classe=${encodeURIComponent(studentClassName)}&parentTel=${encodeURIComponent(parentPhoneStr)}`;

  const qrCodeUrl = generateQRCodeDataURI(qrDataText, 180);

  const renderSingleTicketHTML = (label: string) => `
    <div class="ticket">
      <div class="ticket-header">
        <div class="header-left">
          ${logoUrl ? `<img src="${logoUrl}" class="school-logo" alt="Logo de l'établissement" />` : ''}
          <div>
            <div class="school-name">${resolvedSchool.fullName}</div>
            ${resolvedSchool.addressLine ? `<div class="school-sub">${resolvedSchool.addressLine}</div>` : ''}
            ${resolvedSchool.phoneLine ? `<div class="school-phones">📞 Tél : ${resolvedSchool.phoneLine}</div>` : ''}
          </div>
        </div>
        <div class="header-right text-center">
          <img src="${qrCodeUrl}" class="qr-code" alt="QR Code" />
          <div class="qr-label">Scannez-moi</div>
        </div>
      </div>

      <div class="title-box">
        BILLET D'ENTRÉE
      </div>

      <div class="ticket-body">
        <p class="student-line">
          L'élève : <strong class="student-name">${student.lastName?.toUpperCase()} ${student.firstName?.toUpperCase()}</strong> <span class="matricule-span">(Matricule : ${student.matricule || 'N/A'})</span>
        </p>
        <p class="authorization-line">
          a rempli les conditions d'inscription et est autorisé (e) à débuter les cours en classe de : <strong class="class-name">${studentClassName || 'Non définie'}</strong> pour l'année scolaire <strong>${year}</strong>.
        </p>
      </div>

      <div class="ticket-footer">
        <div class="footer-left">
          <div class="billet-badge">N° Billet : ${billetNo}</div>
          ${resolvedSchool.addressLine ? `<div class="footer-address">${resolvedSchool.addressLine}</div>` : ''}
        </div>
        <div class="footer-right">
          <div class="date-line">Fait${villeEcole ? ` à ${villeEcole}` : ''}, le ${formattedDate}</div>
          <div class="director-title">Le Directeur des Études</div>
          <div class="signature-stamp-row">
            ${(villeEcole.toLowerCase().includes('korhogo') || resolvedSchool.fullName.toLowerCase().includes('korhogo')) ? `
              <div style="display: flex; justify-content: flex-end; margin-top: 2px;">
                <img src="/images/signature_direction_korhogo_transparent.png" alt="Signature & Cachet Direction Korhogo" style="max-height: 48px; max-width: 150px; object-fit: contain; mix-blend-mode: multiply;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
              </div>
            ` : `
              <div class="signature-text">${directeurNom || 'La Direction'}</div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Billet d'Entrée - ${student.lastName} ${student.firstName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: A4 portrait; margin: 8mm; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #fff;
            color: #0f172a;
            font-size: 12px;
            padding: 10px;
          }
          .page-wrapper {
            display: flex;
            flex-direction: column;
            gap: 8mm;
          }
          .ticket {
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 18px 22px;
            background: #ffffff;
            position: relative;
          }
          .ticket-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .school-logo {
            width: 52px;
            height: 52px;
            object-fit: contain;
          }
          .school-name {
            font-size: 14px;
            font-weight: 900;
            color: #0f172a;
            text-transform: uppercase;
          }
          .school-sub {
            font-size: 10px;
            color: #64748b;
            margin-top: 1px;
          }
          .school-phones {
            font-size: 11px;
            font-weight: bold;
            color: #047857;
            margin-top: 2px;
          }
          .qr-code {
            width: 76px;
            height: 76px;
            border: none;
            padding: 0;
            background: #fff;
            display: block;
            object-fit: contain;
          }
          .qr-label {
            font-size: 9px;
            font-weight: bold;
            color: #64748b;
            text-align: center;
            margin-top: 1px;
          }
          .title-box {
            border: 2px solid #0f172a;
            border-radius: 4px;
            padding: 8px;
            text-align: center;
            font-size: 17px;
            font-weight: 900;
            letter-spacing: 2px;
            color: #0f172a;
            margin-bottom: 14px;
            background: #fff;
          }
          .ticket-body {
            font-size: 12px;
            line-height: 1.6;
            color: #0f172a;
            margin-bottom: 16px;
          }
          .student-line {
            margin-bottom: 6px;
          }
          .student-name {
            font-size: 14px;
            font-weight: 900;
            color: #1e1b4b;
            text-decoration: underline dotted #1e1b4b;
            text-transform: uppercase;
          }
          .matricule-span {
            color: #94a3b8;
            font-family: monospace;
            font-weight: 600;
            margin-left: 4px;
          }
          .class-name {
            font-weight: 900;
            color: #1e1b4b;
            text-decoration: underline dotted #1e1b4b;
          }
          .ticket-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 8px;
          }
          .billet-badge {
            background: #dcfce7;
            color: #15803d;
            border: 1px solid #86efac;
            font-size: 10px;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 9999px;
          }
          .footer-address {
            font-size: 8px;
            color: #64748b;
            margin-top: 4px;
            max-width: 220px;
          }
          .footer-right {
            text-align: right;
          }
          .date-line {
            font-size: 10px;
            color: #334155;
          }
          .director-title {
            font-size: 11px;
            font-weight: 900;
            color: #0f172a;
            margin-top: 1px;
          }
          .signature-stamp-row {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 6px;
          }
          .official-stamp {
            width: 64px;
            height: 64px;
            border: 2px dashed #6d28d9;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: #6d28d9;
            font-size: 7.5px;
            font-weight: 800;
            line-height: 1.1;
            transform: rotate(-10deg);
          }
          .signature-text {
            font-family: 'Times New Roman', serif;
            font-size: 15px;
            font-weight: 900;
            font-style: italic;
            color: #1e1b4b;
            border-bottom: 2px solid #1e1b4b;
            padding-bottom: 2px;
          }
          .cut-line {
            border-top: 2px dashed #cbd5e1;
            margin: 8px 0;
            text-align: center;
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 1px;
          }
          .text-center { text-align: center; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          ${renderSingleTicketHTML('COUPON PARENT / ÉLÈVE')}
          <div class="cut-line">✂️ PARTIE À DÉCOUPER — EXEMPLAIRE SECRÉTARIAT / VIE SCOLAIRE ✂️</div>
          ${renderSingleTicketHTML('EXEMPLAIRE SECRÉTARIAT / VIE SCOLAIRE')}
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

/**
 * Imprime des certificats de fréquentation pour une classe entière
 */
export const printClassAttendanceCertificates = (
  students: Student[],
  classRoom: ClassRoom | null,
  school: School | null,
  trimester: number,
  year: string = '2026 - 2027'
) => {
  students.forEach((student, index) => {
    setTimeout(() => {
      printAttendanceCertificate(student, classRoom, school, trimester, year);
    }, index * 500);
  });
};

/**
 * Déduit un libellé de service propre si non spécifié explicitement
 */
export function resolveStaffService(staff: any): string {
  if (staff.service && typeof staff.service === 'string' && staff.service.trim().length > 0) {
    return staff.service.trim();
  }
  if (staff.departement && typeof staff.departement === 'string' && staff.departement.trim().length > 0) {
    return staff.departement.trim();
  }
  const f = (staff.fonction || '').toLowerCase();
  if (f.includes('enseignant') || f.includes('prof') || f.includes('instituteur') || f.includes('coranique')) {
    return 'Direction des Études & Pédagogie';
  }
  if (f.includes('educateur') || f.includes('surveillance') || f.includes('vie')) {
    return 'Vie Scolaire & Discipline';
  }
  if (f.includes('comptable') || f.includes('caisse') || f.includes('finance') || f.includes('economat')) {
    return 'Administration & Finances';
  }
  if (f.includes('directeur') || f.includes('direction') || f.includes('secretaire')) {
    return 'Direction & Secrétariat';
  }
  if (f.includes('rh')) {
    return 'Ressources Humaines';
  }
  if (f.includes('informaticien') || f.includes('it')) {
    return 'Systèmes d\'Information & IT';
  }
  if (f.includes('accueil') || f.includes('agent') || f.includes('securite') || f.includes('service')) {
    return 'Service Général & Sécurité';
  }
  return 'Corps du Personnel';
}

/**
 * ============================================================================
 * IMPRESSION DES BADGES & CARTES SCOLAIRES / PROFESSIONNELLES HAUTE DÉFINITION
 * Couleurs harmonisées avec le logo officiel : Bleu Roi (#0f2b5c), Vert Émeraude (#059669), Or (#d97706)
 * ============================================================================
 */

/**
 * Imprime la Carte d'Identité Scolaire individuelle d'un élève
 */
export const printCarteScolaire = (
  student: any,
  school: School | any = null,
  year: string = '2026 - 2027'
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const entete = resolveEnteteEtablissement({
    ecoleId: school?.id || student.ecole_id || student.schoolId,
    code: school?.code || student.ET_CODEETABLISSEMENT,
    schoolName: school?.name || school?.ET_DENOMMINATION,
  });

  const studentName = `${(student.AU_NOM || student.lastName || student.nom || '').toUpperCase()} ${student.AU_PRENOM || student.firstName || student.prenom || ''}`.trim();
  const matricule = student.AU_MATRICULE || student.matricule || `MAT-${student.id || '01'}`;
  const classeNom = student.classe_nom || student.classe || student.CE_LIBELLE || 'Classe Standard';
  const dateNaiss = student.AU_DATE_NAISSANCE || student.date_naissance || student.dateNaissance || '—';
  const tuteurContact = student.AU_TUTEURLEGALCONTACTS || student.AU_CONTACTS || student.AU_PERECONTACTS || student.contact_parent || student.telephone || '—';
  const photoUrl = student.photo_url || student.photo || '';
  const initials = `${(student.AU_NOM || student.lastName || 'L')[0] || ''}${(student.AU_PRENOM || student.firstName || 'E')[0] || ''}`.toUpperCase();

  const qrUri = generateQRCodeDataURI(
    `ELEVE|ID:${student.id}|MAT:${matricule}|NOM:${student.AU_NOM || student.nom || ''}|PRENOM:${student.AU_PRENOM || student.prenom || ''}|CONTACT:${tuteurContact}|CLS:${classeNom}|ECOLE:${entete.code || 'FHA'}`,
    180
  );

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Carte Scolaire - ${studentName}</title>
        <style>
          @page {
            size: 85.6mm 54mm;
            margin: 0;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #f1f5f9;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .badge-card {
            width: 85.6mm;
            height: 53.98mm;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            color: #0f172a;
            position: relative;
            overflow: hidden;
            border: 1px solid #cbd5e1;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
          }
          .badge-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(45deg, rgba(15, 43, 92, 0.015) 0, rgba(15, 43, 92, 0.015) 2px, transparent 2px, transparent 6px);
            pointer-events: none;
          }
          .badge-header {
            background: #0f2444;
            padding: 4px 8px;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #b45309;
            position: relative;
            z-index: 1;
          }
          .badge-logo {
            height: 26px;
            width: 26px;
            object-fit: contain;
            background: #ffffff;
            border-radius: 3px;
            padding: 1.5px;
          }
          .header-text {
            flex: 1;
            margin-left: 6px;
            line-height: 1.15;
          }
          .badge-inst {
            font-size: 5.8px;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: #cbd5e1;
          }
          .badge-school {
            font-size: 8px;
            font-weight: 800;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 175px;
          }
          .badge-title {
            font-size: 6px;
            font-weight: 700;
            color: #fde68a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .badge-year {
            font-size: 7px;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #ffffff;
            padding: 1.5px 5px;
            border-radius: 3px;
            white-space: nowrap;
          }
          .badge-body {
            padding: 4px 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            flex: 1;
            position: relative;
            z-index: 1;
          }
          .photo-frame {
            width: 48px;
            height: 58px;
            border-radius: 3px;
            border: 1px solid #0f2444;
            padding: 1px;
            background: #ffffff;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .photo-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 2px;
          }
          .photo-fallback {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #475569;
            font-size: 13px;
            font-weight: 700;
          }
          .photo-fallback span {
            font-size: 5.5px;
            color: #94a3b8;
            font-weight: 600;
            margin-top: 1px;
          }
          .student-info {
            flex: 1;
            min-width: 0;
            line-height: 1.25;
          }
          .field-label {
            font-size: 6px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .student-name {
            font-size: 9.5px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 2px;
          }
          .tags-row {
            display: flex;
            gap: 4px;
            margin-bottom: 2px;
          }
          .matricule-badge {
            font-family: monospace;
            font-size: 7px;
            font-weight: 700;
            color: #0f172a;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 1px 3.5px;
            border-radius: 2px;
          }
          .classe-badge {
            font-size: 7px;
            font-weight: 700;
            color: #0f2444;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            padding: 1px 3.5px;
            border-radius: 2px;
          }
          .info-detail {
            font-size: 6.8px;
            color: #334155;
            margin-bottom: 0.5px;
          }
          .info-detail strong {
            color: #0f172a;
          }
          .qr-box-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
          }
          .qr-box {
            width: 44px;
            height: 44px;
            border: 1px solid #cbd5e1;
            border-radius: 3px;
            padding: 1px;
            background: #ffffff;
          }
          .qr-box img {
            width: 100%;
            height: 100%;
          }
          .qr-caption {
            font-size: 5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 1.5px;
            letter-spacing: 0.3px;
          }
          .badge-footer {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 2.5px 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 6px;
            color: #475569;
            font-weight: 600;
            position: relative;
            z-index: 1;
          }
          .secure-tag {
            font-weight: 700;
            color: #047857;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
        </style>
      </head>
      <body>
        <div class="badge-card">
          <div class="badge-header">
            <div style="display: flex; align-items: center;">
              <div style="position: relative; display: inline-block;">
                <img src="${entete.logo || '/images/hinneh_logo_20260507_234919.png'}" alt="Logo" class="badge-logo" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
              </div>
              <div class="header-text">
                <div class="badge-inst">République de Côte d'Ivoire • Ministère de l'Éducation</div>
                <div class="badge-school">${entete.fullName || 'FONDATION HINNEH'}</div>
                <div class="badge-title">Carte d'Identité Scolaire</div>
              </div>
            </div>
            <span class="badge-year">${year}</span>
          </div>

          <div class="badge-body">
            <div class="photo-frame">
              ${photoUrl ? `<img src="${photoUrl}" alt="Photo" />` : `<div class="photo-fallback">${initials}<span>PHOTO</span></div>`}
            </div>

            <div class="student-info">
              <div class="field-label">Élève</div>
              <div class="student-name">${studentName}</div>
              <div class="tags-row">
                <span class="matricule-badge">MAT: ${matricule}</span>
                <span class="classe-badge">Classe: ${classeNom}</span>
              </div>
              <div class="info-detail">Né(e) le : <strong>${dateNaiss}</strong></div>
              <div class="info-detail">Urgence : <strong>${tuteurContact}</strong></div>
            </div>

            <div class="qr-box-wrap">
              <div class="qr-box">
                <img src="${qrUri}" alt="QR" />
              </div>
              <div class="qr-caption">Contrôle Scolaire</div>
              <img src="/images/signature_direction_korhogo_transparent.png" alt="Signature & Cachet" style="height: 34px; max-width: 78px; object-fit: contain; mix-blend-mode: multiply; margin-top: 1px;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
            </div>
          </div>

          <div class="badge-footer">
            <span>Direction des Études</span>
            <span class="secure-tag">Document Officiel Élève</span>
            ${((entete.fullName || '').toLowerCase().includes('korhogo') || (entete.city || '').toLowerCase().includes('korhogo') || (classeNom || '').toLowerCase().includes('korhogo') || (matricule || '').toLowerCase().includes('kho')) ? `
              <span style="display: inline-flex; align-items: center; gap: 3px;">
                <img src="/images/signature_direction_korhogo_transparent.png" alt="Visa Korhogo" style="height: 14px; max-width: 50px; object-fit: contain; mix-blend-mode: multiply;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
                <span style="color: #0f2444; font-weight: 800;">Visa Korhogo</span>
              </span>
            ` : `
              <span>Visa de la Direction</span>
            `}
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

/**
 * Imprime une planche A4 (8 cartes élèves avec repères de découpe)
 */
export const printPlancheCartesScolaires = (
  studentsList: any[],
  school: School | any = null,
  year: string = '2026 - 2027'
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const entete = resolveEnteteEtablissement({
    ecoleId: school?.id,
    code: school?.code,
    schoolName: school?.name || school?.ET_DENOMMINATION,
  });

  const cardsHTML = studentsList.map((student) => {
    const studentName = `${(student.AU_NOM || student.lastName || student.nom || '').toUpperCase()} ${student.AU_PRENOM || student.firstName || student.prenom || ''}`.trim();
    const matricule = student.AU_MATRICULE || student.matricule || `MAT-${student.id || '01'}`;
    const classeNom = student.classe_nom || student.classe || student.CE_LIBELLE || 'Classe Standard';
    const dateNaiss = student.AU_DATE_NAISSANCE || student.date_naissance || '—';
    const tuteurContact = student.AU_TUTEURLEGALCONTACTS || student.AU_CONTACTS || student.contact_parent || '—';
    const photoUrl = student.photo_url || student.photo || '';
    const initials = `${(student.AU_NOM || student.lastName || 'L')[0] || ''}${(student.AU_PRENOM || student.firstName || 'E')[0] || ''}`.toUpperCase();

    const qrUri = generateQRCodeDataURI(
      `ELEVE|ID:${student.id}|MAT:${matricule}|NOM:${student.AU_NOM || student.nom || ''}|PRENOM:${student.AU_PRENOM || student.prenom || ''}|CONTACT:${tuteurContact}|CLS:${classeNom}`,
      140
    );

    return `
      <div class="badge-card">
        <div class="badge-header">
          <div style="display: flex; align-items: center;">
            <div style="position: relative; display: inline-block;">
              <img src="${entete.logo || '/images/hinneh_logo_20260507_234919.png'}" alt="Logo" class="badge-logo" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
            </div>
            <div class="header-text">
              <div class="badge-inst">Rép. de Côte d'Ivoire</div>
              <div class="badge-school">${entete.fullName || 'FONDATION HINNEH'}</div>
              <div class="badge-title">Carte d'Identité Scolaire</div>
            </div>
          </div>
          <span class="badge-year">${year}</span>
        </div>

        <div class="badge-body">
          <div class="photo-frame">
            ${photoUrl ? `<img src="${photoUrl}" alt="Photo" />` : `<div class="photo-fallback">${initials}<span>PHOTO</span></div>`}
          </div>

          <div class="student-info">
            <div class="field-label">Élève</div>
            <div class="student-name">${studentName}</div>
            <div class="tags-row">
              <span class="matricule-badge">MAT: ${matricule}</span>
              <span class="classe-badge">Classe: ${classeNom}</span>
            </div>
            <div class="info-detail">Né(e) : <strong>${dateNaiss}</strong></div>
            <div class="info-detail">Urgence : <strong>${tuteurContact}</strong></div>
          </div>

          <div class="qr-box-wrap">
            <div class="qr-box">
              <img src="${qrUri}" alt="QR" />
            </div>
            <div class="qr-caption">Contrôle</div>
            <img src="/images/signature_direction_korhogo_transparent.png" alt="Signature & Cachet" style="height: 28px; max-width: 68px; object-fit: contain; mix-blend-mode: multiply; margin-top: 1px;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
          </div>
        </div>

        <div class="badge-footer">
          <span>Direction des Études</span>
          <span class="secure-tag">Document Officiel Élève</span>
          ${((entete.fullName || '').toLowerCase().includes('korhogo') || (entete.city || '').toLowerCase().includes('korhogo') || (classeNom || '').toLowerCase().includes('korhogo') || (matricule || '').toLowerCase().includes('kho')) ? `
            <span style="display: inline-flex; align-items: center; gap: 3px;">
              <img src="/images/signature_direction_korhogo_transparent.png" alt="Visa Korhogo" style="height: 13px; max-width: 45px; object-fit: contain; mix-blend-mode: multiply;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
              <span style="color: #0f2444; font-weight: 800;">Visa Korhogo</span>
            </span>
          ` : `
            <span>Visa Direction</span>
          `}
        </div>
      </div>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Planche Cartes Scolaires - ${studentsList.length} élèves</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(2, 85.6mm);
            grid-gap: 6mm 6mm;
            justify-content: center;
          }
          .badge-card {
            width: 85.6mm;
            height: 53.98mm;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            color: #0f172a;
            position: relative;
            overflow: hidden;
            border: 1px dashed #94a3b8;
            page-break-inside: avoid;
          }
          .badge-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(45deg, rgba(15, 43, 92, 0.015) 0, rgba(15, 43, 92, 0.015) 2px, transparent 2px, transparent 6px);
            pointer-events: none;
          }
          .badge-header {
            background: #0f2444;
            padding: 3px 6px;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1.5px solid #b45309;
            position: relative;
            z-index: 1;
          }
          .badge-logo {
            height: 22px;
            width: 22px;
            object-fit: contain;
            background: #ffffff;
            border-radius: 3px;
            padding: 1px;
          }
          .header-text {
            flex: 1;
            margin-left: 5px;
            line-height: 1.15;
          }
          .badge-inst {
            font-size: 5.5px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #cbd5e1;
          }
          .badge-school {
            font-size: 7.5px;
            font-weight: 800;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 145px;
          }
          .badge-title {
            font-size: 5.5px;
            font-weight: 700;
            color: #fde68a;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .badge-year {
            font-size: 6.5px;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #ffffff;
            padding: 1px 4px;
            border-radius: 2.5px;
            white-space: nowrap;
          }
          .badge-body {
            padding: 3.5px 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            flex: 1;
            position: relative;
            z-index: 1;
          }
          .photo-frame {
            width: 44px;
            height: 54px;
            border-radius: 3px;
            border: 1px solid #0f2444;
            padding: 1px;
            background: #ffffff;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .photo-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 2px;
          }
          .photo-fallback {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #475569;
            font-size: 11px;
            font-weight: 700;
          }
          .photo-fallback span {
            font-size: 5px;
            color: #94a3b8;
            font-weight: 600;
          }
          .student-info {
            flex: 1;
            min-width: 0;
            line-height: 1.2;
          }
          .field-label {
            font-size: 5.5px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .student-name {
            font-size: 8.5px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 1.5px;
          }
          .tags-row {
            display: flex;
            gap: 3px;
            margin-bottom: 1.5px;
          }
          .matricule-badge {
            font-family: monospace;
            font-size: 6px;
            font-weight: 700;
            color: #0f172a;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 0.5px 3px;
            border-radius: 2px;
          }
          .classe-badge {
            font-size: 6px;
            font-weight: 700;
            color: #0f2444;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            padding: 0.5px 3px;
            border-radius: 2px;
          }
          .info-detail {
            font-size: 6px;
            color: #334155;
          }
          .info-detail strong {
            color: #0f172a;
          }
          .qr-box-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
          }
          .qr-box {
            width: 40px;
            height: 40px;
            border: 1px solid #cbd5e1;
            border-radius: 3px;
            padding: 1px;
            background: #ffffff;
          }
          .qr-box img {
            width: 100%;
            height: 100%;
          }
          .qr-caption {
            font-size: 4.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 1px;
          }
          .badge-footer {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 2px 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 5.5px;
            color: #475569;
            font-weight: 600;
            position: relative;
            z-index: 1;
          }
          .secure-tag {
            font-weight: 700;
            color: #047857;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="grid-container">
          ${cardsHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

/**
 * Imprime la Carte Professionnelle individuelle d'un membre du personnel avec Photo et Service
 */
export const printCarteProfessionnelle = (
  staff: any,
  school: School | any = null,
  year: string = '2026 - 2027'
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const entete = resolveEnteteEtablissement({
    ecoleId: school?.id || staff.schoolId || staff.ecole_id,
    code: school?.code || staff.ET_CODEETABLISSEMENT,
    schoolName: school?.name || school?.ET_DENOMMINATION,
  });

  const staffName = `${(staff.lastName || staff.nom || '').toUpperCase()} ${staff.firstName || staff.prenom || ''}`.trim();
  const staffFunction = (staff.fonctionExercee || staff.fonction || staff.role || 'Personnel').toUpperCase();
  const staffService = resolveStaffService(staff);
  const staffPhone = staff.phone || staff.telephone || '—';
  const staffId = staff.matricule || (staff.username && !staff.username.includes('@') ? staff.username : `PERS-${String(staff.id || '01').padStart(3, '0')}`);
  const photoUrl = staff.photo || staff.photo_url || '';
  const initials = `${(staff.lastName || staff.nom || 'S')[0] || ''}${(staff.firstName || staff.prenom || 'P')[0] || ''}`.toUpperCase();

  const qrUri = generateQRCodeDataURI(
    `${typeof window !== 'undefined' ? window.location.origin : 'https://hinneh-education.ci'}/#/agent?matricule=${encodeURIComponent(staffId)}&nom=${encodeURIComponent(staff.lastName || staff.nom || staffName)}&prenom=${encodeURIComponent(staff.firstName || staff.prenom || '')}&contact=${encodeURIComponent(staffPhone)}&role=${encodeURIComponent(staffFunction)}`,
    180
  );

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Carte Professionnelle - ${staffName}</title>
        <style>
          @page {
            size: 85.6mm 54mm;
            margin: 0;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #f1f5f9;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .badge-card {
            width: 85.6mm;
            height: 53.98mm;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            color: #0f172a;
            position: relative;
            overflow: hidden;
            border: 1px solid #cbd5e1;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
          }
          .badge-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(45deg, rgba(15, 43, 92, 0.015) 0, rgba(15, 43, 92, 0.015) 2px, transparent 2px, transparent 6px);
            pointer-events: none;
          }
          .badge-header {
            background: #0f2444;
            padding: 4px 8px;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #b45309;
            position: relative;
            z-index: 1;
          }
          .badge-logo {
            height: 26px;
            width: 26px;
            object-fit: contain;
            background: #ffffff;
            border-radius: 3px;
            padding: 1.5px;
          }
          .header-text {
            flex: 1;
            margin-left: 6px;
            line-height: 1.15;
          }
          .badge-inst {
            font-size: 5.8px;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: #cbd5e1;
          }
          .badge-school {
            font-size: 8px;
            font-weight: 800;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 175px;
          }
          .badge-title {
            font-size: 6px;
            font-weight: 700;
            color: #fde68a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .badge-year {
            font-size: 7px;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #ffffff;
            padding: 1.5px 5px;
            border-radius: 3px;
            white-space: nowrap;
          }
          .badge-body {
            padding: 4px 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            flex: 1;
            position: relative;
            z-index: 1;
          }
          .photo-frame {
            width: 48px;
            height: 58px;
            border-radius: 3px;
            border: 1px solid #0f2444;
            padding: 1px;
            background: #ffffff;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .photo-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 2px;
          }
          .photo-fallback {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #475569;
            font-size: 13px;
            font-weight: 700;
          }
          .photo-fallback span {
            font-size: 5.5px;
            color: #94a3b8;
            font-weight: 600;
            margin-top: 1px;
          }
          .staff-info {
            flex: 1;
            min-width: 0;
            line-height: 1.25;
          }
          .field-label {
            font-size: 6px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .staff-name {
            font-size: 9.5px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 2px;
          }
          .staff-role {
            font-size: 7.5px;
            font-weight: 700;
            color: #0f2444;
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            padding: 1px 4px;
            border-radius: 1px;
            display: inline-block;
            margin-bottom: 2px;
            text-transform: uppercase;
          }
          .staff-service {
            font-size: 6.8px;
            font-weight: 600;
            color: #334155;
            margin-bottom: 0.5px;
          }
          .info-detail {
            font-size: 6.8px;
            color: #334155;
            margin-bottom: 0.5px;
          }
          .info-detail strong {
            color: #0f172a;
          }
          .qr-box-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
          }
          .qr-box {
            width: 44px;
            height: 44px;
            border: 1px solid #cbd5e1;
            border-radius: 3px;
            padding: 1px;
            background: #ffffff;
          }
          .qr-box img {
            width: 100%;
            height: 100%;
          }
          .qr-caption {
            font-size: 5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 1.5px;
            letter-spacing: 0.3px;
          }
          .badge-footer {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 2.5px 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 6px;
            color: #475569;
            font-weight: 600;
            position: relative;
            z-index: 1;
          }
          .secure-tag {
            font-weight: 700;
            color: #047857;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
        </style>
      </head>
      <body>
        <div class="badge-card">
          <div class="badge-header">
            <div style="display: flex; align-items: center;">
              <div style="position: relative; display: inline-block;">
                <img src="${entete.logo || '/images/hinneh_logo_20260507_234919.png'}" alt="Logo" class="badge-logo" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
              </div>
              <div class="header-text">
                <div class="badge-inst">Fondation Hinneh • Côte d'Ivoire</div>
                <div class="badge-school">${entete.fullName || 'HÎNNEH ÉDUCATION'}</div>
                <div class="badge-title">Carte Professionnelle d'Agent</div>
              </div>
            </div>
            <span class="badge-year">${year}</span>
          </div>

          <div class="badge-body">
            <div class="photo-frame">
              ${photoUrl ? `<img src="${photoUrl}" alt="Photo" />` : `<div class="photo-fallback">${initials}<span>PHOTO</span></div>`}
            </div>

            <div class="staff-info">
              <div class="field-label">Nom & Prénoms</div>
              <div class="staff-name">${staffName}</div>
              <div><span class="staff-role">${staffFunction}</span></div>
              <div class="staff-service">Service : <strong>${staffService}</strong></div>
              <div class="info-detail">Matricule : <strong>${staffId}</strong></div>
              <div class="info-detail">Contact : <strong>${staffPhone}</strong></div>
            </div>

            <div class="qr-box-wrap">
              <div class="qr-box">
                <img src="${qrUri}" alt="QR" />
              </div>
              <div class="qr-caption">Authentifié RH</div>
              <img src="/images/signature_direction_korhogo_transparent.png" alt="Signature & Cachet" style="height: 34px; max-width: 78px; object-fit: contain; mix-blend-mode: multiply; margin-top: 1px;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
            </div>
          </div>

          <div class="badge-footer">
            <span>${entete.fullName || "Fondation Hinneh"}</span>
            <span class="secure-tag">Personnel Enregistré</span>
            ${((entete.fullName || '').toLowerCase().includes('korhogo') || (entete.city || '').toLowerCase().includes('korhogo') || (staffId || '').toLowerCase().includes('kho')) ? `
              <span style="display: inline-flex; align-items: center; gap: 3px;">
                <img src="/images/signature_direction_korhogo_transparent.png" alt="Visa Korhogo" style="height: 14px; max-width: 50px; object-fit: contain; mix-blend-mode: multiply;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
                <span style="color: #0f2444; font-weight: 800;">Visa Korhogo</span>
              </span>
            ` : `
              <span>Visa de la Direction</span>
            `}
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

/**
 * Imprime une planche A4 multi-cartes de tout le personnel (ou sélection)
 */
export const printPlancheCartesProfessionnelles = (
  staffList: any[],
  school: School | any = null,
  year: string = '2026 - 2027'
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const entete = resolveEnteteEtablissement({
    ecoleId: school?.id,
    code: school?.code,
    schoolName: school?.name || school?.ET_DENOMMINATION,
  });

  const cardsHTML = staffList.map((staff) => {
    const staffName = `${(staff.lastName || staff.nom || '').toUpperCase()} ${staff.firstName || staff.prenom || ''}`.trim();
    const staffFunction = (staff.fonctionExercee || staff.fonction || staff.role || 'Personnel').toUpperCase();
    const staffPhone = staff.phone || staff.telephone || '—';
    const staffId = staff.matricule || (staff.username && !staff.username.includes('@') ? staff.username : `PERS-${String(staff.id || '01').padStart(3, '0')}`);
    const photoUrl = staff.photo || staff.photo_url || '';
    const initials = `${(staff.lastName || staff.nom || 'S')[0] || ''}${(staff.firstName || staff.prenom || 'P')[0] || ''}`.toUpperCase();

    const qrUri = generateQRCodeDataURI(
      `${typeof window !== 'undefined' ? window.location.origin : 'https://hinneh-education.ci'}/#/agent?matricule=${encodeURIComponent(staffId)}&nom=${encodeURIComponent(staff.lastName || staff.nom || staffName)}&prenom=${encodeURIComponent(staff.firstName || staff.prenom || '')}&contact=${encodeURIComponent(staffPhone)}&role=${encodeURIComponent(staffFunction)}`,
      140
    );

    return `
      <div class="badge-card">
        <div class="badge-header">
          <div style="display: flex; align-items: center;">
            <div style="position: relative; display: inline-block;">
              <img src="${entete.logo || '/images/hinneh_logo_20260507_234919.png'}" alt="Logo" class="badge-logo" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
            </div>
            <div class="header-text">
              <div class="badge-inst">Fondation Hinneh</div>
              <div class="badge-school">${entete.fullName || 'HÎNNEH ÉDUCATION'}</div>
              <div class="badge-title">Carte Professionnelle</div>
            </div>
          </div>
          <span class="badge-year">${year}</span>
        </div>

        <div class="badge-body">
          <div class="photo-frame">
            ${photoUrl ? `<img src="${photoUrl}" alt="Photo" />` : `<div class="photo-fallback">${initials}<span>PHOTO</span></div>`}
          </div>

          <div class="staff-info">
            <div class="field-label">Nom & Prénoms</div>
            <div class="staff-name">${staffName}</div>
            <div><span class="staff-role">${staffFunction}</span></div>
            <div class="staff-service">Service : <strong>${staffService}</strong></div>
            <div class="info-detail">ID: <strong>${staffId}</strong> | Tél: <strong>${staffPhone}</strong></div>
          </div>

          <div class="qr-box-wrap">
            <div class="qr-box">
              <img src="${qrUri}" alt="QR" />
            </div>
            <div class="qr-caption">RH</div>
            <img src="/images/signature_direction_korhogo_transparent.png" alt="Signature & Cachet" style="height: 28px; max-width: 68px; object-fit: contain; mix-blend-mode: multiply; margin-top: 1px;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
          </div>
        </div>

        <div class="badge-footer">
          <span>${entete.fullName || "Fondation Hinneh"}</span>
          <span class="secure-tag">Personnel Enregistré</span>
          ${((entete.fullName || '').toLowerCase().includes('korhogo') || (entete.city || '').toLowerCase().includes('korhogo') || (staffId || '').toLowerCase().includes('kho')) ? `
            <span style="display: inline-flex; align-items: center; gap: 3px;">
              <img src="/images/signature_direction_korhogo_transparent.png" alt="Visa Korhogo" style="height: 13px; max-width: 45px; object-fit: contain; mix-blend-mode: multiply;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
              <span style="color: #0f2444; font-weight: 800;">Visa Korhogo</span>
            </span>
          ` : `
            <span>Visa Direction</span>
          `}
        </div>
      </div>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Planche Cartes Professionnelles - ${staffList.length} cartes</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(2, 85.6mm);
            grid-gap: 6mm 6mm;
            justify-content: center;
          }
          .badge-card {
            width: 85.6mm;
            height: 53.98mm;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            color: #0f172a;
            position: relative;
            overflow: hidden;
            border: 1px dashed #94a3b8;
            page-break-inside: avoid;
          }
          .badge-card::before {
            content: "";
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(45deg, rgba(15, 43, 92, 0.015) 0, rgba(15, 43, 92, 0.015) 2px, transparent 2px, transparent 6px);
            pointer-events: none;
          }
          .badge-header {
            background: #0f2444;
            padding: 3px 6px;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1.5px solid #b45309;
            position: relative;
            z-index: 1;
          }
          .badge-logo {
            height: 22px;
            width: 22px;
            object-fit: contain;
            background: #ffffff;
            border-radius: 3px;
            padding: 1px;
          }
          .header-text {
            flex: 1;
            margin-left: 5px;
            line-height: 1.15;
          }
          .badge-inst {
            font-size: 5.5px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #cbd5e1;
          }
          .badge-school {
            font-size: 7.5px;
            font-weight: 800;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 155px;
          }
          .badge-title {
            font-size: 5.5px;
            font-weight: 700;
            color: #fde68a;
            text-transform: uppercase;
          }
          .badge-year {
            font-size: 6.5px;
            font-weight: 700;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: #ffffff;
            padding: 1px 4px;
            border-radius: 2px;
          }
          .badge-body {
            padding: 3.5px 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            flex: 1;
            position: relative;
            z-index: 1;
          }
          .photo-frame {
            width: 44px;
            height: 54px;
            border-radius: 3px;
            border: 1px solid #0f2444;
            padding: 1px;
            background: #ffffff;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .photo-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 2px;
          }
          .photo-fallback {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #475569;
            font-size: 11px;
            font-weight: 700;
          }
          .photo-fallback span {
            font-size: 5px;
            color: #94a3b8;
            font-weight: 600;
          }
          .staff-info {
            flex: 1;
            min-width: 0;
            line-height: 1.2;
          }
          .field-label {
            font-size: 5.5px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
          }
          .staff-name {
            font-size: 8.5px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 1.5px;
          }
          .staff-role {
            font-size: 6.8px;
            font-weight: 700;
            color: #0f2444;
            background: #e2e8f0;
            border-left: 2px solid #0f2444;
            padding: 0.5px 3px;
            border-radius: 1px;
            display: inline-block;
            margin-bottom: 1px;
            text-transform: uppercase;
          }
          .staff-service {
            font-size: 6px;
            color: #334155;
          }
          .info-detail {
            font-size: 6px;
            color: #334155;
          }
          .info-detail strong {
            color: #0f172a;
          }
          .qr-box-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
          }
          .qr-box {
            width: 40px;
            height: 40px;
            border: 1px solid #cbd5e1;
            border-radius: 3px;
            padding: 1px;
            background: #ffffff;
          }
          .qr-box img {
            width: 100%;
            height: 100%;
          }
          .qr-caption {
            font-size: 4.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 1px;
          }
          .badge-footer {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 2px 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 5.5px;
            color: #475569;
            font-weight: 600;
            position: relative;
            z-index: 1;
          }
          .secure-tag {
            font-weight: 700;
            color: #047857;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="grid-container">
          ${cardsHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};



/**
 * Imprime un Billet d'Entrée suite à Retard délivré par la Vie Scolaire / Éducateur
 */
export const printBilletEntreeRetard = (
  student: Student,
  classRoom: ClassRoom | null,
  school: School | any = null,
  retardData: {
    heureArrivee?: string;
    motif?: string;
    decision?: string;
    educateurNom?: string;
    date?: string;
    year?: string;
  } = {}
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const entete = resolveEnteteEtablissement({
    ecoleId: school?.id || (student as any).schoolId || (student as any).ecole_id,
    code: school?.code || student.codeEtablissement,
    schoolName: school?.name || (student as any).schoolName,
    className: classRoom?.name || student.className,
  });

  const dateStr = retardData.date || new Date().toLocaleDateString('fr-FR');
  const heureStr = retardData.heureArrivee || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const motifStr = retardData.motif || 'Retard signalé à la vie scolaire';
  const decisionStr = retardData.decision || 'Autorisé(e) à intégrer le cours';
  const educateurStr = retardData.educateurNom || 'Le Service Vie Scolaire / Éducateur';
  const anneeStr = retardData.year || '2026 - 2027';
  const studentName = `${(student.lastName || '').toUpperCase()} ${student.firstName || ''}`.trim();
  const className = classRoom?.name || student.className || 'Classe';
  const billetId = `RET-${new Date().getFullYear()}-${String(student.id || '01').padStart(4, '0')}-${Math.floor(100 + Math.random() * 900)}`;

  const renderSingleRetardHTML = (label: string) => `
    <div class="ticket">
      <div class="header">
        <div class="header-left">
          ${entete.logo ? `<img src="${entete.logo}" class="logo" alt="Logo" />` : ''}
          <div>
            <div class="school-name">${entete.fullName}</div>
            <div class="school-sub">SERVICE VIE SCOLAIRE & ÉDUCATION</div>
            ${entete.phoneLine ? `<div class="school-phones">📞 Tél : ${entete.phoneLine}</div>` : ''}
          </div>
        </div>
        <div class="header-right">
          <div class="tag-retard">BILLET DE RETARD</div>
          <div class="ticket-no">${billetId}</div>
          <div class="label-copy">${label}</div>
        </div>
      </div>

      <div class="title-banner">
        BILLET D'ENTRÉE EN CLASSE (RETARDATAIRE)
      </div>

      <div class="body-content">
        <div class="row-info">
          <div>Élève : <strong class="uppercase">${studentName}</strong></div>
          <div>Matricule : <strong>${student.matricule || 'N/A'}</strong></div>
          <div>Classe : <strong>${className}</strong></div>
        </div>

        <div class="retard-box">
          <div class="grid-2">
            <div>📅 <strong>Date :</strong> ${dateStr}</div>
            <div>⏰ <strong>Heure d'arrivée :</strong> <span class="highlight-heure">${heureStr}</span></div>
          </div>
          <div style="margin-top: 5px;">📝 <strong>Motif du retard :</strong> ${motifStr}</div>
          <div style="margin-top: 5px;">✅ <strong>Décision Vie Scolaire :</strong> <span class="badge-decision">${decisionStr}</span></div>
        </div>

        <p class="instruction">
          L'enseignant est prié d'accepter l'élève en classe dès présentation de ce billet dûment visé.
        </p>
      </div>

      <div class="footer">
        <div class="footer-left">
          Fait${entete.city ? ` à ${entete.city}` : ''}, le ${dateStr} à ${heureStr}
        </div>
        <div class="footer-right">
          <div class="sign-title">${educateurStr}</div>
          <div class="sign-placeholder">Visa & Cachet Vie Scolaire</div>
        </div>
      </div>
    </div>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Billet d'Entrée Retard - ${studentName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: A4 portrait; margin: 10mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #0f172a;
            padding: 10px;
            background: #fff;
          }
          .page-wrapper {
            display: flex;
            flex-direction: column;
            gap: 12mm;
          }
          .ticket {
            border: 1.5px solid #cbd5e1;
            border-radius: 10px;
            padding: 16px 20px;
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #ea580c;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .logo {
            width: 44px;
            height: 44px;
            object-fit: contain;
          }
          .school-name {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
          }
          .school-sub {
            font-size: 9px;
            font-weight: 700;
            color: #ea580c;
            letter-spacing: 0.5px;
          }
          .school-phones {
            font-size: 9px;
            color: #64748b;
          }
          .header-right {
            text-align: right;
          }
          .tag-retard {
            display: inline-block;
            background: #fff7ed;
            color: #c2410c;
            border: 1px solid #fdba74;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 800;
          }
          .ticket-no {
            font-size: 8px;
            font-family: monospace;
            color: #94a3b8;
            margin-top: 2px;
          }
          .label-copy {
            font-size: 7.5px;
            color: #64748b;
            text-transform: uppercase;
          }
          .title-banner {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 6px;
            text-align: center;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 1px;
            color: #0f172a;
            border-radius: 6px;
            margin-bottom: 12px;
          }
          .body-content {
            font-size: 11px;
            line-height: 1.5;
          }
          .row-info {
            display: flex;
            justify-content: space-between;
            background: #f1f5f9;
            padding: 6px 10px;
            border-radius: 6px;
            margin-bottom: 10px;
            font-size: 10.5px;
          }
          .uppercase { text-transform: uppercase; }
          .retard-box {
            border: 1px solid #fed7aa;
            background: #fffaf5;
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 10px;
            font-size: 10.5px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .highlight-heure {
            color: #c2410c;
            font-weight: 800;
            font-size: 12px;
          }
          .badge-decision {
            background: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
            padding: 1px 6px;
            border-radius: 4px;
            font-weight: 700;
          }
          .instruction {
            font-size: 9.5px;
            font-style: italic;
            color: #475569;
            margin-bottom: 12px;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
          }
          .footer-left {
            font-size: 9px;
            color: #64748b;
          }
          .footer-right {
            text-align: right;
          }
          .sign-title {
            font-size: 10px;
            font-weight: 700;
            color: #0f172a;
          }
          .sign-placeholder {
            font-size: 8.5px;
            color: #94a3b8;
            margin-top: 2px;
            font-style: italic;
          }
          .cut-line {
            border-top: 1.5px dashed #94a3b8;
            margin: 6px 0;
            text-align: center;
            font-size: 8.5px;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 1px;
          }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          ${renderSingleRetardHTML('COUPON PROFESSEUR / ENTRÉE EN CLASSE')}
          <div class="cut-line">✂️ PARTIE À DÉCOUPER — SOUCHE VIE SCOLAIRE ✂️</div>
          ${renderSingleRetardHTML('SOUCHE VIE SCOLAIRE / ARCHIVE ÉDUCATEUR')}
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

/**
 * Imprime un Billet d'Autorisation de Repos Médical / Décharge Infirmerie
 */
export const printBilletReposMaladie = (
  student: Student,
  classRoom: ClassRoom | null,
  school: School | any = null,
  maladieData: {
    dateConstat?: string;
    periodeRepos?: string;
    motifMedical?: string;
    recommandations?: string;
    parentPrevenu?: string;
    parentTel?: string;
    heureDepart?: string;
    soignantNom?: string;
    educateurNom?: string;
    year?: string;
  } = {}
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const entete = resolveEnteteEtablissement({
    ecoleId: school?.id || (student as any).schoolId || (student as any).ecole_id,
    code: school?.code || student.codeEtablissement,
    schoolName: school?.name || (student as any).schoolName,
    className: classRoom?.name || student.className,
  });

  const dateStr = maladieData.dateConstat || new Date().toLocaleDateString('fr-FR');
  const periodeStr = maladieData.periodeRepos || '1 jour (repos à domicile)';
  const motifStr = maladieData.motifMedical || 'Indisposition / Raison de santé constatée à l\'infirmerie';
  const recommandations = maladieData.recommandations || 'Repos strict, réhydratation et consultation médicale si les symptômes persistent.';
  const parentPrevenu = maladieData.parentPrevenu || 'Oui (Tuteur légal informé)';
  const parentTel = maladieData.parentTel || (student as any).parentPhone || (student as any).parentTel || 'Non renseigné';
  const heureDepart = maladieData.heureDepart || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const soignantStr = maladieData.soignantNom || 'Infirmerie Scolaire';
  const educateurStr = maladieData.educateurNom || 'Vie Scolaire & Éducation';
  const anneeStr = maladieData.year || '2026 - 2027';
  const studentName = `${(student.lastName || '').toUpperCase()} ${student.firstName || ''}`.trim();
  const className = classRoom?.name || student.className || 'Classe';
  const billetId = `MED-${new Date().getFullYear()}-${String(student.id || '01').padStart(4, '0')}-${Math.floor(100 + Math.random() * 900)}`;

  const renderSingleReposHTML = (label: string) => `
    <div class="ticket">
      <div class="header">
        <div class="header-left">
          ${entete.logo ? `<img src="${entete.logo}" class="logo" alt="Logo" />` : ''}
          <div>
            <div class="school-name">${entete.fullName}</div>
            <div class="school-sub">INFIRMERIE & VIE SCOLAIRE</div>
            ${entete.phoneLine ? `<div class="school-phones">📞 Tél : ${entete.phoneLine}</div>` : ''}
          </div>
        </div>
        <div class="header-right">
          <div class="tag-med">AUTORISATION MÉDICALE</div>
          <div class="ticket-no">${billetId}</div>
          <div class="label-copy">${label}</div>
        </div>
      </div>

      <div class="title-banner">
        BILLET DE REPOS MALADIE / SORTIE INFIRMERIE
      </div>

      <div class="body-content">
        <div class="row-info">
          <div>Élève : <strong class="uppercase">${studentName}</strong></div>
          <div>Matricule : <strong>${student.matricule || 'N/A'}</strong></div>
          <div>Classe : <strong>${className}</strong></div>
        </div>

        <div class="med-box">
          <div class="grid-2">
            <div>📅 <strong>Date du constat :</strong> ${dateStr}</div>
            <div>⏰ <strong>Heure de sortie :</strong> ${heureDepart}</div>
          </div>
          <div style="margin-top: 5px;">🛌 <strong>Durée du repos autorisée :</strong> <span class="highlight-periode">${periodeStr}</span></div>
          <div style="margin-top: 5px;">🩺 <strong>Motif / Diagnostic sommaire :</strong> ${motifStr}</div>
          <div style="margin-top: 5px;">📋 <strong>Recommandations :</strong> ${recommandations}</div>
          <div style="margin-top: 5px;">👨‍👩‍👧 <strong>Parent contacté :</strong> ${parentPrevenu} (Tél : ${parentTel})</div>
        </div>

        <p class="instruction">
          L'élève est dispensé(e) des cours pour la période indiquée. Tout retour en classe nécessite la présentation d'un certificat de guérison si le repos excède 48h.
        </p>
      </div>

      <div class="footer">
        <div class="footer-col">
          <div class="sign-title">L'Infirmier(ère) / Soignant</div>
          <div class="sign-placeholder">${soignantStr}</div>
        </div>
        <div class="footer-col" style="text-align: center;">
          <div class="sign-title">L'Éducateur / Vie Scolaire</div>
          <div class="sign-placeholder">${educateurStr}</div>
        </div>
        <div class="footer-col" style="text-align: right;">
          <div class="sign-title">Le Directeur des Études</div>
          <div class="sign-placeholder">Visa & Cachet</div>
        </div>
      </div>
    </div>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Billet de Repos Maladie - ${studentName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: A4 portrait; margin: 10mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #0f172a;
            padding: 10px;
            background: #fff;
          }
          .page-wrapper {
            display: flex;
            flex-direction: column;
            gap: 12mm;
          }
          .ticket {
            border: 1.5px solid #cbd5e1;
            border-radius: 10px;
            padding: 16px 20px;
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .logo {
            width: 44px;
            height: 44px;
            object-fit: contain;
          }
          .school-name {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
          }
          .school-sub {
            font-size: 9px;
            font-weight: 700;
            color: #0284c7;
            letter-spacing: 0.5px;
          }
          .school-phones {
            font-size: 9px;
            color: #64748b;
          }
          .header-right {
            text-align: right;
          }
          .tag-med {
            display: inline-block;
            background: #f0f9ff;
            color: #0369a1;
            border: 1px solid #bae6fd;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 800;
          }
          .ticket-no {
            font-size: 8px;
            font-family: monospace;
            color: #94a3b8;
            margin-top: 2px;
          }
          .label-copy {
            font-size: 7.5px;
            color: #64748b;
            text-transform: uppercase;
          }
          .title-banner {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 6px;
            text-align: center;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 1px;
            color: #0f172a;
            border-radius: 6px;
            margin-bottom: 12px;
          }
          .body-content {
            font-size: 11px;
            line-height: 1.5;
          }
          .row-info {
            display: flex;
            justify-content: space-between;
            background: #f1f5f9;
            padding: 6px 10px;
            border-radius: 6px;
            margin-bottom: 10px;
            font-size: 10.5px;
          }
          .uppercase { text-transform: uppercase; }
          .med-box {
            border: 1px solid #bae6fd;
            background: #f8fcff;
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 10px;
            font-size: 10.5px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .highlight-periode {
            color: #0369a1;
            font-weight: 800;
            font-size: 11.5px;
          }
          .instruction {
            font-size: 9.5px;
            font-style: italic;
            color: #475569;
            margin-bottom: 12px;
          }
          .footer {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
            gap: 10px;
          }
          .footer-col {
            font-size: 9px;
          }
          .sign-title {
            font-size: 9.5px;
            font-weight: 700;
            color: #0f172a;
          }
          .sign-placeholder {
            font-size: 8.5px;
            color: #64748b;
            margin-top: 2px;
            font-style: italic;
          }
          .cut-line {
            border-top: 1.5px dashed #94a3b8;
            margin: 6px 0;
            text-align: center;
            font-size: 8.5px;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 1px;
          }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          ${renderSingleReposHTML('EXEMPLAIRE PARENT / ÉLÈVE')}
          <div class="cut-line">✂️ PARTIE À DÉCOUPER — SOUCHE INFIRMERIE & VIE SCOLAIRE ✂️</div>
          ${renderSingleReposHTML('SOUCHE INFIRMERIE & VIE SCOLAIRE')}
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

/**
 * Imprime la Fiche d'Appel journalière d'une classe avec grille M1..M5 et S1..S5
 */
export const printFicheAppelClasse = (
  classRoom: ClassRoom | null,
  dateStr: string,
  students: Student[],
  attendanceList: any[],
  school: School | any = null,
  creneaux: string[] = ['M1', 'M2', 'M3', 'M4', 'M5', 'S1', 'S2', 'S3', 'S4', 'S5']
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const entete = resolveEnteteEtablissement({
    ecoleId: school?.id || (classRoom as any)?.ecole_id,
    code: school?.code || (classRoom as any)?.ET_CODEETABLISSEMENT,
    schoolName: school?.name,
    className: classRoom?.name,
  });

  const sortedStudents = [...students].sort((a, b) =>
    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
  );

  // Rows HTML
  const rowsHTML = sortedStudents.map((s, idx) => {
    const sName = `${(s.lastName || '').toUpperCase()} ${s.firstName || ''}`.trim();
    let presencesCount = 0;
    let absencesCount = 0;
    let retardsCount = 0;

    const cellsHTML = creneaux.map((cr) => {
      const rec = attendanceList.find(
        (a) =>
          String(a.studentId || a.eleve_id) === String(s.id) &&
          (a.heure === cr || (a.creneau || '').toUpperCase() === cr || (a.heure || '').startsWith(cr))
      );
      const st = (rec?.status || rec?.statut || '').toLowerCase();
      let badge = '—';
      let cls = 'empty';

      if (st === 'present' || st === 'présent') {
        badge = 'P';
        cls = 'pres';
        presencesCount++;
      } else if (st === 'absent') {
        badge = 'A';
        cls = 'abs';
        absencesCount++;
      } else if (st === 'retard') {
        badge = 'R';
        cls = 'ret';
        retardsCount++;
      } else if (st === 'excuse' || st === 'excusé') {
        badge = 'E';
        cls = 'exc';
        presencesCount++;
      }

      return `<td class="slot-cell ${cls}">${badge}</td>`;
    }).join('');

    return `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="student-cell">
          <strong>${sName}</strong>
          <div class="sub-mat">${s.matricule || 'N/A'}</div>
        </td>
        ${cellsHTML}
        <td class="total-cell text-center pres">${presencesCount}</td>
        <td class="total-cell text-center abs">${absencesCount}</td>
        <td class="total-cell text-center ret">${retardsCount}</td>
      </tr>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>Fiche d'Appel - ${classRoom?.name || 'Classe'} - ${dateStr}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: A4 landscape; margin: 8mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #0f172a;
            padding: 10px;
            font-size: 10px;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .school-title {
            font-size: 14px;
            font-weight: 900;
            color: #0f172a;
            text-transform: uppercase;
          }
          .sub-title {
            font-size: 10px;
            color: #0284c7;
            font-weight: 700;
          }
          .title-box {
            text-align: center;
          }
          .main-title {
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 1px;
            color: #0f172a;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            background: #f1f5f9;
            padding: 6px 10px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 10.5px;
            margin-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 4px 6px;
          }
          th {
            background: #f8fafc;
            font-weight: 800;
            text-align: center;
          }
          .th-slot {
            width: 32px;
          }
          .student-cell {
            text-align: left;
            white-space: nowrap;
          }
          .sub-mat {
            font-size: 8px;
            color: #64748b;
            font-family: monospace;
          }
          .text-center { text-align: center; }
          .slot-cell {
            text-align: center;
            font-weight: 800;
            font-size: 10px;
          }
          .pres { color: #166534; background: #f0fdf4; }
          .abs { color: #991b1b; background: #fef2f2; font-weight: 900; }
          .ret { color: #c2410c; background: #fff7ed; }
          .exc { color: #0369a1; background: #f0f9ff; }
          .empty { color: #cbd5e1; }
          .total-cell {
            font-weight: 800;
            width: 35px;
          }
          .legend {
            display: flex;
            gap: 15px;
            margin-top: 10px;
            font-size: 9px;
            font-weight: 700;
          }
          .footer-signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            font-weight: 700;
          }
          .sign-col {
            text-align: center;
            width: 200px;
          }
          .sign-space {
            height: 40px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 10px;">
            ${entete.logo ? `<img src="${entete.logo}" style="width: 44px; height: 44px; object-fit: contain;" alt="Logo" />` : ''}
            <div>
              <div class="school-title">${entete.fullName}</div>
              <div class="sub-title">FICHE D'APPEL JOURNALIÈRE & REGISTRE D'APPEL</div>
              ${entete.phoneLine ? `<div style="font-size: 8.5px; color: #64748b;">📞 ${entete.phoneLine}</div>` : ''}
            </div>
          </div>
          <div class="title-box">
            <div class="main-title">FICHE D'APPEL PAR CRÉNEAUX</div>
            <div style="font-size: 9px; font-weight: 700; color: #0284c7;">Année Scolaire : 2026 - 2027</div>
          </div>
          <div style="text-align: right; font-size: 9.5px;">
            <div>Date : <strong>${dateStr}</strong></div>
            <div>Classe : <strong>${classRoom?.name || 'Classe'}</strong></div>
            <div>Effectif : <strong>${students.length} élèves</strong></div>
            ${entete.city ? `<div>Ville : <strong>${entete.city}</strong></div>` : ''}
          </div>
        </div>

        <div class="meta-row">
          <span>Matin : M1 (07h30), M2 (08h30), M3 (09h45), M4 (10h45), M5 (11h45)</span>
          <span>Soir : S1 (14h00), S2 (15h00), S3 (16h15), S4 (17h15), S5 (18h15)</span>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width: 25px;">N°</th>
              <th rowspan="2">Nom & Prénoms</th>
              <th colspan="5" style="background: #e0f2fe; color: #0369a1;">MATIN</th>
              <th colspan="5" style="background: #fef3c7; color: #92400e;">SOIR</th>
              <th colspan="3" style="background: #f1f5f9;">BILAN</th>
            </tr>
            <tr>
              <th class="th-slot">M1</th>
              <th class="th-slot">M2</th>
              <th class="th-slot">M3</th>
              <th class="th-slot">M4</th>
              <th class="th-slot">M5</th>
              <th class="th-slot">S1</th>
              <th class="th-slot">S2</th>
              <th class="th-slot">S3</th>
              <th class="th-slot">S4</th>
              <th class="th-slot">S5</th>
              <th style="color: #166534;">P</th>
              <th style="color: #991b1b;">A</th>
              <th style="color: #c2410c;">R</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>

        <div class="legend">
          <span>Légende :</span>
          <span class="pres">P = Présent</span>
          <span class="abs">A = Absent</span>
          <span class="ret">R = Retard</span>
          <span class="exc">E = Excusé</span>
          <span>— = Créneau non encore pointé</span>
        </div>

        <div class="footer-signatures">
          <div class="sign-col">
            <div>Les Enseignants de la Journée</div>
            <div class="sign-space"></div>
            <div>(Signatures)</div>
          </div>
          <div class="sign-col">
            <div>L'Éducateur / Vie Scolaire</div>
            <div class="sign-space"></div>
            <div>(Visa & Contrôle)</div>
          </div>
          <div class="sign-col">
            <div>La Direction des Études</div>
            <div class="sign-space"></div>
            <div>(Cachet officiel)</div>
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


