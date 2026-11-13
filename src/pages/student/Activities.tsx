import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import { Badge, Card, Empty, Loadable, PageHeader, Tabs } from "../../components/ui";
import { must, useAsync } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { categoryLabel, fmtDateTime, pct } from "../../lib/constants";

export default function Activities() {
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const { data, loading, error, reload } = useAsync(async () => {
    const [acts, subs] = await Promise.all([
      supabase.from("activities").select("*").order("created_at", { ascending: false }).then(must),
      supabase.rpc("get_my_submissions").then(must),
    ]);
    return { acts: acts as any[], subs: (subs as any[]) ?? [] };
  });
  const subsOf = (id: string) => data?.subs.filter((s) => s.activity_id === id) ?? [];
  const pending = (data?.acts ?? []).filter((a) => subsOf(a.id).length === 0);
  const done = (data?.acts ?? []).filter((a) => subsOf(a.id).length > 0);
  const list = tab === "pending" ? pending : done;

  return (
    <div>
      <PageHeader title="Atividades" subtitle="Exercícios e avaliações da sua professora" />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "pending", label: `Pendentes (${pending.length})` }, { value: "done", label: `Realizadas (${done.length})` }]} />
      <Loadable loading={loading} error={error} reload={reload}>
        {list.length === 0 ? <Empty title={tab === "pending" ? "Nenhuma atividade pendente 🎉" : "Você ainda não enviou atividades"} /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {list.map((a) => {
              const subs = subsOf(a.id);
              const last = subs[0];
              const late = a.due_date && new Date(a.due_date) < new Date();
              const p = last?.released ? pct(last.final_score, last.max_score) : null;
              return (
                <Link key={a.id} to={`/aluno/atividades/${a.id}`} className="card group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:border-brand/50">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{a.title}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge>{categoryLabel(a.category)}</Badge>
                      {a.time_limit_minutes && <Badge tone="sky"><Clock className="h-3 w-3" /> {a.time_limit_minutes} min</Badge>}
                      {tab === "pending" && a.due_date && <Badge tone={late ? "red" : "amber"}>{late ? "Atrasada · " : "Até "}{fmtDateTime(a.due_date)}</Badge>}
                      {last && (last.released ? <Badge tone={p! >= 70 ? "green" : "amber"}>Nota: {p}%</Badge> : <Badge tone="zinc">Aguardando correção</Badge>)}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-500 transition group-hover:translate-x-1 group-hover:text-violet-300" />
                </Link>
              );
            })}
          </div>
        )}
      </Loadable>
    </div>
  );
}
