import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../../components/Logo";
import { Button, ErrorBox, Field, Input, Spinner, useToast } from "../../components/ui";
import { callFn, errMsg, supabase } from "../../lib/supabase";

/** Configuração inicial: cria a conta da professora (somente se ainda não existir). */
export default function Setup() {
  const nav = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "open" | "closed">("loading");
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callFn<{ has_teacher: boolean }>("admin-users", { action: "status" })
      .then((r) => setStatus(r.has_teacher ? "closed" : "open"))
      .catch((e) => { setError(errMsg(e)); setStatus("open"); });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await callFn("admin-users", { action: "bootstrap_teacher", ...form });
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (error) throw error;
      toast("Conta da professora criada. Bem-vinda!");
      nav("/professora");
    } catch (err) {
      setError(errMsg(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center glow-bg p-6">
      <div className="card w-full max-w-md p-7">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-semibold">Configuração inicial</h1>
        {status === "loading" && <Spinner />}
        {status === "closed" && (
          <p className="mt-3 text-sm text-zinc-400">A plataforma já está configurada. <Link to="/entrar" className="text-violet-300 underline">Ir para o login</Link>.</p>
        )}
        {status === "open" && (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <p className="text-sm text-zinc-400">Crie a conta de administradora (professora). Esta página só funciona uma vez.</p>
            <Field label="Nome completo"><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="E-mail"><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Senha" hint="Mínimo de 8 caracteres"><Input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            {error && <ErrorBox error={error} />}
            <Button type="submit" className="w-full" loading={busy}>Criar conta da professora</Button>
          </form>
        )}
      </div>
    </div>
  );
}
