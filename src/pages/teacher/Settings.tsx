import { useEffect, useState } from "react";
import { Button, Card, Field, Input, PageHeader, Spinner, Textarea, Toggle, useToast } from "../../components/ui";
import { clearPublicInfoCache } from "../../components/Logo";
import { useAuth } from "../../lib/auth";
import { errMsg, supabase } from "../../lib/supabase";

export default function Settings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [s, setS] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState("");

  useEffect(() => {
    supabase.from("teacher_settings").select("*").eq("teacher_id", profile!.id).maybeSingle().then(({ data }) => {
      setS(data ?? { teacher_id: profile!.id, platform_name: "Fluency Lab", teacher_display_name: profile!.full_name, teacher_bio: "", gamification_enabled: true, ranking_enabled: false, weekly_challenge: "", weekly_vocab_goal: 20 });
    });
  }, []);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("teacher_settings").upsert({ ...s, teacher_id: profile!.id, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return toast(errMsg(error), "error");
    clearPublicInfoCache();
    toast("Configurações salvas.");
  };
  const changePw = async () => {
    if (pw.length < 8) return toast("A senha deve ter pelo menos 8 caracteres.", "error");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast(errMsg(error), "error");
    setPw(""); toast("Senha alterada.");
  };

  if (!s) return <Spinner />;
  return (
    <div className="max-w-3xl">
      <PageHeader title="Configurações" subtitle="Identidade da plataforma, gamificação e conta" />
      <div className="space-y-4">
        <Card className="space-y-4">
          <h3 className="font-medium">Página inicial</h3>
          <Field label="Nome da plataforma"><Input value={s.platform_name ?? ""} onChange={(e) => setS({ ...s, platform_name: e.target.value })} /></Field>
          <Field label="Nome de exibição da professora"><Input value={s.teacher_display_name ?? ""} onChange={(e) => setS({ ...s, teacher_display_name: e.target.value })} /></Field>
          <Field label="Apresentação da professora" hint="Aparece na página inicial pública."><Textarea value={s.teacher_bio ?? ""} onChange={(e) => setS({ ...s, teacher_bio: e.target.value })} /></Field>
        </Card>
        <Card className="space-y-4">
          <h3 className="font-medium">Gamificação</h3>
          <Toggle checked={s.gamification_enabled} onChange={(v) => setS({ ...s, gamification_enabled: v })} label="Mostrar pontos, medalhas e desafios aos alunos" />
          <Toggle checked={s.ranking_enabled} onChange={(v) => setS({ ...s, ranking_enabled: v })} label="Mostrar ranking da turma aos alunos (competição)" />
          <Field label="Desafio da semana"><Input value={s.weekly_challenge ?? ""} onChange={(e) => setS({ ...s, weekly_challenge: e.target.value })} /></Field>
          <Field label="Meta semanal de vocabulário (revisões)"><Input type="number" min={0} value={s.weekly_vocab_goal} onChange={(e) => setS({ ...s, weekly_vocab_goal: Number(e.target.value) })} /></Field>
        </Card>
        <div className="flex justify-end"><Button loading={busy} onClick={save}>Salvar configurações</Button></div>
        <Card className="space-y-3">
          <h3 className="font-medium">Minha senha</h3>
          <div className="flex gap-2"><Input type="password" placeholder="Nova senha" value={pw} onChange={(e) => setPw(e.target.value)} /><Button variant="secondary" onClick={changePw}>Alterar</Button></div>
        </Card>
      </div>
    </div>
  );
}
