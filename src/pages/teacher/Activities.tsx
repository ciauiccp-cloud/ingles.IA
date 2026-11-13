import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge, Button, Card, Empty, Input, Loadable, PageHeader, Select, useToast } from "../../components/ui";
import { must, useAsync } from "../../lib/hooks";
import { errMsg, supabase } from "../../lib/supabase";
import { fetchClasses } from "../../lib/data";
import { CATEGORIES, categoryLabel, fmtDateTime } from "../../lib/constants";

export default function Activities() {
  const nav = useNavigate();
  const { toast, confirm } = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [acts, classes, subs, qs] = await Promise.all([
      supabase.from("activities").select("*, profiles!activities_student_id_fkey(full_name)").order("created_at", { ascending: false }).then(must),
      fetchClasses(),
      supabase.from("submissions").select("activity_id, status").then(must),
      supabase.from("questions").select("activity_id").not("activity_id", "is", null).then(must),
    ]);
    return { acts: acts as any[], classes, subs: subs as any[], qs: qs as any[] };
  });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const list = useMemo(() => (data?.acts ?? []).filter((a) => (!q || a.title.toLowerCase().includes(q.toLowerCase())) && (!cat || a.category === cat)), [data, q, cat]);

  const duplicate = async (a: any) => {
    try {
      const { id, created_at, profiles, ...rest } = a;
      const r = await supabase.from("activities").insert({ ...rest, title: `${a.title} (cópia)`, published: false }).select().single();
      if (r.error) throw r.error;
      const qs = must(await supabase.from("questions").select("*").eq("activity_id", a.id)) as any[];
      if (qs.length) {
        const ins = await supabase.from("questions").insert(qs.map(({ id: _i, created_at: _c, ...x }) => ({ ...x, activity_id: r.data.id, in_bank: false })));
        if (ins.error) throw ins.error;
      }
      toast("Atividade duplicada como rascunho."); nav(`/professora/atividades/${r.data.id}`);
    } catch (e) { toast(errMsg(e), "error"); }
  };
  const remove = async (a: any) => {
    if (!(await confirm(`Excluir "${a.title}"? Todas as respostas dos alunos para esta atividade também serão apagadas.`, { danger: true, ok: "Excluir" }))) return;
    const { error } = await supabase.from("activities").delete().eq("id", a.id);
    if (error) return toast(errMsg(error), "error");
    toast("Atividade excluída."); reload();
  };

  return (
    <div>
      <PageHeader title="Atividades" subtitle="Crie exercícios, avaliações e tarefas para turmas ou alunos"
        actions={<Link to="/professora/atividades/nova"><Button icon={<Plus className="h-4 w-4" />}>Nova atividade</Button></Link>} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><Input className="pl-9" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select className="sm:w-52" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Todas as categorias</option>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select>
      </div>
      <Loadable loading={loading} error={error} reload={reload}>
        {list.length === 0 ? <Empty title="Nenhuma atividade" text="Crie sua primeira atividade com questões objetivas, discursivas, áudio ou imagem." action={<Link to="/professora/atividades/nova"><Button>Criar atividade</Button></Link>} /> : (
          <div className="grid gap-3 lg:grid-cols-2">
            {list.map((a) => {
              const subs = data!.subs.filter((s) => s.activity_id === a.id);
              const pending = subs.filter((s) => s.status === "submitted" || s.status === "ai_graded").length;
              return (
                <Card key={a.id} className="transition hover:border-brand/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/professora/atividades/${a.id}`} className="font-medium hover:text-violet-300">{a.title}</Link>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge>{categoryLabel(a.category)}</Badge>
                        <Badge tone={a.published ? "green" : "zinc"}>{a.published ? "Publicada" : "Rascunho"}</Badge>
                        <Badge tone="zinc">{a.student_id ? `Individual: ${a.profiles?.full_name}` : data!.classes.find((c) => c.id === a.class_id)?.name ?? "Todos os alunos"}</Badge>
                        {a.time_limit_minutes && <Badge tone="sky">⏱ {a.time_limit_minutes} min</Badge>}
                      </div>
                    </div>
                    <div className="flex shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => nav(`/professora/atividades/${a.id}`)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => duplicate(a)} title="Duplicar"><Copy className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(a)}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-400">
                    <span>{data!.qs.filter((x) => x.activity_id === a.id).length} questões</span>
                    <span>{subs.length} envios</span>
                    {pending > 0 && <Link to="/professora/correcoes" className="text-amber-300 hover:underline">{pending} para corrigir</Link>}
                    <span>Entrega: {a.due_date ? fmtDateTime(a.due_date) : "sem prazo"}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Loadable>
    </div>
  );
}
