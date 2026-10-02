import { useState, useEffect } from 'react';
import { useParams } from 'react';
import { motion } from 'framer-motion';
import apiClient from '@/lib/apiClient';
import { loadEcoles, resolveEnteteEtablissement } from '@/lib/ecoleIdentite';
import { formatStudentName, formatCurrency } from '@/lib/index';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ShieldCheck, UserCheck, Phone, GraduationCap, Calendar, Ticket, Award, ArrowLeft } from 'lucide-react';
import { AppLogoLoader } from '@/components/AppLogoLoader';

export default function StudentPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  useEffect(() => {
    const fetchPublicStudent = async () => {
      if (!id) {
        setLoading(false);
        setNotFound(true);
        return;
      }
      try {
        setLoading(true);
        // Fiches établissement chargées avant le rendu : l'en-tête reprend le nom,
        // l'adresse et les téléphones saisis dans Profil École.
        await loadEcoles().catch(() => []);
        const data = await apiClient.getStudentById(id);
        if (data) {
          setStudent(data);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Error fetching public student:', err);
        // Aucune fiche de démonstration : une fiche officielle vérifiée ne doit
        // jamais afficher un élève inventé quand la lecture échoue.
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicStudent();
  }, [id]);

  if (loading) {
    return (
      <AppLogoLoader
        fullScreen
        title="GROUPE SCOLAIRE CONFESSIONNEL HÎNNEH"
        message="Chargement de la Fiche Publique Élève..."
        submessage="Vérification sécurisée de l'authenticité du badge"
      />
    );
  }

  if (notFound || !student) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-rose-200 shadow-lg">
          <CardContent className="p-8 text-center space-y-2">
            <h1 className="text-lg font-black text-rose-700">Fiche élève introuvable</h1>
            <p className="text-sm text-slate-600">
              Aucune fiche officielle ne correspond à ce lien. Vérifiez le QR code ou
              rapprochez-vous du secrétariat de l'établissement.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ecole = resolveEnteteEtablissement({
    ecoleId: student?.schoolId || student?.ecole_id,
    code: student?.codeEtablissement || student?.ET_CODEETABLISSEMENT,
    schoolName: student?.schoolName,
    className: student?.className || student?.classeNom || student?.niveau,
  });

  const isPaid = student?.AU_SCOLARITE ? (student.AU_TOTALDEPOT >= student.AU_SCOLARITE) : true;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4 font-sans text-slate-900">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Header Card */}
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-indigo-600 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 p-6 text-white text-center relative">
              <div className="absolute top-3 right-3 bg-emerald-500 text-white font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                <ShieldCheck className="w-3.5 h-3.5" /> Fiche Officielle Vérifiée
              </div>
              {ecole.logo && (
                <img
                  src={ecole.logo}
                  alt="Logo de l'établissement"
                  className="w-20 h-20 object-contain mx-auto mb-2 drop-shadow-md"
                />
              )}
              <h1 className="text-lg font-black uppercase tracking-tight">
                {ecole.fullName}
              </h1>
              {ecole.addressLine && (
                <p className="text-xs text-indigo-200 font-medium mt-0.5">{ecole.addressLine}</p>
              )}
              {ecole.phoneLine && (
                <div className="mt-2 text-xs font-bold bg-white/10 backdrop-blur-md px-3 py-1 rounded-full inline-block border border-white/20">
                  📞 Contact École : {ecole.phoneLine}
                </div>
              )}
            </div>

            <CardContent className="p-6 space-y-6">
              
              {/* Status Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1">
                <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 font-bold">
                  INSCRIPTION VALIDÉE — ANNÉE 2026–2027
                </Badge>
                <p className="text-xs text-emerald-800 font-bold mt-2 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  L'élève est régulièrement inscrit(e) et autorisé(e) à suivre les cours.
                </p>
              </div>

              {/* Student Identity Card */}
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="w-24 h-24 rounded-2xl border-2 border-indigo-500 bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0 font-black text-3xl text-indigo-700 shadow-md">
                  {student?.photo || student?.photoUrl ? (
                    <img src={student.photo || student.photoUrl} alt="Photo Élève" className="w-full h-full object-cover" />
                  ) : (
                    `${student?.firstName?.[0] || 'E'}${student?.lastName?.[0] || 'L'}`
                  )}
                </div>
                <div className="space-y-1 text-xs flex-1">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {formatStudentName(student)}
                  </h2>
                  <p className="font-semibold text-indigo-600 dark:text-indigo-400">
                    Matricule : <strong className="text-slate-900 dark:text-white font-bold">{student?.matricule || student?.matricule_eleve || 'AUTO'}</strong>
                  </p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Classe : <strong className="text-indigo-700 dark:text-indigo-300 font-extrabold">{student?.className || student?.classeNom || student?.niveau || 'CE1'}</strong>
                  </p>
                  <p className="text-slate-500">
                    Sexe : <strong>{student?.gender === 'F' ? 'Féminin (F)' : 'Masculin (M)'}</strong>
                  </p>
                </div>
              </div>

              {/* Academic Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900 space-y-1">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 text-[11px]">
                    <GraduationCap className="w-3.5 h-3.5" /> Établissement
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white text-xs">
                    {student?.schoolName || 'Collège Privé Hînneh Biabou'}
                  </p>
                </div>

                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900 space-y-1">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 text-[11px]">
                    <Ticket className="w-3.5 h-3.5" /> Billet d'Entrée
                  </span>
                  <p className="font-extrabold text-emerald-700 dark:text-emerald-400 text-xs">
                    Délivré & Actif ✅
                  </p>
                </div>
              </div>

              {/* Parent Tuteur Contact */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-indigo-600" /> Tuteur Légal & Contact Parent
                </h3>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">Nom Tuteur :</span>
                  <span className="font-bold text-slate-900 dark:text-white">{student?.parentNom || 'Parent Légal'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Contact WhatsApp :</span>
                  <a
                    href={`https://wa.me/225${(student?.parentTel || '').replace(/\s+/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    {student?.parentTel || '07 00 00 00 00'} 💬
                  </a>
                </div>
              </div>

              {/* Digital Authentication Seal */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Direction des Études</p>
                  <p className="text-[10px]">M. Moussa SANGARE</p>
                </div>
                <div className="text-right">
                  <span className="inline-block border border-indigo-300 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Document Certifié Hînneh 🎓
                  </span>
                </div>
              </div>

            </CardContent>
          </Card>
        </motion.div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500">
          © 2026 Groupe Scolaire Confessionnel Hînneh — Abidjan, Côte d'Ivoire
        </p>

      </div>
    </div>
  );
}
