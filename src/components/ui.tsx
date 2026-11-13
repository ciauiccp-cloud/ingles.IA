import {
  createContext, useContext, useEffect, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from "react";
import { AlertTriangle, CheckCircle2, Inbox, Loader2, X } from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ------------------------------------------------------------ Botões
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
};
export function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest }: BtnProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
  const sizes = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };
  const variants = {
    primary: "bg-gradient-to-r from-brand to-brand-2 text-white shadow-lg shadow-brand/20 hover:shadow-brand/40 hover:brightness-110 active:scale-[.98]",
    secondary: "bg-ink-3 text-white border border-line hover:border-brand/50 hover:bg-[#1f1f2a]",
    outline: "border border-brand/50 text-violet-200 hover:bg-brand/10",
    ghost: "text-zinc-300 hover:text-white hover:bg-white/5",
    danger: "bg-rose-600/90 text-white hover:bg-rose-600",
  };
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ------------------------------------------------------------ Formulário
export function Field({ label, hint, children, className }: { label?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block space-y-1.5", className)}>
      {label && <span className="text-sm font-medium text-zinc-300">{label}</span>}
      {children}
      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}
const inputCls = "w-full rounded-xl bg-ink-2 border border-line px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition";
export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input className={cx(inputCls, className)} {...p} />;
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cx(inputCls, "min-h-24", className)} {...p} />;
export const Select = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cx(inputCls, "appearance-none pr-8 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 fill=%22%23a1a1aa%22 viewBox=%220 0 16 16%22><path d=%22M4 6l4 4 4-4%22 stroke=%22%23a1a1aa%22 fill=%22none%22 stroke-width=%222%22/></svg>')] bg-no-repeat bg-[right_0.75rem_center]", className)} {...p}>
    {children}
  </select>
);
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-3 text-sm text-zinc-300 text-left">
      <span className={cx("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand" : "bg-zinc-700")}>
        <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
      {label}
    </button>
  );
}

// ------------------------------------------------------------ Layout
export function Card({ className, children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("card p-5", className)} {...p}>{children}</div>;
}
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
export function Stat({ label, value, icon, hint, accent }: { label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode; accent?: string }) {
  return (
    <div className="card p-4 transition hover:border-brand/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span>
        {icon && <span className={cx("grid h-8 w-8 place-items-center rounded-lg", accent ?? "bg-brand/15 text-violet-300")}>{icon}</span>}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}
export function Badge({ children, tone = "violet", className }: { children: ReactNode; tone?: "violet" | "green" | "amber" | "red" | "zinc" | "sky"; className?: string }) {
  const tones = {
    violet: "bg-brand/15 text-violet-200 border-brand/30",
    green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    red: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    zinc: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30",
    sky: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}
export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-zinc-800", className)}>
      <div className="h-full rounded-full bg-gradient-to-r from-brand to-fuchsia-500 transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-line bg-ink-2 p-1 scrollbar-thin">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={cx("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition", value === t.value ? "bg-brand text-white shadow" : "text-zinc-400 hover:text-white")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ Estados
export function Spinner({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-zinc-400">
      <Loader2 className="h-5 w-5 animate-spin text-brand" /> {label}
    </div>
  );
}
export function Empty({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-violet-300">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <h3 className="font-medium">{title}</h3>
      {text && <p className="mt-1 max-w-md text-sm text-zinc-400">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function ErrorBox({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{error}</div>
      {onRetry && <button onClick={onRetry} className="underline">Tentar novamente</button>}
    </div>
  );
}
/** Envolve o conteúdo com estados de carregamento/erro. */
export function Loadable({ loading, error, reload, children }: { loading: boolean; error: string | null; reload?: () => void; children: ReactNode }) {
  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  return <>{children}</>;
}

// ------------------------------------------------------------ Modal
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()}
        className={cx("card flex max-h-[92vh] w-full flex-col rounded-b-none animate-fade-up sm:rounded-2xl", wide ? "sm:max-w-4xl" : "sm:max-w-lg")}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-white/5 hover:text-white" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Toasts e confirmação
type Toast = { id: number; type: "success" | "error" | "info"; text: string };
const ToastCtx = createContext<{ toast: (text: string, type?: Toast["type"]) => void; confirm: (text: string, opts?: { danger?: boolean; ok?: string }) => Promise<boolean> }>(null as any);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const [conf, setConf] = useState<{ text: string; danger?: boolean; ok?: string; resolve: (v: boolean) => void } | null>(null);
  const toast = (text: string, type: Toast["type"] = "success") => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, type, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4500);
  };
  const confirm = (text: string, opts?: { danger?: boolean; ok?: string }) =>
    new Promise<boolean>((resolve) => setConf({ text, ...opts, resolve }));
  return (
    <ToastCtx.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={cx("pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur animate-fade-up",
            t.type === "error" ? "border-rose-500/40 bg-rose-950/90 text-rose-100" : t.type === "info" ? "border-line bg-ink-3/95" : "border-emerald-500/40 bg-emerald-950/90 text-emerald-100")}>
            {t.type === "error" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
      <Modal open={!!conf} onClose={() => { conf?.resolve(false); setConf(null); }} title="Confirmar"
        footer={<>
          <Button variant="ghost" onClick={() => { conf?.resolve(false); setConf(null); }}>Cancelar</Button>
          <Button variant={conf?.danger ? "danger" : "primary"} onClick={() => { conf?.resolve(true); setConf(null); }}>{conf?.ok ?? "Confirmar"}</Button>
        </>}>
        <p className="text-sm text-zinc-300">{conf?.text}</p>
      </Modal>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/** Bloco de texto com quebras de linha e **negrito** simples. */
export function RichText({ text, className }: { text?: string | null; className?: string }) {
  if (!text) return null;
  return (
    <div className={cx("space-y-2 text-sm leading-relaxed text-zinc-300", className)}>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>
          {para.split("\n").map((line, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((seg, k) =>
                seg.startsWith("**") ? <strong key={k} className="text-white">{seg.slice(2, -2)}</strong>
                : seg.startsWith("*") && seg.length > 2 ? <em key={k} className="text-violet-200">{seg.slice(1, -1)}</em>
                : <span key={k}>{seg}</span>)}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

export function DemoTag() {
  return <Badge tone="amber">Dados de demonstração</Badge>;
}
