import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge, Button, Card, Empty, Input, Loadable, Modal, PageHeader, Tabs, useToast } from "../../components/ui";
import { QuestionEditor, cleanData, newQuestion, validateQuestion, type QDraft } from "../../components/QuestionEditor";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { errMsg, supabase } from "../../lib/supabase";
import { CATEGORIES, categoryLabel, qTypeLabel } from "../../lib/constants";

export default function QuestionBank() {
  const { profile } = useAuth();
  const { toast, confirm } = useToast();
  const { data, loading, error, reload } = useAsync(async () => must(await supabase.from("questions").select("*").eq("in_bank", true).order("created_at", { ascending: false })) as any[]);
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<QDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => (data ?? []).filter((x) => (cat === "all" || x.category === cat) && (!q || x.prompt.toLowerCase().includes(q.toLowerCase()))), [data, cat, q]);

  const save = async () => {
    if (!edit) return;
    const err = validateQuestion(edit); if (err) return toast(err, "error");
    setBusy(true);
    const row = { type: edit.type, category: edit.category, level: edit.level ?? null, prompt: edit.prompt, passage: edit.passage || null, media_path: edit.media_path || null, media_url: edit.media_url || null, data: cleanData(edit), points: edit.points, in_bank: true, activity_id: null };
    const r = edit.id ? await supabase.from("questions").update(row).eq("id", edit.id) : await supabase.from("questions").insert(row);
    setBusy(false);
    if (r.error) return toast(errMsg(r.error), "error");
    toast("Questão salva."); setEdit(null); reload();
  };
  const remove = async (x: any) => {
    if (!(await confirm("Excluir esta questão do banco?", { danger: true }))) return;
    await supabase.from("questions").delete().eq("id", x.id); reload();
  };

  return (
    <div>
      <PageHeader title="Banco de questões" subtitle="Questões reutilizáveis organizadas por habilidade"
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setEdit(newQuestion("multiple_choice", cat === "all" ? "grammar" : cat))}>Nova questão</Button>} />
      <Tabs value={cat} onChange={setCat} tabs={[{ value: "all", label: "Todas" }, ...CATEGORIES.map((c) => ({ value: c.value as string, label: `${c.label} (${(data ?? []).filter((x) => x.category === c.value).length})` }))]} />
      <div className="relative mb-4"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><Input className="pl-9" placeholder="Buscar enunciado" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Loadable loading={loading} error={error} reload={reload}>
        {list.length === 0 ? <Empty title="Nenhuma questão no banco" text="Crie questões aqui ou salve questões das suas atividades para reutilizar depois." /> : (
          <div className="space-y-2">{list.map((x) => (
            <Card key={x.id} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="text-sm">{x.prompt}</div>
                <div className="mt-1.5 flex flex-wrap gap-1"><Badge>{qTypeLabel(x.type)}</Badge><Badge tone="zinc">{categoryLabel(x.category)}</Badge><Badge tone="zinc">{Number(x.points)} pt</Badge></div>
              </div>
              <div className="flex shrink-0">
                <Button size="sm" variant="ghost" onClick={() => setEdit({ ...x, points: Number(x.points) })}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(x)}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
              </div>
            </Card>
          ))}</div>
        )}
      </Loadable>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar questão" : "Nova questão"} wide
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button><Button loading={busy} onClick={save}>Salvar</Button></>}>
        {edit && <QuestionEditor q={edit} onChange={setEdit} teacherId={profile!.id} />}
      </Modal>
    </div>
  );
}
