/**
 * ficheSantePrinter.ts
 * Impression conforme à la Fiche de Santé physique du Collège Privé Hînneh Biabou
 */

export interface FicheSantePrintData {
  nomPrenoms: string;
  dateNaissance: string;
  sexe: string;
  classe: string;
  photoUrl?: string;
  parentContacts: Array<{ nomPrenom: string; contact: string }>;
  groupeSanguin: string;
  rhesus: string;
  allergiesAlimentaires: string;
  allergiesMedicamenteuses: string;
  etatVaccinal: string;
  asthme: boolean;
  asthmeTraitement?: string;
  drepanocytose: boolean;
  drepanocytoseTraitement?: string;
  epilepsie: boolean;
  epilepsieTraitement?: string;
  handicap: boolean;
  handicapPrecision?: string;
  autresPathologies: string;
  autresTraitement?: string;
  dispenseSportive: boolean;
  dispensePrecision?: string;
  medecin1Contact?: string;
  medecin2Contact?: string;
  nomAssurance?: string;
  dateImpression?: string;
}

export function printFicheSante(data: FicheSantePrintData): void {
  const printWindow = window.open('', '_blank', 'width=850,height=1100');
  if (!printWindow) return;

  const parentRows = (data.parentContacts && data.parentContacts.length > 0)
    ? data.parentContacts.map((p, idx) => `
      <tr>
        <td style="width: 10%; text-align: center; font-weight: bold;">${idx + 1}</td>
        <td>${p.nomPrenom || ''}</td>
        <td>${p.contact || ''}</td>
      </tr>
    `).join('')
    : `
      <tr><td style="text-align: center; font-weight: bold;">1</td><td></td><td></td></tr>
      <tr><td style="text-align: center; font-weight: bold;">2</td><td></td><td></td></tr>
      <tr><td style="text-align: center; font-weight: bold;">3</td><td></td><td></td></tr>
    `;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Fiche de Santé - ${data.nomPrenoms}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.3;
      color: #000;
      padding: 10px;
    }
    .header-table {
      width: 100%;
      margin-bottom: 15px;
    }
    .header-title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      text-decoration: underline;
      letter-spacing: 1px;
      margin-bottom: 20px;
    }
    .photo-box {
      width: 110px;
      height: 130px;
      border: 1px solid #000;
      float: right;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      color: #666;
    }
    .photo-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .field-line {
      margin-bottom: 6px;
      font-size: 11pt;
    }
    .field-label {
      font-weight: bold;
      text-transform: uppercase;
    }
    .dotted-val {
      border-bottom: 1px dotted #000;
      padding-left: 5px;
      font-weight: bold;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 12px;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #000;
      padding: 5px 8px;
      font-size: 10pt;
      vertical-align: middle;
    }
    table.data-table th {
      background-color: #f2f2f2;
      text-align: left;
    }
    .section-title {
      font-weight: bold;
      font-size: 11pt;
      margin-top: 12px;
      margin-bottom: 6px;
    }
    .footer-note {
      font-size: 8pt;
      margin-top: 4px;
      font-style: italic;
    }
    .signature-block {
      margin-top: 25px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <!-- PHOTO BOX TOP RIGHT -->
  <div class="photo-box">
    ${data.photoUrl ? `<img src="${data.photoUrl}" alt="Photo" />` : 'PHOTO'}
  </div>

  <!-- TITLE -->
  <div class="header-title">FICHE DE SANTE</div>

  <!-- SECTION 1-4 : IDENTITÉ -->
  <div style="margin-right: 130px;">
    <div class="field-line">
      <span class="field-label">1. NOM ET PRENOMS :</span>
      <span class="dotted-val">${data.nomPrenoms || ''}</span>
    </div>
    <div class="field-line">
      <span class="field-label">2. DATE DE NAISSANCE :</span>
      <span class="dotted-val">${data.dateNaissance || ''}</span>
    </div>
    <div class="field-line">
      <span class="field-label">3. SEXE :</span>
      <span class="dotted-val">${data.sexe || ''}</span>
    </div>
    <div class="field-line">
      <span class="field-label">4. CLASSE :</span>
      <span class="dotted-val">${data.classe || ''}</span>
    </div>
  </div>

  <div style="clear: both; height: 10px;"></div>

  <!-- SECTION 5 : CONTACTS PARENTS -->
  <div class="section-title">5. CONTACTS DES PARENTS OU TUTEURS LEGAUX</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 8%;">N°</th>
        <th style="width: 52%;">Noms et prénoms</th>
        <th style="width: 40%;">Contacts</th>
      </tr>
    </thead>
    <tbody>
      ${parentRows}
    </tbody>
  </table>

  <!-- SECTION 6 : ANTECEDENTS -->
  <div class="section-title">6. ANTECEDENTS</div>
  <div class="field-line" style="display: flex; gap: 20px;">
    <div><span class="field-label">Groupe sanguin :</span> <span class="dotted-val">${data.groupeSanguin || '......'}</span></div>
    <div><span class="field-label">Rhésus :</span> <span class="dotted-val">${data.rhesus || '......'}</span></div>
  </div>
  <div class="field-line"><span class="field-label">Allergies alimentaires :</span> <span class="dotted-val">${data.allergiesAlimentaires || 'Aucune'}</span></div>
  <div class="field-line"><span class="field-label">Allergies médicamenteuses :</span> <span class="dotted-val">${data.allergiesMedicamenteuses || 'Aucune'}</span></div>
  <div class="field-line"><span class="field-label">Etat vaccinal* :</span> <span class="dotted-val">${data.etatVaccinal || 'À jour'}</span></div>

  <div class="section-title" style="margin-top: 8px;">Antécédents médicaux</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 35%;">Pathologies</th>
        <th style="width: 12%; text-align: center;">Oui</th>
        <th style="width: 12%; text-align: center;">Non</th>
        <th style="width: 41%;">Traitement d'urgence**</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Asthme</td>
        <td style="text-align: center;">${data.asthme ? 'X' : ''}</td>
        <td style="text-align: center;">${!data.asthme ? 'X' : ''}</td>
        <td>${data.asthmeTraitement || ''}</td>
      </tr>
      <tr>
        <td>2. Drépanocytose</td>
        <td style="text-align: center;">${data.drepanocytose ? 'X' : ''}</td>
        <td style="text-align: center;">${!data.drepanocytose ? 'X' : ''}</td>
        <td>${data.drepanocytoseTraitement || ''}</td>
      </tr>
      <tr>
        <td>3. Epilepsie</td>
        <td style="text-align: center;">${data.epilepsie ? 'X' : ''}</td>
        <td style="text-align: center;">${!data.epilepsie ? 'X' : ''}</td>
        <td>${data.epilepsieTraitement || ''}</td>
      </tr>
      <tr>
        <td>3. Handicap (auditif, visuel, physique ou autre)***</td>
        <td style="text-align: center;">${data.handicap ? 'X' : ''}</td>
        <td style="text-align: center;">${!data.handicap ? 'X' : ''}</td>
        <td>${data.handicapPrecision || ''}</td>
      </tr>
      <tr>
        <td>4. Autres : ${data.autresPathologies || '................................'}</td>
        <td style="text-align: center;">${data.autresPathologies ? 'X' : ''}</td>
        <td style="text-align: center;">${!data.autresPathologies ? 'X' : ''}</td>
        <td>${data.autresTraitement || ''}</td>
      </tr>
      <tr>
        <td>5. Autres : ................................................</td>
        <td style="text-align: center;"></td>
        <td style="text-align: center;"></td>
        <td></td>
      </tr>
    </tbody>
  </table>
  <div class="footer-note">**ordonnance du médecin traitant</div>
  <div class="footer-note">***rapport médical</div>

  <!-- SECTION 7 : DISPENSE SPORTIVE -->
  <div class="section-title">7. DISPENSE SPORTIVE</div>
  <div class="field-line">
    <span>DISPENSE EPS : <strong>${data.dispenseSportive ? 'OUI' : 'NON'}</strong></span>
    ${data.dispenseSportive ? `<span style="margin-left: 20px;">PRECISER : <span class="dotted-val">${data.dispensePrecision || ''}</span></span>` : ''}
  </div>

  <!-- SECTION 8 : CONTACTS MEDECINS TRAITANTS -->
  <div class="section-title">8. CONTACTS DU/DES MEDECINS TRAITANTS</div>
  <div class="field-line">Contact 1 : <span class="dotted-val">${data.medecin1Contact || '................................................................................'}</span></div>
  <div class="field-line">Contact 2 : <span class="dotted-val">${data.medecin2Contact || '................................................................................'}</span></div>

  <!-- SECTION 9 : NOM DE L'ASSURANCE -->
  <div class="section-title">9. NOM DE L'ASSURANCE</div>
  <div class="field-line"><span class="dotted-val">${data.nomAssurance || '..............................................................................................................'}</span></div>

  <!-- SIGNATURES -->
  <div class="signature-block">
    <div>
      <p style="font-size: 8pt; font-weight: bold; font-style: italic;">NB : VEUILLEZ JOINDRE LES CERTIFICATS DE DISPENSE</p>
    </div>
    <div style="text-align: right;">
      <p>Date et Signature des parents :</p>
      <div style="height: 50px;"></div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
