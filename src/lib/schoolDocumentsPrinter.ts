import { formatCurrency } from './index';
import { resolveEnteteEtablissement } from './ecoleIdentite';

export interface StudentDocData {
  id?: number | string;
  matricule: string;
  nom: string;
  prenom: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  genre?: string;
  classe: string;
  cycle?: string;
  regime?: string;
  dateInscription?: string;
  orphelin?: boolean;
  parentNom?: string;
  parentPhone?: string;
  parentAdresse?: string;
  parentEmail?: string;
  statutOrientation?: string;
  // Fiche de Santé
  groupeSanguin?: string;
  rhesus?: string;
  allergiesAlimentaires?: string;
  allergiesMedicamenteuses?: string;
  etatVaccinal?: string;
  hasAsthme?: boolean;
  hasDrepanocytose?: boolean;
  hasEpilepsie?: boolean;
  medecinContact?: string;
  nomAssurance?: string;
  // Professeur Principal
  professeurPrincipal?: string;
  anneeScolaire?: string;
}

/**
 * Imprime le Dossier Scolaire Complet / Synthèse Individuelle de l'Élève (Fiche Officielle Complète)
 */
export function printDossierScolaireComplet(dossier: any) {
  printDocumentHtml(generateDossierScolaireSyntheseHtml(dossier), `Dossier_Scolaire_${dossier.matricule || dossier.id}`);
}

/**
 * Imprime le Dossier Administratif Complet de l'Élève (3 fiches : Identification, Santé, Engagement)
 */
export function printDossierEleveComplet(student: StudentDocData) {
  printDocumentHtml([
    generateFicheIdentificationHtml(student),
    generateFicheSanteHtml(student),
    generateFicheEngagementHtml(student)
  ].join('<div class="page-break"></div>'), `Dossier_Complet_${student.matricule}`);
}

/**
 * Imprime la Fiche d'Identification seule
 */
export function printFicheIdentification(student: StudentDocData) {
  printDocumentHtml(generateFicheIdentificationHtml(student), `Fiche_Identification_${student.matricule}`);
}

/**
 * Imprime la Fiche de Santé seule
 */
export function printFicheSante(student: StudentDocData) {
  printDocumentHtml(generateFicheSanteHtml(student), `Fiche_Sante_${student.matricule}`);
}

/**
 * Imprime la Fiche d'Engagement seule
 */
export function printFicheEngagement(student: StudentDocData) {
  printDocumentHtml(generateFicheEngagementHtml(student), `Fiche_Engagement_${student.matricule}`);
}

/**
 * Imprime la Liste Administrative de Classe
 */
export function printListeAdministrative(className: string, students: StudentDocData[], profPrincipal?: string) {
  const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const entete = resolveEnteteEtablissement({ className });

  const rows = students.map((s, idx) => `
    <tr>
      <td class="text-center">${idx + 1}</td>
      <td><code>${s.matricule}</code></td>
      <td><strong>${s.nom.toUpperCase()}</strong> ${s.prenom}</td>
      <td class="text-center">${s.genre || 'M'}</td>
      <td>${s.dateNaissance || 'N/C'}</td>
      <td>${s.parentNom || 'Parent d\'élève'}</td>
      <td class="font-mono text-center">${s.parentPhone || 'N/C'}</td>
      <td class="text-center">${s.orphelin ? '<span class="badge-tag">Orphelin(e)</span>' : 'Regulier'}</td>
    </tr>
  `).join('');

  const html = `
    <div class="doc-container">
      <div class="header flex-between" style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${entete.logo || '/images/hinneh_logo_20260507_234919.png'}" style="width: 48px; height: 48px; object-fit: contain;" alt="Logo" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
          <div>
            <h1 class="school-name">${entete.fullName}</h1>
            <p class="sub-text">LISTE ADMINISTRATIVE DES ÉLÈVES PAR CLASSE</p>
          </div>
        </div>
        <div class="text-right">
          <p><strong>Année Scolaire :</strong> 2026-2027</p>
          <p><strong>Date d'édition :</strong> ${todayStr}</p>
        </div>
      </div>
      <hr class="divider"/>
      
      <div class="meta-banner flex-between">
        <div>
          <h2>CLASSE : <span class="highlight">${className}</span></h2>
          <p>Effectif Total : <strong>${students.length} Élève(s)</strong></p>
        </div>
        ${profPrincipal ? `<div class="prof-box"><strong>Professeur Principal :</strong> M./Mme ${profPrincipal}</div>` : ''}
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th width="4%">N°</th>
            <th width="15%">Matricule</th>
            <th width="28%">Nom & Prénoms</th>
            <th width="6%">Sexe</th>
            <th width="12%">Date Naiss.</th>
            <th width="20%">Tuteur / Parent</th>
            <th width="12%">Contact Parent</th>
            <th width="10%">Situation</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="footer-sig flex-between">
        <div>Visa du Secrétariat / Éducateur</div>
        <div>Le Directeur de l'Établissement</div>
      </div>
    </div>
  `;

  printDocumentHtml(html, `Liste_Administrative_${className}`);
}

/**
 * Imprime la Liste Pédagogique de Classe (destinée à la saisie des notes avec le nom du Professeur Principal)
 */
export function printListePedagogique(className: string, students: StudentDocData[], profPrincipal?: string, matiereName?: string) {
  const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const entete = resolveEnteteEtablissement({ className });

  const rows = students.map((s, idx) => `
    <tr>
      <td class="text-center">${idx + 1}</td>
      <td><code>${s.matricule}</code></td>
      <td><strong>${s.nom.toUpperCase()}</strong> ${s.prenom}</td>
      <td class="text-center">${s.genre || 'M'}</td>
      <td class="grid-cell"></td>
      <td class="grid-cell"></td>
      <td class="grid-cell"></td>
      <td class="grid-cell"></td>
    </tr>
  `).join('');

  const html = `
    <div class="doc-container">
      <div class="header flex-between" style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${entete.logo || '/images/hinneh_logo_20260507_234919.png'}" style="width: 48px; height: 48px; object-fit: contain;" alt="Logo" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
          <div>
            <h1 class="school-name">${entete.fullName}</h1>
            <p class="sub-text">FICHE PÉDAGOGIQUE DE RELEVÉ ET SAISIE DES NOTES</p>
          </div>
        </div>
        <div class="text-right">
          <p><strong>Année Scolaire :</strong> 2026-2027</p>
          <p><strong>Date :</strong> ${todayStr}</p>
        </div>
      </div>
      <hr class="divider"/>

      <div class="meta-banner flex-between">
        <div>
          <h2>CLASSE : <span class="highlight">${className}</span> ${matiereName ? `| Matière : ${matiereName}` : ''}</h2>
          <p><strong>Professeur Principal :</strong> <span class="prof-name">${profPrincipal || 'Non assigné'}</span></p>
        </div>
        <div class="text-right">
          <p><strong>Trimestre / Période :</strong> ____ Trimestre</p>
          <p>Effectif : <strong>${students.length} Élève(s)</strong></p>
        </div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th width="4%">N°</th>
            <th width="15%">Matricule</th>
            <th width="35%">Nom & Prénoms</th>
            <th width="6%">Sexe</th>
            <th width="10%">Devoir 1</th>
            <th width="10%">Devoir 2</th>
            <th width="10%">Composition</th>
            <th width="10%">Moyenne</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="footer-sig flex-between">
        <div>Signature de l'Enseignant / Professeur</div>
        <div>Visa du Professeur Principal (${profPrincipal || 'N/C'})</div>
      </div>
    </div>
  `;

  printDocumentHtml(html, `Liste_Pedagogique_${className}`);
}

// ----------------- HELPERS GENERATION HTML -----------------

function generateFicheIdentificationHtml(s: StudentDocData): string {
  const entete = resolveEnteteEtablissement({ className: s.classe });
  return `
    <div class="doc-container">
      <div class="header flex-between" style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${entete.logo || '/images/hinneh_logo_20260507_234919.png'}" style="width: 48px; height: 48px; object-fit: contain;" alt="Logo" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
          <div>
            <h1 class="school-name">${entete.fullName}</h1>
            <p class="sub-text">FICHE D'IDENTIFICATION OFFICIELLE DE L'ÉLÈVE</p>
          </div>
        </div>
        <div class="photo-box">
          PHOTO ÉLÈVE
        </div>
      </div>
      <hr class="divider"/>

      <div class="info-grid">
        <div class="info-card">
          <h3>1. ÉTAT CIVIL & ÉTABLISSEMENT</h3>
          <p><strong>Matricule :</strong> <code>${s.matricule}</code></p>
          <p><strong>Nom :</strong> ${s.nom.toUpperCase()}</p>
          <p><strong>Prénom :</strong> ${s.prenom}</p>
          <p><strong>Sexe :</strong> ${s.genre === 'F' ? 'Féminin' : 'Masculin'}</p>
          <p><strong>Date & Lieu Naissance :</strong> ${s.dateNaissance || 'N/C'} à ${s.lieuNaissance || 'Abidjan'}</p>
          <p><strong>Classe Assignée :</strong> <strong class="highlight">${s.classe}</strong></p>
          <p><strong>Régime :</strong> ${s.regime || 'Non-boursier'}</p>
          <p><strong>Situation Familiale :</strong> ${s.orphelin ? 'Orphelin(e)' : 'Régulier(e)'}</p>
          <p><strong>Date d'Inscription :</strong> <strong>${s.dateInscription || new Date().toLocaleDateString('fr-FR')}</strong></p>
        </div>

        <div class="info-card">
          <h3>2. COORDONNÉES DES PARENTS & TUTEURS</h3>
          <p><strong>Nom & Prénoms du Tuteur :</strong> M./Mme ${s.parentNom || 'N/C'}</p>
          <p><strong>Téléphone Contact Urgent :</strong> <strong class="font-mono">${s.parentPhone || 'N/C'}</strong></p>
          <p><strong>Adresse Géographique :</strong> ${s.parentAdresse || 'Non renseignée'}</p>
          <p><strong>Statut Orientation :</strong> ${s.statutOrientation || "Affecté par l'État"}</p>
        </div>
      </div>

      <div class="signature-section flex-between">
        <div>
          <p>Signature de l'Élève</p>
          <div class="sig-space"></div>
        </div>
        <div>
          <p>Signature du Parent / Tuteur Legal</p>
          <div class="sig-space"></div>
        </div>
        <div>
          <p>Visa de l'Éducateur / Caisse</p>
          <div class="sig-space"></div>
        </div>
      </div>
    </div>
  `;
}

function generateFicheSanteHtml(s: StudentDocData): string {
  const entete = resolveEnteteEtablissement({ className: s.classe });
  return `
    <div class="doc-container">
      <div class="header flex-between" style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${entete.logo || '/images/hinneh_logo_20260507_234919.png'}" style="width: 48px; height: 48px; object-fit: contain;" alt="Logo" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
          <div>
            <h1 class="school-name">${entete.fullName}</h1>
            <p class="sub-text">FICHE CONFIDENTIELLE DE SANTÉ & SUIVI MÉDICAL</p>
          </div>
        </div>
        <div class="badge-medical">CONFIDENTIEL MÉDICAL</div>
      </div>
      <hr class="divider"/>

      <div class="meta-strip">
        <p>Élève : <strong>${s.nom.toUpperCase()} ${s.prenom}</strong> | Matricule : <code>${s.matricule}</code> | Classe : <strong>${s.classe}</strong></p>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <h3>1. PROFIL SANGUIN & VACCINATIONS</h3>
          <p><strong>Groupe Sanguin :</strong> <strong class="badge-blood">${s.groupeSanguin || 'A+'}</strong></p>
          <p><strong>Rhésus :</strong> ${s.rhesus || '+'}</p>
          <p><strong>État Vaccinal :</strong> ${s.etatVaccinal || 'À jour'}</p>
        </div>

        <div class="info-card">
          <h3>2. ANTECDENTS & ANOMALIES SANTE</h3>
          <p><strong>Asthme :</strong> ${s.hasAsthme ? 'OUI ⚠️' : 'NON'}</p>
          <p><strong>Drépanocytose :</strong> ${s.hasDrepanocytose ? 'OUI ⚠️' : 'NON'}</p>
          <p><strong>Épilepsie :</strong> ${s.hasEpilepsie ? 'OUI ⚠️' : 'NON'}</p>
          <p><strong>Allergies Alimentaires :</strong> ${s.allergiesAlimentaires || 'Aucune signalée'}</p>
          <p><strong>Allergies Médicamenteuses :</strong> ${s.allergiesMedicamenteuses || 'Aucune signalée'}</p>
        </div>
      </div>

      <div class="info-card">
        <h3>3. PERSONNES À CONTACTER EN CAS D'URGENCE MÉDICALE</h3>
        <p><strong>Contact d'urgence Tuteur :</strong> ${s.parentPhone || '07 00 00 00 00'} (${s.parentNom || 'Parent'})</p>
        <p><strong>Médecin Traitant :</strong> ${s.medecinContact || 'Non renseigné'}</p>
        <p><strong>Assurance Santé / Mutuelle :</strong> ${s.nomAssurance || 'Aucune'}</p>
      </div>

      <div class="signature-section flex-between">
        <div>
          <p>Signature et Déclaration du Parent</p>
          <div class="sig-space"></div>
        </div>
        <div>
          <p>Visa du Service de Santé / Infirmerie</p>
          <div class="sig-space"></div>
        </div>
      </div>
    </div>
  `;
}

function generateFicheEngagementHtml(s: StudentDocData): string {
  const entete = resolveEnteteEtablissement({ className: s.classe });
  return `
    <div class="doc-container">
      <div class="header flex-between" style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${entete.logo || '/images/hinneh_logo_20260507_234919.png'}" style="width: 48px; height: 48px; object-fit: contain;" alt="Logo" onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" />
          <div>
            <h1 class="school-name">${entete.fullName}</h1>
            <p class="sub-text">FICHE D'ENGAGEMENT RESPECT DU RÈGLEMENT INTÉRIEUR</p>
          </div>
        </div>
        <div><strong>Date :</strong> ${s.dateInscription || new Date().toLocaleDateString('fr-FR')}</div>
      </div>
      <hr class="divider"/>

      <div class="body-text">
        <p>Je soussigné(e) <strong>${s.parentNom || "M./Mme le Tuteur Légale"}</strong>, tuteur légale de l'élève <strong>${s.nom.toUpperCase()} ${s.prenom}</strong> inscrit(e) en classe de <strong>${s.classe}</strong> (Matricule: <code>${s.matricule}</code>) déclare :</p>

        <ul>
          <li>Avoir pris connaissance du Règlement Intérieur de l'établissement ${entete.fullName}.</li>
          <li>M'engager à régler ponctuellement les frais de scolarité, transport et cantine au plus tard le 5 de chaque mois.</li>
          <li>Veiller à la ponctualité, à la tenue réglementaire et au travail assidu de mon enfant.</li>
          <li>Reconnaître que cette fiche d'engagement signée constitue la 3ème pièce obligatoire du dossier individuel de l'élève.</li>
        </ul>
      </div>

      <div class="signature-section flex-between" style="margin-top: 60px;">
        <div>
          <p><strong>Le Parent / Tuteur (Lu et Approuvé)</strong></p>
          <div class="sig-space"></div>
        </div>
        <div>
          <p><strong>L'Éducateur (Remise et Signature)</strong></p>
          <div class="sig-space"></div>
        </div>
        <div>
          <p><strong>L'Enseignant / Prof. Principal</strong></p>
          <div class="sig-space"></div>
        </div>
      </div>
    </div>
  `;
}

function generateDossierScolaireSyntheseHtml(d: any): string {
  const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const initials = `${(d.nom || 'L')[0] || ''}${(d.prenom || 'E')[0] || ''}`.toUpperCase();

  // Résolution dynamique de l'établissement et du logo selon l'utilisateur connecté ou l'élève
  const entete = resolveEnteteEtablissement({
    ecoleId: d.ecole_id,
    code: d.ecole_code,
    schoolName: d.ecole_nom,
    className: d.classe,
  });

  // Paiements rows
  const paiements = d.derniers_paiements || [];
  const paiementsHtml = paiements.length > 0 
    ? `
      <table class="report-table" style="margin-top: 6px; font-size: 10px;">
        <thead>
          <tr>
            <th width="20%">Date</th>
            <th width="22%">N° Reçu</th>
            <th width="25%">Type / Tranche</th>
            <th width="15%">Mode</th>
            <th width="18%" style="text-align: right;">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${paiements.map((p: any) => `
            <tr>
              <td>${p.date || '—'}</td>
              <td><code>${p.recu_numero || '—'}</code></td>
              <td>${p.type_paiement || 'Scolarité'}</td>
              <td>${p.mode || 'Espèces'}</td>
              <td style="text-align: right; font-weight: bold; color: #166534;">${formatCurrency(p.montant || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : `<p style="font-size: 10px; color: #64748b; font-style: italic; margin: 4px 0;">Aucun versement enregistré pour le moment.</p>`;

  // Notes & Moyennes rows
  const moyennes = d.moyennes || [];
  const notes = d.dernieres_notes || [];

  const moyennesHtml = moyennes.length > 0
    ? `
      <div style="display: flex; gap: 10px; margin-bottom: 8px;">
        ${moyennes.map((m: any) => `
          <div style="flex: 1; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px; text-align: center;">
            <div style="font-size: 8px; font-weight: bold; color: #475569; text-transform: uppercase;">${m.periode || 'Trimestre'}</div>
            <div style="font-size: 12px; font-weight: 900; color: #1e3a8a; margin: 2px 0;">${Number(m.moyenne_generale || 0).toFixed(2)} / 20</div>
            <div style="font-size: 8px; color: #64748b;">${m.rang ? `Rang : ${m.rang}e` : 'Non classé'}</div>
          </div>
        `).join('')}
      </div>
    `
    : '';

  const notesHtml = notes.length > 0
    ? `
      <table class="report-table" style="margin-top: 4px; font-size: 10px;">
        <thead>
          <tr>
            <th width="35%">Matière</th>
            <th width="25%">Type d'évaluation</th>
            <th width="15%">Date</th>
            <th width="10%" style="text-align: center;">Coeff.</th>
            <th width="15%" style="text-align: right;">Note / 20</th>
          </tr>
        </thead>
        <tbody>
          ${notes.slice(0, 8).map((n: any) => `
            <tr>
              <td><strong>${n.matiere || '—'}</strong></td>
              <td>${n.type_eval || 'Devoir'}</td>
              <td>${n.date || '—'}</td>
              <td style="text-align: center;">${n.coefficient || 1}</td>
              <td style="text-align: right; font-weight: bold; color: ${(n.note || 0) >= 10 ? '#166534' : '#dc2626'};">${Number(n.note || 0).toFixed(2)} / 20</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : `<p style="font-size: 10px; color: #64748b; font-style: italic; margin: 4px 0;">Aucune note enregistrée récemment.</p>`;

  const totalAbs = (Number(d.absences_total_justifiees) || 0) + (Number(d.absences_total_non_justifiees) || 0);

  return `
    <div class="doc-container">
      <!-- EN-TÊTE OFFICIEL -->
      <div class="header flex-between" style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px;">
        <div style="text-align: left; width: 38%;">
          <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #1e293b; letter-spacing: 0.5px;">RÉPUBLIQUE DE CÔTE D'IVOIRE</div>
          <div style="font-size: 8px; color: #64748b; font-style: italic;">Union - Discipline - Travail</div>
          <div style="font-size: 8.5px; font-weight: 700; color: #334155; margin-top: 2px;">MINISTÈRE DE L'ÉDUCATION NATIONALE ET DE L'ALPHABÉTISATION</div>
        </div>
        <div style="text-align: center; width: 24%;">
          <img 
            src="${entete.logo || '/images/hinneh_logo_20260507_234919.png'}" 
            alt="Logo HÎNNEH" 
            style="width: 52px; height: 52px; object-fit: contain; margin: 0 auto; display: block;" 
            onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" 
          />
          <div style="font-size: 8px; font-weight: 800; color: #0369a1; margin-top: 2px; letter-spacing: 0.5px;">HÎNNEH ÉDUCATION</div>
        </div>
        <div style="text-align: right; width: 38%;">
          <div style="font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${entete.fullName || d.ecole_nom || 'GROUPE SCOLAIRE HÎNNEH'}</div>
          <div style="font-size: 9px; color: #475569;">Code Établissement : <strong>${entete.code || d.ecole_code || 'FHA-01'}</strong></div>
          ${entete.phoneLine ? `<div style="font-size: 8.5px; color: #475569;">Tél : <strong>${entete.phoneLine}</strong></div>` : ''}
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Date d'édition : <strong>${todayStr}</strong></div>
        </div>
      </div>

      <!-- BANDEAU TITRE -->
      <div style="text-align: center; background: #0f172a; color: #ffffff; padding: 6px 10px; border-radius: 6px; margin-bottom: 10px;">
        <h1 style="margin: 0; font-size: 13px; font-weight: 900; letter-spacing: 0.8px; text-transform: uppercase;">DOSSIER SCOLAIRE INDIVIDUEL DE L'ÉLÈVE</h1>
        <div style="font-size: 8.5px; font-weight: 600; opacity: 0.9; margin-top: 2px;">ANNÉE SCOLAIRE 2026-2027 • SYNTHÈSE ADMINISTRATIVE, FINANCIÈRE & PÉDAGOGIQUE</div>
      </div>

      <!-- SECTION 1 & 2 : IDENTITÉ & TUTEUR -->
      <div class="info-grid" style="margin-bottom: 10px;">
        <div class="info-card">
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <div style="width: 60px; height: 70px; border: 1.5px dashed #94a3b8; border-radius: 6px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 11px; color: #475569; font-weight: 800; flex-shrink: 0; overflow: hidden;">
              ${d.photo_url ? `<img src="${d.photo_url}" style="width: 100%; height: 100%; object-fit: cover;"/>` : `${initials}`}
            </div>
            <div style="flex: 1;">
              <h3 style="margin: 0 0 4px 0; font-size: 9.5px; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">1. ÉTAT CIVIL & SCOLARITÉ</h3>
              <p style="margin: 2px 0;"><strong>Matricule :</strong> <code>${d.matricule}</code></p>
              <p style="margin: 2px 0;"><strong>Nom & Prénoms :</strong> <strong>${(d.nom || '').toUpperCase()} ${d.prenom || ''}</strong></p>
              <p style="margin: 2px 0;"><strong>Sexe :</strong> ${d.genre === 'F' ? 'Féminin' : 'Masculin'}</p>
              <p style="margin: 2px 0;"><strong>Né(e) le :</strong> ${d.date_naissance || 'Non renseignée'} ${d.lieu_naissance ? `à ${d.lieu_naissance}` : ''}</p>
              <p style="margin: 2px 0;"><strong>Classe :</strong> <strong class="highlight">${d.classe}</strong> (Niveau: ${d.niveau || '—'})</p>
            </div>
          </div>
        </div>

        <div class="info-card">
          <h3 style="margin: 0 0 4px 0; font-size: 9.5px; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">2. PARENT / TUTEUR LÉGAL</h3>
          <p style="margin: 2px 0;"><strong>Nom du Tuteur :</strong> <strong>${d.nom_tuteur || 'Non renseigné'}</strong></p>
          <p style="margin: 2px 0;"><strong>Contact Téléphonique :</strong> <strong class="font-mono">${d.telephone_tuteur || d.telephone || 'Non renseigné'}</strong></p>
          <p style="margin: 2px 0;"><strong>E-mail :</strong> ${d.email || 'Non renseigné'}</p>
          <p style="margin: 2px 0;"><strong>Adresse Géographique :</strong> ${d.adresse || 'Non renseignée'}</p>
          <p style="margin: 2px 0;"><strong>Établissement :</strong> ${d.ecole_nom || 'GROUPE SCOLAIRE HÎNNEH'}</p>
        </div>
      </div>

      <!-- SECTION 3 : SITUATION FINANCIÈRE -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px;">
        <h3 style="margin: 0 0 6px 0; font-size: 9.5px; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">3. SITUATION FINANCIÈRE & RECOUVREMENT</h3>
        
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 6px;">
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 5px; text-align: center;">
            <div style="font-size: 7.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Scolarité Due</div>
            <div style="font-size: 11px; font-weight: 900; color: #0f172a; margin-top: 1px;">${formatCurrency(d.scolarite_due || 0)}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid #bbf7d0; border-radius: 4px; padding: 5px; text-align: center;">
            <div style="font-size: 7.5px; font-weight: 700; color: #166534; text-transform: uppercase;">Total Versé</div>
            <div style="font-size: 11px; font-weight: 900; color: #15803d; margin-top: 1px;">${formatCurrency(d.total_verse || 0)}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid ${d.solde_reste > 0 ? '#fecaca' : '#bbf7d0'}; border-radius: 4px; padding: 5px; text-align: center;">
            <div style="font-size: 7.5px; font-weight: 700; color: ${d.solde_reste > 0 ? '#991b1b' : '#166534'}; text-transform: uppercase;">Reste à Payer</div>
            <div style="font-size: 11px; font-weight: 900; color: ${d.solde_reste > 0 ? '#dc2626' : '#15803d'}; margin-top: 1px;">${formatCurrency(d.solde_reste || 0)}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 5px; text-align: center;">
            <div style="font-size: 7.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Taux Recouvrement</div>
            <div style="font-size: 11px; font-weight: 900; color: #0284c7; margin-top: 1px;">${(Number(d.taux_recouvrement_pct) || 0).toFixed(1)}%</div>
          </div>
        </div>

        ${paiementsHtml}
      </div>

      <!-- SECTION 4 : RÉSULTATS PÉDAGOGIQUES -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px;">
        <h3 style="margin: 0 0 6px 0; font-size: 9.5px; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">4. RÉSULTATS PÉDAGOGIQUES & ÉVALUATIONS</h3>
        ${moyennesHtml}
        ${notesHtml}
      </div>

      <!-- SECTION 5 : ASSIDUITÉ & DISCIPLINE -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px;">
        <h3 style="margin: 0 0 4px 0; font-size: 9.5px; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">5. ASSIDUITÉ & DISCIPLINE</h3>
        <div style="display: flex; gap: 20px; font-size: 9.5px; margin-top: 3px;">
          <div>Total Absences cumulées : <strong>${totalAbs} heure(s)</strong></div>
          <div style="color: #15803d;">Justifiées : <strong>${d.absences_total_justifiees || 0} h</strong></div>
          <div style="color: #dc2626;">Non justifiées : <strong>${d.absences_total_non_justifiees || 0} h</strong></div>
        </div>
      </div>

      <!-- SIGNATURES OFFICIELLES -->
      <div class="signature-section flex-between" style="margin-top: 10px; border-top: 1px solid #cbd5e1; padding-top: 6px;">
        <div style="text-align: center; width: 30%;">
          <p style="margin: 0; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">Le Parent / Tuteur</p>
          <p style="margin: 2px 0 0 0; font-size: 7.5px; color: #64748b;">(Lu et Approuvé)</p>
          <div style="height: 35px;"></div>
        </div>
        <div style="text-align: center; width: 30%;">
          <p style="margin: 0; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">L'Éducateur / Caisse</p>
          <p style="margin: 2px 0 0 0; font-size: 7.5px; color: #64748b;">(Visa & Contrôle)</p>
          <div style="height: 35px;"></div>
        </div>
        <div style="text-align: center; width: 30%;">
          <p style="margin: 0; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">Le Chef d'Établissement</p>
          <p style="margin: 2px 0 0 0; font-size: 7.5px; color: #64748b;">(Signature et Cachet Officiel)</p>
          <div style="height: 35px;"></div>
        </div>
      </div>
    </div>
  `;
}

// ----------------- GENERIC PRINT WINDOW METHOD -----------------
function printDocumentHtml(innerHtml: string, title: string) {
  const printWin = window.open('', '_blank', 'width=900,height=1000');
  if (!printWin) {
    alert("Veuillez autoriser les fenêtres surgissantes (pop-ups) pour imprimer les documents scolaires.");
    return;
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm 15mm; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 12px; line-height: 1.5; }
        .doc-container { padding: 10px; box-sizing: border-box; min-height: 95vh; display: flex; flex-direction: column; justify-content: space-between; }
        .page-break { page-break-after: always; }
        .flex-between { display: flex; justify-content: space-between; align-items: flex-start; }
        .school-name { font-size: 18px; font-weight: 900; color: #0f172a; margin: 0; }
        .sub-text { font-size: 11px; font-weight: 800; color: #475569; margin: 2px 0 0 0; letter-spacing: 0.5px; }
        .photo-box { width: 90px; height: 110px; border: 2px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8; text-align: center; font-weight: bold; }
        .badge-medical { background: #ffe4e6; color: #9f1239; font-weight: 900; padding: 6px 12px; border-radius: 6px; font-size: 11px; border: 1px solid #fda4af; }
        .badge-blood { background: #be123c; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
        .divider { border: none; border-top: 2px solid #0f172a; margin: 12px 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
        .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
        .info-card h3 { margin: 0 0 8px 0; font-size: 11px; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        .info-card p { margin: 4px 0; font-size: 11px; }
        code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: bold; }
        .highlight { color: #4338ca; font-weight: 900; }
        .badge-tag { background: #fef3c7; color: #92400e; font-weight: 800; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        .report-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .report-table th { background: #0f172a; color: white; padding: 8px; font-size: 10px; text-transform: uppercase; text-align: left; }
        .report-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
        .grid-cell { height: 24px; border: 1px solid #cbd5e1; background: #fafafa; }
        .signature-section { margin-top: 30px; }
        .sig-space { height: 50px; }
        .footer-sig { margin-top: 40px; font-weight: bold; font-size: 11px; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-mono { font-family: monospace; }
        .meta-banner { background: #eeef2; border-left: 4px solid #4338ca; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; }
        .meta-banner h2 { margin: 0; font-size: 14px; }
      </style>
    </head>
    </body>
    </html>
  `;

  printWin.document.open();
  printWin.document.write(fullHtml);
  printWin.document.close();
}

export interface ReductionAttestationData {
  studentName: string;
  matricule?: string;
  className?: string;
  dateNaissance?: string;
  parentName?: string;
  parentPhone?: string;
  typeReductionLabel: string;
  tauxReduction?: number;
  montantReduction?: number;
  motif?: string;
  dateEffet?: string;
  approuvePar?: string;
  totalInitial?: number;
  totalAjuste?: number;
  tranches?: Array<{
    libelle: string;
    date_echeance?: string;
    montant_initial?: number;
    reduction_appliquee?: number;
    nouveau_montant_prevu?: number;
  }>;
}

/**
 * Imprime l'Attestation Officielle d'Accord de Réduction Tarifaire & Reconfiguration d'Échéancier
 */
export function printAttestationReduction(data: ReductionAttestationData) {
  const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const entete = resolveEnteteEtablissement({ className: data.className });

  const rowsTranches = (data.tranches || []).map((t, idx) => `
    <tr>
      <td class="text-center">${idx + 1}</td>
      <td><strong>${t.libelle}</strong></td>
      <td class="text-center font-mono">${t.date_echeance || '—'}</td>
      <td class="text-right font-mono">${formatCurrency(t.montant_initial || 0)}</td>
      <td class="text-right font-mono" style="color: #059669; font-weight: bold;">-${formatCurrency(t.reduction_appliquee || 0)}</td>
      <td class="text-right font-mono" style="color: #4338ca; font-weight: bold;">${formatCurrency(t.nouveau_montant_prevu || 0)}</td>
    </tr>
  `).join('');

  const html = `
    <div class="doc-container">
      <div>
        <div class="header flex-between" style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${entete.logoUrl ? `<img src="${entete.logoUrl}" style="height: 55px; width: auto; object-fit: contain;" />` : ''}
            <div>
              <h1 class="school-name">${entete.nom}</h1>
              <p class="sub-text">${entete.sousTitre}</p>
              <p style="font-size: 10px; color: #64748b; margin: 0;">${entete.contacts} ${entete.ville ? `• ${entete.ville}` : ''}</p>
            </div>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 11px; margin: 0; font-weight: 800; color: #1e3a8a;">RÉPUBLIQUE DE CÔTE D'IVOIRE</p>
            <p style="font-size: 9px; color: #64748b; margin: 0;">Union - Discipline - Travail</p>
            <p style="font-size: 10px; margin-top: 4px; font-weight: 600;">Année Scolaire 2025-2026</p>
          </div>
        </div>

        <div style="text-align: center; margin: 15px 0 20px 0;">
          <h2 style="font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #1e3a8a; margin: 0; padding: 6px 14px; background: #e0e7ff; display: inline-block; border-radius: 6px; border: 1px solid #c7d2fe;">
            ⭐ ATTESTATION OFFICIELLE D'ACCORD DE RÉDUCTION TARIFAIRE
          </h2>
          <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">Décision administrative d'ajustement des frais de scolarité</p>
        </div>

        <div class="info-grid" style="margin-bottom: 15px;">
          <div class="info-card">
            <h3>👤 IDENTIFICATION DE L'ÉLÈVE BÉNÉFICIAIRE</h3>
            <p><strong>Nom & Prénoms :</strong> <span class="highlight">${data.studentName}</span></p>
            <p><strong>Matricule :</strong> <code>${data.matricule || 'N/C'}</code></p>
            <p><strong>Classe :</strong> <strong>${data.className || 'Non assignée'}</strong></p>
            ${data.dateNaissance ? `<p><strong>Date de naissance :</strong> ${data.dateNaissance}</p>` : ''}
          </div>

          <div class="info-card">
            <h3>👨‍👩‍👧‍👦 PARENT / RÉFÉRENT & STATUT</h3>
            <p><strong>Nom du Parent / Tuteur :</strong> ${data.parentName || 'Parent d\'élève'}</p>
            <p><strong>Contact WhatsApp / Téléphone :</strong> <span class="font-mono font-bold">${data.parentPhone || 'N/C'}</span></p>
            <p><strong>Approuvé par :</strong> <em>${data.approuvePar || 'Directeur des Études / Direction'}</em></p>
            <p><strong>Date d'effet :</strong> ${data.dateEffet || todayStr}</p>
          </div>
        </div>

        <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
            <div>
              <p style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin: 0;">Dispositif de Réduction</p>
              <h4 style="font-size: 14px; font-weight: 900; color: #1e3a8a; margin: 2px 0 0 0;">
                ${data.typeReductionLabel}
              </h4>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 18px; font-weight: 900; color: #059669; font-family: monospace; background: #ecfdf5; padding: 4px 10px; border-radius: 6px; border: 1px solid #a7f3d0;">
                ${data.tauxReduction ? `-${data.tauxReduction}%` : `-${formatCurrency(data.montantReduction || 0)}`}
              </span>
            </div>
          </div>
          <p style="font-size: 11px; margin: 4px 0 0 0;"><strong>Motif officiel / Justification :</strong> <em>${data.motif || 'Réduction accordée conformément aux règlements de l\'établissement.'}</em></p>
        </div>

        ${data.tranches && data.tranches.length > 0 ? `
          <h4 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; margin: 10px 0 5px 0;">
            📊 RECONFIGURATION DE L'ÉCHÉANCIER DE PAIEMENT
          </h4>
          <table class="report-table" style="margin-top: 0;">
            <thead>
              <tr>
                <th class="text-center" style="width: 30px;">#</th>
                <th>Tranche</th>
                <th class="text-center">Date Limite</th>
                <th class="text-right">Montant Initial</th>
                <th class="text-right" style="color: #6ee7b7;">Déduction</th>
                <th class="text-right" style="color: #a5b4fc;">Nouveau Montant Net</th>
              </tr>
            </thead>
            <tbody>
              ${rowsTranches}
            </tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #0f172a;">
                <td colspan="3" class="text-right" style="padding: 8px;">TOTAL SCOLARITÉ RÉVISÉE</td>
                <td class="text-right font-mono" style="padding: 8px;">${formatCurrency(data.totalInitial || 0)}</td>
                <td class="text-right font-mono" style="padding: 8px; color: #059669;">-${formatCurrency((data.totalInitial || 0) - (data.totalAjuste || 0))}</td>
                <td class="text-right font-mono" style="padding: 8px; color: #4338ca; font-size: 13px;">${formatCurrency(data.totalAjuste || 0)}</td>
              </tr>
            </tfoot>
          </table>
        ` : ''}
      </div>

      <div class="signature-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 25px;">
        <div style="border: 1px dashed #94a3b8; border-radius: 8px; padding: 10px; text-align: center;">
          <p style="font-weight: bold; font-size: 11px; margin: 0 0 45px 0;">Signature & Engagement du Parent / Tuteur</p>
          <p style="font-size: 10px; color: #94a3b8; margin: 0;">(Précédé de la mention "Lu et approuvé")</p>
        </div>
        <div style="border: 1px dashed #94a3b8; border-radius: 8px; padding: 10px; text-align: center;">
          <p style="font-weight: bold; font-size: 11px; margin: 0 0 45px 0;">Le Directeur des Études / La Direction</p>
          <p style="font-size: 10px; color: #94a3b8; margin: 0;">(Signature et Cachet Officiel)</p>
        </div>
      </div>
    </div>
  `;

  printDocumentHtml(html, `Attestation_Reduction_${data.matricule || 'Eleve'}`);
}

/**
 * Interface des données pour l'impression du Livret Scolaire & Certificat de Radiation
 */
export interface CertificatRadiationData {
  eleveId?: number | string;
  matricule: string;
  nom: string;
  prenom: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  genre?: string;
  classe: string;
  cycle?: string;
  niveau?: string;
  ecoleNom?: string;
  ecoleCode?: string;
  ecoleId?: number | string;
  dateRadiation: string;
  motifRadiation: string;
  etablissementAccueil?: string;
  observations?: string;
  quitusFinancier?: boolean;
  tuteurNom?: string;
  tuteurContact?: string;
  tuteurAdresse?: string;
  anneeScolaire?: string;

  // Données du Livret Scolaire (moyennes, notes, sanctions)
  moyennes?: Array<{
    periode: string;
    moyenne_generale: number;
    rang?: number;
    appreciation?: string;
  }>;
  moyennesMatieres?: Array<{
    matiere: string;
    moyenne: number;
    coefficient: number;
    appreciation?: string;
    rang?: number;
  }>;
  dernieresNotes?: Array<{
    matiere: string;
    note: number;
    coefficient?: number;
    date?: string;
    type_eval?: string;
  }>;
  moyenneAnnuelle?: number;
  rangAnnuel?: number;
  effectifClasse?: number;
  decisionConseil?: string;

  // Assiduité & Discipline
  absencesTotal?: number;
  absencesJustifiees?: number;
  absencesNonJustifiees?: number;
  retardsTotal?: number;
  sanctionsDisciplinaires?: string[];
  conduiteAppreciation?: string;
}

/**
 * Génère le code HTML complet du Livret Scolaire et Certificat Officiel de Radiation
 */
export function generateCertificatRadiationHtml(data: CertificatRadiationData): string {
  const todayStr = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const entete = resolveEnteteEtablissement({
    ecoleId: data.ecoleId,
    code: data.ecoleCode,
    schoolName: data.ecoleNom,
    className: data.classe,
  });

  const nomUpper = (data.nom || '').trim().toUpperCase();
  const prenomVal = (data.prenom || '').trim();
  const nomComplet = `${nomUpper} ${prenomVal}`.trim();
  const anneeScolaire = data.anneeScolaire || '2026-2027';

  // Moyennes par trimestre
  const moyennes = data.moyennes || [];
  const moyennesHtml = moyennes.length > 0
    ? `
      <div style="display: flex; gap: 8px; margin: 8px 0;">
        ${moyennes.map((m: any) => `
          <div style="flex: 1; background: #ffffff; border: 1px solid #cbd5e1; border-top: 3px solid #1e3a8a; border-radius: 4px; padding: 6px 8px; text-align: center;">
            <div style="font-size: 8px; font-weight: 800; color: #475569; text-transform: uppercase;">${m.periode || 'Période'}</div>
            <div style="font-size: 13px; font-weight: 900; color: #1e3a8a; margin: 2px 0;">${Number(m.moyenne_generale || 0).toFixed(2)} / 20</div>
            <div style="font-size: 8px; color: #64748b;">
              ${m.rang ? `Rang : <strong>${m.rang}e</strong>` : ''} 
              ${m.appreciation ? `<span style="display: block; color: #0284c7; font-weight: 600;">${m.appreciation}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `
    : `
      <div style="display: flex; gap: 8px; margin: 8px 0;">
        <div style="flex: 1; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 6px; text-align: center;">
          <div style="font-size: 8px; font-weight: bold; color: #64748b;">TRIMESTRE 1</div>
          <div style="font-size: 11px; font-weight: bold; color: #0f172a; margin: 2px 0;">${data.moyenneAnnuelle ? `${Number(data.moyenneAnnuelle).toFixed(2)} / 20` : 'En cours'}</div>
          <div style="font-size: 7.5px; color: #64748b;">Évalué</div>
        </div>
        <div style="flex: 1; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 6px; text-align: center;">
          <div style="font-size: 8px; font-weight: bold; color: #64748b;">TRIMESTRE 2</div>
          <div style="font-size: 11px; font-weight: bold; color: #0f172a; margin: 2px 0;">${data.moyenneAnnuelle ? `${Number(data.moyenneAnnuelle).toFixed(2)} / 20` : 'En cours'}</div>
          <div style="font-size: 7.5px; color: #64748b;">Évalué</div>
        </div>
        <div style="flex: 1; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 4px; padding: 6px; text-align: center;">
          <div style="font-size: 8px; font-weight: bold; color: #64748b;">TRIMESTRE 3</div>
          <div style="font-size: 11px; font-weight: bold; color: #0f172a; margin: 2px 0;">${data.moyenneAnnuelle ? `${Number(data.moyenneAnnuelle).toFixed(2)} / 20` : 'En cours'}</div>
          <div style="font-size: 7.5px; color: #64748b;">Évalué</div>
        </div>
      </div>
    `;

  // Moyennes par matière
  const matieresList = data.moyennesMatieres && data.moyennesMatieres.length > 0
    ? data.moyennesMatieres
    : [
        { matiere: 'Français (Expression écrite / Lecture)', moyenne: data.moyenneAnnuelle || 12.5, coefficient: 3, appreciation: 'Assez Bien' },
        { matiere: 'Mathématiques', moyenne: data.moyenneAnnuelle || 11.0, coefficient: 3, appreciation: 'Passable' },
        { matiere: 'Anglais', moyenne: data.moyenneAnnuelle || 13.0, coefficient: 2, appreciation: 'Assez Bien' },
        { matiere: 'Histoire - Géographie', moyenne: data.moyenneAnnuelle || 12.0, coefficient: 2, appreciation: 'Assez Bien' },
        { matiere: 'Sciences de la Vie et de la Terre (SVT)', moyenne: data.moyenneAnnuelle || 11.5, coefficient: 2, appreciation: 'Passable' },
        { matiere: 'Physique - Chimie', moyenne: data.moyenneAnnuelle || 10.5, coefficient: 2, appreciation: 'Passable' },
        { matiere: 'Éducation Physique et Sportive (EPS)', moyenne: 14.5, coefficient: 1, appreciation: 'Bien' },
        { matiere: 'Conduite & Discipline', moyenne: 15.0, coefficient: 1, appreciation: 'Bonne conduite' },
      ];

  const matieresRowsHtml = matieresList.map((m: any, idx: number) => {
    const noteVal = Number(m.moyenne || 0);
    const noteColor = noteVal >= 10 ? '#15803d' : '#b91c1c';
    const noteBg = noteVal >= 10 ? '#f0fdf4' : '#fef2f2';
    return `
      <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 4px 6px; font-weight: 700; color: #1e293b;">${m.matiere}</td>
        <td style="padding: 4px 6px; text-align: center; color: #475569;">${m.coefficient || 1}</td>
        <td style="padding: 4px 6px; text-align: right; font-weight: 800; color: ${noteColor}; background: ${noteBg};">
          ${noteVal.toFixed(2)} / 20
        </td>
        <td style="padding: 4px 6px; font-size: 8px; color: #334155; font-style: italic;">
          ${m.appreciation || (noteVal >= 14 ? 'Bien' : noteVal >= 10 ? 'Passable' : 'Insuffisant')}
        </td>
      </tr>
    `;
  }).join('');

  // Sanctions disciplinaires
  const sanctions = data.sanctionsDisciplinaires || [];
  const sanctionsListHtml = sanctions.length > 0 && sanctions[0] !== 'Aucune sanction'
    ? sanctions.map((s: string) => `
        <div style="display: flex; align-items: center; gap: 6px; margin: 2px 0; font-size: 8.5px; color: #b91c1c;">
          <span style="display: inline-block; width: 6px; height: 6px; background: #dc2626; border-radius: 50%;"></span>
          <strong>${s}</strong>
        </div>
      `).join('')
    : `
      <div style="font-size: 8.5px; color: #15803d; font-weight: 600; display: flex; align-items: center; gap: 6px;">
        <span style="color: #16a34a; font-size: 11px;">✓</span>
        Aucune sanction disciplinaire enregistrée — Conduite et assiduité irréprochables
      </div>
    `;

  // Assiduité
  const absTotal = Number(data.absencesTotal ?? 0);
  const absJust = Number(data.absencesJustifiees ?? 0);
  const absNonJust = Number(data.absencesNonJustifiees ?? absTotal);
  const retards = Number(data.retardsTotal ?? 0);

  return `
    <div class="doc-container" style="max-width: 820px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 15px; box-sizing: border-box; line-height: 1.35; font-size: 9.5px;">
      
      <!-- EN-TÊTE OFFICIEL DE LA RÉPUBLIQUE & ÉTABLISSEMENT -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
        <tr>
          <td style="width: 35%; vertical-align: top; text-align: left; font-size: 8.5px; line-height: 1.25; color: #1e293b;">
            <strong style="font-size: 9.5px; text-transform: uppercase;">RÉPUBLIQUE DE CÔTE D'IVOIRE</strong><br/>
            <em>Union – Discipline – Travail</em><br/>
            ------------------------------------<br/>
            MINISTÈRE DE L'ÉDUCATION NATIONALE<br/>
            ET DE L'ALPHABÉTISATION<br/>
            <strong>DRENA : ${entete.city ? `DRENA ${entete.city.toUpperCase()}` : 'DRENA ABIDJAN 4'}</strong>
          </td>
          <td style="width: 30%; vertical-align: top; text-align: center;">
            <img 
              src="${entete.logo || '/images/hinneh_logo_20260507_234919.png'}" 
              alt="Logo" 
              style="height: 52px; max-width: 120px; object-fit: contain; margin-bottom: 2px;"
              onerror="this.onerror=null; this.src='/images/hinneh_logo_20260507_234919.png';" 
            />
            <div style="font-weight: 900; font-size: 12px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
              ${entete.fullName || data.ecoleNom || 'GROUPE SCOLAIRE HÎNNEH'}
            </div>
            <div style="font-size: 8px; color: #475569; font-weight: 600;">SERVICE DE LA SCOLARITÉ & VIE SCOLAIRE</div>
          </td>
          <td style="width: 35%; vertical-align: top; text-align: right; font-size: 8.5px; line-height: 1.3; color: #334155;">
            <strong>Année Scolaire :</strong> ${anneeScolaire}<br/>
            <strong>Code Établissement :</strong> ${entete.code || data.ecoleCode || 'ETAB-HINNEH'}<br/>
            <strong>Ville :</strong> ${(entete.city || 'ABIDJAN').toUpperCase()}<br/>
            <strong>Date d'émission :</strong> ${todayStr}
          </td>
        </tr>
      </table>

      <hr style="border: none; border-top: 2px solid #0f172a; margin: 4px 0 8px 0;" />

      <!-- TITRE OFFICIEL DU DOCUMENT -->
      <div style="text-align: center; background: #0f172a; color: #ffffff; padding: 6px 12px; border-radius: 4px; margin-bottom: 8px;">
        <h1 style="margin: 0; font-size: 13px; font-weight: 900; letter-spacing: 0.8px; text-transform: uppercase;">
          LIVRET SCOLAIRE & CERTIFICAT OFFICIEL DE RADIATION
        </h1>
        <div style="font-size: 8.5px; font-weight: 600; opacity: 0.9; margin-top: 2px;">
          ATTESTATION OFFICIELLE DE SORTIE DÉFINITIVE & SYNTHÈSE ACADÉMIQUE / DISCIPLINAIRE
        </div>
      </div>

      <!-- CARTOUCHE DE RADIATION OFFICIELLE (AVEC MOTIF EN ÉVIDENCE) -->
      <div style="background: #fff; border: 1.5px solid #dc2626; border-left: 6px solid #b91c1c; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #fca5a5; padding-bottom: 4px; margin-bottom: 4px;">
          <div style="font-weight: 900; color: #991b1b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
            DÉCISION OFFICIELLE DE RADIATION SCOLAIRE
          </div>
          <div style="font-size: 8.5px; color: #475569;">
            Date effective de radiation : <strong style="color: #0f172a;">${data.dateRadiation || todayStr}</strong>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 9px;">
          <div>
            <strong>MOTIF DU RETRAIT :</strong>
            <span style="display: inline-block; background: #fef2f2; color: #b91c1c; font-weight: 800; padding: 2px 6px; border-radius: 3px; border: 1px solid #fecdd3; margin-left: 4px;">
              ${data.motifRadiation}
            </span>
          </div>
          <div>
            <strong>ÉTABLISSEMENT D'ACCUEIL :</strong>
            <span style="color: #0f172a; font-weight: 700;">${data.etablissementAccueil || 'Non communiqué à ce jour'}</span>
          </div>
          ${data.observations ? `
            <div style="grid-column: span 2; color: #475569; font-size: 8.5px; border-top: 1px solid #f1f5f9; padding-top: 3px;">
              <strong>Observations & Références :</strong> <em>${data.observations}</em>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- SECTION 1 : ÉTAT CIVIL & IDENTITÉ SCOLAIRE DE L'ÉLÈVE -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px;">
        <div style="font-size: 9.5px; font-weight: 800; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 4px;">
          1. ÉTAT CIVIL & IDENTITÉ SCOLAIRE
        </div>
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px; font-size: 9px;">
          <div>
            <p style="margin: 2px 0;"><strong>Nom & Prénoms :</strong> <strong style="font-size: 11px; text-transform: uppercase; color: #0f172a;">${nomComplet}</strong></p>
            <p style="margin: 2px 0;"><strong>Matricule Scolaire :</strong> <code style="background: #e2e8f0; padding: 1px 5px; border-radius: 3px; font-family: monospace; font-weight: bold; color: #0284c7;">${data.matricule}</code></p>
            <p style="margin: 2px 0;"><strong>Date & Lieu de Naissance :</strong> ${data.dateNaissance || '—'}${data.lieuNaissance ? ` à ${data.lieuNaissance}` : ''} | <strong>Sexe :</strong> ${data.genre === 'F' ? 'Féminin' : 'Masculin'}</p>
          </div>
          <div>
            <p style="margin: 2px 0;"><strong>Classe Fréquentée :</strong> <strong style="color: #4338ca; font-weight: 800;">${data.classe}</strong></p>
            <p style="margin: 2px 0;"><strong>Niveau / Cycle :</strong> ${data.niveau || data.cycle || 'Secondaire'}</p>
            <p style="margin: 2px 0;"><strong>Tuteur Légal :</strong> ${data.tuteurNom || 'Non renseigné'} ${data.tuteurContact ? `(${data.tuteurContact})` : ''}</p>
          </div>
        </div>
      </div>

      <!-- SECTION 2 & 3 : LIVRET SCOLAIRE — MOYENNES & NOTES DU CURSUS -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 4px;">
          <div style="font-size: 9.5px; font-weight: 800; color: #1e3a8a;">
            2. LIVRET SCOLAIRE — SYNTHÈSE DES MOYENNES GÉNÉRALES
          </div>
          <div style="font-size: 8.5px; font-weight: 700; color: #0f172a;">
            ${data.moyenneAnnuelle ? `Moyenne Annuelle : <strong style="color: #1e3a8a; font-size: 10px;">${Number(data.moyenneAnnuelle).toFixed(2)} / 20</strong>` : ''}
          </div>
        </div>

        ${moyennesHtml}

        <!-- Tableau des Matières -->
        <div style="margin-top: 6px;">
          <div style="font-size: 8.5px; font-weight: 800; color: #334155; margin-bottom: 2px; text-transform: uppercase;">
            Relevé des Moyennes par Matière au Moment du Retrait :
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; font-size: 8.5px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff;">
                <th style="padding: 4px 6px; text-align: left;">Matière / Discipline</th>
                <th style="padding: 4px 6px; text-align: center; width: 60px;">Coeff.</th>
                <th style="padding: 4px 6px; text-align: right; width: 90px;">Moyenne / 20</th>
                <th style="padding: 4px 6px; text-align: left; width: 150px;">Appréciation Pédagogique</th>
              </tr>
            </thead>
            <tbody>
              ${matieresRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION 4 & 5 : VIE SCOLAIRE, ASSIDUITÉ & SANCTIONS DISCIPLINAIRES -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px;">
        <div style="font-size: 9.5px; font-weight: 800; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 4px;">
          3. VIE SCOLAIRE, ASSIDUITÉ & SANCTIONS DISCIPLINAIRES
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 8.5px;">
          
          <!-- Assiduité -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px;">
            <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">
              ÉTAT DES ABSENCES & RETARDS
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
              <div>Absences cumulées : <strong>${absTotal} heure(s)</strong></div>
              <div>Retards enregistrés : <strong>${retards}</strong></div>
              <div style="color: #15803d;">Justifiées : <strong>${absJust} h</strong></div>
              <div style="color: ${absNonJust > 0 ? '#b91c1c' : '#475569'};">Non justifiées : <strong>${absNonJust} h</strong></div>
            </div>
          </div>

          <!-- Sanctions disciplinaires -->
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px;">
            <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px;">
              SANCTIONS DISCIPLINAIRES & CONDUITE
            </div>
            ${sanctionsListHtml}
          </div>
        </div>
      </div>

      <!-- SECTION 6 : MENTION DE QUITUS ADMINISTRATIF & MATÉRIEL -->
      <div style="background: #f1f5f9; border: 1px dashed #94a3b8; border-radius: 4px; padding: 5px 8px; font-size: 8px; color: #334155; margin-bottom: 8px;">
        <strong>Quitus Administratif & Matériel :</strong> Il est certifié que l'élève a restitué l'ensemble des manuels scolaires et équipements appartenant à l'établissement, et est en règle vis-à-vis des obligations administratives à la date de sa radiation.
      </div>

      <!-- SECTION 7 : QUADRUPLE VISA & SIGNATURES OFFICIELLES -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-top: 10px; page-break-inside: avoid;">
        <div style="border: 1px dashed #cbd5e1; border-radius: 4px; padding: 5px; text-align: center; min-height: 60px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-weight: 800; font-size: 8px; color: #0f172a; text-transform: uppercase;">Le Parent / Tuteur</div>
          <div style="font-size: 7px; color: #64748b;">(Accusé de réception du livret)</div>
          <div style="height: 25px;"></div>
        </div>
        <div style="border: 1px dashed #cbd5e1; border-radius: 4px; padding: 5px; text-align: center; min-height: 60px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-weight: 800; font-size: 8px; color: #0f172a; text-transform: uppercase;">Le Professeur Principal</div>
          <div style="font-size: 7px; color: #64748b;">(Visa Pédagogique)</div>
          <div style="height: 25px;"></div>
        </div>
        <div style="border: 1px dashed #cbd5e1; border-radius: 4px; padding: 5px; text-align: center; min-height: 60px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-weight: 800; font-size: 8px; color: #0f172a; text-transform: uppercase;">La Vie Scolaire</div>
          <div style="font-size: 7px; color: #64748b;">(Visa Disciplinaire)</div>
          <div style="height: 25px;"></div>
        </div>
        <div style="border: 1.5px solid #0f172a; border-radius: 4px; padding: 5px; text-align: center; min-height: 60px; display: flex; flex-direction: column; justify-content: space-between; background: #fafafa;">
          <div style="font-weight: 900; font-size: 8px; color: #0f172a; text-transform: uppercase;">Le Chef d'Établissement</div>
          <div style="font-size: 7px; color: #64748b;">(Signature et Cachet Officiel)</div>
          <div style="height: 25px;"></div>
        </div>
      </div>

      <div style="text-align: center; font-size: 7.5px; color: #94a3b8; margin-top: 6px; border-top: 1px solid #f1f5f9; padding-top: 3px;">
        Document officiel émis par le Système Intégré de Gestion Scolaire Hinneh Éducation • Fait foi pour l'inscription dans le nouvel établissement d'accueil.
      </div>
    </div>
  `;
}

/**
 * Imprime le Livret Scolaire et Certificat Officiel de Radiation
 */
export function printCertificatRadiation(data: CertificatRadiationData) {
  const nomUpper = (data.nom || '').trim().toUpperCase();
  const html = generateCertificatRadiationHtml(data);
  printDocumentHtml(html, `Livret_Radiation_${data.matricule}_${nomUpper}`);
}

/**
 * Télécharge directement le Livret Scolaire et Certificat de Radiation sous format PDF
 */
export async function downloadCertificatRadiationPDF(data: CertificatRadiationData): Promise<void> {
  const nomUpper = (data.nom || '').trim().toUpperCase();
  const filename = `Livret_Radiation_${data.matricule}_${nomUpper}.pdf`;
  const htmlContent = generateCertificatRadiationHtml(data);

  // Utiliser un iframe temporaire isolé
  const iframe = document.createElement('iframe');
  iframe.id = 'temp-pdf-certificate-frame';
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '794px';  // A4 Portrait à 96dpi (~210mm)
  iframe.style.height = '1123px'; // A4 Portrait à 96dpi (~297mm)
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error("Impossible d'accéder au document de l'iframe.");
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Attente du rendu
    await new Promise((resolve) => setTimeout(resolve, 350));

    const targetElement = iframeDoc.querySelector('.doc-container') || iframeDoc.body;

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

