import { Logo } from "../../components/Logo";

export default function NotConfigured() {
  return (
    <div className="grid min-h-screen place-items-center glow-bg p-6">
      <div className="card max-w-lg p-8">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-semibold">Configuração pendente</h1>
        <p className="mt-2 text-sm text-zinc-400">
          A plataforma ainda não está conectada ao Supabase. Crie um arquivo <code className="text-violet-300">.env</code> na raiz do projeto
          (veja <code className="text-violet-300">.env.example</code>) com:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-ink-2 p-4 text-xs text-zinc-300">{`VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica`}</pre>
        <p className="mt-4 text-sm text-zinc-400">Depois reinicie o servidor (<code>npm run dev</code>) ou publique novamente. O passo a passo completo está no README.</p>
      </div>
    </div>
  );
}
