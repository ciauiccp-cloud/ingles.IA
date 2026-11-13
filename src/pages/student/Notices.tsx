import { Megaphone, Pin } from "lucide-react";
import { Badge, Card, Empty, Loadable, PageHeader } from "../../components/ui";
import { must, useAsync } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { fmtDateTime } from "../../lib/constants";
import { NOTICE_KINDS } from "../teacher/Announcements";

export default function Notices() {
  const { data, loading, error, reload } = useAsync(async () => must(await supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false })) as any[]);
  return (
    <div>
      <PageHeader title="Avisos" subtitle="Comunicados e mensagens da professora" />
      <Loadable loading={loading} error={error} reload={reload}>
        {data?.length === 0 ? <Empty icon={<Megaphone className="h-6 w-6" />} title="Nenhum aviso" /> : (
          <div className="space-y-3">{data?.map((a) => (
            <Card key={a.id} className={a.pinned ? "border-brand/40" : ""}>
              <div className="flex flex-wrap items-center gap-2">{a.pinned && <Pin className="h-4 w-4 text-violet-300" />}<h3 className="font-medium">{a.title}</h3><Badge>{NOTICE_KINDS.find((k) => k.value === a.kind)?.label}</Badge>{a.student_id && <Badge tone="sky">Mensagem para você</Badge>}</div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{a.body}</p>
              <div className="mt-2 text-xs text-zinc-500">{fmtDateTime(a.created_at)}</div>
            </Card>
          ))}</div>
        )}
      </Loadable>
    </div>
  );
}
