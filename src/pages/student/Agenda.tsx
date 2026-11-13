import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Loadable, Modal, PageHeader } from "../../components/ui";
import { MonthCalendar, type CalItem } from "../../components/MonthCalendar";
import { must, useAsync } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { EVENT_KINDS, fmtDateTime } from "../../lib/constants";

export default function Agenda() {
  const nav = useNavigate();
  const [sel, setSel] = useState<CalItem | null>(null);
  const { data, loading, error, reload } = useAsync(async () => {
    const [events, acts] = await Promise.all([
      supabase.from("events").select("*").then(must),
      supabase.from("activities").select("id, title, due_date").not("due_date", "is", null).then(must),
    ]);
    return { events: events as any[], acts: acts as any[] };
  });
  const items: CalItem[] = useMemo(() => [
    ...(data?.events ?? []).map((e) => ({ id: e.id, date: new Date(e.starts_at), title: e.title, kind: e.kind, raw: e })),
    ...(data?.acts ?? []).map((a) => ({ id: `a-${a.id}`, date: new Date(a.due_date), title: `Entrega: ${a.title}`, kind: "deadline", raw: { activity_id: a.id } })),
  ], [data]);
  return (
    <div>
      <PageHeader title="Agenda" subtitle="Aulas, avaliações, entregas e eventos" />
      <Loadable loading={loading} error={error} reload={reload}>
        <MonthCalendar items={items} onItemClick={setSel} />
      </Loadable>
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.title ?? ""}
        footer={<>{sel?.raw?.activity_id && <Button onClick={() => nav(`/aluno/atividades/${sel.raw.activity_id}`)}>Abrir atividade</Button>}<Button variant="secondary" onClick={() => setSel(null)}>Fechar</Button></>}>
        {sel && <div className="space-y-2 text-sm"><div className="text-zinc-400">{EVENT_KINDS.find((k) => k.value === sel.kind)?.label} · {fmtDateTime(sel.date.toISOString())}</div>{sel.raw?.description && <p className="whitespace-pre-wrap">{sel.raw.description}</p>}</div>}
      </Modal>
    </div>
  );
}
