import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "../../components/Logo";
import { Button, ErrorBox, Field, Input, useToast } from "../../components/ui";
import { errMsg, supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

export default function ResetPassword() {
  const { session } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setError("A senha deve ter pelo menos 8 caracteres.");
    if (pw !== pw2) return setError("As senhas não conferem.");
    setBusy(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError(errMsg(error));
    toast("Senha atualizada com sucesso!");
    nav("/entrar");
  };
  return (
    <div className="grid min-h-screen place-items-center glow-bg p-6">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-7">
        <Logo />
        <h1 className="font-display text-xl font-semibold">Criar nova senha</h1>
        {!session && <p className="text-sm text-amber-300">Abra esta página pelo link enviado ao seu e-mail.</p>}
        <Field label="Nova senha"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></Field>
        <Field label="Confirmar senha"><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></Field>
        {error && <ErrorBox error={error} />}
        <Button type="submit" className="w-full" loading={busy} disabled={!session}>Salvar senha</Button>
      </form>
    </div>
  );
}
