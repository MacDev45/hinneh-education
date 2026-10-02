import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, Building2, Calendar, Sparkles, UserCheck, AlertTriangle, Plus, Trash2, Printer, CheckCircle2, Clock, BookOpen, ShieldAlert, Layers } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { printSchedule, printOfficialScheduleGrid, OFFICIAL_TIME_SLOTS, type OfficialScheduleData, printPrimaryOfficialMENASchedule } from "@/lib/printSchedule";
import { formatStudentName } from "@/lib/index";
import { PrimaryTimetableGrid } from "./PrimaryTimetableGrid";
import { isPrimaryClass } from "@/lib/primaryScheduleData";

interface ClassTimetableManagerProps {
  classes: any[];
  staff: any[];
  subjects: any[];
  attributions: any[];
  schools?: any[];
  selectedSchoolId?: string;
  selectedCityFilter?: string;
  onAttributionsUpdated: () => void;
}

const DAYS_OF_WEEK = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

const STANDARD_TIME_OPTIONS = [
  "07:30 - 08:20",
  "08:20 - 09:10",
  "09:10 - 10:00",
  "10:15 - 11:05",
  "11:05 - 11:55",
  "13:20 - 14:10",
  "14:10 - 15:00",
  "15:00 - 15:50",
  "07:30 - 09:10",
  "10:15 - 11:55",
  "13:20 - 15:00",
  "08:00 - 10:00",
  "10:00 - 12:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00"
];

export const ClassTimetableManager: React.FC<ClassTimetableManagerProps> = ({
  classes: propClasses,
  staff: propStaff,
  subjects: propSubjects,
  attributions: propAttributions,
  schools = [],
  selectedSchoolId: propSelectedSchoolId,
  selectedCityFilter: propSelectedCityFilter,
  onAttributionsUpdated
}) => {
  const [internalSchools, setInternalSchools] = useState<any[]>([]);
  const [internalStaff, setInternalStaff] = useState<any[]>([]);
  const [internalSubjects, setInternalSubjects] = useState<any[]>([]);
  const [internalClasses, setInternalClasses] = useState<any[]>([]);
  const [internalAttributions, setInternalAttributions] = useState<any[]>([]);

  const [selectedCity, setSelectedCity] = useState<string>(
    (propSelectedCityFilter && propSelectedCityFilter.trim() !== "") ? propSelectedCityFilter : "all"
  );
  const [selectedSchool, setSelectedSchool] = useState<string>(
    (propSelectedSchoolId && propSelectedSchoolId.trim() !== "") ? propSelectedSchoolId : "all"
  );

  // Auto-chargement de secours si les props sont vides
  useEffect(() => {
    if (!schools || schools.length === 0) {
      apiClient.getSchools().then((res: any) => {
        if (Array.isArray(res)) setInternalSchools(res);
      }).catch(err => console.error("Error loading schools in ClassTimetableManager:", err));
    }
  }, [schools]);

  useEffect(() => {
    if (!propStaff || propStaff.length === 0) {
      apiClient.getStaff().then((res: any) => {
        if (Array.isArray(res)) setInternalStaff(res);
      }).catch(err => console.error("Error loading staff:", err));
    }
    if (!propSubjects || propSubjects.length === 0) {
      apiClient.getSubjects().then((res: any) => {
        if (Array.isArray(res)) setInternalSubjects(res);
      }).catch(err => console.error("Error loading subjects:", err));
    }
    if (!propClasses || propClasses.length === 0) {
      apiClient.getClasses().then((res: any) => {
        if (Array.isArray(res)) setInternalClasses(res);
      }).catch(err => console.error("Error loading classes:", err));
    }
    if (!propAttributions || propAttributions.length === 0) {
      apiClient.getAttributions().then((res: any) => {
        if (Array.isArray(res)) setInternalAttributions(res);
      }).catch(err => console.error("Error loading attributions:", err));
    }
  }, [propStaff, propSubjects, propClasses, propAttributions]);

  const effectiveSchools = useMemo(() => (schools && schools.length > 0) ? schools : internalSchools, [schools, internalSchools]);
  const effectiveStaff = useMemo(() => (propStaff && propStaff.length > 0) ? propStaff : internalStaff, [propStaff, internalStaff]);
  const effectiveSubjects = useMemo(() => (propSubjects && propSubjects.length > 0) ? propSubjects : internalSubjects, [propSubjects, internalSubjects]);
  const effectiveClasses = useMemo(() => (propClasses && propClasses.length > 0) ? propClasses : internalClasses, [propClasses, internalClasses]);
  const effectiveAttributions = useMemo(() => (propAttributions && propAttributions.length > 0) ? propAttributions : internalAttributions, [propAttributions, internalAttributions]);

  // Synchroniser avec les props externes si elles changent
  useEffect(() => {
    if (propSelectedCityFilter !== undefined) {
      setSelectedCity((propSelectedCityFilter && propSelectedCityFilter.trim() !== "") ? propSelectedCityFilter : "all");
    }
  }, [propSelectedCityFilter]);

  useEffect(() => {
    if (propSelectedSchoolId !== undefined) {
      setSelectedSchool((propSelectedSchoolId && propSelectedSchoolId.trim() !== "") ? propSelectedSchoolId : "all");
    }
  }, [propSelectedSchoolId]);

  // Villes uniques disponibles
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    effectiveSchools.forEach(s => {
      const v = s.city || s.ET_VILLE || s.ville;
      if (v) set.add(v.trim());
    });
    effectiveClasses.forEach(c => {
      const v = c.city || c.ville;
      if (v) set.add(v.trim());
    });
    return Array.from(set).sort();
  }, [effectiveSchools, effectiveClasses]);

  // Écoles filtrées par la ville sélectionnée
  const filteredSchools = useMemo(() => {
    if (selectedCity === "all" || !selectedCity) return effectiveSchools;
    return effectiveSchools.filter(s => {
      const v = s.city || s.ET_VILLE || s.ville || "";
      return v.toLowerCase().trim() === selectedCity.toLowerCase().trim();
    });
  }, [effectiveSchools, selectedCity]);

  // Classes filtrées par l'école et la ville sélectionnées
  const filteredClasses = useMemo(() => {
    return effectiveClasses.filter(c => {
      if (selectedSchool && selectedSchool !== "all") {
        const cSchId = String(c.schoolId || c.ecole_id || "");
        const cCode = String(c.ET_CODEETABLISSEMENT || c.schoolCode || "");
        if (cSchId !== String(selectedSchool) && cCode !== String(selectedSchool)) {
          return false;
        }
      }
      if (selectedCity && selectedCity !== "all") {
        const sch = effectiveSchools.find(s =>
          String(s.id || s.IDETABLISSEMENT) === String(c.schoolId || c.ecole_id) ||
          String(s.code || s.ET_CODEETABLISSEMENT) === String(c.ET_CODEETABLISSEMENT || c.schoolCode)
        );
        const v = sch?.city || sch?.ET_VILLE || sch?.ville || c.city || c.ville || "";
        if (v && v.toLowerCase().trim() !== selectedCity.toLowerCase().trim()) {
          return false;
        }
      }
      return true;
    });
  }, [effectiveClasses, selectedSchool, selectedCity, effectiveSchools]);

  const [selectedClassId, setSelectedClassId] = useState<string>("");

  // Mettre à jour la classe sélectionnée si la sélection actuelle n'est plus dans les classes filtrées
  useEffect(() => {
    if (filteredClasses.length > 0) {
      const exists = filteredClasses.some(c => String(c.id) === String(selectedClassId));
      if (!exists) {
        setSelectedClassId(String(filteredClasses[0].id));
      }
    } else if (effectiveClasses.length > 0 && selectedSchool === "all" && selectedCity === "all") {
      setSelectedClassId(String(effectiveClasses[0].id));
    }
  }, [filteredClasses, selectedClassId, effectiveClasses, selectedSchool, selectedCity]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false);
  
  // États pour l'ajout individuel d'un cours / créneau
  const [addSlotOpen, setAddSlotOpen] = useState(false);
  const [slotJour, setSlotJour] = useState("Lundi");
  const [slotHeure, setSlotHeure] = useState("08:00 - 10:00");
  const [slotMatiereId, setSlotMatiereId] = useState("");
  const [slotTeacherId, setSlotTeacherId] = useState("");
  const [slotSalle, setSlotSalle] = useState("Salle de cours");
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  // Cohérence de l'emploi du temps avec le programme scolaire officiel du cycle
  const [programmeCoherence, setProgrammeCoherence] = useState<any>(null);
  const [loadingCoherence, setLoadingCoherence] = useState(false);

  const selectedClass = useMemo(() => {
    return effectiveClasses.find(c => String(c.id) === String(selectedClassId));
  }, [effectiveClasses, selectedClassId]);

  const isCurrentClassPrimary = useMemo(() => {
    return isPrimaryClass(selectedClass?.name || selectedClass?.CE_LIBELLE, selectedClass?.CY_LIBELLECYCLE);
  }, [selectedClass]);

  const [activeViewMode, setActiveViewMode] = useState<'standard' | 'primary_official'>('standard');

  useEffect(() => {
    if (isCurrentClassPrimary) {
      setActiveViewMode('primary_official');
    }
  }, [isCurrentClassPrimary, selectedClassId]);

  // École rattachée à la classe sélectionnée
  const targetSchool = useMemo(() => {
    if (!selectedClass) return null;
    return effectiveSchools.find(s =>
      String(s.id || s.IDETABLISSEMENT) === String(selectedClass.schoolId || selectedClass.ecole_id) ||
      String(s.code || s.ET_CODEETABLISSEMENT) === String(selectedClass.ET_CODEETABLISSEMENT || selectedClass.schoolCode)
    ) || null;
  }, [selectedClass, effectiveSchools]);


  // Ville rattachée à la classe
  const targetCity = useMemo(() => {
    return targetSchool?.city || targetSchool?.ET_VILLE || targetSchool?.ville || selectedClass?.city || selectedClass?.ville || (typeof localStorage !== 'undefined' ? (localStorage.getItem('user_ville') || 'Abidjan') : 'Abidjan');
  }, [targetSchool, selectedClass]);

  // Enseignants filtrés
  const teachers = useMemo(() => {
    const list = effectiveStaff.filter(s => {
      const f = (s.fonction || s.role || "").toLowerCase();
      return !f || f.includes("enseign") || f.includes("prof") || f.includes("coran") || f.includes("arabe") || f.includes("maitre") || f.includes("instituteur") || f === "autre" || f === "personnel";
    });
    return list.length > 0 ? list : effectiveStaff;
  }, [effectiveStaff]);

  // Attributions de la classe sélectionnée
  const classAttributions = useMemo(() => {
    return effectiveAttributions.filter(a => String(a.classe_id) === String(selectedClassId));
  }, [effectiveAttributions, selectedClassId]);

  // Recharger la cohérence avec le programme officiel dès qu'on change de classe ou que
  // ses créneaux sont modifiés (ajout, suppression, régénération...).
  useEffect(() => {
    if (!selectedClassId) {
      setProgrammeCoherence(null);
      return;
    }
    let cancelled = false;
    setLoadingCoherence(true);
    apiClient.getClassProgrammeCoherence(selectedClassId)
      .then((data) => { if (!cancelled) setProgrammeCoherence(data); })
      .catch(() => { if (!cancelled) setProgrammeCoherence(null); })
      .finally(() => { if (!cancelled) setLoadingCoherence(false); });
    return () => { cancelled = true; };
  }, [selectedClassId, classAttributions.length]);

  // Fonction pour vérifier si un créneau horaire chevauche un autre
  const isTimeOverlapping = (slot1: string, slot2: string): boolean => {
    if (!slot1 || !slot2) return false;
    try {
      const parseSlot = (s: string) => {
        if (!s) return null;
        const clean = s.trim().toLowerCase().replace(/h/g, ':');
        const parts = clean.split('-');
        if (parts.length !== 2) return null;
        const toMins = (str: string) => {
          const sub = str.trim().split(':');
          const h = parseInt(sub[0] || '0', 10);
          const m = sub.length > 1 && sub[1] ? parseInt(sub[1], 10) : 0;
          return isNaN(h) ? 0 : h * 60 + (isNaN(m) ? 0 : m);
        };
        const start = toMins(parts[0]);
        const end = toMins(parts[1]);
        return { start, end };
      };
      const t1 = parseSlot(slot1);
      const t2 = parseSlot(slot2);
      if (!t1 || !t2) return slot1.trim().toLowerCase() === slot2.trim().toLowerCase();
      return t1.start < t2.end && t2.start < t1.end;
    } catch {
      return slot1.trim().toLowerCase() === slot2.trim().toLowerCase();
    }
  };

  // Détecter la disponibilité d'un enseignant pour un créneau donné
  const getTeacherAvailability = (teacherId: number | string, jour: string, heure: string, currentAttrId: number) => {
    if (!teacherId || !jour || !heure) return { available: true };

    const conflict = effectiveAttributions.find(a => 
      String(a.enseignant_id) === String(teacherId) &&
      a.id !== currentAttrId &&
      a.jour?.toLowerCase().trim() === jour.toLowerCase().trim() &&
      isTimeOverlapping(a.heure, heure)
    );

    if (conflict) {
      const conflictClass = effectiveClasses.find(c => String(c.id) === String(conflict.classe_id));
      const conflictSubj = effectiveSubjects.find(s => String(s.id) === String(conflict.matiere_id));
      const className = conflictClass?.name || conflictClass?.CE_LIBELLE || `Classe #${conflict.classe_id}`;
      const subjName = conflictSubj?.libelle || "Cours";
      return {
        available: false,
        reason: `Occupé en ${className} (${subjName}, ${conflict.heure})`,
        className,
        subjName,
        heure: conflict.heure
      };
    }
    return { available: true };
  };

  const refreshAllAttributions = async () => {
    try {
      const updated = await apiClient.getAttributions();
      if (Array.isArray(updated)) {
        setInternalAttributions(updated);
      }
    } catch (e) {
      console.error("Failed to fetch fresh attributions", e);
    }
    onAttributionsUpdated();
  };

  // Générer automatiquement la grille standard prédéfinie
  const handleGenerateTemplate = async () => {
    if (!selectedClassId) {
      toast.error("Veuillez sélectionner une classe.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await apiClient.generateClassScheduleTemplate({
        classe_id: parseInt(selectedClassId, 10),
        replace_existing: true
      });
      toast.success(res.message || "Emploi du temps prédéfini généré avec succès !");
      setConfirmGenerateOpen(false);
      await refreshAllAttributions();
    } catch (err: any) {
      console.error("Erreur de génération :", err);
      toast.error(err.response?.data?.detail || "Échec de la génération automatique.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Ajouter un cours individuel
  const handleAddSlotSubmit = async () => {
    if (!selectedClassId || !slotMatiereId || !slotJour || !slotHeure) {
      toast.error("Veuillez sélectionner au moins la matière, le jour et la plage horaire.");
      return;
    }

    if (slotTeacherId && slotTeacherId !== "unassigned") {
      const check = getTeacherAvailability(slotTeacherId, slotJour, slotHeure, 0);
      if (!check.available) {
        const teacherObj = effectiveStaff.find(s => String(s.id) === String(slotTeacherId));
        const teacherName = teacherObj ? formatStudentName(teacherObj) : "Cet enseignant";
        toast.error(
          `⛔ Conflit : ${teacherName} est déjà programmé en ${check.className} (${check.subjName}) le ${slotJour} à ${slotHeure}.`,
          { duration: 5000 }
        );
        return;
      }
    }

    setIsAddingSlot(true);
    try {
      await apiClient.createAttribution({
        classe_id: parseInt(selectedClassId, 10),
        matiere_id: parseInt(slotMatiereId, 10),
        enseignant_id: (slotTeacherId && slotTeacherId !== "unassigned") ? parseInt(slotTeacherId, 10) : undefined,
        jour: slotJour,
        heure: slotHeure,
        salle: slotSalle || "Salle de cours",
        statut: "actif",
        groupe: "Classe entière"
      });
      toast.success("Nouveau cours ajouté avec succès !");
      setAddSlotOpen(false);
      setSlotMatiereId("");
      setSlotTeacherId("");
      await refreshAllAttributions();
    } catch (err: any) {
      console.error("Erreur d'ajout de cours :", err);
      toast.error(err.response?.data?.detail || "Impossible d'ajouter ce cours.");
    } finally {
      setIsAddingSlot(false);
    }
  };

  // Assigner un enseignant à un créneau (avec blocage anti-collision)
  const handleAssignTeacher = async (attributionId: number, teacherId: number | null) => {
    const slot = classAttributions.find(a => a.id === attributionId);
    if (slot && teacherId) {
      const check = getTeacherAvailability(teacherId, slot.jour, slot.heure, slot.id);
      if (!check.available) {
        const teacherObj = effectiveStaff.find(s => String(s.id) === String(teacherId));
        const teacherName = teacherObj ? formatStudentName(teacherObj) : "Cet enseignant";
        toast.error(
          `⛔ Conflit d'emploi du temps : ${teacherName} est déjà programmé en ${check.className} (${check.subjName}) le ${slot.jour} à ${slot.heure}.`,
          { duration: 5000 }
        );
        return;
      }
    }

    try {
      const res = await apiClient.assignTeacherToSlot({
        attribution_id: attributionId,
        enseignant_id: teacherId ?? undefined
      });
      toast.success(res.message || "Attribution mise à jour avec succès !");
      await refreshAllAttributions();
    } catch (err: any) {
      console.error("Erreur d'attribution :", err);
      toast.error(err.response?.data?.detail || "Conflit d'horaire détecté.");
    }
  };

  // Supprimer un créneau
  const handleDeleteSlot = async (attributionId: number) => {
    try {
      await apiClient.deleteAttribution(attributionId);
      toast.success("Créneau supprimé.");
      await refreshAllAttributions();
    } catch (err: any) {
      toast.error("Impossible de supprimer ce créneau.");
    }
  };

  // Imprimer l'emploi du temps de la classe
  const handlePrint = () => {
    if (!selectedClass) return;
    const weekData = DAYS_OF_WEEK.map(day => {
      const slots = classAttributions
        .filter(a => a.jour?.toLowerCase() === day.toLowerCase())
        .sort((a, b) => (a.heure || "").localeCompare(b.heure || ""))
        .map(a => {
          const subj = effectiveSubjects.find(s => String(s.id) === String(a.matiere_id));
          const teacherObj = effectiveStaff.find(s => String(s.id) === String(a.enseignant_id));
          return {
            time: a.heure,
            matiere: subj ? subj.libelle : "Matière",
            classe: selectedClass.name || selectedClass.CE_LIBELLE,
            salle: a.salle || "Salle de cours",
            type: (subj?.code || "").toLowerCase().includes("islam") ? "islamique" : "cours",
            teacherName: teacherObj ? formatStudentName(teacherObj) : "Non assigné"
          };
        });
      return { day, slots };
    });

    const finalSchoolName = targetSchool?.name || targetSchool?.ET_LIBELLEETABLISSEMENT || (typeof localStorage !== 'undefined' ? (localStorage.getItem('user_ecole_name') || 'Établissement Scolaire') : 'Établissement Scolaire');

    printSchedule(weekData, `Emploi du temps - ${selectedClass.name || selectedClass.CE_LIBELLE}`, {
      name: `Classe ${selectedClass.name || selectedClass.CE_LIBELLE}`,
      classeName: selectedClass.name || selectedClass.CE_LIBELLE,
      matiere: "Toutes disciplines",
      schoolName: finalSchoolName,
      city: targetCity,
      ville: targetCity,
      schoolCode: targetSchool?.code || targetSchool?.ET_CODEETABLISSEMENT,
      anneeScolaire: "2026-2027"
    });
  };

  // Imprimer la grille horaire officielle confessionnelle (modèle 2025)
  const handlePrintOfficial = () => {
    if (!selectedClass) return;
    const finalSchoolName = targetSchool?.name || targetSchool?.ET_LIBELLEETABLISSEMENT || (typeof localStorage !== 'undefined' ? (localStorage.getItem('user_ecole_name') || 'Établissement Scolaire') : 'Établissement Scolaire');

    // Construire l'objet OfficialScheduleData à partir des attributions
    const officialData: OfficialScheduleData = {};
    OFFICIAL_TIME_SLOTS.forEach(slot => {
      if (slot.isBreak) return; // on ne renseigne que les créneaux de cours
      officialData[slot.id] = {};
    });

    const normalizeTime = (t: string) => t.toLowerCase().replace(/h/g, ':').replace(/\s+/g, '');

    classAttributions.forEach(a => {
      const subj = effectiveSubjects.find(s => String(s.id) === String(a.matiere_id));
      const heureNorm = normalizeTime(a.heure || '');
      const day = (a.jour || '').toUpperCase();

      const slotPayload = {
        matiere: subj ? subj.libelle : 'Matière',
        classe: selectedClass.name || selectedClass.CE_LIBELLE,
        salle: a.salle || ''
      };

      // Table de correspondance étendue (monocréneaux et blocs 2h)
      const targetSlotIds: string[] = [];
      if (heureNorm.includes('07:30-08:20') || heureNorm.includes('7:30-8:20')) targetSlotIds.push('c1');
      else if (heureNorm.includes('08:20-09:10') || heureNorm.includes('8:20-9:10')) targetSlotIds.push('c2');
      else if (heureNorm.includes('09:10-10:00') || heureNorm.includes('9:10-10:00')) targetSlotIds.push('c3');
      else if (heureNorm.includes('10:15-11:05')) targetSlotIds.push('c4');
      else if (heureNorm.includes('11:05-11:55')) targetSlotIds.push('c5');
      else if (heureNorm.includes('13:20-14:10')) targetSlotIds.push('c6');
      else if (heureNorm.includes('14:10-15:00')) targetSlotIds.push('c7');
      else if (heureNorm.includes('15:00-15:50')) targetSlotIds.push('c8');
      // Blocs combinés
      else if (heureNorm.includes('07:30-09:10') || heureNorm.includes('7:30-9:10')) targetSlotIds.push('c1', 'c2');
      else if (heureNorm.includes('08:00-10:00')) targetSlotIds.push('c1', 'c2', 'c3');
      else if (heureNorm.includes('10:15-11:55')) targetSlotIds.push('c4', 'c5');
      else if (heureNorm.includes('10:00-12:00')) targetSlotIds.push('c4', 'c5');
      else if (heureNorm.includes('13:20-15:00')) targetSlotIds.push('c6', 'c7');
      else if (heureNorm.includes('14:00-16:00')) targetSlotIds.push('c6', 'c7', 'c8');
      else if (heureNorm.includes('16:00-18:00')) targetSlotIds.push('c8');
      else {
        // Fallback matching
        const match = OFFICIAL_TIME_SLOTS.find(sl => !sl.isBreak && normalizeTime(sl.label).includes(heureNorm));
        if (match) targetSlotIds.push(match.id);
      }

      targetSlotIds.forEach(sId => {
        if (!officialData[sId]) officialData[sId] = {};
        officialData[sId][day] = slotPayload;
      });
    });

    printOfficialScheduleGrid(officialData, {
      schoolName: finalSchoolName,
      city: targetCity,
      classeName: selectedClass.name || selectedClass.CE_LIBELLE,
      isTeacherMode: false,
      anneeScolaire: "2025-2026"
    });
  };

  // Imprimer l'emploi du temps officiel primaire réaménagé (MENA / DPFC)
  const handlePrintPrimary = () => {
    if (!selectedClass) return;
    const finalSchoolName = targetSchool?.name || targetSchool?.ET_LIBELLEETABLISSEMENT || (typeof localStorage !== 'undefined' ? (localStorage.getItem('user_ecole_name') || 'Établissement Scolaire') : 'Établissement Scolaire');
    printPrimaryOfficialMENASchedule({
      classeName: selectedClass.name || selectedClass.CE_LIBELLE || 'CM1',
      ecoleName: finalSchoolName,
      anneeScolaire: '2026-2027'
    });
  };

  return (
    <div className="space-y-6">
      {/* ── BARRE D'ACTIONS ET SÉLECTEURS VILLE / ÉCOLE / CLASSE ── */}
      <Card className="border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-50/50 via-sky-50/30 to-background shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Filtres de sélection : Ville, École, Classe */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Filtre Ville */}
              {availableCities.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-indigo-600" />
                    Ville
                  </Label>
                  <Select value={selectedCity} onValueChange={(val) => {
                    setSelectedCity(val);
                    setSelectedSchool("all");
                  }}>
                    <SelectTrigger className="w-[160px] h-9 text-xs font-semibold bg-white dark:bg-slate-900 border-indigo-200">
                      <SelectValue placeholder="Toutes les villes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs font-bold">Toutes les villes</SelectItem>
                      {availableCities.map(city => (
                        <SelectItem key={city} value={city} className="text-xs font-medium">
                          📍 {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Filtre École / Établissement */}
              {effectiveSchools.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-indigo-600" />
                    Établissement (École)
                  </Label>
                  <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                    <SelectTrigger className="w-[210px] h-9 text-xs font-semibold bg-white dark:bg-slate-900 border-indigo-200 truncate">
                      <SelectValue placeholder="Tous les établissements" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs font-bold">Tous les établissements</SelectItem>
                      {filteredSchools.map(sch => (
                        <SelectItem key={sch.id || sch.IDETABLISSEMENT} value={String(sch.id || sch.IDETABLISSEMENT)} className="text-xs font-medium">
                          🏫 {sch.name || sch.ET_LIBELLEETABLISSEMENT} {(sch.city || sch.ET_VILLE) ? `(${sch.city || sch.ET_VILLE})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sélection de la classe cible */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-indigo-600" />
                  Classe Cible
                </Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-[230px] h-9 font-bold text-xs bg-white dark:bg-slate-900 border-indigo-300 text-indigo-950 dark:text-indigo-100">
                    <SelectValue placeholder={filteredClasses.length === 0 ? "Aucune classe trouvée" : "Choisir une classe..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredClasses.length === 0 ? (
                      <SelectItem value="none" disabled className="text-xs italic text-muted-foreground">
                        Aucune classe trouvée
                      </SelectItem>
                    ) : (
                      filteredClasses.map(c => (
                        <SelectItem key={c.id} value={String(c.id)} className="font-semibold text-xs">
                          {c.name || c.CE_LIBELLE} {c.CY_LIBELLECYCLE ? `(${c.CY_LIBELLECYCLE})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Message informatif si aucune classe n'est trouvée avec bouton de réinitialisation */}
            {filteredClasses.length === 0 && classes.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Aucune classe enregistrée pour cet établissement ou cette ville.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCity("all");
                    setSelectedSchool("all");
                  }}
                  className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 rounded font-bold text-[11px] transition-colors"
                >
                  Afficher toutes les classes ({classes.length})
                </button>
              </div>
            )}

            {/* Boutons d'action : Imprimer, Ajouter cours & Générer */}
            <div className="flex flex-wrap items-center gap-2 justify-end pt-2 lg:pt-0">
              {isCurrentClassPrimary ? (
                <Button
                  size="sm"
                  onClick={handlePrintPrimary}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 shadow-xs"
                >
                  <Printer className="h-4 w-4" />
                  Imprimer Fiche MENA ({selectedClass?.name || 'Primaire'})
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintPrimary}
                  className="gap-1.5 border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-semibold h-9"
                >
                  <Printer className="h-4 w-4 text-emerald-600" />
                  Modèle MENA Primaire
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={classAttributions.length === 0}
                className="gap-1.5 border-slate-300 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-semibold h-9"
              >
                <Printer className="h-4 w-4 text-indigo-600" />
                Imprimer Emploi du Temps
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintOfficial}
                disabled={classAttributions.length === 0}
                className="gap-1.5 border-emerald-300 hover:bg-emerald-50 text-emerald-700 dark:text-emerald-300 font-semibold h-9"
              >
                <Printer className="h-4 w-4 text-emerald-600" />
                Grille Officielle 2025
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSlotJour("Lundi");
                  setAddSlotOpen(true);
                }}
                disabled={!selectedClassId}
                className="gap-1.5 border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 font-bold h-9"
              >
                <Plus className="h-4 w-4 text-indigo-600" />
                Ajouter un Cours
              </Button>

              <Button
                size="sm"
                onClick={() => setConfirmGenerateOpen(true)}
                disabled={!selectedClassId}
                className="gap-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold shadow-xs h-9"
              >
                <Sparkles className="h-4 w-4" />
                Générer Grille Prédéfinie
              </Button>
            </div>
          </div>

          {/* Badge récapitulatif du périmètre actuel de l'emploi du temps */}
          {selectedClass && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-indigo-100/70 dark:border-indigo-900/30 text-xs">
              <span className="text-muted-foreground font-medium">Périmètre de cet emploi du temps :</span>
              <Badge variant="outline" className="gap-1 bg-white/80 dark:bg-slate-900/80 border-indigo-200 text-indigo-900 dark:text-indigo-200 font-semibold">
                <MapPin className="h-3 w-3 text-indigo-600" />
                Ville : <strong className="text-indigo-700 dark:text-indigo-300">{targetCity}</strong>
              </Badge>
              <Badge variant="outline" className="gap-1 bg-white/80 dark:bg-slate-900/80 border-indigo-200 text-indigo-900 dark:text-indigo-200 font-semibold">
                <Building2 className="h-3 w-3 text-indigo-600" />
                Établissement : <strong className="text-indigo-700 dark:text-indigo-300">{targetSchool?.name || targetSchool?.ET_LIBELLEETABLISSEMENT || 'Tous établissements'}</strong>
              </Badge>
              <Badge variant="secondary" className="gap-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 font-bold">
                <Calendar className="h-3 w-3 text-indigo-600" />
                Classe : {selectedClass.name || selectedClass.CE_LIBELLE}
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs ml-auto">
                {classAttributions.length} cours configuré(s)
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── DIALOGUE D'AJOUT MANUEL D'UN COURS ── */}
      <Dialog open={addSlotOpen} onOpenChange={setAddSlotOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-950">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Ajouter un cours à l'emploi du temps
            </DialogTitle>
            <DialogDescription>
              Programmez une matière pour la classe <strong>{selectedClass?.name || selectedClass?.CE_LIBELLE}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              {/* Jour */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">Jour</Label>
                <Select value={slotJour} onValueChange={setSlotJour}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(d => (
                      <SelectItem key={d} value={d} className="text-xs font-semibold">{d}</SelectItem>
                    ))}
                    <SelectItem value="Samedi" className="text-xs font-semibold">Samedi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Plage horaire */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">Plage horaire</Label>
                <Select value={slotHeure} onValueChange={setSlotHeure}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_TIME_OPTIONS.map(h => (
                      <SelectItem key={h} value={h} className="text-xs font-mono">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Matière */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Matière *</Label>
              <Select value={slotMatiereId} onValueChange={setSlotMatiereId}>
                <SelectTrigger className="h-9 text-xs font-semibold">
                  <SelectValue placeholder="Choisir la discipline..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {effectiveSubjects.map(s => (
                    <SelectItem key={s.id} value={String(s.id)} className="text-xs font-medium">
                      {s.libelle} {s.code ? `(${s.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Enseignant assigné */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Enseignant (optionnel)</Label>
              <Select value={slotTeacherId} onValueChange={setSlotTeacherId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="— Aucun enseignant assigné —" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="unassigned" className="text-xs italic text-muted-foreground">
                    — Aucun enseignant assigné —
                  </SelectItem>
                  {teachers.map(t => {
                    const check = getTeacherAvailability(t.id, slotJour, slotHeure, 0);
                    return (
                      <SelectItem
                        key={t.id}
                        value={String(t.id)}
                        disabled={!check.available}
                        className={`text-xs ${!check.available ? "opacity-60 text-red-600 line-through" : ""}`}
                      >
                        {formatStudentName(t)} {!check.available ? `(⛔ ${check.reason})` : " (✅ Libre)"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Salle */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Salle de cours</Label>
              <Input
                placeholder="Ex: Salle 101, Laboratoire..."
                value={slotSalle}
                onChange={e => setSlotSalle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddSlotOpen(false)}>Annuler</Button>
            <Button
              onClick={handleAddSlotSubmit}
              disabled={isAddingSlot || !slotMatiereId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {isAddingSlot ? "Enregistrement..." : "Ajouter ce cours"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOGUE DE CONFIRMATION DE GÉNÉRATION ── */}
      <Dialog open={confirmGenerateOpen} onOpenChange={setConfirmGenerateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-950">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Générer l'Emploi du Temps Prédéfini
            </DialogTitle>
            <DialogDescription>
              Le système va générer automatiquement les créneaux officiels (Lundi au Vendredi) avec la répartition horaire standard des matières (Maths, Français, Anglais, SVT, Physique, EPS, Éducation Islamique...) adaptée au niveau <strong>{selectedClass?.name || selectedClass?.CE_LIBELLE}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Attribution rapide des enseignants :
            </div>
            <p>
              Une fois les créneaux générés, il vous suffira de sélectionner les enseignants pour chaque cours. Le système vérifiera automatiquement en temps réel qu'aucun enseignant n'est doublement programmé à la même heure.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmGenerateOpen(false)}>Annuler</Button>
            <Button
              onClick={handleGenerateTemplate}
              disabled={isGenerating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {isGenerating ? "Génération en cours..." : "Confirmer la Génération"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── SÉLECTEUR DE FORMAT D'EMPLOI DU TEMPS ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={activeViewMode === 'primary_official' ? 'default' : 'outline'}
            onClick={() => setActiveViewMode('primary_official')}
            className={`text-xs font-bold gap-1.5 h-8.5 ${
              activeViewMode === 'primary_official'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                : 'border-slate-300 text-slate-700 dark:text-slate-200'
            }`}
          >
            🏛️ Grille Officielle Primaire (MENA - DPFC)
            {isCurrentClassPrimary && (
              <Badge className="bg-white/25 text-white text-[9px] px-1 py-0 ml-1">Recommandé</Badge>
            )}
          </Button>

          <Button
            size="sm"
            variant={activeViewMode === 'standard' ? 'default' : 'outline'}
            onClick={() => setActiveViewMode('standard')}
            className={`text-xs font-bold gap-1.5 h-8.5 ${
              activeViewMode === 'standard'
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                : 'border-slate-300 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Grille Hebdomadaire Standard ({classAttributions.length} cours)
          </Button>
        </div>

        {activeViewMode === 'primary_official' && (
          <Button
            size="sm"
            onClick={handlePrintPrimary}
            className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold h-8.5 text-xs shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimer la Grille Officielle MENA
          </Button>
        )}
      </div>

      {/* ── COHÉRENCE AVEC LE PROGRAMME SCOLAIRE OFFICIEL DU CYCLE ── */}
      {loadingCoherence && (
        <p className="text-[10px] text-slate-400 px-1">Vérification de la cohérence avec le programme officiel...</p>
      )}
      {programmeCoherence && !loadingCoherence && (
        <Card className="border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <BookOpen className="h-3.5 w-3.5" />
                Cohérence avec le programme officiel ({programmeCoherence.template_utilise})
              </CardTitle>
              <Badge
                className={
                  programmeCoherence.coherent
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-amber-100 text-amber-800 border-amber-300"
                }
              >
                {programmeCoherence.nb_conformes}/{programmeCoherence.nb_matieres_programme} matières conformes
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {programmeCoherence.matieres.map((m: any) => {
                const styles: Record<string, string> = {
                  conforme: "bg-emerald-50 text-emerald-700 border-emerald-300",
                  manquant: "bg-red-50 text-red-700 border-red-300",
                  insuffisant: "bg-amber-50 text-amber-700 border-amber-300",
                  exces: "bg-sky-50 text-sky-700 border-sky-300",
                };
                const labels: Record<string, string> = {
                  conforme: "✓ conforme",
                  manquant: "manquant",
                  insuffisant: `insuffisant (${m.ecart_heures}h)`,
                  exces: `en excès (+${m.ecart_heures}h)`,
                };
                return (
                  <Badge
                    key={m.code}
                    variant="outline"
                    title={`${m.libelle} : ${m.heures_reelles}h planifiées / ${m.heures_prevues}h prévues au programme`}
                    className={`text-[10px] font-semibold ${styles[m.statut] || ""}`}
                  >
                    {m.libelle} — {labels[m.statut] || m.statut}
                  </Badge>
                );
              })}
            </div>
            {programmeCoherence.hors_programme?.length > 0 && (
              <p className="text-[10px] text-slate-500">
                ⚠️ Hors programme officiel du cycle :{" "}
                {programmeCoherence.hors_programme.map((h: any) => `${h.libelle} (${h.heures_reelles}h)`).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeViewMode === 'primary_official' ? (
        <PrimaryTimetableGrid
          classeName={selectedClass?.name || selectedClass?.CE_LIBELLE || 'CM1'}
          ecoleName={targetSchool?.name || targetSchool?.ET_LIBELLEETABLISSEMENT}
          anneeScolaire="2026-2027"
        />
      ) : classAttributions.length === 0 ? (
        <Card className="border-dashed border-2 p-12 text-center bg-slate-50/50">
          <div className="max-w-md mx-auto space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Aucun cours configuré pour {selectedClass?.name || "cette classe"}</h3>
            <p className="text-xs text-muted-foreground">
              Générez automatiquement la grille hebdomadaire prédéfinie ou ajoutez vos matières créneau par créneau.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button
                onClick={() => setConfirmGenerateOpen(true)}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                <Sparkles className="h-4 w-4" />
                Générer la grille prédéfinie
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSlotJour("Lundi");
                  setAddSlotOpen(true);
                }}
                className="gap-2 border-indigo-300 text-indigo-700 font-bold"
              >
                <Plus className="h-4 w-4" />
                Ajouter manuellement un cours
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {DAYS_OF_WEEK.map(day => {
            const daySlots = classAttributions
              .filter(a => a.jour?.toLowerCase() === day.toLowerCase())
              .sort((a, b) => (a.heure || "").localeCompare(b.heure || ""));

            return (
              <Card key={day} className="overflow-hidden border-slate-200 shadow-xs flex flex-col">
                <div className="bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-slate-800 dark:to-slate-800/80 px-3.5 py-2.5 border-b border-indigo-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="font-extrabold text-indigo-900 dark:text-indigo-200 text-sm">{day}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-900 border-indigo-200 text-indigo-700 font-bold px-1.5 py-0.5">
                      {daySlots.length} cours
                    </Badge>
                    <button
                      onClick={() => {
                        setSlotJour(day);
                        setAddSlotOpen(true);
                      }}
                      className="p-1 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                      title={`Ajouter un cours le ${day}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <CardContent className="p-2.5 space-y-2.5 flex-1 bg-slate-50/40 dark:bg-slate-900/20">
                  {daySlots.map(slot => {
                    const subj = effectiveSubjects.find(s => String(s.id) === String(slot.matiere_id));
                    const assignedTeacher = effectiveStaff.find(s => String(s.id) === String(slot.enseignant_id));
                    const isIslamic = (subj?.code || "").toLowerCase().includes("islam") || (subj?.libelle || "").toLowerCase().includes("islam");

                    return (
                      <div
                        key={slot.id}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isIslamic 
                            ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60" 
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        } shadow-2xs hover:shadow-xs`}
                      >
                        {/* Heure et Suppression */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span className="font-mono font-bold text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-indigo-500" />
                            {slot.heure}
                          </span>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-0.5"
                            title="Supprimer ce créneau"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Matière */}
                        <div className="font-black text-xs text-indigo-950 dark:text-indigo-100 line-clamp-1 mb-1">
                          {subj?.libelle || "Matière"}
                        </div>

                        {/* Salle */}
                        <div className="text-[10px] text-slate-500 font-medium mb-2">
                          📍 {slot.salle || "Salle de cours"}
                        </div>

                        {/* SÉLECTEUR D'ENSEIGNANT ANTI-COLLISION */}
                        <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          <Label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <UserCheck className="h-3 w-3 text-indigo-600" />
                            Enseignant :
                          </Label>

                          <Select
                            value={slot.enseignant_id ? String(slot.enseignant_id) : "unassigned"}
                            onValueChange={(val) => {
                              if (val === "unassigned") {
                                handleAssignTeacher(slot.id, null);
                              } else {
                                handleAssignTeacher(slot.id, parseInt(val, 10));
                              }
                            }}
                          >
                            <SelectTrigger className={`h-7 text-[11px] font-medium ${assignedTeacher ? "bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border-indigo-200" : "bg-amber-50/70 text-amber-900 border-amber-300 font-semibold"}`}>
                              <SelectValue placeholder="⚠️ Non assigné" />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              <SelectItem value="unassigned" className="text-xs py-1.5 text-muted-foreground font-medium">
                                <em>— Aucun enseignant assigné —</em>
                              </SelectItem>

                              {teachers.map(t => {
                                const check = getTeacherAvailability(t.id, slot.jour, slot.heure, slot.id);
                                const isCurrent = String(slot.enseignant_id) === String(t.id);

                                return (
                                  <SelectItem
                                    key={t.id}
                                    value={String(t.id)}
                                    disabled={!check.available && !isCurrent}
                                    className={`text-xs py-1.5 ${!check.available && !isCurrent ? "opacity-60 bg-red-50/40 dark:bg-red-950/20 text-red-700 cursor-not-allowed" : ""}`}
                                  >
                                    <div className="flex items-center justify-between w-full gap-2">
                                      <span className={`font-semibold ${!check.available && !isCurrent ? "text-red-700 line-through" : ""}`}>
                                        {formatStudentName(t)}
                                      </span>
                                      {isCurrent ? (
                                        <Badge className="text-[9px] bg-indigo-600 text-white px-1.5 py-0">Actuel</Badge>
                                      ) : check.available ? (
                                        <span className="text-[10px] text-emerald-600 font-bold">✅ Libre</span>
                                      ) : (
                                        <Badge variant="outline" className="text-[9px] border-red-200 bg-red-100/70 text-red-700 font-bold px-1 py-0">
                                          ⛔ {check.reason}
                                        </Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}

                  {daySlots.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground italic flex flex-col items-center gap-2">
                      <span>Aucun cours</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSlotJour(day);
                          setAddSlotOpen(true);
                        }}
                        className="h-7 text-xs text-indigo-600 hover:bg-indigo-50"
                      >
                        + Ajouter un cours
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
