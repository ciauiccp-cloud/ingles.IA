import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  BarChart3, BookOpen, BookText, Bot, CalendarDays, ClipboardCheck, FileStack, FolderOpen, GraduationCap, Headphones,
  Home, Languages, LayoutDashboard, Library, ListChecks, Megaphone, MessagesSquare, PenLine, Settings, Trophy, Users,
} from "lucide-react";
import { useAuth } from "./lib/auth";
import { isConfigured } from "./lib/supabase";
import { AppLayout, type NavItem } from "./components/Layout";
import { Spinner } from "./components/ui";
import Landing from "./pages/public/Landing";
import Login from "./pages/public/Login";
import ResetPassword from "./pages/public/ResetPassword";
import Setup from "./pages/public/Setup";
import NotConfigured from "./pages/public/NotConfigured";

// Professora
const TDashboard = lazy(() => import("./pages/teacher/Dashboard"));
const TStudents = lazy(() => import("./pages/teacher/Students"));
const TStudentDetail = lazy(() => import("./pages/teacher/StudentDetail"));
const TClasses = lazy(() => import("./pages/teacher/Classes"));
const TLessons = lazy(() => import("./pages/teacher/Lessons"));
const TMaterials = lazy(() => import("./pages/teacher/Materials"));
const TActivities = lazy(() => import("./pages/teacher/Activities"));
const TActivityEditor = lazy(() => import("./pages/teacher/ActivityEditor"));
const TQuestionBank = lazy(() => import("./pages/teacher/QuestionBank"));
const TGrading = lazy(() => import("./pages/teacher/Grading"));
const TTutor = lazy(() => import("./pages/teacher/TutorReports"));
const TReports = lazy(() => import("./pages/teacher/Reports"));
const TCalendar = lazy(() => import("./pages/teacher/Calendar"));
const TNotices = lazy(() => import("./pages/teacher/Announcements"));
const TContent = lazy(() => import("./pages/teacher/Content"));
const TSettings = lazy(() => import("./pages/teacher/Settings"));
// Aluno
const SHome = lazy(() => import("./pages/student/Home"));
const SLessons = lazy(() => import("./pages/student/Lessons"));
const SActivities = lazy(() => import("./pages/student/Activities"));
const STake = lazy(() => import("./pages/student/TakeActivity"));
const STutor = lazy(() => import("./pages/student/Tutor"));
const SVocab = lazy(() => import("./pages/student/Vocabulary"));
const SGrammar = lazy(() => import("./pages/student/Grammar"));
const SPractice = lazy(() => import("./pages/student/Practice"));
const SWriting = lazy(() => import("./pages/student/Writing"));
const SSpeaking = lazy(() => import("./pages/student/Speaking"));
const SPerformance = lazy(() => import("./pages/student/Performance"));
const SMaterials = lazy(() => import("./pages/student/Materials"));
const SAgenda = lazy(() => import("./pages/student/Agenda"));
const SNotices = lazy(() => import("./pages/student/Notices"));

const teacherNav: NavItem[] = [
  { to: "/professora", label: "Visão geral", icon: <LayoutDashboard />, end: true },
  { to: "/professora/alunos", label: "Alunos", icon: <Users /> },
  { to: "/professora/turmas", label: "Turmas", icon: <GraduationCap /> },
  { to: "/professora/aulas", label: "Aulas e biblioteca", icon: <Library /> },
  { to: "/professora/materiais", label: "Materiais didáticos", icon: <FolderOpen /> },
  { to: "/professora/atividades", label: "Atividades", icon: <ListChecks /> },
  { to: "/professora/banco-de-questoes", label: "Banco de questões", icon: <FileStack /> },
  { to: "/professora/correcoes", label: "Correções", icon: <ClipboardCheck /> },
  { to: "/professora/tutor", label: "Tutor IA", icon: <Bot /> },
  { to: "/professora/relatorios", label: "Relatórios", icon: <BarChart3 /> },
  { to: "/professora/calendario", label: "Calendário", icon: <CalendarDays /> },
  { to: "/professora/avisos", label: "Avisos", icon: <Megaphone /> },
  { to: "/professora/conteudos", label: "Conteúdos (Vocab, Gram., Textos)", icon: <BookText /> },
  { to: "/professora/configuracoes", label: "Configurações", icon: <Settings /> },
];

const studentNav: NavItem[] = [
  { to: "/aluno", label: "Início", icon: <Home />, end: true },
  { to: "/aluno/aulas", label: "Minhas aulas", icon: <BookOpen /> },
  { to: "/aluno/atividades", label: "Atividades", icon: <ListChecks /> },
  { to: "/aluno/conversacao", label: "Conversação com IA", icon: <MessagesSquare /> },
  { to: "/aluno/vocabulario", label: "Vocabulário", icon: <Languages /> },
  { to: "/aluno/gramatica", label: "Gramática", icon: <BookText /> },
  { to: "/aluno/listening", label: "Listening", icon: <Headphones /> },
  { to: "/aluno/reading", label: "Reading", icon: <BookOpen /> },
  { to: "/aluno/writing", label: "Writing", icon: <PenLine /> },
  { to: "/aluno/speaking", label: "Speaking", icon: <MessagesSquare /> },
  { to: "/aluno/desempenho", label: "Meu desempenho", icon: <Trophy /> },
  { to: "/aluno/materiais", label: "Materiais da professora", icon: <FolderOpen /> },
  { to: "/aluno/agenda", label: "Agenda", icon: <CalendarDays /> },
  { to: "/aluno/avisos", label: "Avisos", icon: <Megaphone /> },
];

function RequireRole({ role, children }: { role: "teacher" | "student"; children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen glow-bg"><Spinner /></div>;
  if (!session) return <Navigate to="/entrar" replace />;
  if (!profile) return <div className="min-h-screen glow-bg"><Spinner label="Carregando perfil..." /></div>;
  if (profile.role !== role) return <Navigate to={profile.role === "teacher" ? "/professora" : "/aluno"} replace />;
  return <>{children}</>;
}

export default function App() {
  if (!isConfigured) return <NotConfigured />;
  return (
    <Suspense fallback={<div className="min-h-screen glow-bg"><Spinner /></div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/entrar" element={<Login />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route path="/configuracao-inicial" element={<Setup />} />

        <Route path="/professora" element={<RequireRole role="teacher"><AppLayout nav={teacherNav} area="Área da professora" /></RequireRole>}>
          <Route index element={<TDashboard />} />
          <Route path="alunos" element={<TStudents />} />
          <Route path="alunos/:id" element={<TStudentDetail />} />
          <Route path="turmas" element={<TClasses />} />
          <Route path="aulas" element={<TLessons />} />
          <Route path="materiais" element={<TMaterials />} />
          <Route path="atividades" element={<TActivities />} />
          <Route path="atividades/:id" element={<TActivityEditor />} />
          <Route path="banco-de-questoes" element={<TQuestionBank />} />
          <Route path="correcoes" element={<TGrading />} />
          <Route path="tutor" element={<TTutor />} />
          <Route path="relatorios" element={<TReports />} />
          <Route path="calendario" element={<TCalendar />} />
          <Route path="avisos" element={<TNotices />} />
          <Route path="conteudos" element={<TContent />} />
          <Route path="configuracoes" element={<TSettings />} />
        </Route>

        <Route path="/aluno" element={<RequireRole role="student"><AppLayout nav={studentNav} area="Área do aluno" /></RequireRole>}>
          <Route index element={<SHome />} />
          <Route path="aulas" element={<SLessons />} />
          <Route path="atividades" element={<SActivities />} />
          <Route path="atividades/:id" element={<STake />} />
          <Route path="conversacao" element={<STutor />} />
          <Route path="vocabulario" element={<SVocab />} />
          <Route path="gramatica" element={<SGrammar />} />
          <Route path="listening" element={<SPractice skill="listening" />} />
          <Route path="reading" element={<SPractice skill="reading" />} />
          <Route path="writing" element={<SWriting />} />
          <Route path="speaking" element={<SSpeaking />} />
          <Route path="desempenho" element={<SPerformance />} />
          <Route path="materiais" element={<SMaterials />} />
          <Route path="agenda" element={<SAgenda />} />
          <Route path="avisos" element={<SNotices />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
