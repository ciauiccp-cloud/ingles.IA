import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import { Logo } from "../../components/Logo";
import { Button, ErrorBox, Field, Input } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { callFn, errMsg, supabase } from "../../lib/supabase";

export default function Login() {
  const { session, profile } = useAuth();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    callFn<{ has_teacher: boolean }>("admin-users", { action: "status" })
      .then((r) => setNeedsSetup(!r.has_teacher)).catch(() => {});
  }, []);

  if (session && profile) return <Navigate to={profile.role === "teacher" ? "/professora" : "/aluno"} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/redefinir-senha` });
        if (error) throw error;
        setSent(true);
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen glow-bg lg:grid-cols-2">
      <div className="hidden flex-col justify-between border-r border-line bg-gradient-to-br from-deep/60 via-ink to-ink p-10 lg:flex">
        <Logo />
        <div>
          <h2 className="font-display text-4xl font-semibold leading-tight">Seu inglês evolui<br /><span className="text-gradient">um diálogo por vez.</span></h2>
          <p className="mt-4 max-w-md text-zinc-400">Acesse suas aulas, atividades e o tutor de conversação com IA.</p>
        </div>
        <p className="text-xs text-zinc-500">Acesso restrito a alunos cadastrados pela professora.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-up">
          <Link to="/" className="mb-8 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
          <div className="mb-6 lg:hidden"><Logo /></div>
          <h1 className="font-display text-2xl font-semibold">{mode === "login" ? "Entrar" : "Recuperar senha"}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {mode === "login" ? "Use o e-mail e a senha fornecidos pela professora." : "Enviaremos um link para você criar uma nova senha."}
          </p>
          {needsSetup && (
            <div className="mt-4 rounded-xl border border-brand/40 bg-brand/10 p-3 text-sm text-violet-100">
              Primeiro acesso? <Link to="/configuracao-inicial" className="font-medium underline">Crie a conta da professora</Link>.
            </div>
          )}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="E-mail">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="voce@email.com" />
              </div>
            </Field>
            {mode === "login" && (
              <Field label="Senha">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="••••••••" />
                </div>
              </Field>
            )}
            {error && <ErrorBox error={error} />}
            {sent && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">Se o e-mail estiver cadastrado, você receberá um link em instantes.</div>}
            <Button type="submit" loading={busy} className="w-full" size="lg">{mode === "login" ? "Entrar" : "Enviar link"}</Button>
          </form>
          <button onClick={() => { setMode(mode === "login" ? "forgot" : "login"); setError(null); setSent(false); }} className="mt-4 text-sm text-violet-300 hover:underline">
            {mode === "login" ? "Esqueci minha senha" : "Voltar para o login"}
          </button>
        </div>
      </div>
    </div>
  );
}
