export interface PrimaryScheduleItem {
  heure: string;
  activite: string;
  duree: string;
  type: 'francais' | 'maths' | 'sciences' | 'transition' | 'eps' | 'decouverte' | 'break' | 'header';
  bgColor?: string;
  textColor?: string;
}

export interface PrimaryDaySchedule {
  day: string;
  items: PrimaryScheduleItem[];
}

export const MENA_PRIMARY_SCHEDULE_CM1: PrimaryDaySchedule[] = [
  {
    day: 'LUNDI',
    items: [
      { heure: '7h45-8h00', activite: 'Salut aux couleurs', duree: "15'", type: 'decouverte', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '8h00-8h05', activite: 'Transition', duree: "5'", type: 'transition', bgColor: '#22c55e', textColor: '#ffffff' },
      { heure: '8h05-8h35', activite: 'Lecture 1', duree: "30'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '8h35-8h40', activite: 'Transition', duree: "5'", type: 'transition', bgColor: '#22c55e', textColor: '#ffffff' },
      { heure: '8h40-9h25', activite: 'Mathématiques (acq.)', duree: "45'", type: 'maths', bgColor: '#93c5fd', textColor: '#1e3a8a' },
      { heure: '9h25-10h00', activite: 'Expression orale 1', duree: "35'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '10h00-10h15', activite: 'R É C R É A T I O N', duree: "15'", type: 'break', bgColor: '#e0f2fe', textColor: '#0369a1' },
      { heure: '10h15-11h00', activite: 'Remédiation Français', duree: "45'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '11h00-11h30', activite: 'Lecture 2', duree: "30'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '11h30-11h55', activite: 'Chant', duree: "25'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '11h55-12h15', activite: 'Écriture', duree: "20'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '12h15-14h30', activite: 'A P R È S - M I D I (Pause)', duree: "2h15", type: 'header', bgColor: '#f1f5f9', textColor: '#334155' },
      { heure: '14h30-15h10', activite: 'Histoire/géographie', duree: "40'", type: 'decouverte', bgColor: '#fbcfe8', textColor: '#831843' },
      { heure: '15h10-15h30', activite: 'Mathématiques (ex)', duree: "20'", type: 'maths', bgColor: '#93c5fd', textColor: '#1e3a8a' },
      { heure: '15h30-16h00', activite: 'Expression écrite 1', duree: "30'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '16h00-16h15', activite: 'R É C R É A T I O N', duree: "15'", type: 'break', bgColor: '#e0f2fe', textColor: '#0369a1' },
      { heure: '16h15-17h00', activite: 'Reméd. Mathématiques', duree: "45'", type: 'maths', bgColor: '#93c5fd', textColor: '#1e3a8a' },
      { heure: '17h00-17h30', activite: 'EDHC/AEC', duree: "30'", type: 'decouverte', bgColor: '#f3e8ff', textColor: '#581c87' },
    ]
  },
  {
    day: 'MARDI',
    items: [
      { heure: '7h45-8h10', activite: 'Expl de texte 1 (vocab)', duree: "25'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '8h10-8h15', activite: 'Transition', duree: "5'", type: 'transition', bgColor: '#22c55e', textColor: '#ffffff' },
      { heure: '8h15-9h00', activite: 'Mathématiques (acq)', duree: "45'", type: 'maths', bgColor: '#93c5fd', textColor: '#1e3a8a' },
      { heure: '9h00-9h30', activite: 'Expression orale 2', duree: "30'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '9h30-10h00', activite: 'Expression écrite 2', duree: "30'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '10h00-10h15', activite: 'R É C R É A T I O N', duree: "15'", type: 'break', bgColor: '#e0f2fe', textColor: '#0369a1' },
      { heure: '10h15-11h00', activite: 'Remédiation français', duree: "45'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '11h00-11h25', activite: 'Expl de texte 1 (orth)', duree: "25'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '11h25-11h45', activite: 'Poésie', duree: "20'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '11h45-12h15', activite: 'Mathématiques exercices', duree: "30'", type: 'maths', bgColor: '#93c5fd', textColor: '#1e3a8a' },
      { heure: '12h15-14h30', activite: 'A P R È S - M I D I (Pause)', duree: "2h15", type: 'header', bgColor: '#f1f5f9', textColor: '#334155' },
      { heure: '14h30-15h15', activite: 'Sciences et technologie', duree: "45'", type: 'sciences', bgColor: '#ef4444', textColor: '#ffffff' },
      { heure: '15h15-15h40', activite: 'Lecture 1&2 (renfo)', duree: "25'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '15h40-16h00', activite: 'Expl de texte (renfo)', duree: "20'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '16h00-16h15', activite: 'R É C R É A T I O N', duree: "15'", type: 'break', bgColor: '#e0f2fe', textColor: '#0369a1' },
      { heure: '16h15-17h00', activite: 'Remédiation Mathémat.', duree: "45'", type: 'maths', bgColor: '#93c5fd', textColor: '#1e3a8a' },
      { heure: '17h00-17h30', activite: 'Sciences et technologie (renforcement)', duree: "30'", type: 'sciences', bgColor: '#ef4444', textColor: '#ffffff' },
    ]
  },
  {
    day: 'JEUDI',
    items: [
      { heure: '7h45-8h25', activite: 'EPS', duree: "40'", type: 'eps', bgColor: '#60a5fa', textColor: '#ffffff' },
      { heure: '8h25-8h30', activite: 'Transition', duree: "5'", type: 'transition', bgColor: '#22c55e', textColor: '#ffffff' },
      { heure: '8h30-9h15', activite: 'Mathématiques (acq)', duree: "45'", type: 'maths', bgColor: '#93c5fd', textColor: '#1e3a8a' },
      { heure: '9h15-9h20', activite: 'Transition', duree: "5'", type: 'transition', bgColor: '#22c55e', textColor: '#ffffff' },
      { heure: '9h20-10h00', activite: 'Sciences et technologie', duree: "40'", type: 'sciences', bgColor: '#ef4444', textColor: '#ffffff' },
      { heure: '10h00-10h15', activite: 'R É C R É A T I O N', duree: "15'", type: 'break', bgColor: '#e0f2fe', textColor: '#0369a1' },
      { heure: '10h15-11h00', activite: 'Remédiation français', duree: "45'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '11h00-11h05', activite: 'Transition', duree: "5'", type: 'transition', bgColor: '#22c55e', textColor: '#ffffff' },
      { heure: '11h05-11h40', activite: 'Math exercices', duree: "35'", type: 'maths', bgColor: '#93c5fd', textColor: '#1e3a8a' },
      { heure: '11h40-12h15', activite: 'Lecture 1', duree: "35'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '12h15-14h30', activite: 'A P R È S - M I D I (Pause)', duree: "2h15", type: 'header', bgColor: '#f1f5f9', textColor: '#334155' },
      { heure: '14h30-15h00', activite: 'LECTURE 2', duree: "30'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '15h00-15h30', activite: 'Dictée (préparation)', duree: "30'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '15h30-16h00', activite: 'Expression orale', duree: "30'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '16h00-16h15', activite: 'R É C R É A T I O N', duree: "15'", type: 'break', bgColor: '#e0f2fe', textColor: '#0369a1' },
      { heure: '16h15-17h00', activite: 'Reméd. mathématiques', duree: "45'", type: 'maths', bgColor: '#93c5fd', textColor: '#1e3a8a' },
      { heure: '17h00-17h30', activite: 'Expression écrite 3', duree: "30'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
    ]
  },
  {
    day: 'VENDREDI',
    items: [
      { heure: '7h45-8h10', activite: 'Expl de texte 2 (gramm)', duree: "25'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '8h10-8h15', activite: 'Transition', duree: "5'", type: 'transition', bgColor: '#22c55e', textColor: '#ffffff' },
      { heure: '8h15-9h00', activite: 'Mathématiques (acq)', duree: "45'", type: 'maths', bgColor: '#93c5fd', textColor: '#1e3a8a' },
      { heure: '9h00-9h25', activite: 'Expl de texte 2 (conj)', duree: "25'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '9h25-10h00', activite: 'Sces et techno (renfo.)', duree: "35'", type: 'sciences', bgColor: '#ef4444', textColor: '#ffffff' },
      { heure: '10h00-10h15', activite: 'R É C R É A T I O N', duree: "15'", type: 'break', bgColor: '#e0f2fe', textColor: '#0369a1' },
      { heure: '10h15-11h00', activite: 'Remédiation français', duree: "45'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '11h00-11h25', activite: 'Écriture', duree: "25'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '11h25-11h55', activite: 'Dictée 2 (admin)', duree: "30'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '11h55-12h15', activite: 'Mathématiques (exercices)', duree: "20'", type: 'maths', bgColor: '#93c5fd', textColor: '#1e3a8a' },
      { heure: '12h15-14h30', activite: 'A P R È S - M I D I (Pause)', duree: "2h15", type: 'header', bgColor: '#f1f5f9', textColor: '#334155' },
      { heure: '14h30-15h10', activite: 'Sces et techno (soutien)', duree: "40'", type: 'sciences', bgColor: '#ef4444', textColor: '#ffffff' },
      { heure: '15h10-15h35', activite: 'Poésie', duree: "25'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '15h35-16h00', activite: 'Animation lecture', duree: "25'", type: 'francais', bgColor: '#fef08a', textColor: '#854d0e' },
      { heure: '16h00-16h15', activite: 'R É C R É A T I O N', duree: "15'", type: 'break', bgColor: '#e0f2fe', textColor: '#0369a1' },
      { heure: '16h15-17h00', activite: 'Remédiation math', duree: "45'", type: 'maths', bgColor: '#93c5fd', textColor: '#1e3a8a' },
      { heure: '17h00-17h20', activite: 'Activités entrepreneuriales', duree: "20'", type: 'decouverte', bgColor: '#fed7aa', textColor: '#9a3412' },
      { heure: '17h20-17h30', activite: 'Salut aux couleurs', duree: "10'", type: 'decouverte', bgColor: '#fef08a', textColor: '#854d0e' },
    ]
  }
];

export function isPrimaryClass(className?: string, cycleName?: string): boolean {
  const n = (className || '').toLowerCase();
  const c = (cycleName || '').toLowerCase();
  return (
    n.includes('cp') ||
    n.includes('ce1') ||
    n.includes('ce2') ||
    n.includes('cm1') ||
    n.includes('cm2') ||
    n.includes('prim') ||
    c.includes('prim') ||
    n.includes('cours')
  );
}
