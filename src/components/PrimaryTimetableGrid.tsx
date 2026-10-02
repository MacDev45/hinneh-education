import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { MENA_PRIMARY_SCHEDULE_CM1, type PrimaryDaySchedule } from '@/lib/primaryScheduleData';
import { printPrimaryOfficialMENASchedule } from '@/lib/printSchedule';

interface PrimaryTimetableGridProps {
  className?: string;
  classeName?: string;
  ecoleName?: string;
  anneeScolaire?: string;
  customData?: PrimaryDaySchedule[];
  readOnly?: boolean;
}

export const PrimaryTimetableGrid: React.FC<PrimaryTimetableGridProps> = ({
  className = '',
  classeName = 'CM1',
  ecoleName,
  anneeScolaire = '2026-2027',
  customData,
}) => {
  const scheduleData = customData || MENA_PRIMARY_SCHEDULE_CM1;

  const handlePrint = () => {
    printPrimaryOfficialMENASchedule({
      classeName,
      ecoleName: ecoleName || (typeof localStorage !== 'undefined' ? (localStorage.getItem('user_ecole_name') || 'École Primaire Confessionnelle HINNEH') : 'École Primaire'),
      anneeScolaire,
    });
  };

  // Détecter l'activité en cours selon l'heure actuelle
  const now = new Date();
  const currentDayIndex = now.getDay(); // 1=Lundi, 2=Mardi, 4=Jeudi, 5=Vendredi
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentMinutesTotal = currentHours * 60 + currentMinutes;

  const getDayNameByIndex = (idx: number) => {
    if (idx === 1) return 'LUNDI';
    if (idx === 2) return 'MARDI';
    if (idx === 4) return 'JEUDI';
    if (idx === 5) return 'VENDREDI';
    return null;
  };

  const todayName = getDayNameByIndex(currentDayIndex);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ── BANNIÈRE OFFICIELLE MENA / DPFC ── */}
      <div className="relative overflow-hidden rounded-xl border-2 border-lime-300 bg-gradient-to-br from-lime-50 via-emerald-50/60 to-yellow-50/50 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[11px] font-black uppercase tracking-wider">
              🏛️ Ministère de l'Éducation Nationale et de l'Alphabétisation (MENA)
            </div>
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">
              Direction de la Pédagogie et de la Formation Continue (DPFC)
            </p>
            <h2 className="text-xl md:text-2xl font-black text-blue-950 uppercase tracking-tight flex items-center gap-2 justify-center md:justify-start">
              <span>Enseignement Primaire — Emploi du Temps Réaménagé</span>
            </h2>
            <div className="flex items-center gap-2 pt-1 justify-center md:justify-start">
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-1 uppercase tracking-widest shadow-xs">
                Classe : {classeName}
              </Badge>
              <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-white/80 font-bold text-xs">
                Année Scolaire : {anneeScolaire}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
            <Button
              onClick={handlePrint}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-md h-10 px-4"
            >
              <Printer className="h-4 w-4" />
              Imprimer la Fiche Officielle (PDF)
            </Button>
          </div>
        </div>
      </div>

      {/* ── LÉGENDE PÉDAGOGIQUE ── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-700 dark:text-slate-300">
        <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] mr-1">
          Légende officielle :
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#fef08a] text-[#854d0e] font-bold border border-yellow-300">
          Français / Lecture / Écriture / Poésie / Chant
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#93c5fd] text-[#1e3a8a] font-bold border border-blue-300">
          Mathématiques (acq / ex / remédiation)
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#ef4444] text-white font-bold border border-red-500">
          Sciences et technologie
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#22c55e] text-white font-bold border border-green-500">
          Transition (5')
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#60a5fa] text-white font-bold border border-blue-400">
          EPS
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#fbcfe8] text-[#831843] font-bold border border-pink-300">
          Histoire-Géographie / EDHC
        </span>
      </div>

      {/* ── GRILLE 2X2 CONFORME AU DOCUMENT OFFICIEL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Colonne Gauche : LUNDI & MARDI */}
        <div className="space-y-4">
          {scheduleData.filter(d => d.day === 'LUNDI' || d.day === 'MARDI').map(dayObj => (
            <DayTableCard
              key={dayObj.day}
              dayObj={dayObj}
              isToday={todayName === dayObj.day}
              currentMinutesTotal={currentMinutesTotal}
            />
          ))}
        </div>

        {/* Colonne Droite : JEUDI & VENDREDI */}
        <div className="space-y-4">
          {scheduleData.filter(d => d.day === 'JEUDI' || d.day === 'VENDREDI').map(dayObj => (
            <DayTableCard
              key={dayObj.day}
              dayObj={dayObj}
              isToday={todayName === dayObj.day}
              currentMinutesTotal={currentMinutesTotal}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface DayTableCardProps {
  dayObj: PrimaryDaySchedule;
  isToday: boolean;
  currentMinutesTotal: number;
}

const DayTableCard: React.FC<DayTableCardProps> = ({ dayObj, isToday }) => {
  return (
    <Card className={`overflow-hidden border-2 transition-all ${isToday ? 'border-indigo-400 shadow-md ring-2 ring-indigo-200/50' : 'border-slate-300 shadow-xs'}`}>
      <div className="flex">
        {/* Bandeau latéral vertical avec le Nom du Jour */}
        <div
          className={`flex items-center justify-center font-black text-sm tracking-widest px-2 py-4 select-none ${
            isToday
              ? 'bg-indigo-700 text-white'
              : 'bg-slate-800 text-white'
          }`}
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {dayObj.day}
        </div>

        {/* Tableau des créneaux */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-extrabold border-b border-slate-300">
                <th className="py-1.5 px-3 text-center border-r border-slate-300 w-[110px]">HORAIRES</th>
                <th className="py-1.5 px-3 text-left border-r border-slate-300">ACTIVITES</th>
                <th className="py-1.5 px-3 text-center w-[70px]">DUREE</th>
              </tr>
            </thead>
            <tbody>
              {dayObj.items.map((item, idx) => {
                if (item.type === 'break' || item.type === 'header') {
                  return (
                    <tr
                      key={idx}
                      style={{ backgroundColor: item.bgColor }}
                      className="border-b border-slate-300 font-black tracking-widest text-[11px] text-center"
                    >
                      <td colSpan={3} className="py-1.5 px-3 uppercase" style={{ color: item.textColor }}>
                        {item.activite} {item.duree && item.duree !== '—' && `(${item.duree})`}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={idx}
                    style={{ backgroundColor: item.bgColor }}
                    className="border-b border-slate-200/80 transition-colors hover:brightness-95"
                  >
                    <td className="py-1 px-3 font-mono font-bold text-center border-r border-black/10 text-slate-900 text-[11px] whitespace-nowrap">
                      {item.heure}
                    </td>
                    <td className="py-1 px-3 font-bold border-r border-black/10 text-[11.5px]" style={{ color: item.textColor }}>
                      {item.activite}
                    </td>
                    <td className="py-1 px-3 font-mono font-bold text-center text-slate-900 text-[11px]">
                      {item.duree}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};
