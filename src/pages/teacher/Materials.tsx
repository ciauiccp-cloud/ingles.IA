import { useMemo, useState } from "react";
import { Eye, FileAudio, FileImage, FileText, FileVideo, Link2, Pencil, Plus, Presentation, Search, Trash2, Upload } from "lucide-react";
import { Badge, Button, Card, Empty, Field, Input, Loadable, Modal, PageHeader, RichText, Select, Textarea, Toggle, useToast } from "../../components/ui";
import { FileLink, MediaView } from "../../components/FileLink";
import { useAuth } from "../../lib/auth";
import { must, useAsync } from "../../lib/hooks";
import { errMsg, supabase, uploadFile } from "../../lib/supabase";
import { fetchClasses } from "../../lib/data";
import { LEVELS, MATERIAL_KINDS, fmtDate, levelLabel } from "../../lib/constants";

export const kindIcon = (k: string) => ({
  pdf: <FileText />, audio: <FileAudio />, video: <FileVideo />, image: <FileImage />, link: <Link2 />, presentation: <Presentation />, text: <FileText />,
} as Record<string, JSX.Element>)[k] ?? <FileText />;

const SKILLS = [
  { value: "general", label: "Geral" }, { value: "grammar", label: "Gramática" }, { value: "vocabulary", label: "Vocabulário" },
  { value: "listening", label: "Listening" }, { value: "reading", label: "Reading" }, { value: "writing", label: "Writing" }, { value: "speaking", label: "Speaking" },
];

export function MaterialViewer({ m }: { m: any }) {
  return (
    <div className="space-y-3">
      {m.body && <RichText text={m.body} />}
      {(m.file_path || m.url) && (["audio", "video", "image", "pdf"].includes(m.kind)
        ? <MediaView path={m.file_path} url={m.url} kind={m.kind} name={m.title} />
        : m.file_path ? <FileLink path={m.file_path} name={m.file_name} />
        : <a href={m.url} target="_blank" rel="noopener" className="text-sm text-violet-300 underline">{m.url}</a>)}
      {m.file_path && ["pdf", "audio", "video", "image"].includes(m.kind) && <FileLink path={m.file_path} name={`Baixar ${m.file_name ?? ""}`} />}
    </div>
  );
}

export default function Materials() {
  const { profile } = useAuth();
  const { toast, confirm } = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [mats, classes] = await Promise.all([supabase.from("materials").select("*").order("created_at", { ascending: false }).then(must), fetchClasses()]);
    return { mats: mats as any[], classes };
  });
  const [f, setF] = useState({ q: "", kind: "", unit: "", cls: "" });
  const [form, setForm] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<any>(null);

  const units = useMemo(() => [...new Set((data?.mats ?? []).map((m) => m.unit).filter(Boolean))].sort(), [data]);
  const list = useMemo(() => (data?.mats ?? []).filter((m) =>
    (!f.q || `${m.title} ${m.subject ?? ""} ${m.unit ?? ""}`.toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.kind || m.kind === f.kind) && (!f.unit || m.unit === f.unit) && (!f.cls || m.class_id === f.cls)), [data, f]);
  const grouped = useMemo(() => {
    const g = new Map<string, any[]>();
    for (const m of list) { const k = m.unit || "Sem unidade"; g.set(k, [...(g.get(k) ?? []), m]); }
    return [...g.entries()];
  }, [list]);

  const save = async () => {
    if (!form.title?.trim()) return toast("Informe o título.", "error");
    if (form.kind === "link" && !form.url) return toast("Informe o link.", "error");
    if (!["text", "link"].includes(form.kind) && !file && !form.file_path && !form.url) return toast("Selecione um arquivo ou informe um link.", "error");
    setBusy(true);
    try {
      let file_path = form.file_path ?? null, file_name = form.file_name ?? null;
      if (file) { const up = await uploadFile(profile!.id, file); file_path = up.path; file_name = up.name; }
      const payload = {
        title: form.title, kind: form.kind, class_id: form.class_id || null, unit: form.unit || null, subject: form.subject || null,
        level: form.level || null, skill: form.skill || "general", body: form.body || null, url: form.url || null, file_path, file_name, published: form.published ?? true,
      };
      const r = form.id ? await supabase.from("materials").update(payload).eq("id", form.id) : await supabase.from("materials").insert(payload);
      if (r.error) throw r.error;
      if (file && form.id && form.file_path) await supabase.storage.from("materials").remove([form.file_path]);
      toast("Material salvo."); setForm(null); setFile(null); reload();
    } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  };
  const remove = async (m: any) => {
    if (!(await confirm(`Excluir "${m.title}"?`, { danger: true, ok: "Excluir" }))) return;
    const { error } = await supabase.from("materials").delete().eq("id", m.id);
    if (error) return toast(errMsg(error), "error");
    if (m.file_path) await supabase.storage.from("materials").remove([m.file_path]);
    toast("Material excluído."); reload();
  };

  return (
    <div>
      <PageHeader title="Materiais didáticos" subtitle="Apostilas, áudios, vídeos, listas de vocabulário e atividades complementares"
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => { setForm({ kind: "pdf", skill: "general", published: true }); setFile(null); }}>Novo material</Button>} />
      <Card className="mb-4 grid gap-2 p-3 sm:grid-cols-4">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><Input className="pl-9" placeholder="Buscar" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
        <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="">Todos os tipos</option>{MATERIAL_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select>
        <Select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}><option value="">Todas as unidades</option>{units.map((u) => <option key={u}>{u}</option>)}</Select>
        <Select value={f.cls} onChange={(e) => setF({ ...f, cls: e.target.value })}><option value="">Todas as turmas</option>{data?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
      </Card>
      <Loadable loading={loading} error={error} reload={reload}>
        {list.length === 0 ? <Empty title="Nenhum material" text="Envie PDFs, áudios, vídeos ou crie textos e listas de vocabulário diretamente na plataforma." /> : (
          <div className="space-y-6">
            {grouped.map(([unit, mats]) => (
              <div key={unit}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">{unit}</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {mats.map((m) => (
                    <Card key={m.id} className="flex items-start gap-3 p-4 transition hover:border-brand/40">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/15 text-violet-300 [&>svg]:h-5 [&>svg]:w-5">{kindIcon(m.kind)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{m.title}</div>
                        <div className="text-xs text-zinc-400">{MATERIAL_KINDS.find((k) => k.value === m.kind)?.label} · {m.subject || "—"} · {levelLabel(m.level)}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge tone="zinc">{data!.classes.find((c) => c.id === m.class_id)?.name ?? "Todos"}</Badge>
                          {!m.published && <Badge tone="amber">Oculto</Badge>}
                          <span className="text-[11px] text-zinc-500">{fmtDate(m.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <Button size="sm" variant="ghost" onClick={() => setView(m)}><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { setForm(m); setFile(null); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(m)}><Trash2 className="h-4 w-4 text-rose-400" /></Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Loadable>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Editar material" : "Novo material"} wide
        footer={<><Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button><Button loading={busy} onClick={save}>Salvar</Button></>}>
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título *" className="sm:col-span-2"><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Tipo"><Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{MATERIAL_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select></Field>
            <Field label="Habilidade"><Select value={form.skill ?? "general"} onChange={(e) => setForm({ ...form, skill: e.target.value })}>{SKILLS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></Field>
            <Field label="Unidade"><Input list="units" value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Ex.: Unit 3" /><datalist id="units">{units.map((u) => <option key={u} value={u} />)}</datalist></Field>
            <Field label="Assunto"><Input value={form.subject ?? ""} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Ex.: Food & Drinks" /></Field>
            <Field label="Turma"><Select value={form.class_id ?? ""} onChange={(e) => setForm({ ...form, class_id: e.target.value })}><option value="">Todos os meus alunos</option>{data?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Nível"><Select value={form.level ?? ""} onChange={(e) => setForm({ ...form, level: e.target.value })}><option value="">—</option>{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</Select></Field>
            {!["text", "link"].includes(form.kind) && (
              <Field label="Arquivo" className="sm:col-span-2" hint="Tamanho máximo: 100 MB. Para vídeos longos, prefira um link (YouTube, Drive).">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-zinc-400 hover:border-brand/60 hover:text-white">
                  <Upload className="h-4 w-4" /> {file ? file.name : form.file_name ? `Substituir: ${form.file_name}` : "Selecionar arquivo"}
                  <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    accept={{ pdf: ".pdf", audio: "audio/*", video: "video/*", image: "image/*", presentation: ".ppt,.pptx,.key,.odp,.pdf" }[form.kind as string]} />
                </label>
              </Field>
            )}
            {["link", "video", "audio", "other"].includes(form.kind) && <Field label={form.kind === "link" ? "Link *" : "Ou link externo"} className="sm:col-span-2"><Input value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" /></Field>}
            <Field label={form.kind === "text" ? "Conteúdo" : "Descrição / instruções / transcrição"} className="sm:col-span-2"
              hint={form.kind === "text" ? "Para listas de vocabulário, use uma palavra por linha: word — tradução." : undefined}>
              <Textarea className="min-h-32" value={form.body ?? ""} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </Field>
            <Toggle checked={form.published ?? true} onChange={(v) => setForm({ ...form, published: v })} label="Visível para os alunos" />
          </div>
        )}
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.title ?? ""} wide footer={<Button onClick={() => setView(null)}>Fechar</Button>}>
        {view && <MaterialViewer m={view} />}
      </Modal>
    </div>
  );
}
