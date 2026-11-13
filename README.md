# Fluency Lab — Plataforma de ensino de inglês com IA

Plataforma completa para a professora gerenciar turmas e para os alunos estudarem inglês, com tutor de conversação por IA (texto e voz).

**Tecnologias:** React 18 + TypeScript + Vite + Tailwind CSS v4 no frontend; Supabase (Postgres com RLS, Auth, Storage e Edge Functions) no backend; IA da Anthropic (Claude) chamada **somente** pelas Edge Functions, então a chave nunca vai para o navegador.

## O que já vem pronto

- **Site público:** página inicial, login, recuperação de senha e configuração inicial da conta da professora.
- **Área da professora:** painel com estatísticas, alunos (cadastro com senha temporária e campos de LGPD), turmas, aulas e biblioteca de aulas, materiais (PDF, áudio, vídeo, imagem e link), atividades com 10 tipos de questão, banco de questões, geração de questões com IA, correções com nota sugerida pela IA (a professora edita e libera), relatórios do tutor, relatórios com gráficos e PDF, calendário, avisos, conteúdos (vocabulário, gramática e textos) e configurações (gamificação, ranking, metas).
- **Área do aluno:** início, aulas, atividades (com cronômetro e limite de tentativas), tutor de IA, vocabulário com flashcards e repetição espaçada, gramática, listening, reading, writing com correção por IA, speaking (pronúncia, leitura em voz alta, simulações), desempenho, materiais, agenda e avisos.
- **Conteúdo base:** 80 palavras, 10 tópicos de gramática e 6 textos de listening/reading. São conteúdos pedagógicos reais, não dados fictícios de alunos.

## Passo a passo para colocar no ar

### 1. Criar o projeto no Supabase
1. Crie uma conta em https://supabase.com e um projeto novo (o plano gratuito serve para começar).
2. Em **Project Settings → API**, copie a **Project URL** e a chave **anon/publishable**.

### 2. Criar o banco de dados
No **SQL Editor** do Supabase, rode os arquivos abaixo **nesta ordem** (copie e cole o conteúdo de cada um):

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_practice.sql`
3. `supabase/migrations/0003_seed_content.sql`

Se preferir a linha de comando: `supabase link --project-ref SEU_REF` e depois `supabase db push`.

### 3. Publicar as funções de IA e de usuários
Com a [Supabase CLI](https://supabase.com/docs/guides/cli) instalada:

```bash
supabase login
supabase link --project-ref SEU_REF
supabase functions deploy ai
supabase functions deploy admin-users
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# opcional: trocar o modelo (padrão: claude-opus-5-5)
# supabase secrets set AI_MODEL=claude-sonnet-5-5
```

A chave da Anthropic é criada em https://console.anthropic.com. Ela fica guardada como segredo no Supabase e nunca aparece no site.

### 4. Configurar o login
Em **Authentication → URL Configuration**:
- **Site URL:** o endereço do site (ex.: `https://seu-site.vercel.app`, ou `http://localhost:5173` em testes).
- **Redirect URLs:** adicione `https://seu-site.vercel.app/redefinir-senha` (e `http://localhost:5173/redefinir-senha`).

Recomendado: em **Authentication → Providers → Email**, desative o cadastro público ("Allow new users to sign up"). Os alunos são cadastrados pela professora dentro da plataforma.

### 5. Rodar o site
```bash
cp .env.example .env      # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev               # abre em http://localhost:5173
```

### 6. Criar a conta da professora
Abra `/configuracao-inicial`. Essa tela só funciona enquanto não existir nenhuma professora; depois ela se bloqueia sozinha.

### 7. Publicar (ex.: Vercel)
Importe o projeto na Vercel, defina as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, e publique. O arquivo `vercel.json` já faz as rotas funcionarem ao recarregar a página. Comando de build: `npm run build`; pasta de saída: `dist`.

## Observações importantes

- **Voz:** o reconhecimento de fala usa o navegador. Funciona melhor no **Chrome** ou no **Edge** (computador e Android). No Safari/iPhone o modo por texto funciona normalmente, mas o microfone pode não estar disponível.
- **LGPD e menores de idade:** o áudio nunca é gravado nem enviado; só o texto transcrito vai para a IA. O aluno precisa aceitar o aviso de privacidade antes de usar o tutor, e o uso por voz de alunos menores só é liberado quando a professora marca a autorização do responsável no cadastro. Cada aluno vê apenas os próprios dados (regras RLS no banco), e as respostas corretas das atividades nunca chegam ao navegador do aluno antes da hora.
- **Custos:** o Supabase gratuito atende uma turma pequena. A IA é cobrada por uso na Anthropic; uma conversa curta com o tutor custa alguns centavos. Para economizar, defina `AI_MODEL` com um modelo menor (ex.: `claude-sonnet-5-5` ou `claude-haiku-5-5`).
- **Dados de demonstração:** a plataforma não cria alunos ou notas falsas. Qualquer exemplo de demonstração aparece com a etiqueta "demonstração".

## Estrutura

```
src/                  frontend (páginas em src/pages/{public,teacher,student,shared})
supabase/migrations/  banco de dados, regras de acesso e conteúdo base
supabase/functions/   ai (tutor, correção, geração de questões) e admin-users
scripts/              geração do conteúdo base e testes das regras de acesso
```
