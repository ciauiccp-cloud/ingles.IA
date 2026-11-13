import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, cx } from "./ui";
import { EVENT_KINDS } from "../lib/constants";

export type CalItem = { id: string; date: Date; title: string; kind: string; sub?: string; raw?: any };

const WEEK = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function MonthCalendar({ items, onDayClick, onItemClick }: { items: CalItem[]; onDayClick?: (d: Date) => void; onItemClick?: (i: CalItem) => void }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected, setSelected] = useState<string>(ymd(new Date()));
  const days = useMemo(() => {
    const first = new Date(cursor);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);
  const byDay = useMemo(() => {
    const m = new Map<string, CalItem[]>();
    for (const it of items) { const k = ymd(it.date); m.set(k, [...(m.get(k) ?? []), it]); }
    for (const v of m.values()) v.sort((a, b) => a.date.getTime() - b.date.getTime());
    return m;
  }, [items]);
  const color = (k: string) => EVENT_KINDS.find((e) => e.value === k)?.color ?? "bg-zinc-500";
  const today = ymd(new Date());
  const sel = byDay.get(selected) ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold capitalize">{cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h3>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => { const d = new Date(cursor); d.setMonth(d.getMonth() - 1); setCursor(d); }}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="secondary" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); setSelected(today); }}>Hoje</Button>
            <Button size="sm" variant="ghost" onClick={() => { const d = new Date(cursor); d.setMonth(d.getMonth() + 1); setCursor(d); }}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">{WEEK.map((w) => <div key={w} className="py-1">{w}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const k = ymd(d);
            const its = byDay.get(k) ?? [];
            const out = d.getMonth() !== cursor.getMonth();
            return (
              <button key={k} onClick={() => { setSelected(k); }} onDoubleClick={() => onDayClick?.(d)}
                className={cx("min-h-16 rounded-lg border p-1 text-left transition sm:min-h-24",
                  selected === k ? "border-brand bg-brand/10" : "border-line/60 hover:border-brand/40", out && "opacity-40")}>
                <div className={cx("mb-1 grid h-6 w-6 place-items-center rounded-full text-xs", k === today && "bg-brand text-white")}>{d.getDate()}</div>
                <div className="space-y-0.5">
                  {its.slice(0, 3).map((it) => (
                    <div key={it.id} className="flex items-center gap-1 truncate text-[10px] sm:text-[11px]">
                      <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", color(it.kind))} /><span className="hidden truncate sm:inline">{it.title}</span>
                    </div>
                  ))}
                  {its.length > 3 && <div className="text-[10px] text-zinc-500">+{its.length - 3}</div>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">{EVENT_KINDS.map((k) => <span key={k.value} className="flex items-center gap-1"><span className={cx("h-2 w-2 rounded-full", k.color)} />{k.label}</span>)}</div>
      </div>
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium">{new Date(selected + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</h3>
          {onDayClick && <Button size="sm" onClick={() => onDayClick(new Date(selected + "T09:00"))}>Adicionar</Button>}
        </div>
        {sel.length === 0 ? <p className="text-sm text-zinc-500">Nenhum compromisso.</p> : (
          <ul className="space-y-2">{sel.map((it) => (
            <li key={it.id}>
              <button onClick={() => onItemClick?.(it)} className="flex w-full items-start gap-2 rounded-xl border border-line p-3 text-left hover:border-brand/40">
                <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", color(it.kind))} />
                <div><div className="text-sm font-medium">{it.title}</div><div className="text-xs text-zinc-400">{it.date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{it.sub && ` · ${it.sub}`}</div></div>
              </button>
            </li>
          ))}</ul>
        )}
      </div>
    </div>
  );
}
