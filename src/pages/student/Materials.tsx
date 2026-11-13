import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge, Button, Card, Empty, Input, Loadable, Modal, PageHeader, Select } from "../../components/ui";
import { must, useAsync } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { MATERIAL_KINDS, fmtDate, levelLabel } from "../../lib/constants";
import { MaterialViewer, kindIcon } from "../teacher/Materials";

export default function Materials() {
  const { data, loading, error, reload } = useAsync(async () => must(await supabase.from("materials").select("*").order("created_at", { ascending: false })) as any[]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [view, setView] = useState<any>(null);
  const grouped = useMemo(() => {
    const g = new Map<string, any[]>();
    for (const m of (data ?? []).filter((m) => (!q || `${m.title} ${m.subject ?? ""}`.toLowerCase().includes(q.toLowerCase())) && (!kind || m.kind === kind))) {
      const k = m.unit || "Outros materiais"; g.set(k, [...(g.get(k) ?? []), m]);
    }
    return [...g.entries()];
  }, [data, q, kind]);
  return (
    <div>
      <PageHeader title="Materiais da professora" subtitle="Apostilas, áudios, vídeos e materiais complementares" />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><Input className="pl-9" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select className="sm:w-52" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">Todos os tipos</option>{MATERIAL_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select>
      </div>
      <Loadable loading={loading} error={error} reload={reload}>
        {grouped.length === 0 ? <Empty title="Nenhum material disponível" /> : (
          <div className="space-y-6">{grouped.map(([unit, mats]) => (
            <div key={unit}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">{unit}</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{mats.map((m) => (
                <button key={m.id} onClick={() => setView(m)} className="card flex items-start gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:border-brand/50">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/15 text-violet-300 [&>svg]:h-5 [&>svg]:w-5">{kindIcon(m.kind)}</div>
                  <div className="min-w-0"><div className="truncate font-medium">{m.title}</div><div className="text-xs text-zinc-400">{MATERIAL_KINDS.find((k) => k.value === m.kind)?.label} · {m.subject || levelLabel(m.level)}</div><div className="mt-1 text-[11px] text-zinc-500">{fmtDate(m.created_at)}</div></div>
                </button>
              ))}</div>
            </div>
          ))}</div>
        )}
      </Loadable>
      <Modal open={!!view} onClose={() => setView(null)} title={view?.title ?? ""} wide footer={<Button onClick={() => setView(null)}>Fechar</Button>}>
        {view && <><div className="mb-3 flex gap-2">{view.subject && <Badge>{view.subject}</Badge>}{view.unit && <Badge tone="zinc">{view.unit}</Badge>}</div><MaterialViewer m={view} /></>}
      </Modal>
    </div>
  );
}
