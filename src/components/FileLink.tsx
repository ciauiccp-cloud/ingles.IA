import { useEffect, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { signedUrl } from "../lib/supabase";

/** Abre um arquivo privado do Storage com URL temporária. */
export function FileLink({ path, name, className }: { path: string; name?: string | null; className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} className={className ?? "inline-flex items-center gap-1.5 text-sm text-violet-300 hover:underline"}
      onClick={async () => {
        setBusy(true);
        try { window.open(await signedUrl(path), "_blank", "noopener"); } finally { setBusy(false); }
      }}>
      <FileText className="h-4 w-4" /> {name || "Abrir arquivo"} <ExternalLink className="h-3 w-3 opacity-60" />
    </button>
  );
}

export function useSignedUrl(path?: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (path) signedUrl(path).then(setUrl).catch(() => setUrl(null));
  }, [path]);
  return url;
}

/** Mostra a mídia (áudio, vídeo, imagem, PDF) de um arquivo privado ou URL. */
export function MediaView({ path, url, kind, name }: { path?: string | null; url?: string | null; kind: string; name?: string | null }) {
  const signed = useSignedUrl(path);
  const src = signed ?? url ?? null;
  if (!src) return path ? <p className="text-sm text-zinc-500">Carregando arquivo…</p> : null;
  if (kind === "audio") return <AudioPlayer src={src} />;
  if (kind === "image") return <img src={src} alt={name ?? ""} className="max-h-96 rounded-xl border border-line" />;
  if (kind === "video") {
    const yt = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
    if (yt) return <iframe className="aspect-video w-full rounded-xl border border-line" src={`https://www.youtube-nocookie.com/embed/${yt[1]}`} allowFullScreen title={name ?? "vídeo"} />;
    return <video src={src} controls className="w-full rounded-xl border border-line" />;
  }
  if (kind === "pdf") return <iframe src={src} className="h-[70vh] w-full rounded-xl border border-line bg-white" title={name ?? "PDF"} />;
  return <a href={src} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-violet-300 hover:underline"><ExternalLink className="h-4 w-4" /> {name || "Abrir"}</a>;
}

/** Player de áudio com controle de velocidade (Listening). */
export function AudioPlayer({ src }: { src: string }) {
  const [rate, setRate] = useState(1);
  const [el, setEl] = useState<HTMLAudioElement | null>(null);
  useEffect(() => { if (el) el.playbackRate = rate; }, [rate, el]);
  return (
    <div className="space-y-2">
      <audio ref={setEl} src={src} controls className="w-full" />
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        Velocidade:
        {[0.75, 1, 1.25].map((r) => (
          <button key={r} type="button" onClick={() => setRate(r)} className={`rounded-lg px-2 py-1 ${rate === r ? "bg-brand text-white" : "bg-ink-3 hover:text-white"}`}>{r}x</button>
        ))}
      </div>
    </div>
  );
}
