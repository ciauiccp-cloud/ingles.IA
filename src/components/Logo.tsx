import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase, isConfigured } from "../lib/supabase";

let cache: Record<string, string> | null = null;
export function usePublicInfo() {
  const [info, setInfo] = useState<Record<string, string>>(cache ?? {});
  useEffect(() => {
    if (cache || !isConfigured) return;
    supabase.rpc("public_info").then(({ data }) => {
      cache = (data as Record<string, string>) ?? {};
      setInfo(cache);
    });
  }, []);
  return info;
}
export const clearPublicInfoCache = () => { cache = null; };

export function Logo({ compact }: { compact?: boolean }) {
  const info = usePublicInfo();
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-2 to-deep shadow-lg shadow-brand/30">
        <span className="font-display text-lg font-bold">F</span>
        <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-fuchsia-300" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-base font-semibold tracking-tight">{info.platform_name || "Fluency Lab"}</div>
          <div className="text-[11px] text-zinc-400">English with AI</div>
        </div>
      )}
    </div>
  );
}
