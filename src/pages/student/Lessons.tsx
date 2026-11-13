import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge, Button, Card, Empty, Input, Loadable, Modal, PageHeader } from "../../components/ui";
import { must, useAsync } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { fmtDate, levelLabel } from "../../lib/constants";
import { LessonView } from "../teacher/Lessons";

export default function Lessons() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [lessons, mats, acts, classes] = await Promise.all([
      supabase.from("lessons").select("*").order("lesson_date", { ascending: false }).then(must),
      supabase.from("materials").select("*").not("lesson_id", "is", null).then(must),
      supabase.from("activities").select("id, title, lesson_id").not("lesson_id", "is", null).then(must),
      supabase.from("classes").select("id, name").then(must),
    ]);
    return { lessons: lessons as any[], mats: mats as any[], acts: acts as any[], classes: classes as any[] };
  });
  const [q, setQ] = useState("");
  const [view, setView] = useState<any>(null);
  const today = new Date().toISOString().slice(0, 10);
  const list = useMemo(() => (data?.lessons ?? []).filter((l) => !q || `${l.title} ${l.subject ?? ""}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const upcoming = list.filter((l) => l.lesson_date >= today && l.status !== "done").reverse();
  const past = list.filter((l) => !(l.lesson_date >= today && l.status !== "done"));
  const cname = (id: string | null) => data?.classes.find((c) => c.id === id)?.name ?? "Geral";

  const Row = ({ l }: { l: any }) => (
    <Card className="flex items-center gap-4 p-4 transition hover:border-brand/40">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand/15 text-center leading-tight"><div><div className="font-display font-semibold">{l.lesson_date.slice(8, 10)}</div><div className="text-[10px] uppercase text-violet-300">{new Date(l.lesson_date + "T12:00").toLocaleDateString("pt-BR", { month: "short" })}</div></div></div>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{l.title}</div>
        <div className="text-xs text-zinc-400">{cname(l.class_id)} · {l.subject || "—"} · {levelLabel(l.level)}</div>
        {l.status === "cancelled" && <Badge tone="red">Cancelada</Badge>}
      </div>
      <Button size="sm" variant="secondary" onClick={() => setView(l)}>Abrir</Button>
    </Card>
  );

  return (
    <div>
      <PageHeader title="Minhas aulas" subtitle="Próximas aulas e histórico do conteúdo trabalhado" />
      <div className="relative mb-4"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><Input className="pl-9" placeholder="Buscar aula ou assunto" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Loadable loading={loading} error={error} reload={reload}>
        {list.length === 0 ? <Empty title="Nenhuma aula disponível ainda" text="Quando sua professora publicar aulas, elas aparecerão aqui." /> : (
          <div className="space-y-6">
            {upcoming.length > 0 && <div><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">Próximas</h3><div className="space-y-2">{upcoming.map((l) => <Row key={l.id} l={l} />)}</div></div>}
            {past.length > 0 && <div><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">Histórico</h3><div className="space-y-2">{past.map((l) => <Row key={l.id} l={l} />)}</div></div>}
          </div>
        )}
      </Loadable>
      <Modal open={!!view} onClose={() => setView(null)} title={view?.title ?? ""} wide footer={<Button onClick={() => setView(null)}>Fechar</Button>}>
        {view && <LessonView lesson={view} className={cname(view.class_id)} mats={data!.mats.filter((m) => m.lesson_id === view.id)} acts={data!.acts.filter((a) => a.lesson_id === view.id)} studentLinks />}
      </Modal>
    </div>
  );
}
