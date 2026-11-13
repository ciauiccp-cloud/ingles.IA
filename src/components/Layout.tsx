import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { cx } from "./ui";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { fmtDateTime } from "../lib/constants";

export type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean };

function Notifications() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    if (!profile) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(20);
    setItems(data ?? []);
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [profile?.id]);
  const unread = items.filter((i) => !i.read).length;
  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", profile!.id).eq("read", false);
    load();
  };
  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); if (!open) load(); }} className="relative rounded-xl p-2 text-zinc-300 hover:bg-white/5 hover:text-white" aria-label="Notificações">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-fuchsia-500 px-1 text-[10px] font-bold">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="card absolute right-0 z-40 mt-2 w-[min(92vw,360px)] overflow-hidden p-0 shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="font-medium">Notificações</span>
              {unread > 0 && <button onClick={markAll} className="text-xs text-violet-300 hover:underline">Marcar todas como lidas</button>}
            </div>
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {items.length === 0 && <p className="p-6 text-center text-sm text-zinc-500">Nenhuma notificação.</p>}
              {items.map((n) => (
                <button key={n.id} onClick={async () => {
                  await supabase.from("notifications").update({ read: true }).eq("id", n.id);
                  setOpen(false); load();
                  if (n.link) nav(n.link);
                }} className={cx("block w-full border-b border-line/60 px-4 py-3 text-left hover:bg-white/5", !n.read && "bg-brand/5")}>
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-fuchsia-500" />}
                    <div>
                      <div className="text-sm font-medium">{n.title}</div>
                      {n.body && <div className="text-xs text-zinc-400">{n.body}</div>}
                      <div className="mt-0.5 text-[11px] text-zinc-500">{fmtDateTime(n.created_at)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AppLayout({ nav, area }: { nav: NavItem[]; area: string }) {
  const { profile, signOut } = useAuth();
  const [mobile, setMobile] = useState(false);
  const loc = useLocation();
  useEffect(() => setMobile(false), [loc.pathname]);

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="px-5 py-5"><Link to="/"><Logo /></Link></div>
      <div className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{area}</div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => cx(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
              isActive ? "bg-gradient-to-r from-brand/25 to-transparent text-white shadow-[inset_2px_0_0_#9333ea]" : "text-zinc-400 hover:bg-white/5 hover:text-white")}>
            <span className="[&>svg]:h-[18px] [&>svg]:w-[18px]">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </div>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-deep text-sm font-semibold">
            {(profile?.full_name || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{profile?.full_name}</div>
            <div className="truncate text-xs text-zinc-500">{profile?.email}</div>
          </div>
          <button onClick={signOut} className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white" title="Sair" aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-full glow-bg">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-ink/80 backdrop-blur lg:block">{sidebar}</aside>
      {mobile && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobile(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-line bg-ink animate-fade-up">
            <button className="absolute right-3 top-5 rounded-lg p-1 text-zinc-400" onClick={() => setMobile(false)} aria-label="Fechar menu"><X className="h-5 w-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-ink/70 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-zinc-300 hover:bg-white/5 lg:hidden" onClick={() => setMobile(true)} aria-label="Abrir menu"><Menu className="h-5 w-5" /></button>
            <div className="lg:hidden"><Logo compact /></div>
          </div>
          <div className="flex items-center gap-2">
            <Notifications />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
