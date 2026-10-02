import { useState, useEffect } from 'react';
import {
  HeartPulse, Search, Filter, Printer, Eye, Edit3, Save,
  AlertTriangle, ShieldCheck, UserCheck, FileText, CheckCircle2,
  Users, Stethoscope, RefreshCw, X, AlertCircle, Phone
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { matchStudentSearch } from '@/lib/index';
import apiClient from '@/lib/apiClient';
import { printFicheSante } from '@/lib/ficheSantePrinter';

export default function ControleMedicalSpace() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>('all');
  const [selectedFilterPathology, setSelectedFilterPathology] = useState<string>('all');

  // Selected student for editing / detail modal
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stRes, clRes, scRes] = await Promise.all([
        apiClient.getStudents(),
        apiClient.getClasses(),
        apiClient.getSchools(),
      ]);
      setStudents(stRes || []);
      setClasses(clRes || []);
      setSchools(scRes || []);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur de chargement',
        description: 'Impossible de charger les données médicales des élèves.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Utility function to parse health JSON safely
  const parseStudentMedical = (student: any) => {
    let parsed: any = {};
    if (student.notes_sante || student.notesSante || student.healthNotes) {
      try {
        const raw = student.notes_sante || student.notesSante || student.healthNotes;
        parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {}
    }

    return {
      groupeSanguin: parsed.groupeSanguin || student.groupeSanguin || student.groupe_sanguin || 'A+',
      rhesus: parsed.rhesus || student.rhesus || '+',
      allergiesAlimentaires: parsed.allergiesAlimentaires || student.allergiesAlimentaires || student.allergies_alimentaires || '',
      allergiesMedicamenteuses: parsed.allergiesMedicamenteuses || student.allergiesMedicamenteuses || student.allergies_medicamenteuses || '',
      etatVaccinal: parsed.etatVaccinal || student.etatVaccinal || student.etat_vaccinal || 'À jour',
      hasAsthme: Boolean(parsed.hasAsthme ?? student.hasAsthme ?? student.has_asthme ?? false),
      asthmeTraitement: parsed.asthmeTraitement || student.asthmeTraitement || student.asthme_traitement || '',
      hasDrepanocytose: Boolean(parsed.hasDrepanocytose ?? student.hasDrepanocytose ?? student.has_drepanocytose ?? false),
      drepanocytoseTraitement: parsed.drepanocytoseTraitement || student.drepanocytoseTraitement || student.drepanocytose_traitement || '',
      hasEpilepsie: Boolean(parsed.hasEpilepsie ?? student.hasEpilepsie ?? student.has_epilepsie ?? false),
      epilepsieTraitement: parsed.epilepsieTraitement || student.epilepsieTraitement || student.epilepsie_traitement || '',
      hasHandicap: Boolean(parsed.hasHandicap ?? student.hasHandicap ?? student.has_handicap ?? student.AU_HANDICAP ?? false),
      handicapPrecision: parsed.handicapPrecision || student.handicapPrecision || student.handicap_precision || student.AU_AUTRESHANDICAP || '',
      autresPathologies: parsed.autresPathologies || student.autresPathologies || student.autres_pathologies || '',
      autresTraitement: parsed.autresTraitement || student.autresTraitement || student.autres_traitement || '',
      dispenseSportive: Boolean(parsed.dispenseSportive ?? student.dispenseSportive ?? student.dispense_sportive ?? false),
      dispensePrecision: parsed.dispensePrecision || student.dispensePrecision || student.dispense_precision || '',
      medecin1Contact: parsed.medecin1Contact || student.medecin1Contact || student.medecin1_contact || '',
      medecin2Contact: parsed.medecin2Contact || student.medecin2Contact || student.medecin2_contact || '',
      nomAssurance: parsed.nomAssurance || student.nomAssurance || student.nom_assurance || '',
    };
  };

  // Filtered Students list
  const filteredStudents = students.filter(st => {
    // 1. Text search match
    if (search.trim() && !matchStudentSearch(st, search)) return false;

    // 2. School filter (Strict match by ID & ET_CODEETABLISSEMENT)
    if (selectedSchool !== 'all') {
      const schObj = schools.find((s: any) => String(s.IDETABLISSEMENT || s.id) === selectedSchool);
      const schCode = schObj?.ET_CODEETABLISSEMENT || schObj?.code || '';
      const stEcoleId = String(st.ecole_id || st.schoolId || '');
      const stCode = String(st.ET_CODEETABLISSEMENT || st.code_etablissement || st.codeEtablissement || '');

      const matchById = stEcoleId === selectedSchool;
      const matchByCode = Boolean(schCode && stCode && schCode.toUpperCase() === stCode.toUpperCase());

      if (!matchById && !matchByCode) return false;
    }

    // 3. Class filter
    if (selectedClass !== 'all' && String(st.classe_id) !== selectedClass) return false;

    // 4. Blood Group filter
    if (selectedBloodGroup !== 'all') {
      const med = parseStudentMedical(st);
      if (!med.groupeSanguin.toUpperCase().includes(selectedBloodGroup.toUpperCase())) return false;
    }

    // 5. Pathology filter
    if (selectedFilterPathology !== 'all') {
      const med = parseStudentMedical(st);
      if (selectedFilterPathology === 'asthme' && !med.hasAsthme) return false;
      if (selectedFilterPathology === 'drepanocytose' && !med.hasDrepanocytose) return false;
      if (selectedFilterPathology === 'epilepsie' && !med.hasEpilepsie) return false;
      if (selectedFilterPathology === 'handicap' && !med.hasHandicap) return false;
      if (selectedFilterPathology === 'dispense' && !med.dispenseSportive) return false;
    }

    return true;
  });

  // Calculate Medical KPIs
  const totalFiches = students.length;
  const countAsthme = students.filter(s => parseStudentMedical(s).hasAsthme).length;
  const countDrepanocytose = students.filter(s => parseStudentMedical(s).hasDrepanocytose).length;
  const countEpilepsie = students.filter(s => parseStudentMedical(s).hasEpilepsie).length;
  const countHandicap = students.filter(s => parseStudentMedical(s).hasHandicap).length;
  const countDispense = students.filter(s => parseStudentMedical(s).dispenseSportive).length;

  const handleOpenStudentMedicalModal = (student: any) => {
    const med = parseStudentMedical(student);
    setSelectedStudent({
      ...student,
      ...med,
    });
    setOpenModal(true);
  };

  const handleSaveMedicalRecord = async () => {
    if (!selectedStudent) return;
    try {
      const healthData = {
        groupeSanguin: selectedStudent.groupeSanguin || 'A+',
        rhesus: selectedStudent.rhesus || '+',
        allergiesAlimentaires: selectedStudent.allergiesAlimentaires || '',
        allergiesMedicamenteuses: selectedStudent.allergiesMedicamenteuses || '',
        etatVaccinal: selectedStudent.etatVaccinal || 'À jour',
        hasAsthme: Boolean(selectedStudent.hasAsthme),
        asthmeTraitement: selectedStudent.asthmeTraitement || '',
        hasDrepanocytose: Boolean(selectedStudent.hasDrepanocytose),
        drepanocytoseTraitement: selectedStudent.drepanocytoseTraitement || '',
        hasEpilepsie: Boolean(selectedStudent.hasEpilepsie),
        epilepsieTraitement: selectedStudent.epilepsieTraitement || '',
        hasHandicap: Boolean(selectedStudent.hasHandicap),
        handicapPrecision: selectedStudent.handicapPrecision || '',
        autresPathologies: selectedStudent.autresPathologies || '',
        autresTraitement: selectedStudent.autresTraitement || '',
        dispenseSportive: Boolean(selectedStudent.dispenseSportive),
        dispensePrecision: selectedStudent.dispensePrecision || '',
        medecin1Contact: selectedStudent.medecin1Contact || '',
        medecin2Contact: selectedStudent.medecin2Contact || '',
        nomAssurance: selectedStudent.nomAssurance || '',
      };

      const notesSanteJson = JSON.stringify(healthData);

      await apiClient.updateStudent(selectedStudent.id, {
        notes_sante: notesSanteJson,
      });

      // Update local state immediately for instant UI & KPI refresh
      setStudents(prev => prev.map(s => {
        if (String(s.id) === String(selectedStudent.id)) {
          return {
            ...s,
            notes_sante: notesSanteJson,
            ...healthData,
            groupe_sanguin: healthData.groupeSanguin,
            has_asthme: healthData.hasAsthme,
            has_drepanocytose: healthData.hasDrepanocytose,
            has_epilepsie: healthData.hasEpilepsie,
            has_handicap: healthData.hasHandicap,
            dispense_sportive: healthData.dispenseSportive,
          };
        }
        return s;
      }));

      toast({
        title: 'Fiche de santé enregistrée',
        description: `Le dossier médical de ${selectedStudent.firstName || selectedStudent.prenom || selectedStudent.nom} a été mis à jour avec succès.`,
      });
      setOpenModal(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur d\'enregistrement',
        description: 'Impossible d\'enregistrer la fiche de santé.'
      });
    }
  };

  const handlePrintStudentFiche = (st: any) => {
    const clsObj = classes.find((c: any) => String(c.id) === String(st.classe_id));
    const className = clsObj?.CE_LIBELLE || clsObj?.name || st.className || st.AU_CLASSEPRECEDENTE || 'Classe Non Spécifiée';
    const med = parseStudentMedical(st);

    printFicheSante({
      nomPrenoms: `${st.lastName || st.nom || ''} ${st.firstName || st.prenom || ''}`,
      dateNaissance: typeof st.dateOfBirth === 'string' ? st.dateOfBirth : (st.date_naissance || ''),
      sexe: st.gender || st.genre || 'M',
      classe: className,
      photoUrl: st.photo || '',
      parentContacts: [
        { nomPrenom: st.AU_TUTEURLEGAL || st.AU_PERENOMPRENOMS || 'Tuteur Légal', contact: st.AU_CONTACTS || st.AU_PERECONTACTS || 'N/A' }
      ],
      groupeSanguin: med.groupeSanguin,
      rhesus: med.rhesus,
      allergiesAlimentaires: med.allergiesAlimentaires || 'Aucune',
      allergiesMedicamenteuses: med.allergiesMedicamenteuses || 'Aucune',
      etatVaccinal: med.etatVaccinal,
      asthme: med.hasAsthme,
      asthmeTraitement: med.asthmeTraitement,
      drepanocytose: med.hasDrepanocytose,
      drepanocytoseTraitement: med.drepanocytoseTraitement,
      epilepsie: med.hasEpilepsie,
      epilepsieTraitement: med.epilepsieTraitement,
      handicap: med.hasHandicap,
      handicapPrecision: med.handicapPrecision,
      autresPathologies: med.autresPathologies,
      autresTraitement: med.autresTraitement,
      dispenseSportive: med.dispenseSportive,
      dispensePrecision: med.dispensePrecision,
      medecin1Contact: med.medecin1Contact,
      medecin2Contact: med.medecin2Contact,
      nomAssurance: med.nomAssurance,
    });
  };

  return (
    <Layout title="Contrôle Médical & Santé" description="Suivi des dossiers médicaux, fiches de santé, pathologies et urgences par élève">
      <div className="space-y-6">

        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <HeartPulse className="w-8 h-8 text-rose-400" />
              Contrôle Médical & Suivi Santé des Élèves
            </h1>
            <p className="text-xs text-rose-200">
              Registres d'infirmerie, fiches de santé officielles, antécédents médicaux & urgences.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={loadData} variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser Registre
            </Button>
          </div>
        </div>

        {/* MEDICAL KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-rose-500 shadow-xs">
            <CardContent className="p-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Asthme</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1">{countAsthme}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Ordonnances d'urgence</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-xs">
            <CardContent className="p-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Drépanocytose</p>
              <h3 className="text-2xl font-black text-purple-600 mt-1">{countDrepanocytose}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Suivis hématologie</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 shadow-xs">
            <CardContent className="p-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Épilepsie</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">{countEpilepsie}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Protocole de crise</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-xs">
            <CardContent className="p-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Handicap</p>
              <h3 className="text-2xl font-black text-blue-600 mt-1">{countHandicap}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Auditif / Visuel / Moteur</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 shadow-xs">
            <CardContent className="p-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Dispenses EPS</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{countDispense}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Exemptions sport</p>
            </CardContent>
          </Card>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Rechercher élève, nom ou matricule..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] text-slate-500">École :</Label>
                  <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                    <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Toutes" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les écoles</SelectItem>
                      {schools.map(s => (
                        <SelectItem key={s.IDETABLISSEMENT || s.id} value={String(s.IDETABLISSEMENT || s.id)}>
                          {s.ET_DENOMMINATION || s.name || `École ${s.IDETABLISSEMENT || s.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] text-slate-500">Classe :</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Toutes" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.CE_LIBELLE || c.name || `Classe ${c.id}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] text-slate-500">Pathologie :</Label>
                  <Select value={selectedFilterPathology} onValueChange={setSelectedFilterPathology}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Toutes" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes pathologies</SelectItem>
                      <SelectItem value="asthme">Asthme</SelectItem>
                      <SelectItem value="drepanocytose">Drépanocytose</SelectItem>
                      <SelectItem value="epilepsie">Épilepsie</SelectItem>
                      <SelectItem value="handicap">Handicap</SelectItem>
                      <SelectItem value="dispense">Dispense EPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MEDICAL RECORDS TABLE / CARDS GRID */}
        <div className="grid grid-cols-1 gap-4">
          {filteredStudents.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <Stethoscope className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              Aucun dossier médical trouvé pour les critères sélectionnés.
            </Card>
          ) : (
            filteredStudents.map(st => {
              const clsObj = classes.find((c: any) => String(c.id) === String(st.classe_id));
              const className = clsObj?.CE_LIBELLE || clsObj?.name || st.className || st.AU_CLASSEPRECEDENTE || 'Classe N/A';
              const med = parseStudentMedical(st);
              const hasAsthme = med.hasAsthme;
              const hasDrepanocytose = med.hasDrepanocytose;
              const hasEpilepsie = med.hasEpilepsie;
              const hasHandicap = med.hasHandicap;
              const hasDispense = med.dispenseSportive;

              return (
                <Card key={st.id} className="shadow-xs hover:border-rose-300 transition-all border-l-4 border-l-rose-500">
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      {/* Student info */}
                      <div className="flex items-center gap-3">
                        {st.photo ? (
                          <img src={st.photo} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 font-bold flex items-center justify-center border border-rose-200">
                            {(st.firstName || st.prenom || 'E')[0]}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">
                              {st.lastName || st.nom} {st.firstName || st.prenom}
                            </h3>
                            <Badge className="bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold">
                              🩺 GS : {med.groupeSanguin} ({med.rhesus})
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Matricule : <strong className="text-slate-800 dark:text-slate-200">{st.matricule || 'N/A'}</strong> — Classe : <strong className="text-indigo-600">{className}</strong>
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Tuteur : {st.AU_TUTEURLEGAL || st.AU_PERENOMPRENOMS || 'Non renseigné'} ({st.AU_CONTACTS || st.AU_PERECONTACTS || 'N/A'})
                          </p>
                        </div>
                      </div>

                      {/* Pathology Badges */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {hasAsthme && <Badge className="bg-rose-600 text-white font-bold text-[10px]">🫁 Asthme</Badge>}
                        {hasDrepanocytose && <Badge className="bg-purple-600 text-white font-bold text-[10px]">🩸 Drépanocytose</Badge>}
                        {hasEpilepsie && <Badge className="bg-amber-600 text-white font-bold text-[10px]">⚡ Épilepsie</Badge>}
                        {hasHandicap && <Badge className="bg-blue-600 text-white font-bold text-[10px]">♿ Handicap</Badge>}
                        {hasDispense && <Badge className="bg-emerald-600 text-white font-bold text-[10px]">🏃 Dispense EPS</Badge>}
                        {!hasAsthme && !hasDrepanocytose && !hasEpilepsie && !hasHandicap && !hasDispense && (
                          <Badge variant="outline" className="text-slate-400 text-[10px]">Aucune pathologie majeure</Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenStudentMedicalModal(st)}
                          className="text-xs gap-1.5 font-semibold"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-600" /> Éditer Fiche
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handlePrintStudentFiche(st)}
                          className="text-xs gap-1.5 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                        >
                          <Printer className="w-3.5 h-3.5" /> Imprimer Fiche Officielle
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* MODAL FICHE DE SANTÉ ÉDITION */}
        {selectedStudent && (
          <Dialog open={openModal} onOpenChange={setOpenModal}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-rose-600">
                  <HeartPulse className="w-5 h-5" /> Dossier Médical & Fiche de Santé
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Élève : <strong>{selectedStudent.lastName || selectedStudent.nom} {selectedStudent.firstName || selectedStudent.prenom}</strong> (Matricule : {selectedStudent.matricule})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 block text-xs">🩸 1. Informations Médicales de Base</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-[11px]">Groupe Sanguin</Label>
                      <Select value={selectedStudent.groupeSanguin} onValueChange={v => setSelectedStudent({ ...selectedStudent, groupeSanguin: v })}>
                        <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A +</SelectItem>
                          <SelectItem value="A-">A -</SelectItem>
                          <SelectItem value="B+">B +</SelectItem>
                          <SelectItem value="B-">B -</SelectItem>
                          <SelectItem value="AB+">AB +</SelectItem>
                          <SelectItem value="AB-">AB -</SelectItem>
                          <SelectItem value="O+">O +</SelectItem>
                          <SelectItem value="O-">O -</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px]">Rhésus</Label>
                      <Select value={selectedStudent.rhesus} onValueChange={v => setSelectedStudent({ ...selectedStudent, rhesus: v })}>
                        <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+">Positif (+)</SelectItem>
                          <SelectItem value="-">Négatif (-)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px]">État Vaccinal</Label>
                      <Select value={selectedStudent.etatVaccinal} onValueChange={v => setSelectedStudent({ ...selectedStudent, etatVaccinal: v })}>
                        <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="À jour">À jour</SelectItem>
                          <SelectItem value="Incomplet">Incomplet</SelectItem>
                          <SelectItem value="Non à jour">Non à jour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px]">Nom de l'Assurance</Label>
                      <Input value={selectedStudent.nomAssurance} onChange={e => setSelectedStudent({ ...selectedStudent, nomAssurance: e.target.value })} placeholder="SAHAM, MUGEFCI..." className="mt-1 h-8" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-[11px]">Allergies Alimentaires</Label>
                      <Input value={selectedStudent.allergiesAlimentaires} onChange={e => setSelectedStudent({ ...selectedStudent, allergiesAlimentaires: e.target.value })} placeholder="Ex: Arachide, Lait..." className="mt-1 h-8" />
                    </div>
                    <div>
                      <Label className="text-[11px]">Allergies Médicamenteuses</Label>
                      <Input value={selectedStudent.allergiesMedicamenteuses} onChange={e => setSelectedStudent({ ...selectedStudent, allergiesMedicamenteuses: e.target.value })} placeholder="Ex: Pénicilline, Aspirine..." className="mt-1 h-8" />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <span className="font-bold text-slate-800 block text-xs">🏥 2. Pathologies & Traitement d'Urgence</span>

                  <div className="space-y-2">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <label className="flex items-center gap-2 font-bold cursor-pointer w-44">
                        <input type="checkbox" className="w-4 h-4 accent-rose-600 rounded" checked={selectedStudent.hasAsthme} onChange={e => setSelectedStudent({ ...selectedStudent, hasAsthme: e.target.checked })} />
                        <span>Asthme</span>
                      </label>
                      {selectedStudent.hasAsthme && (
                        <Input value={selectedStudent.asthmeTraitement} onChange={e => setSelectedStudent({ ...selectedStudent, asthmeTraitement: e.target.value })} placeholder="Traitement d'urgence..." className="h-8 text-xs flex-1" />
                      )}
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <label className="flex items-center gap-2 font-bold cursor-pointer w-44">
                        <input type="checkbox" className="w-4 h-4 accent-rose-600 rounded" checked={selectedStudent.hasDrepanocytose} onChange={e => setSelectedStudent({ ...selectedStudent, hasDrepanocytose: e.target.checked })} />
                        <span>Drépanocytose</span>
                      </label>
                      {selectedStudent.hasDrepanocytose && (
                        <Input value={selectedStudent.drepanocytoseTraitement} onChange={e => setSelectedStudent({ ...selectedStudent, drepanocytoseTraitement: e.target.value })} placeholder="Type (SS/AS) & consignes..." className="h-8 text-xs flex-1" />
                      )}
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <label className="flex items-center gap-2 font-bold cursor-pointer w-44">
                        <input type="checkbox" className="w-4 h-4 accent-rose-600 rounded" checked={selectedStudent.hasEpilepsie} onChange={e => setSelectedStudent({ ...selectedStudent, hasEpilepsie: e.target.checked })} />
                        <span>Épilepsie</span>
                      </label>
                      {selectedStudent.hasEpilepsie && (
                        <Input value={selectedStudent.epilepsieTraitement} onChange={e => setSelectedStudent({ ...selectedStudent, epilepsieTraitement: e.target.value })} placeholder="Protocoles de crise..." className="h-8 text-xs flex-1" />
                      )}
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <label className="flex items-center gap-2 font-bold cursor-pointer w-44">
                        <input type="checkbox" className="w-4 h-4 accent-rose-600 rounded" checked={selectedStudent.hasHandicap} onChange={e => setSelectedStudent({ ...selectedStudent, hasHandicap: e.target.checked })} />
                        <span>Handicap</span>
                      </label>
                      {selectedStudent.hasHandicap && (
                        <Input value={selectedStudent.handicapPrecision} onChange={e => setSelectedStudent({ ...selectedStudent, handicapPrecision: e.target.value })} placeholder="Rapport médical & aménagements..." className="h-8 text-xs flex-1" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 block text-xs">🏃 3. Dispense Sportive EPS</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                        <input type="radio" name="modalDispense" checked={Boolean(selectedStudent.dispenseSportive)} onChange={() => setSelectedStudent({ ...selectedStudent, dispenseSportive: true })} />
                        <span>Oui</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                        <input type="radio" name="modalDispense" checked={!Boolean(selectedStudent.dispenseSportive)} onChange={() => setSelectedStudent({ ...selectedStudent, dispenseSportive: false, dispensePrecision: '' })} />
                        <span>Non</span>
                      </label>
                    </div>
                    {selectedStudent.dispenseSportive && (
                      <Input value={selectedStudent.dispensePrecision} onChange={e => setSelectedStudent({ ...selectedStudent, dispensePrecision: e.target.value })} placeholder="Motif & durée..." className="h-8 text-xs mt-1" />
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 block text-xs">🩺 4. Contacts Médecins Traitants</span>
                    <Input value={selectedStudent.medecin1Contact} onChange={e => setSelectedStudent({ ...selectedStudent, medecin1Contact: e.target.value })} placeholder="Médecin 1 (Nom & Tél)" className="h-8 text-xs mb-1" />
                    <Input value={selectedStudent.medecin2Contact} onChange={e => setSelectedStudent({ ...selectedStudent, medecin2Contact: e.target.value })} placeholder="Médecin 2 (Nom & Tél)" className="h-8 text-xs" />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-3">
                <Button variant="outline" onClick={() => setOpenModal(false)}>Annuler</Button>
                <Button onClick={handleSaveMedicalRecord} className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5">
                  <Save className="w-4 h-4" /> Enregistrer Fiche Médicale
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

      </div>
    </Layout>
  );
}
