import type { Student, School, ClassRoom, Evaluation } from '@/lib/index';

interface SubjectGrade {
  subject: string;
  coeff: number;
  studentAverage: number;
  classAverage: number;
  minGrade: number;
  maxGrade: number;
  annAverage: number;
  annRank: number;
  teacher: string;
  appreciation: string;
  category: 'LITTERAIRE' | 'SCIENTIFIQUE' | 'AUTRE' | 'RELIGION';
}

const TEACHER_NAMES: Record<string, string> = {
  'Français': 'Mr KAMAGATE MOCLANDI',
  'Expression Écrite': 'Mr KAMAGATE MOCLANDI',
  'Expression Orale': 'Mr KAMAGATE MOCLANDI',
  'Orthographe / Grammaire': 'Mr KAMAGATE MOCLANDI',
  'Anglais': 'Mr KONATE MOULAYE',
  'Histoire-Géographie': 'Mr YEO Sourgalo',
  'Mathématiques': 'Mr SOUMAHORO LASSINA',
  'Physique-Chimie': 'Mlle KONE SALIMATA',
  'SVT': 'Mr ASSIELOU BROU AUBIN',
  'Sciences de la Vie et de la Terre': 'Mr ASSIELOU BROU AUBIN',
  'EDHC': 'Mr SANOGO SOULEYMANE',
  'EPS': 'Mr TOURE KASSOUM',
  'Conduite': 'LE CONSEIL',
  'Informatique / TICE': 'Mr OUATTARA BRAHIMA',
  'Arabe': 'Mr SYLLA ADAM BEN HASSANE',
  'Éducation Islamique': 'Mr KONATE SIRIKY',
  'Coran / Tajwid': 'Mr KONATE SIRIKY',
  'Akhlaq': 'Mr KONATE SIRIKY',
  'Sirah': 'Mr KONATE SIRIKY',
  'Fiqh': 'Mr KONATE SIRIKY',
};

const SUBJECT_CATEGORIES: Record<string, 'LITTERAIRE' | 'SCIENTIFIQUE' | 'AUTRE' | 'RELIGION'> = {
  'Français': 'LITTERAIRE',
  'Expression Écrite': 'LITTERAIRE',
  'Expression Orale': 'LITTERAIRE',
  'Orthographe / Grammaire': 'LITTERAIRE',
  'Anglais': 'LITTERAIRE',
  'Histoire-Géographie': 'LITTERAIRE',
  'Arabe': 'LITTERAIRE',
  
  'Mathématiques': 'SCIENTIFIQUE',
  'Physique-Chimie': 'SCIENTIFIQUE',
  'SVT': 'SCIENTIFIQUE',
  'Sciences de la Vie et de la Terre': 'SCIENTIFIQUE',
  'Sciences': 'SCIENTIFIQUE',

  'EDHC': 'AUTRE',
  'EPS': 'AUTRE',
  'Conduite': 'AUTRE',
  'Informatique / TICE': 'AUTRE',
  'Arts Plastiques': 'AUTRE',
  'Musique': 'AUTRE',

  'Éducation Islamique': 'RELIGION',
  'Coran / Tajwid': 'RELIGION',
  'Akhlaq': 'RELIGION',
  'Sirah': 'RELIGION',
  'Fiqh': 'RELIGION',
};

const DEFAULT_COEFFS: Record<string, number> = {
  'Français': 3,
  'Expression Écrite': 1,
  'Expression Orale': 1,
  'Orthographe / Grammaire': 1,
  'Anglais': 2,
  'Histoire-Géographie': 2,
  'Arabe': 2,

  'Mathématiques': 3,
  'Physique-Chimie': 2,
  'SVT': 2,
  'Sciences de la Vie et de la Terre': 2,

  'EDHC': 1,
  'EPS': 1,
  'Conduite': 1,
  'Informatique / TICE': 1,

  'Éducation Islamique': 1,
  'Coran / Tajwid': 1,
  'Akhlaq': 1,
  'Sirah': 1,
  'Fiqh': 1,
};

function fmt(n: number): string {
  if (isNaN(n)) return '0,00';
  return n.toFixed(2).replace('.', ',');
}

function appreciation(avg: number): string {
  if (avg >= 17) return 'Très Bien';
  if (avg >= 15) return 'Bien';
  if (avg >= 13) return 'Bien';
  if (avg >= 11) return 'Assez Bien';
  if (avg >= 10) return 'Passable';
  if (avg >= 8) return 'Insuffisant';
  return 'Très Insuffisant';
}

function rankLabel(rank: number): string {
  if (rank === 1) return '1 er';
  if (rank === 2) return '2 e';
  return `${rank} e`;
}

function getSubjectRank(subject: string, studentAvg: number, classList: any[], classEvals: any[]): number {
  const averages: { id: string; avg: number }[] = [];
  classList.forEach((st) => {
    const stEvals = classEvals.filter((e: any) => String(e.studentId) === String(st.id) && e.subject === subject);
    if (stEvals.length > 0) {
      const avg = stEvals.reduce((sum: number, e: any) => sum + e.note, 0) / stEvals.length;
      averages.push({ id: st.id, avg });
    }
  });
  if (averages.length === 0) return 1;
  averages.sort((a, b) => b.avg - a.avg);
  const foundIdx = averages.findIndex((a) => a.avg === studentAvg);
  return foundIdx !== -1 ? foundIdx + 1 : 1;
}

export const printBulletins = (
  students: Student[],
  evaluations: Evaluation[],
  classRoom: ClassRoom | null,
  school: School | null,
  trimester: number
) => {
  let html = '';

  students.forEach((student, index) => {
    const studentEvals = evaluations.filter(
      (e) => String(e.studentId) === String(student.id) && e.trimester === trimester
    );

    const classListForRanking = [...students];

    const classStudentIds = classListForRanking.map((s) => String(s.id));
    const classEvals = evaluations.filter(
      (e) => classStudentIds.includes(String(e.studentId)) && e.trimester === trimester
    );

    const subjectsMap: Record<string, { notes: number[]; coeff: number; appreciation: string }> = {};
    if (studentEvals.length > 0) {
      studentEvals.forEach((e) => {
        if (!subjectsMap[e.subject]) {
          subjectsMap[e.subject] = {
            notes: [],
            coeff: e.coefficient || DEFAULT_COEFFS[e.subject] || 1,
            appreciation: e.appreciation || '',
          };
        }
        subjectsMap[e.subject].notes.push(e.note);
        if (e.appreciation && !subjectsMap[e.subject].appreciation) {
          subjectsMap[e.subject].appreciation = e.appreciation;
        }
      });
    }

    const subjectGrades: SubjectGrade[] = [];
    let totalWeighted = 0;
    let totalCoeffs = 0;

    Object.entries(subjectsMap).forEach(([subject, data]) => {
      const studentAvg = data.notes.reduce((sum, n) => sum + n, 0) / data.notes.length;
      const allAverages: number[] = [];
      classListForRanking.forEach((st) => {
        const stEvals = classEvals.filter((e) => String(e.studentId) === String(st.id) && e.subject === subject);
        if (stEvals.length > 0) {
          const avg = stEvals.reduce((sum, e) => sum + e.note, 0) / stEvals.length;
          allAverages.push(avg);
        }
      });
      const classAvg = allAverages.length > 0 ? allAverages.reduce((a, b) => a + b, 0) / allAverages.length : 0;
      const minGrade = allAverages.length > 0 ? Math.min(...allAverages) : 0;
      const maxGrade = allAverages.length > 0 ? Math.max(...allAverages) : 0;
      const rank = getSubjectRank(subject, studentAvg, classListForRanking, classEvals);
      const weighted = studentAvg * data.coeff;

      const allTrimesterEvals = evaluations.filter((e) => String(e.studentId) === String(student.id) && e.subject === subject);
      const annAvg = allTrimesterEvals.length > 0 ? allTrimesterEvals.reduce((sum, e) => sum + e.note, 0) / allTrimesterEvals.length : studentAvg;
      const annRank = rank;

      subjectGrades.push({
        subject,
        coeff: data.coeff,
        studentAverage: studentAvg,
        classAverage: classAvg,
        minGrade: minGrade,
        maxGrade: maxGrade,
        annAverage: annAvg,
        annRank: annRank,
        teacher: TEACHER_NAMES[subject] || 'Enseignant',
        appreciation: data.appreciation || appreciation(studentAvg),
        category: SUBJECT_CATEGORIES[subject] || 'AUTRE',
      });

      totalWeighted += weighted;
      totalCoeffs += data.coeff;
    });

    const studentGeneralAverage = totalCoeffs > 0 ? totalWeighted / totalCoeffs : 0;

    const grouped = {
      LITTERAIRE: subjectGrades.filter((g) => g.category === 'LITTERAIRE'),
      SCIENTIFIQUE: subjectGrades.filter((g) => g.category === 'SCIENTIFIQUE'),
      AUTRE: subjectGrades.filter((g) => g.category === 'AUTRE'),
      RELIGION: subjectGrades.filter((g) => g.category === 'RELIGION'),
    };

    const groupTotals = {
      LITTERAIRE: grouped.LITTERAIRE.reduce((acc, g) => ({ points: acc.points + g.studentAverage * g.coeff, coef: acc.coef + g.coeff }), { points: 0, coef: 0 }),
      SCIENTIFIQUE: grouped.SCIENTIFIQUE.reduce((acc, g) => ({ points: acc.points + g.studentAverage * g.coeff, coef: acc.coef + g.coeff }), { points: 0, coef: 0 }),
      AUTRE: grouped.AUTRE.reduce((acc, g) => ({ points: acc.points + g.studentAverage * g.coeff, coef: acc.coef + g.coeff }), { points: 0, coef: 0 }),
      RELIGION: grouped.RELIGION.reduce((acc, g) => ({ points: acc.points + g.studentAverage * g.coeff, coef: acc.coef + g.coeff }), { points: 0, coef: 0 }),
    };

    const studentGeneralAverages: Record<string, number> = {};
    classListForRanking.forEach((st) => {
      const stEvals = evaluations.filter((e) => String(e.studentId) === String(st.id) && e.trimester === trimester);
      if (stEvals.length > 0) {
        let wSum = 0;
        let cSum = 0;
        const sMap: Record<string, { total: number; count: number; coeff: number }> = {};
        stEvals.forEach((e) => {
          const coeff = e.coefficient || DEFAULT_COEFFS[e.subject] || 1;
          if (!sMap[e.subject]) sMap[e.subject] = { total: 0, count: 0, coeff };
          sMap[e.subject].total += e.note;
          sMap[e.subject].count += 1;
        });
        Object.values(sMap).forEach((d) => {
          const avg = d.total / d.count;
          wSum += avg * d.coeff;
          cSum += d.coeff;
        });
        studentGeneralAverages[st.id] = cSum > 0 ? wSum / cSum : 0;
      }
    });
    const evaluatedStudents = Object.entries(studentGeneralAverages);
    const sortedAverages = evaluatedStudents
      .map(([id, avg]) => ({ id, avg }))
      .sort((a, b) => b.avg - a.avg);
    const rankIndex = sortedAverages.findIndex((x) => String(x.id) === String(student.id));
    const studentRank = rankIndex !== -1 ? rankIndex + 1 : 1;
    const allClassAvgs = sortedAverages.map((x) => x.avg);
    const classGeneralAverage = allClassAvgs.length > 0 ? allClassAvgs.reduce((a, b) => a + b, 0) / allClassAvgs.length : 0;
    const maxClassAverage = allClassAvgs.length > 0 ? Math.max(...allClassAvgs) : 0;
    const minClassAverage = allClassAvgs.length > 0 ? Math.min(...allClassAvgs) : 0;

    const schoolName = (school as any)?.name || (school as any)?.denomination || (school as any)?.ET_DENOMMINATION || (school as any)?.ET_NOM || 'GROUPE SCOLAIRE CONFESSIONNEL HÎNNEH - YAMOUSSOUKRO';
    const schoolPhone = (school as any)?.contacts || (school as any)?.phone || (school as any)?.ET_CONTACTS || (school as any)?.telephone || '+225 2530009862';
    const schoolCity = (school as any)?.city || (school as any)?.ET_VILLE || (school as any)?.ville || 'YAMOUSSOUKRO';
    const rawDrena = (school as any)?.drena || (school as any)?.region || (school as any)?.ET_REGION || '';
    const schoolDrena = rawDrena ? (rawDrena.toUpperCase().startsWith('DRENA') ? rawDrena : `DRENA ${rawDrena}`) : '';

    const trimesterLabel = trimester === 1 ? '1er Trimestre' : trimester === 2 ? '2e Trimestre' : '3e Trimestre';
    const schoolYear = '2025-2026';
    const formattedBirthDate = student.dateOfBirth
      ? new Date(student.dateOfBirth).toLocaleDateString('fr-FR')
      : '23/07/2010';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const toAbsoluteUrl = (url: string) => {
      if (!url) return '';
      if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
      if (url.startsWith('/')) return `${origin}${url}`;
      return `${origin}/${url}`;
    };
    const photoUrl = toAbsoluteUrl(student.photo || '');
    const logoUrl = toAbsoluteUrl((school as any)?.logo || (school as any)?.LOGO || '');

    const renderCategoryBlock = (catName: string, grades: SubjectGrade[], total: { points: number; coef: number }) => {
      if (grades.length === 0) return '';
      const catAvg = total.coef > 0 ? total.points / total.coef : 0;

      const rows = grades.map(g => `
        <tr>
          <td style="text-align: left; padding-left: 6px;">${g.subject}</td>
          <td>${fmt(g.studentAverage)}</td>
          <td>${fmt(g.coeff)}</td>
          <td>${fmt(g.studentAverage * g.coeff)}</td>
          <td>${getSubjectRank(g.subject, g.studentAverage, classListForRanking, classEvals)}</td>
          ${trimester === 3 ? `<td>${fmt(g.annAverage)}</td><td>${g.annRank}</td>` : ''}
          <td style="text-align: left;">${g.teacher}</td>
          <td style="text-align: left;">${g.appreciation}</td>
          <td></td>
        </tr>
      `).join('');

      return `
        ${rows}
        <tr class="cat-summary-row">
          <td style="text-align: left; font-weight: bold; text-transform: uppercase;">${catName}</td>
          <td style="font-weight: bold;">${fmt(catAvg)}</td>
          <td style="font-weight: bold;">${fmt(total.coef)}</td>
          <td style="font-weight: bold;">${fmt(total.points)}</td>
          <td></td>
          ${trimester === 3 ? `<td></td><td></td>` : ''}
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;
    };

    html += `
      <div class="bulletin-container ${index < students.length - 1 ? 'page-break' : ''}">
        
        <!-- HEADER DYNAMIQUE SELON L'ÉCOLE DU CONNECTÉ -->
        <table class="top-header-table">
          <tr>
            <td style="width: 55%; vertical-align: top;">
              <div class="republique">REPUBLIQUE DE COTE D'IVOIRE</div>
              <div class="ministere">MINISTERE DE L'EDUCATION NATIONALE ET DE L'ALPHABETISATION</div>
              ${schoolDrena ? `<div class="drena-meta" style="font-size: 8pt; font-weight: bold; margin-top: 2px;">${schoolDrena.toUpperCase()}</div>` : ''}
              <div class="school-name-title">${schoolName.toUpperCase()}</div>
            </td>
            <td style="width: 45%; vertical-align: top; text-align: right;">
              <div class="phone-meta">Telephone : <b>${schoolPhone}</b></div>
              <div class="year-meta">Année Scolaire : <b>${schoolYear}</b></div>
            </td>
          </tr>
        </table>

        <!-- MAIN TITLE -->
        <div class="main-bulletin-title">
          <span>BULLETIN DE NOTES</span> &nbsp;&nbsp;&nbsp; <span style="font-weight: bold;">${trimesterLabel}</span>
        </div>

        <!-- STUDENT IDENTIFICATION BOX -->
        <table class="student-info-box">
          <tr>
            <td style="width: 82%; vertical-align: top; padding: 6px 10px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
                <tr>
                  <td style="width: 18%; font-weight: bold;">NOM ET PRENOMS :</td>
                  <td style="width: 32%; font-weight: bold; font-size: 10.5pt;">${(student.lastName || student.nom || '').toUpperCase()} ${(student.firstName || student.prenom || '').toUpperCase()}</td>
                  <td style="width: 15%; font-weight: bold;">Sexe :</td>
                  <td style="width: 10%; font-weight: bold;">${student.gender || 'F'}</td>
                  <td style="width: 15%; font-weight: bold;">Redoublant :</td>
                  <td style="width: 10%; font-weight: bold;">${(student as any).repeater || (student as any).redoublant === 'OUI' ? 'OUI' : 'NON'}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold;">Matricule :</td>
                  <td style="font-weight: bold;">${student.matricule || '21434391T'}</td>
                  <td style="font-weight: bold;">Né(e) le :</td>
                  <td>${formattedBirthDate}</td>
                  <td style="font-weight: bold;">Boursier :</td>
                  <td>${(student as any).boursier ? 'OUI' : 'NON'}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold;">Classe :</td>
                  <td style="font-weight: bold;">${classRoom?.name || '6A'}</td>
                  <td style="font-weight: bold;">Lieu de Naissance :</td>
                  <td>${(student as any).birthPlace || (student as any).AU_LIEU_NAISSANCE || 'YAMOUSSOUKRO'}</td>
                  <td style="font-weight: bold;">Affecté :</td>
                  <td>${(student as any).statutAffecte || (student as any).statutOrientation || 'AFF'}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold;">Effectif :</td>
                  <td style="font-weight: bold;">${classListForRanking.length}</td>
                  <td style="font-weight: bold;">Nationalité :</td>
                  <td colspan="3">${(student as any).nationality || (student as any).AU_NATIONALITE || 'IVOIRIENNE'}</td>
                </tr>
              </table>
            </td>
            <td style="width: 18%; vertical-align: middle; text-align: center; border-left: 1px solid #000;">
              <div class="photo-box">
                ${photoUrl ? `<img src="${photoUrl}" alt="Photo" />` : 'PHOTO'}
              </div>
            </td>
          </tr>
        </table>

        <!-- GRADES TABLE EXACT PHOTO FORMAT -->
        <table class="main-grades-table">
          <thead>
            <tr>
              <th style="width: 25%; text-align: left; padding-left: 6px;">Matières</th>
              <th style="width: 8%;">Moy./20</th>
              <th style="width: 6%;">Coeff.</th>
              <th style="width: 9%;">M. Coef</th>
              <th style="width: 6%;">Rang</th>
              ${trimester === 3 ? `<th style="width: 8%;">M. Ann</th><th style="width: 6%;">Rg Ann</th>` : ''}
              <th style="width: 18%; text-align: left;">Nom du Prof</th>
              <th style="width: 14%; text-align: left;">Appréciation</th>
              <th style="width: 0%;">Signature</th>
            </tr>
          </thead>
          <tbody>
            ${renderCategoryBlock('LITTERAIRE', grouped.LITTERAIRE, groupTotals.LITTERAIRE)}
            ${renderCategoryBlock('SCIENTIFIQUE', grouped.SCIENTIFIQUE, groupTotals.SCIENTIFIQUE)}
            ${renderCategoryBlock('AUTRE', grouped.AUTRE, groupTotals.AUTRE)}
            ${renderCategoryBlock('RELIGION', grouped.RELIGION, groupTotals.RELIGION)}

            <tr class="total-general-row">
              <td style="text-align: left; font-weight: bold;">TOTAL GENERAL</td>
              <td></td>
              <td style="font-weight: bold;">${fmt(totalCoeffs)}</td>
              <td style="font-weight: bold;">${fmt(totalWeighted)}</td>
              <td></td>
              ${trimester === 3 ? `<td></td><td></td>` : ''}
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <!-- BOTTOM SECTION : 3 BLOCKS EXACT PHOTO LAYOUT -->
        <table class="bottom-blocks-table">
          <tr>
            <!-- BLOCK 1 : BILAN DU TRIMESTRE -->
            <td style="width: 32%; vertical-align: top; padding: 4px 6px;">
              <div class="block-title font-bold text-center border-b pb-1" style="font-size: 10pt;">Bilan du ${trimesterLabel}</div>
              <div style="margin-top: 6px; font-size: 9.5pt;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Moyenne :</span>
                  <span style="font-weight: bold; font-size: 11pt;">${fmt(studentGeneralAverage)} /20</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span>Rang :</span>
                  <span style="font-weight: bold; font-size: 11pt;">${rankLabel(studentRank)} / ${classListForRanking.length}</span>
                </div>

                <div style="font-weight: bold; font-size: 9pt; border-top: 1px solid #000; pt-1; margin-top: 4px;">Résultat de la classe</div>
                <div style="display: flex; justify-content: space-between; font-size: 8.5pt; margin-top: 2px;">
                  <span>Haute moyenne :</span>
                  <span>${fmt(maxClassAverage)} /20</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 8.5pt; margin-top: 1px;">
                  <span>Faible moyenne :</span>
                  <span>${fmt(minClassAverage)} /20</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 8.5pt; margin-top: 1px; margin-bottom: 6px;">
                  <span>Moyenne de la Classe :</span>
                  <span>${fmt(classGeneralAverage)} /20</span>
                </div>

                ${trimester === 3 ? `
                <div style="border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px;">
                  <div style="display: flex; justify-content: space-between; font-weight: bold;">
                    <span>Moyenne Annuelle :</span>
                    <span style="font-size: 10.5pt;">${fmt(studentGeneralAverage)} /20</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 2px;">
                    <span>Rang Annuel :</span>
                    <span>${rankLabel(studentRank)} / ${classListForRanking.length}</span>
                  </div>
                </div>

                <div style="margin-top: 6px; font-size: 8pt; border-top: 1px solid #ddd; padding-top: 4px;">
                  <div>1er Trim : <b>14.10</b> &nbsp; Rang : <b>8e</b></div>
                  <div>2e Trim : <b>15.14</b> &nbsp; Rang : <b>4e</b></div>
                </div>
                ` : trimester === 2 ? `
                <div style="margin-top: 6px; font-size: 8pt; border-top: 1px solid #ddd; padding-top: 4px;">
                  <div>1er Trim : <b>14.10</b> &nbsp; Rang : <b>8e</b></div>
                </div>
                ` : ''}
              </div>
            </td>

            <!-- BLOCK 2 : ASSIDUITÉ, DISTINCTIONS & APPRÉCIATIONS -->
            <td style="width: 38%; vertical-align: top; padding: 4px 6px; border-left: 1px solid #000; border-right: 1px solid #000;">
              <div style="font-size: 8pt; border-bottom: 1px solid #000; pb-1; text-align: center;">
                Heures d'absences justifiées : <b>0</b> &nbsp;&nbsp;&nbsp; Heures d'absences Non Justifiées : <b>0</b>
              </div>

              <div style="margin-top: 6px;">
                <div class="block-title font-bold text-center" style="font-size: 9.5pt; text-decoration: underline;">DISTINCTIONS</div>
                <div style="margin-top: 4px; font-size: 8.5pt; space-y-1;">
                  <div style="display: flex; align-items: center; gap: 6px;"><span class="sq-box"></span> Tableau d'honneur</div>
                  <div style="display: flex; align-items: center; gap: 6px;"><span class="sq-box"></span> Tableau d'honneur + Encouragement</div>
                  <div style="display: flex; align-items: center; gap: 6px;"><span class="sq-box ${studentGeneralAverage >= 14 ? 'checked' : ''}"></span> Tableau d'honneur + Félicitations</div>
                  <div style="display: flex; align-items: center; gap: 6px;"><span class="sq-box"></span> Refusé</div>
                </div>

                <div style="margin-top: 8px; border-top: 1px solid #000; pt-2;">
                  <div class="block-title font-bold text-center" style="font-size: 9.5pt; text-decoration: underline;">Appréciations du Conseil de Classe</div>
                  <div style="text-align: center; font-weight: bold; font-size: 11pt; margin-top: 4px; min-height: 24px;">
                    ${appreciation(studentGeneralAverage)}
                  </div>
                </div>

                <div style="margin-top: 10px; border-top: 1px solid #ddd; pt-2; text-align: center;">
                  <div style="font-weight: bold; font-size: 9pt; text-decoration: underline;">Le Professeur Principal</div>
                  <div style="font-weight: bold; font-size: 10pt; margin-top: 4px;">Mr SOUMAHORO LASSINA</div>
                </div>
              </div>
            </td>

            <!-- BLOCK 3 : SANCTIONS & VISA DIRECTION -->
            <td style="width: 30%; vertical-align: top; padding: 4px 6px;">
              <div class="block-title font-bold text-center" style="font-size: 9.5pt; text-decoration: underline;">SANCTIONS</div>
              <div style="margin-top: 4px; font-size: 8.5pt;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;"><span class="sq-box"></span> Avertissement pour travail</div>
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;"><span class="sq-box"></span> Blâme pour travail insuffisant</div>
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;"><span class="sq-box"></span> Avertissement pour mauvaise conduite</div>
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;"><span class="sq-box"></span> Blâme pour mauvaise conduite</div>
              </div>

              <div style="margin-top: 10px; border-top: 1px solid #000; padding-top: 4px; text-align: center;">
                <div style="font-weight: bold; font-size: 8.5pt; text-transform: uppercase; text-decoration: underline;">VISA DU CHEF D'ETABLISSEMENT</div>
                <div style="font-size: 8.5pt; margin-top: 2px; text-align: right;">${(schoolCity || 'KORHOGO').toUpperCase()} le, ${new Date().toLocaleDateString('fr-FR')}</div>
                ${((schoolCity || '').toLowerCase().includes('korhogo') || (schoolName || '').toLowerCase().includes('korhogo') || (student.classe_nom || student.className || '').toLowerCase().includes('korhogo') || ((student as any).codeEtablissement || '').toLowerCase().includes('kho') || ((student as any).codeEtablissement || '').toLowerCase().includes('csh-02')) ? `
                  <div style="height: 54px; margin-top: 2px; display: flex; align-items: center; justify-content: center;">
                    <img src="/images/signature_direction_korhogo_transparent.png" alt="Signature & Cachet Direction Korhogo" style="max-height: 54px; max-width: 100%; object-fit: contain; mix-blend-mode: multiply;" onerror="this.onerror=null; this.src='/images/signature_direction_korhogo.png';" />
                  </div>
                ` : `
                  <div style="height: 50px; margin-top: 6px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #999;">
                    Signature et Cachet
                  </div>
                `}
              </div>
            </td>
          </tr>
        </table>

        <!-- FOOTER BAR -->
        <div style="display: flex; justify-content: space-between; font-size: 7.5pt; margin-top: 10px; border-top: 1px solid #000; padding-top: 2px;">
          <span>${schoolName}</span>
          <span>Imprimé le ${new Date().toLocaleDateString('fr-FR')}</span>
        </div>

      </div>
    `;
  });

  printContent(html, origin);
};

const printContent = (htmlContent: string, origin: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>Bulletin de Notes - Hînneh Éducation</title>
          <base href="${origin}/">
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            @media print {
              body { padding: 0; background: #fff; }
              .page-break { page-break-after: always; }
              .no-print { display: none; }
              .bulletin-container { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; }
            }
            body {
              font-family: 'Times New Roman', Times, serif, Arial, sans-serif;
              font-size: 9pt;
              color: #000;
              background: #e5e7eb;
              margin: 0;
              padding: 10px;
            }
            .bulletin-container {
              width: 200mm;
              margin: 0 auto 20px auto;
              background: #fff;
              padding: 10px;
              box-sizing: border-box;
              border: 1px solid #000;
            }
            .top-header-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
            .republique { font-size: 8pt; font-weight: bold; }
            .ministere { font-size: 7.5pt; font-weight: bold; }
            .school-name-title { font-size: 11pt; font-weight: bold; margin-top: 4px; text-transform: uppercase; }
            .phone-meta, .year-meta { font-size: 9pt; }
            
            .main-bulletin-title {
              text-align: center;
              font-size: 14pt;
              font-weight: bold;
              margin: 6px 0;
              letter-spacing: 1px;
            }

            .student-info-box {
              width: 100%;
              border: 1px solid #000;
              border-collapse: collapse;
              margin-bottom: 6px;
            }
            .photo-box {
              width: 75px;
              height: 90px;
              border: 1px solid #000;
              margin: 0 auto;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 8pt;
              overflow: hidden;
            }
            .photo-box img { width: 100%; height: 100%; object-fit: cover; }

            .main-grades-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 6px;
            }
            .main-grades-table th, .main-grades-table td {
              border: 1px solid #000;
              padding: 3px 4px;
              font-size: 8.5pt;
              text-align: center;
            }
            .main-grades-table th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .cat-summary-row {
              background-color: #f8fafc;
              font-weight: bold;
            }
            .total-general-row {
              background-color: #e2e8f0;
              font-weight: bold;
            }

            .bottom-blocks-table {
              width: 100%;
              border: 1px solid #000;
              border-collapse: collapse;
            }
            .sq-box {
              width: 10px;
              height: 10px;
              border: 1px solid #000;
              display: inline-block;
            }
            .sq-box.checked::after {
              content: "✓";
              font-size: 9px;
              font-weight: bold;
              display: flex;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="max-width: 800px; margin: 0 auto 10px auto; display: flex; justify-content: space-between; align-items: center; background: #1e3a8a; color: white; padding: 10px 20px; border-radius: 6px;">
            <span style="font-weight: bold; font-size: 12px;">🖨️ Groupe Scolaire Hinneh - Bulletin Officiel</span>
            <button onclick="window.print()" style="background: white; color: #1e3a8a; border: none; padding: 6px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px;">Imprimer le Bulletin</button>
          </div>
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};
