/**
 * Moteur d'impression professionnel pour Emploi du Temps
 * Génère une mise en page Paysage (Landscape) fidèle avec colonnes par jour,
 * cartes de créneaux colorées et en-tête institutionnel.
 */

export interface ScheduleSlot {
  time: string;
  matiere: string;
  classe?: string;
  salle?: string;
  type?: string;
}

export interface DaySchedule {
  day: string;
  slots: ScheduleSlot[];
}

export interface TeacherScheduleMeta {
  name?: string;
  matiere?: string;
  schoolName?: string;
  city?: string;
  ville?: string;
  schoolCode?: string;
  codeEtablissement?: string;
  classeName?: string;
  anneeScolaire?: string;
}

export function printSchedule(
  scheduleInput: DaySchedule[] | HTMLElement | null,
  title: string = 'Emploi du temps',
  meta?: TeacherScheduleMeta
) {
  if (!scheduleInput) return;

  // Extraire les données de l'emploi du temps
  let days: DaySchedule[] = [];

  if (Array.isArray(scheduleInput)) {
    days = scheduleInput;
  } else if (scheduleInput instanceof HTMLElement) {
    // Si un élément HTML a été passé, essayer d'extraire les données ou utiliser son innerHTML
    const dayCards = scheduleInput.querySelectorAll('.overflow-hidden, .border');
    if (dayCards.length > 0) {
      dayCards.forEach(card => {
        const dayTitle = card.querySelector('h3, h4, .font-semibold')?.textContent?.trim() || '';
        const slotEls = card.querySelectorAll('.rounded-lg, [class*="slot"]');
        const slots: ScheduleSlot[] = [];
        slotEls.forEach(s => {
          const lines = Array.from(s.querySelectorAll('p, span')).map(p => p.textContent?.trim() || '');
          if (lines.length >= 2) {
            slots.push({
              time: lines[0] || '',
              matiere: lines[1] || '',
              classe: lines[2] || '',
              salle: lines[3] || '',
              type: 'cours'
            });
          }
        });
        if (dayTitle) {
          days.push({ day: dayTitle, slots });
        }
      });
    }
  }

  // Filtrer les jours pertinents (Lundi à Vendredi, + Samedi si non vide)
  if (days.length === 0) {
    days = [
      { day: 'Lundi', slots: [] },
      { day: 'Mardi', slots: [] },
      { day: 'Mercredi', slots: [] },
      { day: 'Jeudi', slots: [] },
      { day: 'Vendredi', slots: [] },
    ];
  }

  const activeDays = days.filter((d, idx) => {
    if (idx < 5) return true; // Lundi à Vendredi toujours inclus
    return d.slots && d.slots.length > 0; // Samedi seulement si cours
  });

  const schoolName = meta?.schoolName || (typeof localStorage !== 'undefined' ? (localStorage.getItem('user_ecole_name') || localStorage.getItem('user_school_name') || 'Fondation Hinneh Abidjan') : 'Établissement Scolaire');
  const city = meta?.city || meta?.ville || (typeof localStorage !== 'undefined' ? (localStorage.getItem('user_ville') || localStorage.getItem('user_city') || 'Abidjan') : 'Abidjan');
  const teacherName = meta?.name || 'Enseignant';
  const teacherMatiere = meta?.matiere || 'Discipline';
  const annee = meta?.anneeScolaire || '2026-2027';
  const currentDate = new Date().toLocaleDateString('fr-FR');

  // Générer le code HTML des colonnes
  const columnsHtml = activeDays.map(dayObj => {
    const slotsHtml = (dayObj.slots && dayObj.slots.length > 0)
      ? dayObj.slots.map(slot => {
          const isIslamic = (slot.type === 'islamique') || (slot.matiere && slot.matiere.toLowerCase().includes('islam'));
          const isExam = (slot.type === 'exam') || (slot.matiere && slot.matiere.toLowerCase().includes('exam'));
          
          let cardBg = '#f0f9ff'; // sky-50
          let cardBorder = '#bae6fd'; // sky-200
          let titleColor = '#0369a1'; // sky-700

          if (isIslamic) {
            cardBg = '#f0fdf4'; // emerald-50
            cardBorder = '#bbf7d0'; // emerald-200
            titleColor = '#15803d'; // emerald-700
          } else if (isExam) {
            cardBg = '#fef2f2'; // red-50
            cardBorder = '#fecaca'; // red-200
            titleColor = '#b91c1c'; // red-700
          }

          return `
            <div style="background-color: ${cardBg}; border: 1.5px solid ${cardBorder}; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              <div style="font-family: monospace; font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; margin-bottom: 2px;">
                ${slot.time || ''}
              </div>
              <div style="font-size: 12px; font-weight: 800; color: ${titleColor}; line-height: 1.25; margin-bottom: 3px;">
                ${slot.matiere || ''}
              </div>
              <div style="font-size: 11px; font-weight: 600; color: #334155;">
                ${slot.classe || ''}
              </div>
              ${slot.salle ? `<div style="font-size: 10px; color: #64748b; margin-top: 1px;">${slot.salle}</div>` : ''}
            </div>
          `;
        }).join('')
      : `
        <div style="padding: 30px 10px; text-align: center; color: #94a3b8; font-size: 11px; font-style: italic;">
          Aucun cours
        </div>
      `;

    return `
      <div style="flex: 1; min-width: 0; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
        <div style="background-color: #e0f2fe; border-bottom: 1.5px solid #bae6fd; padding: 8px 10px; text-align: left;">
          <span style="font-size: 13px; font-weight: 800; color: #0369a1; text-transform: capitalize;">
            ${dayObj.day}
          </span>
        </div>
        <div style="padding: 8px; flex: 1; background-color: #fafafa;">
          ${slotsHtml}
        </div>
      </div>
    `;
  }).join('');

  // Créer un iframe masqué pour isoler l'impression
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error("Impossible d'accéder au document de l'iframe");
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page {
            size: landscape;
            margin: 6mm 8mm 6mm 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #0f172a;
            background: #ffffff;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .school-info {
            line-height: 1.3;
          }
          .title-box {
            text-align: right;
          }
          .schedule-grid {
            display: flex;
            gap: 10px;
            width: 100%;
            margin-bottom: 14px;
          }
          .signatures-box {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            border-top: 1.5px solid #cbd5e1;
            padding-top: 8px;
            margin-top: 10px;
            text-align: center;
            font-size: 10.5px;
          }
          .sig-space {
            height: 35px;
          }
        </style>
      </head>
      <body>
        <!-- En-tête Officiel -->
        <div class="header-box">
          <div class="school-info">
            <div style="font-size: 11px; font-weight: 800; color: #0369a1; letter-spacing: 0.5px; text-transform: uppercase;">
              RÉPUBLIQUE DE CÔTE D'IVOIRE
            </div>
            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">
              Union - Discipline - Travail
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a;">
              ÉTABLISSEMENT : ${schoolName.toUpperCase()}
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #0369a1; margin-top: 1px;">
              VILLE / COMMUNE : <strong>${city.toUpperCase()}</strong>
            </div>
            <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">
              Année Scolaire : <strong>${annee}</strong>
            </div>
          </div>

          <div class="title-box">
            <div style="display: inline-block; background-color: #e0f2fe; border: 1.5px solid #0284c7; border-radius: 6px; padding: 4px 12px; font-size: 12px; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">
              ${meta?.classeName ? 'EMPLOI DU TEMPS CLASSE' : (title.toLowerCase().includes('classe') ? 'EMPLOI DU TEMPS CLASSE' : 'EMPLOI DU TEMPS ENSEIGNANT')}
            </div>
            <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 4px;">
              ${meta?.classeName ? `Classe : ${meta.classeName}` : (teacherName.toLowerCase().includes('classe') ? teacherName : `Enseignant(e) : ${teacherName}`)}
            </div>
            <div style="font-size: 11px; color: #475569;">
              Discipline : <strong>${teacherMatiere}</strong> · Date d'édition : ${currentDate}
            </div>
          </div>
        </div>

        <!-- Grille des 5 Colonnes (Lundi à Vendredi) -->
        <div class="schedule-grid">
          ${columnsHtml}
        </div>

        <!-- Signatures & Visas -->
        <div class="signatures-box">
          <div>
            <div style="font-weight: 700; color: #334155;">L'Enseignant(e)</div>
            <div class="sig-space"></div>
            <div style="font-size: 9.5px; color: #64748b; font-style: italic;">${teacherName}</div>
          </div>
          <div>
            <div style="font-weight: 700; color: #334155;">Le Censeur / Dir. des Études</div>
            <div class="sig-space"></div>
            <div style="font-size: 9.5px; color: #64748b; font-style: italic;">Visa & Observations</div>
          </div>
          <div>
            <div style="font-weight: 700; color: #334155;">La Direction de l'Établissement</div>
            <div class="sig-space"></div>
            <div style="font-size: 9.5px; color: #64748b; font-style: italic;">Cachet & Signature</div>
          </div>
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Déclencher l'impression après le chargement du document
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Erreur lors de l'impression :", e);
    } finally {
      setTimeout(() => {
        iframe.remove();
      }, 2000);
    }
  }, 350);
}

// ═════════════════════════════════════════════════════════════════════════════
// GRILLE HORAIRE OFFICIELLE CONFESSIONNELLE (Modèle EMPLOI DU TEMPS PROVISOIRE 2025.docx)
// ═════════════════════════════════════════════════════════════════════════════

export interface OfficialScheduleSlotData {
  matiere?: string;
  classe?: string;
  salle?: string;
}

export interface OfficialScheduleData {
  [timeSlot: string]: {
    [day: string]: OfficialScheduleSlotData | null;
  };
}

export interface OfficialScheduleMeta {
  schoolName?: string;
  city?: string;
  anneeScolaire?: string;
  classeName?: string;
  teacherName?: string;
  teacherMatiere?: string;
  teacherPhone?: string;
  isTeacherMode?: boolean;       // true = emploi du temps enseignant, false = classe
  drena?: string;
  iepp?: string;
  /** Récapitulatif horaire par discipline (pour l'emploi du temps enseignant) */
  recap?: Array<{
    discipline: string;
    classe: string;
    heuresHebdo: number;
    heuresAnnuelles?: number;
    dateFinCours?: string;
  }>;
}

/**
 * Créneaux horaires officiels du modèle HINNEH 2025 (confessionnels islamiques)
 * Comprend les pauses institutionnelles (Salut aux couleurs, Récréation, Ablutions/Prière)
 */
export const OFFICIAL_TIME_SLOTS = [
  { id: 'salut',      label: '07H15 - 07H25', special: 'SALUT AUX COULEURS',                               isBreak: true,  breakColor: '#0f172a' },
  { id: 'c1',         label: '07H30 - 08H20', special: null,                                                isBreak: false },
  { id: 'c2',         label: '08H20 - 09H10', special: null,                                                isBreak: false },
  { id: 'c3',         label: '09H10 - 10H00', special: null,                                                isBreak: false },
  { id: 'recreation', label: '10H00 - 10H15', special: 'RÉCRÉATION',                                        isBreak: true,  breakColor: '#15803d' },
  { id: 'c4',         label: '10H15 - 11H05', special: null,                                                isBreak: false },
  { id: 'c5',         label: '11H05 - 11H55', special: null,                                                isBreak: false },
  { id: 'midi',       label: '11H55 - 13H20', special: 'ABLUTIONS (20 min) · PRIÈRE (15 min) · RESTAURATION (30 min) · PAUSE (15 min)', isBreak: true, breakColor: '#0369a1' },
  { id: 'c6',         label: '13H20 - 14H10', special: null,                                                isBreak: false },
  { id: 'c7',         label: '14H10 - 15H00', special: null,                                                isBreak: false },
  { id: 'c8',         label: '15H00 - 15H50', special: null,                                                isBreak: false },
  { id: 'asr',        label: '15H50 - 16H30', special: 'ABLUTIONS · PRIÈRE DE ASR · GOÛTER',                isBreak: true,  breakColor: '#0369a1' },
];

export const OFFICIAL_DAYS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI'];

/**
 * Génère et imprime la grille horaire officielle confessionnelle.
 * Avec en-tête institutionnel, créneaux fixes, pauses religieuses colorées
 * et (pour l'emploi du temps enseignant) la lettre d'affectation + récapitulatif.
 */
export function printOfficialScheduleGrid(
  schedule: OfficialScheduleData,
  meta: OfficialScheduleMeta
) {
  const schoolName = meta.schoolName || 'GROUPE SCOLAIRE CONFESSIONNEL ISLAMIQUE HINNEH';
  const city = meta.city || 'KORHOGO';
  const annee = meta.anneeScolaire || '2025-2026';
  const drena = meta.drena || 'DRENA KORHOGO';
  const iepp = meta.iepp || 'IEPP KORHOGO-EST';
  const currentDate = new Date().toLocaleDateString('fr-FR');
  const isTeacher = meta.isTeacherMode ?? true;

  // Build table rows
  const rowsHtml = OFFICIAL_TIME_SLOTS.map(slot => {
    if (slot.isBreak && slot.special) {
      return `
        <tr>
          <td style="padding:4px 6px;font-size:9.5px;font-weight:700;color:#fff;background:${slot.breakColor};border:1px solid #e2e8f0;white-space:nowrap;">
            ${slot.label}
          </td>
          <td colspan="${OFFICIAL_DAYS.length}" style="padding:4px 6px;font-size:9px;font-weight:800;text-align:center;color:#fff;background:${slot.breakColor};border:1px solid #e2e8f0;text-transform:uppercase;letter-spacing:0.3px;">
            ${slot.special}
          </td>
        </tr>`;
    }

    const cells = OFFICIAL_DAYS.map(day => {
      const cellData = schedule?.[slot.id]?.[day.toLowerCase()] || schedule?.[slot.id]?.[day] || null;
      if (!cellData || !cellData.matiere) {
        return `<td style="padding:4px;border:1px solid #e2e8f0;min-width:80px;height:38px;"></td>`;
      }
      return `
        <td style="padding:4px 5px;border:1px solid #e2e8f0;min-width:80px;background:#f0f9ff;vertical-align:top;">
          <div style="font-size:9.5px;font-weight:800;color:#0369a1;text-transform:uppercase;">${cellData.matiere}</div>
          ${cellData.classe ? `<div style="font-size:8.5px;color:#475569;font-weight:600;">${cellData.classe}</div>` : ''}
          ${cellData.salle ? `<div style="font-size:8px;color:#94a3b8;">Salle : ${cellData.salle}</div>` : ''}
        </td>`;
    }).join('');

    return `
      <tr>
        <td style="padding:4px 6px;font-size:9px;font-weight:700;color:#0f172a;background:#f8fafc;border:1px solid #e2e8f0;white-space:nowrap;">
          ${slot.label}
        </td>
        ${cells}
      </tr>`;
  }).join('');

  // Récapitulatif horaire (mode enseignant)
  const recapHtml = (isTeacher && meta.recap && meta.recap.length > 0) ? `
    <div style="margin-top:16px;">
      <div style="font-size:10.5px;font-weight:800;color:#0f172a;border-bottom:1.5px solid #0f172a;padding-bottom:3px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.4px;">
        RÉCAPITULATIF DES HORAIRES
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
        <thead>
          <tr style="background:#0f172a;color:#fff;font-weight:700;">
            <th style="padding:5px 8px;border:1px solid #e2e8f0;text-align:left;">Discipline</th>
            <th style="padding:5px 8px;border:1px solid #e2e8f0;text-align:left;">Classe</th>
            <th style="padding:5px 8px;border:1px solid #e2e8f0;text-align:center;">Vol. horaire hebdomadaire</th>
            <th style="padding:5px 8px;border:1px solid #e2e8f0;text-align:center;">Vol. horaire annuel</th>
            <th style="padding:5px 8px;border:1px solid #e2e8f0;text-align:center;">Date probable fin de cours</th>
          </tr>
        </thead>
        <tbody>
          ${(meta.recap || []).map(r => `
            <tr>
              <td style="padding:4px 8px;border:1px solid #e2e8f0;">${r.discipline}</td>
              <td style="padding:4px 8px;border:1px solid #e2e8f0;">${r.classe}</td>
              <td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:700;">${r.heuresHebdo}h</td>
              <td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;">${r.heuresAnnuelles ? r.heuresAnnuelles + 'h' : '—'}</td>
              <td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;">${r.dateFinCours || '—'}</td>
            </tr>`).join('')}
          <tr style="background:#f1f5f9;font-weight:800;">
            <td colspan="2" style="padding:4px 8px;border:1px solid #e2e8f0;">Récapitulatif</td>
            <td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;">${(meta.recap || []).reduce((acc, r) => acc + r.heuresHebdo, 0)}h</td>
            <td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;">${(meta.recap || []).reduce((acc, r) => acc + (r.heuresAnnuelles || 0), 0) || '—'}${(meta.recap || []).some(r => r.heuresAnnuelles) ? 'h' : ''}</td>
            <td style="padding:4px 8px;border:1px solid #e2e8f0;"></td>
          </tr>
        </tbody>
      </table>
    </div>` : '';

  // Lettre de notification enseignant
  const letterHtml = isTeacher && meta.teacherName ? `
    <div style="margin-top:18px;padding:12px 16px;border:1.5px solid #0f172a;border-radius:4px;font-size:9.5px;line-height:1.6;background:#fafafa;">
      <div style="font-weight:800;text-align:center;font-size:10.5px;text-transform:uppercase;margin-bottom:8px;border-bottom:1px solid #cbd5e1;padding-bottom:6px;">
        EMPLOI DU TEMPS PROFESSEUR ${annee}
      </div>
      <div><strong>Nom et prénoms :</strong> ${meta.teacherName || '___________________________'}</div>
      <div><strong>Matières :</strong> ${meta.teacherMatiere || '___________________________'}</div>
      <div><strong>Téléphone :</strong> ${meta.teacherPhone || '___________________________'}</div>
      <div style="margin-top:8px;">
        Suite à votre demande relative à un poste d'enseignant dans notre établissement scolaire,
        j'ai l'honneur de vous informer que vous avez été retenu(e) comme professeur de
        <strong>${meta.teacherMatiere || '___________________________'}</strong>
        pour l'année scolaire <strong>${annee}</strong>.
      </div>
      <div style="margin-top:8px;font-style:italic;font-size:9px;color:#64748b;">
        NB : Les professeurs sont tenus au strict respect du présent emploi du temps.
        Toute modification ou réaménagement doit se faire avec l'aval de la direction des études.
      </div>
    </div>` : '';

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.left = '-9999px';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>${isTeacher ? 'Emploi du Temps Enseignant' : 'Emploi du Temps Classe'} - ${meta.teacherName || meta.classeName || schoolName}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm 8mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #0f172a; margin: 0; padding: 0; }
        table { border-collapse: collapse; width: 100%; }
      </style>
    </head>
    <body>
      <!-- EN-TÊTE INSTITUTIONNEL OFFICIEL -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:6px;margin-bottom:10px;">
        <div style="line-height:1.35;">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;">MINISTÈRE DE L'ÉDUCATION NATIONALE ET DE L'ALPHABÉTISATION</div>
          <div style="font-size:9px;color:#475569;">${drena} / ${iepp}</div>
          <div style="font-size:12px;font-weight:900;color:#0369a1;margin-top:2px;text-transform:uppercase;">${schoolName}</div>
          <div style="font-size:9.5px;color:#475569;">ANNÉE SCOLAIRE : <strong>${annee}</strong></div>
        </div>
        <div style="text-align:right;line-height:1.35;">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;">RÉPUBLIQUE DE CÔTE D'IVOIRE</div>
          <div style="font-size:9px;font-style:italic;color:#64748b;">Union - Discipline - Travail</div>
          <div style="font-size:9px;color:#475569;margin-top:4px;">VILLE / COMMUNE : <strong>${city.toUpperCase()}</strong></div>
          <div style="font-size:9px;color:#475569;">Édité le : <strong>${currentDate}</strong></div>
        </div>
      </div>

      <!-- TITRE DE LA GRILLE -->
      <div style="text-align:center;background:#0f172a;color:#fff;padding:5px 0;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;border-radius:2px;">
        ${isTeacher ? `EMPLOI DU TEMPS — ${meta.teacherName ? meta.teacherName.toUpperCase() : 'ENSEIGNANT'}` : `EMPLOI DU TEMPS — CLASSE : ${(meta.classeName || '').toUpperCase()}`}
      </div>

      ${isTeacher ? `
      <div style="font-size:9px;background:#f1f5f9;padding:5px 10px;border:1px solid #cbd5e1;border-radius:3px;margin-bottom:8px;display:flex;gap:20px;">
        <span><strong>Nom :</strong> ${meta.teacherName || '—'}</span>
        <span><strong>Matière(s) :</strong> ${meta.teacherMatiere || '—'}</span>
        <span><strong>Contact :</strong> ${meta.teacherPhone || '—'}</span>
      </div>` : ''}

      <!-- GRILLE HORAIRE OFFICIELLE -->
      <table>
        <thead>
          <tr style="background:#1e293b;color:#fff;font-size:9.5px;font-weight:800;text-align:center;">
            <th style="padding:5px 6px;border:1px solid #e2e8f0;min-width:90px;text-align:left;">JOURS · HORAIRES</th>
            ${OFFICIAL_DAYS.map(d => `<th style="padding:5px 6px;border:1px solid #e2e8f0;min-width:80px;">${d}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- RÉCAPITULATIF HORAIRE -->
      ${recapHtml}

      <!-- LETTRE ENSEIGNANT -->
      ${letterHtml}

      <!-- SIGNATURES -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;border-top:1.5px solid #cbd5e1;padding-top:8px;margin-top:14px;text-align:center;font-size:10px;">
        <div>
          <div style="font-weight:700;color:#334155;">L'Enseignant(e)</div>
          <div style="height:30px;border-bottom:1px solid #cbd5e1;margin:6px 20px;"></div>
          <div style="font-size:9px;color:#64748b;font-style:italic;">${meta.teacherName || '___________________'}</div>
        </div>
        <div>
          <div style="font-weight:700;color:#334155;">Le Directeur des Études</div>
          <div style="height:30px;border-bottom:1px solid #cbd5e1;margin:6px 20px;"></div>
          <div style="font-size:9px;color:#64748b;font-style:italic;">KONATE A. Sidiki</div>
        </div>
        <div>
          <div style="font-weight:700;color:#334155;">Le Chef d'Établissement</div>
          <div style="height:30px;border-bottom:1px solid #cbd5e1;margin:6px 20px;"></div>
          <div style="font-size:9px;color:#64748b;font-style:italic;">Cachet &amp; Signature</div>
        </div>
      </div>
    </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Erreur printOfficialScheduleGrid :", e);
    } finally {
      setTimeout(() => iframe.remove(), 2000);
    }
  }, 350);
}


/**
 * Imprime l'emploi du temps officiel réaménagé pour l'Enseignement Primaire (MENA - DPFC)
 * Reproduction exacte du canevas officiel national (CM1 / Primaire) en 4 blocs Lundi, Mardi, Jeudi, Vendredi
 */
export function printPrimaryOfficialMENASchedule(options?: {
  classeName?: string;
  ecoleName?: string;
  anneeScolaire?: string;
  enseignantName?: string;
}) {
  const classeTitle = (options?.classeName || 'CM1').toUpperCase();
  const ecoleName = options?.ecoleName || (typeof localStorage !== 'undefined' ? (localStorage.getItem('user_ecole_name') || 'ÉCOLE PRIMAIRE') : 'ÉCOLE PRIMAIRE');
  const annee = options?.anneeScolaire || '2026-2027';

  const daysData = [
    {
      day: 'LUNDI',
      items: [
        { h: '7h45-8h00', act: 'Salut aux couleurs', dur: "15'", bg: '#fef08a', c: '#854d0e' },
        { h: '8h00-8h05', act: 'Transition', dur: "5'", bg: '#22c55e', c: '#ffffff' },
        { h: '8h05-8h35', act: 'Lecture 1', dur: "30'", bg: '#fef08a', c: '#854d0e' },
        { h: '8h35-8h40', act: 'Transition', dur: "5'", bg: '#22c55e', c: '#ffffff' },
        { h: '8h40-9h25', act: 'Mathématiques (acq.)', dur: "45'", bg: '#93c5fd', c: '#1e3a8a' },
        { h: '9h25-10h00', act: 'Expression orale 1', dur: "35'", bg: '#fef08a', c: '#854d0e' },
        { h: '10h00-10h15', act: 'R É C R É A T I O N', dur: "15'", bg: '#e0f2fe', c: '#0369a1', isBreak: true },
        { h: '10h15-11h00', act: 'Remédiation Français', dur: "45'", bg: '#fef08a', c: '#854d0e' },
        { h: '11h00-11h30', act: 'Lecture 2', dur: "30'", bg: '#fef08a', c: '#854d0e' },
        { h: '11h30-11h55', act: 'Chant', dur: "25'", bg: '#fef08a', c: '#854d0e' },
        { h: '11h55-12h15', act: 'Écriture', dur: "20'", bg: '#fef08a', c: '#854d0e' },
        { h: '12h15-14h30', act: 'A P R E S - M I D I', dur: '—', bg: '#f1f5f9', c: '#0f172a', isHeader: true },
        { h: '14h30-15h10', act: 'Histoire/géographie', dur: "40'", bg: '#fbcfe8', c: '#831843' },
        { h: '15h10-15h30', act: 'Mathématiques (ex)', dur: "20'", bg: '#93c5fd', c: '#1e3a8a' },
        { h: '15h30-16h00', act: 'Expression écrite 1', dur: "30'", bg: '#fef08a', c: '#854d0e' },
        { h: '16h00-16h15', act: 'R É C R É A T I O N', dur: "15'", bg: '#e0f2fe', c: '#0369a1', isBreak: true },
        { h: '16h15-17h00', act: 'Reméd. Mathématiques', dur: "45'", bg: '#93c5fd', c: '#1e3a8a' },
        { h: '17h00-17h30', act: 'EDHC/AEC', dur: "30'", bg: '#f3e8ff', c: '#581c87' },
      ]
    },
    {
      day: 'JEUDI',
      items: [
        { h: '7h45-8h25', act: 'EPS', dur: "40'", bg: '#60a5fa', c: '#ffffff' },
        { h: '8h25-8h30', act: 'Transition', dur: "5'", bg: '#22c55e', c: '#ffffff' },
        { h: '8h30-9h15', act: 'Mathématiques (acq)', dur: "45'", bg: '#93c5fd', c: '#1e3a8a' },
        { h: '9h15-9h20', act: 'Transition', dur: "5'", bg: '#22c55e', c: '#ffffff' },
        { h: '9h20-10h00', act: 'Sciences et technologie', dur: "40'", bg: '#ef4444', c: '#ffffff' },
        { h: '10h00-10h15', act: 'R É C R É A T I O N', dur: "15'", bg: '#e0f2fe', c: '#0369a1', isBreak: true },
        { h: '10h15-11h00', act: 'Remédiation français', dur: "45'", bg: '#fef08a', c: '#854d0e' },
        { h: '11h00-11h05', act: 'Transition', dur: "5'", bg: '#22c55e', c: '#ffffff' },
        { h: '11h05-11h40', act: 'Math exercices', dur: "35'", bg: '#93c5fd', c: '#1e3a8a' },
        { h: '11h40-12h15', act: 'Lecture 1', dur: "35'", bg: '#fef08a', c: '#854d0e' },
        { h: '12h15-14h30', act: 'A P R E S - M I D I', dur: '—', bg: '#f1f5f9', c: '#0f172a', isHeader: true },
        { h: '14h30-15h00', act: 'LECTURE 2', dur: "30'", bg: '#fef08a', c: '#854d0e' },
        { h: '15h00-15h30', act: 'Dictée (préparation)', dur: "30'", bg: '#fef08a', c: '#854d0e' },
        { h: '15h30-16h00', act: 'Expression orale', dur: "30'", bg: '#fef08a', c: '#854d0e' },
        { h: '16h00-16h15', act: 'R É C R É A T I O N', dur: "15'", bg: '#e0f2fe', c: '#0369a1', isBreak: true },
        { h: '16h15-17h00', act: 'Reméd. mathématiques', dur: "45'", bg: '#93c5fd', c: '#1e3a8a' },
        { h: '17h00-17h30', act: 'Expression écrite 3', dur: "30'", bg: '#fef08a', c: '#854d0e' },
      ]
    },
    {
      day: 'MARDI',
      items: [
        { h: '7h45-8h10', act: 'Expl de texte 1 (vocab)', dur: "25'", bg: '#fef08a', c: '#854d0e' },
        { h: '8h10-8h15', act: 'Transition', dur: "5'", bg: '#22c55e', c: '#ffffff' },
        { h: '8h15-9h00', act: 'Mathématiques (acq)', dur: "45'", bg: '#93c5fd', c: '#1e3a8a' },
        { h: '9h00-9h30', act: 'Expression orale 2', dur: "30'", bg: '#fef08a', c: '#854d0e' },
        { h: '9h30-10h00', act: 'Expression écrite 2', dur: "30'", bg: '#fef08a', c: '#854d0e' },
        { h: '10h00-10h15', act: 'R É C R É A T I O N', dur: "15'", bg: '#e0f2fe', c: '#0369a1', isBreak: true },
        { h: '10h15-11h00', act: 'Remédiation français', dur: "45'", bg: '#fef08a', c: '#854d0e' },
        { h: '11h00-11h25', act: 'Expl de texte 1 (orth)', dur: "25'", bg: '#fef08a', c: '#854d0e' },
        { h: '11h25-11h45', act: 'Poésie', dur: "20'", bg: '#fef08a', c: '#854d0e' },
        { h: '11h45-12h15', act: 'Mathématiques exercices', dur: "30'", bg: '#93c5fd', c: '#1e3a8a' },
        { h: '12h15-14h30', act: 'A P R E S - M I D I', dur: '—', bg: '#f1f5f9', c: '#0f172a', isHeader: true },
        { h: '14h30-15h15', act: 'Sciences et technologie', dur: "45'", bg: '#ef4444', c: '#ffffff' },
        { h: '15h15-15h40', act: 'Lecture 1&2 (renfo)', dur: "25'", bg: '#fef08a', c: '#854d0e' },
        { h: '15h40-16h00', act: 'Expl de texte (renfo)', dur: "20'", bg: '#fef08a', c: '#854d0e' },
        { h: '16h00-16h15', act: 'R É C R É A T I O N', dur: "15'", bg: '#e0f2fe', c: '#0369a1', isBreak: true },
        { h: '16h15-17h00', act: 'Remédiation Mathémat.', dur: "45'", bg: '#93c5fd', c: '#1e3a8a' },
        { h: '17h00-17h30', act: 'Sciences et technologie (renforcement)', dur: "30'", bg: '#ef4444', c: '#ffffff' },
      ]
    },
    {
      day: 'VENDREDI',
      items: [
        { h: '7h45-8h10', act: 'Expl de texte 2 (gramm)', dur: "25'", bg: '#fef08a', c: '#854d0e' },
        { h: '8h10-8h15', act: 'Transition', dur: "5'", bg: '#22c55e', c: '#ffffff' },
        { h: '8h15-9h00', act: 'Mathématiques (acq)', dur: "45'", bg: '#93c5fd', c: '#1e3a8a' },
        { h: '9h00-9h25', act: 'Expl de texte 2 (conj)', dur: "25'", bg: '#fef08a', c: '#854d0e' },
        { h: '9h25-10h00', act: 'Sces et techno (renfo.)', dur: "35'", bg: '#ef4444', c: '#ffffff' },
        { h: '10h00-10h15', act: 'R É C R É A T I O N', dur: "15'", bg: '#e0f2fe', c: '#0369a1', isBreak: true },
        { h: '10h15-11h00', act: 'Remédiation français', dur: "45'", bg: '#fef08a', c: '#854d0e' },
        { h: '11h00-11h25', act: 'Écriture', dur: "25'", bg: '#fef08a', c: '#854d0e' },
        { h: '11h25-11h55', act: 'Dictée 2 (admin)', dur: "30'", bg: '#fef08a', c: '#854d0e' },
        { h: '11h55-12h15', act: 'Mathématiques (exercices)', dur: "20'", bg: '#93c5fd', c: '#1e3a8a' },
        { h: '12h15-14h30', act: 'A P R E S - M I D I', dur: '—', bg: '#f1f5f9', c: '#0f172a', isHeader: true },
        { h: '14h30-15h10', act: 'Sces et techno (soutien)', dur: "40'", bg: '#ef4444', c: '#ffffff' },
        { h: '15h10-15h35', act: 'Poésie', dur: "25'", bg: '#fef08a', c: '#854d0e' },
        { h: '15h35-16h00', act: 'Animation lecture', dur: "25'", bg: '#fef08a', c: '#854d0e' },
        { h: '16h00-16h15', act: 'R É C R É A T I O N', dur: "15'", bg: '#e0f2fe', c: '#0369a1', isBreak: true },
        { h: '16h15-17h00', act: 'Remédiation math', dur: "45'", bg: '#93c5fd', c: '#1e3a8a' },
        { h: '17h00-17h20', act: 'Activités entrepreneuriales', dur: "20'", bg: '#fed7aa', c: '#9a3412' },
        { h: '17h20-17h30', act: 'Salut aux couleurs', dur: "10'", bg: '#fef08a', c: '#854d0e' },
      ]
    }
  ];

  const renderDayTable = (dayObj: typeof daysData[0]) => {
    const rows = dayObj.items.map(it => {
      if (it.isBreak || it.isHeader) {
        return `
          <tr style="background-color: ${it.bg};">
            <td colspan="3" style="border: 1px solid #1e293b; padding: 2px 4px; text-align: center; font-weight: 900; font-size: 8.5px; color: ${it.c}; letter-spacing: 2px;">
              ${it.act}
            </td>
          </tr>
        `;
      }
      return `
        <tr style="background-color: ${it.bg};">
          <td style="border: 1px solid #1e293b; padding: 2px 4px; font-size: 8px; font-weight: 700; white-space: nowrap; text-align: center; color: #0f172a;">
            ${it.h}
          </td>
          <td style="border: 1px solid #1e293b; padding: 2px 5px; font-size: 8.5px; font-weight: 700; color: ${it.c};">
            ${it.act}
          </td>
          <td style="border: 1px solid #1e293b; padding: 2px 4px; font-size: 8px; font-weight: 700; text-align: center; color: #0f172a;">
            ${it.dur}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="display: flex; flex-direction: row; border: 1.5px solid #1e293b; margin-bottom: 6px;">
        <div style="writing-mode: vertical-rl; transform: rotate(180deg); background: #ffffff; color: #0f172a; font-weight: 900; font-size: 13px; letter-spacing: 3px; display: flex; align-items: center; justify-content: center; padding: 4px 6px; border-right: 1.5px solid #1e293b;">
          ${dayObj.day}
        </div>
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <thead>
            <tr style="background: #ffffff; color: #0f172a;">
              <th style="border: 1px solid #1e293b; padding: 2px 4px; font-size: 8px; font-weight: 800; width: 68px; text-align: center;">HORAIRES</th>
              <th style="border: 1px solid #1e293b; padding: 2px 4px; font-size: 8px; font-weight: 800; text-align: center;">ACTIVITES</th>
              <th style="border: 1px solid #1e293b; padding: 2px 4px; font-size: 8px; font-weight: 800; width: 44px; text-align: center;">DUREE</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  };

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.left = '-9999px';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>Emploi du Temps Primaire Réaménagé - ${classeTitle}</title>
      <style>
        @page { size: A4 portrait; margin: 6mm 6mm; }
        * { box-sizing: border-box; }
        body { font-family: "Arial", sans-serif; font-size: 9px; color: #0f172a; margin: 0; padding: 0; }
      </style>
    </head>
    <body>
      <!-- BANNIÈRE OFFICIELLE MINISTÈRE -->
      <div style="background-color: #ecfccb; border: 1.5px solid #bef264; padding: 6px 12px; text-align: center; margin-bottom: 8px; border-radius: 4px;">
        <div style="font-size: 9px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">
          MINISTÈRE DE L'ÉDUCATION NATIONALE ET DE L'ALPHABÉTISATION
        </div>
        <div style="font-size: 8.5px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; margin-top: 1px;">
          DIRECTION DE LA PÉDAGOGIE ET DE LA FORMATION CONTINUE
        </div>
        <div style="font-size: 11px; font-weight: 900; color: #1e40af; text-transform: uppercase; letter-spacing: 1px; margin-top: 3px;">
          ENSEIGNEMENT PRIMAIRE
        </div>
        <div style="font-size: 10px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px;">
          EMPLOI DU TEMPS RÉAMÉNAGÉ
        </div>
        <div style="font-size: 14px; font-weight: 900; color: #15803d; text-transform: uppercase; margin-top: 2px;">
          ${classeTitle}
        </div>
      </div>

      <!-- GRILLE 2X2 DES JOURS -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div>
          ${renderDayTable(daysData[0])}
          ${renderDayTable(daysData[2])}
        </div>
        <div>
          ${renderDayTable(daysData[1])}
          ${renderDayTable(daysData[3])}
        </div>
      </div>

      <!-- BAS DE PAGE -->
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #64748b; margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 3px;">
        <div><strong>Établissement :</strong> ${ecoleName} • Année Scolaire : ${annee}</div>
        <div>Canevas national officiel • MENA / DPFC</div>
      </div>
    </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Erreur impression primaire :", e);
    } finally {
      setTimeout(() => iframe.remove(), 2000);
    }
  }, 350);
}


