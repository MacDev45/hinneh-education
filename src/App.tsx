import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ROUTE_PATHS } from "@/lib/index";
import { isUserFromAbidjan } from "@/lib/utils";

// Critical entry page: loaded synchronously for instant first paint
import Login from "@/pages/Login";

// Lazy-loaded pages (Code Splitting for fast page loads)
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Schools = lazy(() => import("@/pages/Schools"));
const SchoolDetail = lazy(() => import("@/pages/SchoolDetail"));
const Students = lazy(() => import("@/pages/Students"));
const StudentDetail = lazy(() => import("@/pages/StudentDetail"));
const Attendance = lazy(() => import("@/pages/Attendance"));
const Grades = lazy(() => import("@/pages/Grades"));
const Confessional = lazy(() => import("@/pages/Confessional"));
const Finance = lazy(() => import("@/pages/Finance"));
const HR = lazy(() => import("@/pages/HR"));
const Communication = lazy(() => import("@/pages/Communication"));
const Reports = lazy(() => import("@/pages/Reports"));
const Administration = lazy(() => import("@/pages/Administration"));
const ParentPortal = lazy(() => import("@/pages/ParentPortal"));
const ParentPortalV2 = lazy(() => import("@/pages/ParentPortalV2"));
const TeacherSpace = lazy(() => import("@/pages/TeacherSpace"));
const ProfesseurSpace = lazy(() => import("@/pages/ProfesseurSpace"));
const InstituteurSpace = lazy(() => import("@/pages/InstituteurSpace"));
const EducatorSpace = lazy(() => import("@/pages/EducatorSpace"));
const ClassLists = lazy(() => import("@/pages/ClassLists"));
const AdminStaffSpace = lazy(() => import("@/pages/AdminStaffSpace"));
const CRM = lazy(() => import("@/pages/CRM"));
const RapportRentree = lazy(() => import("@/pages/RapportRentree"));
const RapportTrimestriel = lazy(() => import("@/pages/RapportTrimestriel"));
const PreInscription = lazy(() => import("@/pages/PreInscription"));
const PriseRendezVous = lazy(() => import("@/pages/PriseRendezVous"));
const StaffRegistration = lazy(() => import("@/pages/StaffRegistration"));
const AccueilSpace = lazy(() => import("@/pages/AccueilSpace"));
const AgentSpace = lazy(() => import("@/pages/AgentSpace"));
const Reductions = lazy(() => import("@/pages/Reductions"));
const InscriptionProcess = lazy(() => import("@/pages/InscriptionProcess"));
const ScolariteSpace = lazy(() => import("@/pages/ScolariteSpace"));
const EcheancierSpace = lazy(() => import("@/pages/EcheancierSpace"));
const CaisseSpace = lazy(() => import("@/pages/CaisseSpace"));
const BankPayments = lazy(() => import("@/pages/BankPayments"));
const ComptabiliteSpace = lazy(() => import("@/pages/ComptabiliteSpace"));
const ComptabiliteModules = lazy(() => import("@/pages/ComptabiliteModules"));
const TransportSpace = lazy(() => import("@/pages/TransportSpace"));
const SchoolProfile = lazy(() => import("@/pages/SchoolProfile"));
const ImportData = lazy(() => import("@/pages/ImportData"));
const SallesSpace = lazy(() => import("@/pages/SallesSpace"));
const RHSpace = lazy(() => import("@/pages/RHSpace"));
const BulletinsSpace = lazy(() => import("@/pages/BulletinsSpace"));
const NotificationsSpace = lazy(() => import("@/pages/NotificationsSpace"));
const PresencesSpace = lazy(() => import("@/pages/PresencesSpace"));
const RapportsSpace = lazy(() => import("@/pages/RapportsSpace"));
const MessagerieSpace = lazy(() => import("@/pages/MessagerieSpace"));
const ExamensSpace = lazy(() => import("@/pages/ExamensSpace"));
const PortailFamille = lazy(() => import("@/pages/PortailFamille"));
const ParametresSpace = lazy(() => import("@/pages/ParametresSpace"));
const ControleMedicalSpace = lazy(() => import("@/pages/ControleMedicalSpace"));
const VieScolaireTestPanel = lazy(() => import("@/pages/VieScolaireTestPanel"));
const ImpayesSpace = lazy(() => import("@/pages/ImpayesSpace"));
const RecouvrementSpace = lazy(() => import("@/pages/RecouvrementSpace"));
const StudentPublicProfile = lazy(() => import("@/pages/StudentPublicProfile"));
const BilletsSpace = lazy(() => import("@/pages/BilletsSpace"));
const EconomatSpace = lazy(() => import("@/pages/EconomatSpace"));
const BibliothequeSpace = lazy(() => import("@/pages/BibliothequeSpace"));
const ParcAutoSpace = lazy(() => import("@/pages/ParcAutoSpace"));
const PedagogieAdvanced = lazy(() => import("@/pages/PedagogieAdvanced"));
const SupervisorSpace = lazy(() => import("@/pages/SupervisorSpace"));
const DossierEleveSpace = lazy(() => import("@/pages/DossierEleveSpace").then((m) => ({ default: m.DossierEleveSpace })));
const RHDemandesSpace = lazy(() => import("@/pages/RHDemandesSpace").then((m) => ({ default: m.RHDemandesSpace })));
const BadgesQRSpace = lazy(() => import("@/pages/BadgesQRSpace").then((m) => ({ default: m.BadgesQRSpace })));
const ReductionsManagementSpace = lazy(() => import("@/pages/ReductionsManagementSpace").then((m) => ({ default: m.ReductionsManagementSpace })));
const PointageBadgeSpace = lazy(() => import("@/pages/PointageBadgeSpace"));
const StudentTransferSpace = lazy(() => import("@/pages/StudentTransferSpace"));
const StudentSerieTransferSpace = lazy(() => import("@/pages/StudentSerieTransferSpace"));
const StudentWithdrawalSpace = lazy(() => import("@/pages/StudentWithdrawalSpace"));
const TransfertNotesSpace = lazy(() => import("@/pages/TransfertNotesSpace"));
import { AppLogoLoader } from "@/components/AppLogoLoader";

const PageLoadingFallback = () => (
  <AppLogoLoader
    fullScreen
    title="GROUPE SCOLAIRE CONFESSIONNEL HÎNNEH"
    message="Chargement de l'espace en cours..."
    submessage="Préparation de votre session de travail sécurisée"
  />
);

const queryClient = new QueryClient();

const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const token = localStorage.getItem("auth_token");
  const role = localStorage.getItem("user_role");

  if (!token) {
    return <Navigate to={ROUTE_PATHS.LOGIN} replace />;
  }

  // Permettre immédiatement aux utilisateurs d'Abidjan d'accéder à l'espace superviseur
  const currentHash = typeof window !== "undefined" ? (window.location.hash || window.location.pathname) : "";
  const p = currentHash.replace(/^#/, "").toLowerCase();
  if (p.startsWith("/superviseur") && isUserFromAbidjan()) {
    return <>{children}</>;
  }

  if (role === "secretaire" || role === "secretaire_direction") {
    const currentHash = typeof window !== "undefined" ? (window.location.hash || window.location.pathname) : "";
    const p = currentHash.toLowerCase();
    const isExcluded =
      p.includes("administration") ||
      p.includes("school-profile") ||
      p.includes("schools") ||
      p.includes("import-data") ||
      p.includes("parametres") ||
      p.includes("settings");

    if (isExcluded) {
      return <Navigate to={ROUTE_PATHS.DASHBOARD} replace />;
    }
    return <>{children}</>;
  }

  if (role === "enseignant" || role === "instituteur") {
    const currentHash = typeof window !== "undefined" ? (window.location.hash || window.location.pathname) : "";
    const p = currentHash.replace(/^#/, "").toLowerCase();
    const isTeacherAllowed =
      p === "" ||
      p === "/" ||
      p.startsWith("/attendance") ||
      p.startsWith("/teacher-space") ||
      p.startsWith("/professeur-space") ||
      p.startsWith("/instituteur-space");

    if (!isTeacherAllowed) {
      return <Navigate to={ROUTE_PATHS.TEACHER_SPACE} replace />;
    }
    return <>{children}</>;
  }

  if (role === "educateur") {
    const currentHash = typeof window !== "undefined" ? (window.location.hash || window.location.pathname) : "";
    const p = currentHash.replace(/^#/, "").toLowerCase();
    const isEducateurAllowed =
      p === "" ||
      p === "/" ||
      p.startsWith("/class-lists") ||
      p.startsWith("/transfert-classes") ||
      p.startsWith("/transfert-series") ||
      p.startsWith("/retrait-eleves") ||
      p.startsWith("/billets-entree") ||
      p.startsWith("/educator-space") ||
      p.startsWith("/grades") ||
      p.startsWith("/pedagogie-advanced") ||
      p.startsWith("/bulletins-space") ||
      p.startsWith("/pointage-badge") ||
      p.startsWith("/badge-qr") ||
      p.startsWith(ROUTE_PATHS.ACCUEIL_SPACE.toLowerCase()) ||
      p.startsWith(ROUTE_PATHS.INSCRIPTION_PROCESS.toLowerCase());

    if (!isEducateurAllowed) {
      return <Navigate to={ROUTE_PATHS.EDUCATOR_SPACE} replace />;
    }
    return <>{children}</>;
  }

  if (
    allowedRoles &&
    role &&
    role !== "superuser" &&
    !allowedRoles.includes(role) &&
    !(
      (role === "directeur_etudes" || role === "directeur" || role === "directeur_ecole" || role === "de") &&
      allowedRoles.some(r => r === "directeur_ecole" || r === "directeur_etudes" || r === "directeur" || r === "direction_fondation")
    )
  ) {
    // Redirect unauthorized user to their specific default home page
    if (role === "parent" || role === "eleve") {
      return <Navigate to="/parent-space" replace />;
    }
    if (role === "enseignant") {
      return <Navigate to={ROUTE_PATHS.TEACHER_SPACE} replace />;
    }
    if (role === "educateur") {
      return <Navigate to={ROUTE_PATHS.EDUCATOR_SPACE} replace />;
    }
    if (role === "accueil") {
      return <Navigate to={ROUTE_PATHS.ACCUEIL_SPACE} replace />;
    }
    if (role === "agent") {
      return <Navigate to={ROUTE_PATHS.AGENT_SPACE} replace />;
    }
    if (role === "scolarite") {
      return <Navigate to={ROUTE_PATHS.SCOLARITE_SPACE} replace />;
    }
    if (role === "comptable") {
      return <Navigate to={ROUTE_PATHS.COMPTABILITE_SPACE} replace />;
    }
    return <Navigate to={ROUTE_PATHS.DASHBOARD} replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <LoadingProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
          <Route path={ROUTE_PATHS.LOGIN} element={<Login />} />
          <Route
            path={ROUTE_PATHS.PREINSCRIPTION}
            element={<PreInscription />}
          />
          <Route
            path={ROUTE_PATHS.PRISE_RDV}
            element={<PriseRendezVous />}
          />
          <Route
            path={ROUTE_PATHS.STAFF_REGISTRATION}
            element={<StaffRegistration />}
          />
          <Route
            path={ROUTE_PATHS.DASHBOARD}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "enseignant",
                  "educateur",
                  "comptable",
                  "rh",
                  "admin",
                ]}
              >
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.SCHOOLS}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                ]}
              >
                <Schools />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.SCHOOL_DETAIL}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                ]}
              >
                <SchoolDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.STUDENTS}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "enseignant",
                  "educateur",
                  "comptable",
                  "admin",
                ]}
              >
                <Students />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.STUDENT_DETAIL}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "enseignant",
                  "educateur",
                  "comptable",
                  "admin",
                ]}
              >
                <StudentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.ATTENDANCE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "enseignant",
                  "educateur",
                  "admin",
                ]}
              >
                <Attendance />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.GRADES}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "enseignant",
                  "educateur",
                  "admin",
                ]}
              >
                <Grades />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.CLASS_LISTS}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "enseignant",
                  "educateur",
                  "comptable",
                  "caisse",
                  "admin",
                ]}
              >
                <ClassLists />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.STUDENT_TRANSFER}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "directeur_etudes",
                  "directeur_etude",
                  "de",
                  "directeur",
                  "superviseur",
                  "educateur",
                  "secretaire_direction",
                  "admin",
                ]}
              >
                <StudentTransferSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.TRANSFERT_NOTES}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "directeur_etudes",
                  "directeur_etude",
                  "de",
                  "directeur",
                  "superviseur",
                  "educateur",
                  "secretaire_direction",
                  "enseignant",
                  "admin",
                ]}
              >
                <TransfertNotesSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.STUDENT_SERIE_TRANSFER}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "directeur_etudes",
                  "directeur_etude",
                  "de",
                  "directeur",
                  "superviseur",
                  "educateur",
                  "secretaire_direction",
                  "admin",
                ]}
              >
                <StudentSerieTransferSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.STUDENT_WITHDRAWAL}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "directeur_etudes",
                  "directeur_etude",
                  "de",
                  "directeur",
                  "superviseur",
                  "educateur",
                  "scolarite",
                  "secretaire_direction",
                  "admin",
                ]}
              >
                <StudentWithdrawalSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.CONFESSIONAL}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "enseignant",
                  "admin",
                ]}
              >
                <Confessional />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.FINANCE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "comptable",
                  "admin",
                ]}
              >
                <Finance />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.HR}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "rh",
                  "educateur",
                  "admin",
                ]}
              >
                <HR />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.COMMUNICATION}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "enseignant",
                  "parent",
                  "eleve",
                  "admin",
                ]}
              >
                <Communication />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.REPORTS}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                ]}
              >
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.ADMINISTRATION}
            element={
              <ProtectedRoute allowedRoles={["admin", "direction_fondation", "directeur_ecole", "directeur_etudes", "directeur"]}>
                <Administration />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.PARENT_PORTAL}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "parent",
                  "eleve",
                  "direction_fondation",
                  "admin",
                ]}
              >
                <ParentPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.CRM}
            element={
              <ProtectedRoute allowedRoles={["direction_fondation", "admin"]}>
                <CRM />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.RAPPORT_RENTREE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                ]}
              >
                <RapportRentree />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.RAPPORT_TRIMESTRIEL}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                ]}
              >
                <RapportTrimestriel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent-space"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "parent",
                  "eleve",
                  "direction_fondation",
                  "admin",
                ]}
              >
                <ParentPortalV2 />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superviseur"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "directeur_etudes",
                  "directeur_etude",
                  "de",
                  "directeur",
                  "directeur_ecole",
                  "superviseur",
                  "admin",
                  "superuser",
                  "direction_fondation",
                  "direction",
                ]}
              >
                <SupervisorSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.TEACHER_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={["enseignant", "direction_fondation", "admin"]}
              >
                <TeacherSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.PROFESSEUR_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={["enseignant", "direction_fondation", "admin"]}
              >
                <ProfesseurSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.INSTITUTEUR_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={["enseignant", "direction_fondation", "admin"]}
              >
                <InstituteurSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.EDUCATOR_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "educateur",
                  "superviseur",
                  "directeur_ecole",
                  "directeur_etudes",
                  "directeur",
                  "de",
                  "direction_fondation",
                  "admin",
                  "superuser",
                ]}
              >
                <EducatorSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.ADMIN_STAFF_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "directeur_ecole",
                  "rh",
                  "comptable",
                  "educateur",
                  "direction_fondation",
                  "admin",
                ]}
              >
                <AdminStaffSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.ACCUEIL_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "accueil",
                  "scolarite",
                  "comptable",
                  "direction_fondation",
                  "directeur_ecole",
                  "educateur",
                  "admin",
                ]}
              >
                <AccueilSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.AGENT_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "agent",
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                ]}
              >
                <AgentSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.REDUCTIONS}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "directeur_etudes",
                  "directeur",
                  "comptable",
                  "admin",
                ]}
              >
                <Reductions />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.SCOLARITE_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "scolarite",
                  "comptable",
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                ]}
              >
                <ScolariteSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.CONTROLE_MEDICAL}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "scolarite",
                  "comptable",
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                  "accueil",
                  "educateur",
                ]}
              >
                <ControleMedicalSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.ECHEANCIER_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "comptable",
                  "caisse",
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                ]}
              >
                <EcheancierSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.COMPTABILITE_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "comptable",
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                ]}
              >
                <ComptabiliteSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.COMPTABILITE_MODULES}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "comptable",
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                ]}
              >
                <ComptabiliteModules />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.TRANSPORT_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "agent",
                  "directeur_ecole",
                  "direction_fondation",
                  "admin",
                  "comptable",
                  "caisse",
                ]}
              >
                <TransportSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.ECONOMAT_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "comptable",
                  "scolarite",
                  "caisse",
                  "accueil",
                  "educateur",
                  "admin",
                  "secretaire_direction",
                  "agent",
                  "economat",
                  "intendant",
                  "rh",
                ]}
              >
                <EconomatSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.SCHOOL_PROFILE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "directeur_ecole",
                  "direction_fondation",
                  "admin",
                ]}
              >
                <SchoolProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.CAISSE_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "scolarite",
                  "comptable",
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                  "accueil",
                ]}
              >
                <CaisseSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.BANK_PAYMENTS}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "comptable",
                  "caisse",
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                ]}
              >
                <BankPayments />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.IMPORT_DATA}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                ]}
              >
                <ImportData />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.SALLES_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                  "enseignant",
                ]}
              >
                <SallesSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.RH_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                ]}
              >
                <RHSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.BULLETINS_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "enseignant",
                  "educateur",
                  "admin",
                ]}
              >
                <BulletinsSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.NOTIFICATIONS_SPACE}
            element={
              <ProtectedRoute>
                <NotificationsSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.PRESENCES_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "enseignant",
                  "admin",
                ]}
              >
                <PresencesSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.RAPPORTS_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "admin",
                ]}
              >
                <RapportsSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.MESSAGERIE_SPACE}
            element={
              <ProtectedRoute>
                <MessagerieSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.EXAMENS_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "enseignant",
                  "admin",
                ]}
              >
                <ExamensSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.PORTAIL_FAMILLE}
            element={
              <ProtectedRoute>
                <PortailFamille />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.PARAMETRES_SPACE}
            element={
              <ProtectedRoute allowedRoles={["direction_fondation", "directeur_ecole", "directeur_etudes", "directeur", "admin"]}>
                <ParametresSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.INSCRIPTION_PROCESS}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "comptable",
                  "admin",
                  "accueil",
                  "scolarite",
                  "educateur",
                ]}
              >
                <InscriptionProcess />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.VIE_SCOLAIRE_TEST}
            element={
              <ProtectedRoute>
                <VieScolaireTestPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.IMPAYES_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "comptable",
                  "caisse",
                  "accueil",
                  "educateur",
                  "admin",
                  "secretaire_direction",
                  "agent",
                  "economat",
                  "intendant",
                  "rh",
                ]}
              >
                <ImpayesSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.RECOUVREMENT}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "comptable",
                  "caisse",
                  "scolarite",
                  "accueil",
                  "educateur",
                  "admin",
                  "superuser",
                  "superviseur",
                  "secretaire_direction",
                  "agent",
                  "economat",
                  "intendant",
                  "rh",
                ]}
              >
                <RecouvrementSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.BILLETS_ENTREE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "comptable",
                  "scolarite",
                  "caisse",
                  "accueil",
                  "educateur",
                  "admin",
                  "secretaire_direction",
                  "agent",
                  "economat",
                  "intendant",
                  "rh",
                ]}
              >
                <BilletsSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.STUDENT_PUBLIC}
            element={<StudentPublicProfile />}
          />
          <Route
            path={ROUTE_PATHS.BIBLIOTHEQUE_SPACE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "direction_fondation",
                  "directeur_ecole",
                  "enseignant",
                  "educateur",
                  "comptable",
                  "caisse",
                  "accueil",
                  "admin",
                  "secretaire_direction",
                  "agent",
                ]}
              >
                <BibliothequeSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.PARC_AUTO_SPACE}
            element={
              <ProtectedRoute>
                <ParcAutoSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.PEDAGOGIE_ADVANCED}
            element={
              <ProtectedRoute>
                <PedagogieAdvanced />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.DOSSIER_ELEVE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "directeur_ecole",
                  "educateur",
                  "direction_fondation",
                  "admin",
                  "comptable",
                  "scolarite",
                  "rh",
                ]}
              >
                <DossierEleveSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.DOSSIER_ELEVE_DETAIL}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "directeur_ecole",
                  "educateur",
                  "direction_fondation",
                  "admin",
                  "comptable",
                  "scolarite",
                  "rh",
                ]}
              >
                <DossierEleveSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.RH_DEMANDES}
            element={
              <ProtectedRoute>
                <RHDemandesSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.BADGES_QR}
            element={
              <ProtectedRoute>
                <BadgesQRSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.BADGES_QR_DETAIL}
            element={
              <ProtectedRoute>
                <BadgesQRSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTE_PATHS.POINTAGE_BADGE}
            element={
              <ProtectedRoute
                allowedRoles={[
                  "educateur",
                  "directeur_ecole",
                  "directeur",
                  "accueil",
                  "direction_fondation",
                  "admin",
                ]}
              >
                <PointageBadgeSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={<Navigate to={ROUTE_PATHS.LOGIN} replace />}
          />
        </Routes>
        </Suspense>
      </HashRouter>
        </LoadingProvider>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
