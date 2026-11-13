-- =====================================================================
-- Plataforma de Inglês com IA — esquema principal
-- Perfis: 'teacher' (professora) e 'student' (aluno)
-- Todas as tabelas têm RLS ativado.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('teacher', 'student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type english_level as enum ('beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'student',
  full_name text not null default '',
  email text,
  teacher_id uuid references public.profiles(id) on delete set null,
  level english_level not null default 'beginner',
  birth_date date,
  is_minor boolean not null default false,
  guardian_name text,
  guardian_consent boolean not null default false,      -- autorização do responsável (LGPD)
  guardian_consent_at timestamptz,
  voice_consent boolean not null default false,          -- autorização para uso de voz
  privacy_ack_at timestamptz,                            -- aluno ciente de que conversas podem ser analisadas
  goals text,
  points integer not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  last_study_date date,
  active boolean not null default true,
  bio text,
  created_at timestamptz not null default now()
);
create index if not exists profiles_teacher_idx on public.profiles(teacher_id);

-- Funções auxiliares para RLS (security definer evita recursão)
create or replace function public.current_role_name() returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'teacher')
$$;

create or replace function public.my_teacher() returns uuid
language sql stable security definer set search_path = public as $$
  select teacher_id from public.profiles where id = auth.uid()
$$;

create or replace function public.teaches_student(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = sid and teacher_id = auth.uid())
$$;

-- Novo usuário => perfil (sempre como aluno; papel de professora só via função de servidor)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Impede que o aluno altere campos sensíveis do próprio perfil
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if; -- service role / SQL
  if current_setting('app.profile_guard_off', true) = 'on' then return new; end if; -- funções internas
  if public.is_teacher() and (old.teacher_id = auth.uid() or old.id = auth.uid()) then
    -- professora não pode mudar papel nem roubar alunos de outra professora
    if new.role is distinct from old.role and old.id <> auth.uid() then
      raise exception 'Não é permitido alterar o papel do usuário';
    end if;
    if old.id = auth.uid() and new.role is distinct from old.role then
      raise exception 'Não é permitido alterar o próprio papel';
    end if;
    return new;
  end if;
  -- aluno editando o próprio perfil
  new.role := old.role;
  new.teacher_id := old.teacher_id;
  new.level := old.level;
  new.points := old.points;
  new.streak := old.streak;
  new.best_streak := old.best_streak;
  new.last_study_date := old.last_study_date;
  new.is_minor := old.is_minor;
  new.guardian_consent := old.guardian_consent;
  new.guardian_consent_at := old.guardian_consent_at;
  new.voice_consent := old.voice_consent;
  new.active := old.active;
  new.email := old.email;
  return new;
end $$;

drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
for each row execute function public.protect_profile_fields();

alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or teacher_id = auth.uid() or id = public.my_teacher());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_update_teacher on public.profiles;
create policy profiles_update_teacher on public.profiles for update to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- ---------------------------------------------------------------------
-- Configurações da professora (gamificação, ranking)
-- ---------------------------------------------------------------------
create table if not exists public.teacher_settings (
  teacher_id uuid primary key references public.profiles(id) on delete cascade,
  platform_name text not null default 'Fluency Lab',
  teacher_display_name text,
  teacher_bio text,
  gamification_enabled boolean not null default true,
  ranking_enabled boolean not null default false,
  weekly_challenge text default 'Complete 3 atividades e pratique 20 minutos de conversação com a IA.',
  weekly_vocab_goal integer not null default 20,
  updated_at timestamptz not null default now()
);
alter table public.teacher_settings enable row level security;
drop policy if exists ts_teacher on public.teacher_settings;
create policy ts_teacher on public.teacher_settings for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.is_teacher());
drop policy if exists ts_student on public.teacher_settings;
create policy ts_student on public.teacher_settings for select to authenticated
  using (teacher_id = public.my_teacher());

-- ---------------------------------------------------------------------
-- Turmas
-- ---------------------------------------------------------------------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  name text not null,
  level english_level not null default 'beginner',
  schedule text,             -- ex.: "Seg e Qua, 19h–20h"
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index if not exists class_members_student_idx on public.class_members(student_id);

create or replace function public.in_class(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.class_members where class_id = cid and student_id = auth.uid())
$$;

create or replace function public.owns_class(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.classes where id = cid and teacher_id = auth.uid())
$$;

alter table public.classes enable row level security;
drop policy if exists classes_teacher on public.classes;
create policy classes_teacher on public.classes for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.is_teacher());
drop policy if exists classes_student on public.classes;
create policy classes_student on public.classes for select to authenticated
  using (public.in_class(id));

alter table public.class_members enable row level security;
drop policy if exists cm_teacher on public.class_members;
create policy cm_teacher on public.class_members for all to authenticated
  using (public.owns_class(class_id))
  with check (public.owns_class(class_id) and public.teaches_student(student_id));
drop policy if exists cm_student on public.class_members;
create policy cm_student on public.class_members for select to authenticated
  using (student_id = auth.uid());

-- Visibilidade genérica de conteúdo para alunos:
-- conteúdo publicado da sua professora, destinado à sua turma, a ele, ou a todos os alunos (class_id nulo)
create or replace function public.can_see_content(t uuid, cid uuid, sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select t = public.my_teacher() and (
    (sid is not null and sid = auth.uid())
    or (sid is null and cid is not null and public.in_class(cid))
    or (sid is null and cid is null)
  )
$$;

-- ---------------------------------------------------------------------
-- Aulas
-- ---------------------------------------------------------------------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  class_id uuid references public.classes(id) on delete set null,
  title text not null,
  lesson_date date not null default current_date,
  start_time time,
  subject text,              -- assunto (ex.: Simple Past)
  level english_level,
  objectives text[] not null default '{}',
  content text,              -- conteúdo / plano da aula (markdown simples)
  homework text,
  status text not null default 'planned' check (status in ('planned','done','cancelled')),
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.lessons enable row level security;
drop policy if exists lessons_teacher on public.lessons;
create policy lessons_teacher on public.lessons for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.is_teacher());
drop policy if exists lessons_student on public.lessons;
create policy lessons_student on public.lessons for select to authenticated
  using (published and public.can_see_content(teacher_id, class_id, null));

-- ---------------------------------------------------------------------
-- Materiais (PDF, áudio, vídeo, imagem, texto, link, leitura, listening)
-- ---------------------------------------------------------------------
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  class_id uuid references public.classes(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  kind text not null check (kind in ('pdf','audio','video','image','text','link','presentation','other')),
  skill text check (skill in ('listening','reading','writing','speaking','grammar','vocabulary','general')) default 'general',
  unit text,
  subject text,
  level english_level,
  body text,                 -- texto criado na plataforma / transcrição
  file_path text,            -- caminho no bucket "materials"
  file_name text,
  url text,                  -- link externo (YouTube etc.)
  activity_id uuid,          -- atividade de compreensão associada (opcional)
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.materials enable row level security;
drop policy if exists materials_teacher on public.materials;
create policy materials_teacher on public.materials for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.is_teacher());
drop policy if exists materials_student on public.materials;
create policy materials_student on public.materials for select to authenticated
  using (published and public.can_see_content(teacher_id, class_id, null));

-- ---------------------------------------------------------------------
-- Atividades e questões
-- ---------------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  class_id uuid references public.classes(id) on delete set null,
  student_id uuid references public.profiles(id) on delete cascade,   -- atividade individual (opcional)
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  description text,
  category text not null default 'grammar'
    check (category in ('grammar','vocabulary','interpretation','listening','writing','reading','speaking')),
  due_date timestamptz,
  time_limit_minutes integer,                 -- cronômetro opcional
  max_attempts integer not null default 1,    -- 0 = ilimitado
  feedback_mode text not null default 'immediate' check (feedback_mode in ('immediate','after_release')),
  published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.materials drop constraint if exists materials_activity_fk;
alter table public.materials add constraint materials_activity_fk
  foreign key (activity_id) references public.activities(id) on delete set null;

alter table public.activities enable row level security;
drop policy if exists activities_teacher on public.activities;
create policy activities_teacher on public.activities for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.is_teacher());
drop policy if exists activities_student on public.activities;
create policy activities_student on public.activities for select to authenticated
  using (published and public.can_see_content(teacher_id, class_id, student_id));

-- Questões: activity_id nulo = apenas no banco de questões.
-- Tipos: multiple_choice, true_false, fill_blank, matching, ordering, translation,
--        interpretation, open (discursiva), audio, image
-- data (jsonb):
--   multiple_choice/true_false/audio/image/interpretation: { options: [..], answer: index }  (ou answer_text para abertas)
--   fill_blank:  { answers: ["went", "go"] }  (resposta aceita, sem diferenciar maiúsculas)
--   matching:    { pairs: [{left, right}] }
--   ordering:    { words: ["I","am","happy"] }  (ordem correta)
--   translation/open: { reference: "texto de referência", rubric: "critérios" }
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  activity_id uuid references public.activities(id) on delete cascade,
  position integer not null default 0,
  type text not null check (type in ('multiple_choice','true_false','fill_blank','matching','ordering','translation','interpretation','open','audio','image')),
  category text not null default 'grammar'
    check (category in ('grammar','vocabulary','interpretation','listening','writing','reading','speaking')),
  level english_level,
  prompt text not null,
  passage text,              -- texto para interpretação
  media_path text,           -- arquivo no bucket (áudio/imagem)
  media_url text,            -- ou URL externa
  data jsonb not null default '{}'::jsonb,
  points numeric not null default 1,
  in_bank boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists questions_activity_idx on public.questions(activity_id, position);
alter table public.questions enable row level security;
-- Alunos NÃO leem esta tabela diretamente (gabarito). Usam a função get_activity_for_student.
drop policy if exists questions_teacher on public.questions;
create policy questions_teacher on public.questions for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.is_teacher());

-- Envios / tentativas
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  attempt integer not null default 1,
  answers jsonb not null default '{}'::jsonb,       -- { question_id: resposta }
  results jsonb not null default '{}'::jsonb,       -- { question_id: {correct, score, max, ai_feedback, ai_score} }
  auto_score numeric not null default 0,
  ai_score numeric,
  final_score numeric,
  max_score numeric not null default 0,
  needs_review boolean not null default false,
  teacher_comment text,
  status text not null default 'submitted' check (status in ('submitted','ai_graded','graded','released')),
  started_at timestamptz,
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  released_at timestamptz,
  unique(activity_id, student_id, attempt)
);
create index if not exists submissions_student_idx on public.submissions(student_id);
alter table public.submissions enable row level security;
drop policy if exists submissions_teacher on public.submissions;
create policy submissions_teacher on public.submissions for all to authenticated
  using (exists(select 1 from public.activities a where a.id = activity_id and a.teacher_id = auth.uid()))
  with check (exists(select 1 from public.activities a where a.id = activity_id and a.teacher_id = auth.uid()));
-- Aluno não lê direto (as notas podem estar ocultas até a liberação). Usa get_my_submissions().

-- ---------------------------------------------------------------------
-- Tutor de conversação com IA
-- ---------------------------------------------------------------------
create table if not exists public.tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  topic text not null default 'free',
  level english_level not null default 'beginner',
  mode text not null default 'text' check (mode in ('text','voice')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  interactions integer not null default 0,
  corrections_count integer not null default 0,
  report jsonb,
  created_at timestamptz not null default now()
);
create index if not exists tutor_sessions_student_idx on public.tutor_sessions(student_id, started_at desc);

create table if not exists public.tutor_messages (
  id bigserial primary key,
  session_id uuid not null references public.tutor_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  correction jsonb,          -- { original, corrected, explanation_pt, example }
  via_voice boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tutor_messages_session_idx on public.tutor_messages(session_id, id);

alter table public.tutor_sessions enable row level security;
drop policy if exists ts_student_sel on public.tutor_sessions;
create policy ts_student_sel on public.tutor_sessions for select to authenticated
  using (student_id = auth.uid() or public.teaches_student(student_id));
drop policy if exists ts_student_ins on public.tutor_sessions;
create policy ts_student_ins on public.tutor_sessions for insert to authenticated
  with check (student_id = auth.uid());
-- atualizações (fim da sessão, relatório) são feitas pela função de IA no servidor

alter table public.tutor_messages enable row level security;
drop policy if exists tm_select on public.tutor_messages;
create policy tm_select on public.tutor_messages for select to authenticated
  using (exists(select 1 from public.tutor_sessions s where s.id = session_id
                and (s.student_id = auth.uid() or public.teaches_student(s.student_id))));

-- ---------------------------------------------------------------------
-- Vocabulário e gramática
-- teacher_id nulo = conteúdo base da plataforma (visível para todos)
-- ---------------------------------------------------------------------
create table if not exists public.vocab_words (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) on delete cascade,
  category text not null,
  word text not null,
  translation text not null,
  pronunciation text,        -- IPA ou pronúncia aproximada
  example text,
  example_translation text,
  level english_level not null default 'beginner',
  created_at timestamptz not null default now()
);
alter table public.vocab_words enable row level security;
drop policy if exists vw_select on public.vocab_words;
create policy vw_select on public.vocab_words for select to authenticated
  using (teacher_id is null or teacher_id = auth.uid() or teacher_id = public.my_teacher());
drop policy if exists vw_teacher on public.vocab_words;
create policy vw_teacher on public.vocab_words for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.is_teacher());

create table if not exists public.vocab_reviews (
  student_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  word_id uuid not null references public.vocab_words(id) on delete cascade,
  correct integer not null default 0,
  wrong integer not null default 0,
  box integer not null default 0,          -- caixa de Leitner (0..5)
  next_review date not null default current_date,
  last_reviewed timestamptz,
  primary key (student_id, word_id)
);
alter table public.vocab_reviews enable row level security;
drop policy if exists vr_student on public.vocab_reviews;
create policy vr_student on public.vocab_reviews for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists vr_teacher on public.vocab_reviews;
create policy vr_teacher on public.vocab_reviews for select to authenticated
  using (public.teaches_student(student_id));

create table if not exists public.grammar_topics (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  level english_level not null default 'beginner',
  summary text,
  explanation text not null,              -- explicação em português (markdown simples)
  examples jsonb not null default '[]',   -- [{en, pt}]
  exercises jsonb not null default '[]',  -- [{prompt, options:[..], answer: index, explanation}]
  position integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.grammar_topics enable row level security;
drop policy if exists gt_select on public.grammar_topics;
create policy gt_select on public.grammar_topics for select to authenticated
  using (teacher_id is null or teacher_id = auth.uid() or teacher_id = public.my_teacher());
drop policy if exists gt_teacher on public.grammar_topics;
create policy gt_teacher on public.grammar_topics for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.is_teacher());

create table if not exists public.grammar_progress (
  student_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  topic_id uuid not null references public.grammar_topics(id) on delete cascade,
  best_score numeric not null default 0,
  attempts integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_id, topic_id)
);
alter table public.grammar_progress enable row level security;
drop policy if exists gp_student on public.grammar_progress;
create policy gp_student on public.grammar_progress for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists gp_teacher on public.grammar_progress;
create policy gp_teacher on public.grammar_progress for select to authenticated
  using (public.teaches_student(student_id));

-- Produções de escrita corrigidas pela IA
create table if not exists public.writing_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  prompt text,
  text text not null,
  feedback jsonb,
  score numeric,
  created_at timestamptz not null default now()
);
alter table public.writing_entries enable row level security;
drop policy if exists we_student on public.writing_entries;
create policy we_student on public.writing_entries for select to authenticated
  using (student_id = auth.uid() or public.teaches_student(student_id));

-- ---------------------------------------------------------------------
-- Observações pedagógicas (somente professora)
-- ---------------------------------------------------------------------
create table if not exists public.student_notes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);
alter table public.student_notes enable row level security;
drop policy if exists sn_teacher on public.student_notes;
create policy sn_teacher on public.student_notes for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.teaches_student(student_id));

-- ---------------------------------------------------------------------
-- Calendário
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  class_id uuid references public.classes(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  kind text not null default 'lesson' check (kind in ('lesson','exam','deadline','event','review','other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  description text,
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
drop policy if exists ev_teacher on public.events;
create policy ev_teacher on public.events for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.is_teacher());
drop policy if exists ev_student on public.events;
create policy ev_student on public.events for select to authenticated
  using (public.can_see_content(teacher_id, class_id, student_id));

-- ---------------------------------------------------------------------
-- Avisos e notificações
-- ---------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  class_id uuid references public.classes(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'notice' check (kind in ('notice','schedule','activity','reminder','message')),
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
drop policy if exists an_teacher on public.announcements;
create policy an_teacher on public.announcements for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.is_teacher());
drop policy if exists an_student on public.announcements;
create policy an_student on public.announcements for select to authenticated
  using (public.can_see_content(teacher_id, class_id, student_id));

create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists nt_own on public.notifications;
create policy nt_own on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists nt_upd on public.notifications;
create policy nt_upd on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists nt_del on public.notifications;
create policy nt_del on public.notifications for delete to authenticated using (user_id = auth.uid());

-- Destinatários de um conteúdo
create or replace function public.notify_targets(t uuid, cid uuid, sid uuid, ttl text, bdy text, lnk text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if sid is not null then
    insert into notifications(user_id, title, body, link) values (sid, ttl, bdy, lnk);
  elsif cid is not null then
    insert into notifications(user_id, title, body, link)
      select student_id, ttl, bdy, lnk from class_members where class_id = cid;
  else
    insert into notifications(user_id, title, body, link)
      select id, ttl, bdy, lnk from profiles where teacher_id = t and role = 'student' and active;
  end if;
end $$;

create or replace function public.trg_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  was_published boolean := false;
begin
  if tg_table_name = 'announcements' then
    perform notify_targets(new.teacher_id, new.class_id, new.student_id, 'Novo aviso: ' || new.title, left(new.body, 140), '/aluno/avisos');
  elsif tg_table_name = 'lessons' then
    if tg_op = 'UPDATE' then was_published := old.published; end if;
    if new.published and not was_published then
      perform notify_targets(new.teacher_id, new.class_id, null, 'Nova aula: ' || new.title, to_char(new.lesson_date, 'DD/MM/YYYY'), '/aluno/aulas');
    end if;
  elsif tg_table_name = 'materials' then
    if tg_op = 'UPDATE' then was_published := old.published; end if;
    if new.published and not was_published then
      perform notify_targets(new.teacher_id, new.class_id, null, 'Novo material: ' || new.title, null, '/aluno/materiais');
    end if;
  elsif tg_table_name = 'activities' then
    if tg_op = 'UPDATE' then was_published := old.published; end if;
    if new.published and not was_published then
      perform notify_targets(new.teacher_id, new.class_id, new.student_id, 'Nova atividade: ' || new.title,
        case when new.due_date is not null then 'Entrega até ' || to_char(new.due_date at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') end,
        '/aluno/atividades');
    end if;
  elsif tg_table_name = 'events' then
    perform notify_targets(new.teacher_id, new.class_id, new.student_id, 'Agenda: ' || new.title,
      to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI'), '/aluno/agenda');
  end if;
  return new;
end $$;

drop trigger if exists notify_announcements on public.announcements;
create trigger notify_announcements after insert on public.announcements for each row execute function public.trg_notify();
drop trigger if exists notify_lessons on public.lessons;
create trigger notify_lessons after insert or update of published on public.lessons for each row execute function public.trg_notify();
drop trigger if exists notify_materials on public.materials;
create trigger notify_materials after insert or update of published on public.materials for each row execute function public.trg_notify();
drop trigger if exists notify_activities on public.activities;
create trigger notify_activities after insert or update of published on public.activities for each row execute function public.trg_notify();
drop trigger if exists notify_events on public.events;
create trigger notify_events after insert on public.events for each row execute function public.trg_notify();

-- ---------------------------------------------------------------------
-- Gamificação: pontos, medalhas, sequência de estudos
-- ---------------------------------------------------------------------
create table if not exists public.point_events (
  id bigserial primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.point_events enable row level security;
drop policy if exists pe_sel on public.point_events;
create policy pe_sel on public.point_events for select to authenticated
  using (student_id = auth.uid() or public.teaches_student(student_id));

create table if not exists public.student_badges (
  student_id uuid not null references public.profiles(id) on delete cascade,
  badge text not null,
  earned_at timestamptz not null default now(),
  primary key (student_id, badge)
);
alter table public.student_badges enable row level security;
drop policy if exists sb_sel on public.student_badges;
create policy sb_sel on public.student_badges for select to authenticated
  using (student_id = auth.uid() or public.teaches_student(student_id));

-- Registro diário de estudo (frequência de acesso)
create table if not exists public.study_days (
  student_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  actions integer not null default 1,
  primary key (student_id, day)
);
alter table public.study_days enable row level security;
drop policy if exists sd_sel on public.study_days;
create policy sd_sel on public.study_days for select to authenticated
  using (student_id = auth.uid() or public.teaches_student(student_id));

create or replace function public.award(sid uuid, pts integer, why text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into point_events(student_id, points, reason) values (sid, pts, why);
  perform set_config('app.profile_guard_off', 'on', true);
  update profiles set points = points + pts where id = sid;
end $$;

create or replace function public.grant_badge(sid uuid, code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into student_badges(student_id, badge) values (sid, code) on conflict do nothing;
  if found then
    insert into notifications(user_id, title, body, link)
      values (sid, 'Nova medalha conquistada!', code, '/aluno/desempenho');
  end if;
end $$;

-- Marca o dia como estudado e atualiza a sequência
create or replace function public.touch_study(sid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  p profiles%rowtype;
  today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select * into p from profiles where id = sid;
  if not found or p.role <> 'student' then return; end if;
  insert into study_days(student_id, day) values (sid, today)
    on conflict (student_id, day) do update set actions = study_days.actions + 1;
  if p.last_study_date = today then return; end if;
  perform set_config('app.profile_guard_off', 'on', true);
  if p.last_study_date = today - 1 then
    update profiles set streak = streak + 1, best_streak = greatest(best_streak, streak + 1), last_study_date = today where id = sid;
  else
    update profiles set streak = 1, best_streak = greatest(best_streak, 1), last_study_date = today where id = sid;
  end if;
  if (select streak from profiles where id = sid) >= 7 then perform grant_badge(sid, 'Seven Days Learning'); end if;
end $$;

-- RPC chamada pelo aluno (ex.: ao abrir a plataforma ou concluir um exercício)
create or replace function public.register_study() returns void
language sql security definer set search_path = public as $$
  select public.touch_study(auth.uid());
$$;

create or replace function public.check_badges(sid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  select count(*) into n from tutor_sessions where student_id = sid and ended_at is not null;
  if n >= 1 then perform grant_badge(sid, 'First Conversation'); end if;
  if n >= 10 then perform grant_badge(sid, 'Conversation Pro'); end if;

  select count(*) into n from vocab_reviews where student_id = sid and box >= 3;
  if n >= 50 then perform grant_badge(sid, 'Vocabulary Champion'); end if;

  select count(*) into n from grammar_progress where student_id = sid and best_score >= 80;
  if n >= 5 then perform grant_badge(sid, 'Grammar Master'); end if;

  select count(*) into n from submissions s join activities a on a.id = s.activity_id
    where s.student_id = sid and a.category = 'listening' and s.max_score > 0
      and coalesce(s.final_score, s.auto_score) / s.max_score >= 0.8;
  if n >= 5 then perform grant_badge(sid, 'Listening Expert'); end if;

  select count(*) into n from submissions where student_id = sid;
  if n >= 1 then perform grant_badge(sid, 'First Activity'); end if;
end $$;

-- ---------------------------------------------------------------------
-- Funções de atividades para o aluno (sem expor gabarito)
-- ---------------------------------------------------------------------
create or replace function public.student_can_access_activity(aid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from activities a where a.id = aid and a.published
                and public.can_see_content(a.teacher_id, a.class_id, a.student_id))
$$;

create or replace function public.get_activity_for_student(aid uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  act activities%rowtype;
  qs jsonb;
  used integer;
begin
  if not student_can_access_activity(aid) then raise exception 'Atividade não disponível'; end if;
  select * into act from activities where id = aid;
  select count(*) into used from submissions where activity_id = aid and student_id = auth.uid();
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'type', q.type, 'prompt', q.prompt, 'passage', q.passage,
      'media_path', q.media_path, 'media_url', q.media_url, 'points', q.points,
      'data', case
        when q.type in ('multiple_choice','true_false','audio','image','interpretation')
          then jsonb_build_object('options', q.data->'options')
        when q.type = 'matching' then jsonb_build_object(
          'left', (select jsonb_agg(p->'left') from jsonb_array_elements(q.data->'pairs') p),
          'right', (select jsonb_agg(r order by md5(r::text || q.id::text)) from
                    (select p->'right' as r from jsonb_array_elements(q.data->'pairs') p) s))
        when q.type = 'ordering' then jsonb_build_object(
          'words', (select jsonb_agg(w order by md5(w::text || q.id::text)) from jsonb_array_elements(q.data->'words') w))
        when q.type = 'fill_blank' then jsonb_build_object('blanks', jsonb_array_length(coalesce(q.data->'answers','[]'::jsonb)))
        else '{}'::jsonb end
    ) order by q.position, q.created_at), '[]'::jsonb)
  into qs from questions q where q.activity_id = aid;
  return jsonb_build_object(
    'activity', to_jsonb(act) - 'teacher_id',
    'questions', qs,
    'attempts_used', used
  );
end $$;

-- Corrige questões objetivas no servidor e registra a tentativa
create or replace function public.submit_activity(aid uuid, ans jsonb, started timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  act activities%rowtype;
  q record;
  used integer;
  res jsonb := '{}'::jsonb;
  total numeric := 0; maxs numeric := 0; sc numeric; ok boolean;
  a jsonb; review boolean := false; sub_id uuid;
  given text; expected jsonb; i integer; n integer; hits integer;
begin
  if not student_can_access_activity(aid) then raise exception 'Atividade não disponível'; end if;
  select * into act from activities where id = aid;
  select count(*) into used from submissions where activity_id = aid and student_id = auth.uid();
  if act.max_attempts > 0 and used >= act.max_attempts then
    raise exception 'Limite de tentativas atingido';
  end if;
  if act.due_date is not null and now() > act.due_date + interval '1 day' then
    -- tolerância de 1 dia; a professora vê a data de envio
    null;
  end if;

  for q in select * from questions where activity_id = aid order by position loop
    a := ans -> (q.id::text);
    maxs := maxs + q.points;
    sc := 0; ok := null;
    if q.type in ('multiple_choice','true_false','audio','image','interpretation')
       and (q.data ? 'answer') then
      ok := (a is not null and a::text = (q.data->'answer')::text);
      sc := case when ok then q.points else 0 end;
    elsif q.type = 'fill_blank' then
      expected := coalesce(q.data->'answers', '[]'::jsonb);
      n := jsonb_array_length(expected); hits := 0;
      for i in 0 .. n - 1 loop
        given := lower(trim(coalesce(a->>i, '')));
        if given <> '' and given = any (string_to_array(lower(expected->>i), '|')) then hits := hits + 1; end if;
      end loop;
      sc := case when n > 0 then round(q.points * hits / n, 2) else 0 end;
      ok := (hits = n);
    elsif q.type = 'matching' then
      n := jsonb_array_length(coalesce(q.data->'pairs','[]'::jsonb)); hits := 0;
      for i in 0 .. n - 1 loop
        if a ->> i = q.data->'pairs'->i->>'right' then hits := hits + 1; end if;
      end loop;
      sc := case when n > 0 then round(q.points * hits / n, 2) else 0 end;
      ok := (hits = n);
    elsif q.type = 'ordering' then
      ok := (a is not null and lower(a::text) = lower((q.data->'words')::text));
      sc := case when ok then q.points else 0 end;
    else
      -- translation / open / interpretação discursiva: correção por IA + professora
      review := true;
      ok := null;
    end if;
    total := total + sc;
    res := res || jsonb_build_object(q.id::text, jsonb_build_object('correct', ok, 'score', sc, 'max', q.points, 'pending', ok is null));
  end loop;

  insert into submissions(activity_id, student_id, attempt, answers, results, auto_score, max_score, needs_review,
                          status, started_at, final_score, released_at)
  values (aid, auth.uid(), used + 1, ans, res, total, maxs, review,
          case when not review and act.feedback_mode = 'immediate' then 'released' else 'submitted' end,
          started,
          case when not review then total end,
          case when not review and act.feedback_mode = 'immediate' then now() end)
  returning id into sub_id;

  perform award(auth.uid(), 10, 'Atividade concluída: ' || act.title);
  perform touch_study(auth.uid());
  perform check_badges(auth.uid());

  return jsonb_build_object('submission_id', sub_id, 'needs_review', review,
    'show_result', (not review and act.feedback_mode = 'immediate'),
    'score', case when not review and act.feedback_mode = 'immediate' then total end, 'max', maxs);
end $$;

-- Envios do aluno com notas ocultas até a liberação
create or replace function public.get_my_submissions(aid uuid default null)
returns setof jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', s.id, 'activity_id', s.activity_id, 'activity_title', a.title, 'category', a.category,
    'attempt', s.attempt, 'submitted_at', s.submitted_at, 'status', s.status,
    'released', s.status = 'released',
    'answers', s.answers,
    'final_score', case when s.status = 'released' then s.final_score end,
    'max_score', s.max_score,
    'results', case when s.status = 'released' then s.results end,
    'teacher_comment', case when s.status = 'released' then s.teacher_comment end
  )
  from submissions s join activities a on a.id = s.activity_id
  where s.student_id = auth.uid() and (aid is null or s.activity_id = aid)
  order by s.submitted_at desc
$$;

-- Gabarito liberado (após o resultado ser liberado)
create or replace function public.get_answer_key(sub uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  s submissions%rowtype;
  act activities%rowtype;
  used integer;
  reveal boolean;
begin
  select * into s from submissions where id = sub and student_id = auth.uid();
  if not found or s.status <> 'released' then return null; end if;
  select * into act from activities where id = s.activity_id;
  select count(*) into used from submissions where activity_id = s.activity_id and student_id = auth.uid();
  -- o gabarito só aparece quando não há mais tentativas ou o prazo terminou (evita "colar" na nova tentativa)
  reveal := (act.max_attempts > 0 and used >= act.max_attempts) or (act.due_date is not null and act.due_date < now());
  return (select jsonb_object_agg(q.id::text, jsonb_build_object('type', q.type, 'prompt', q.prompt,
            'data', case when reveal then q.data
                         else (q.data - 'answer' - 'answers' - 'reference' - 'rubric' - 'words' - 'pairs')
                              || case when q.data ? 'pairs' then jsonb_build_object('pairs',
                                   (select jsonb_agg(jsonb_build_object('left', p->'left')) from jsonb_array_elements(q.data->'pairs') p))
                                 else '{}'::jsonb end
                    end, 'position', q.position))
          from questions q where q.activity_id = s.activity_id);
end $$;

-- Liberação/correção pela professora
create or replace function public.trg_submission_points() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'released' and old.status is distinct from 'released' then
    insert into notifications(user_id, title, body, link)
      select new.student_id, 'Resultado liberado', a.title, '/aluno/atividades' from activities a where a.id = new.activity_id;
    perform check_badges(new.student_id);
  end if;
  return new;
end $$;
drop trigger if exists submission_release on public.submissions;
create trigger submission_release after update of status on public.submissions
for each row execute function public.trg_submission_points();

-- ---------------------------------------------------------------------
-- Vocabulário: registrar revisão de flashcard (repetição espaçada)
-- ---------------------------------------------------------------------
create or replace function public.review_word(wid uuid, was_correct boolean)
returns void language plpgsql security definer set search_path = public as $$
declare b integer;
begin
  insert into vocab_reviews(student_id, word_id) values (auth.uid(), wid) on conflict do nothing;
  if was_correct then
    update vocab_reviews set correct = correct + 1, box = least(box + 1, 5), last_reviewed = now(),
      next_review = current_date + (array[1,2,4,7,15,30])[least(box + 1, 5) + 1]
      where student_id = auth.uid() and word_id = wid returning box into b;
  else
    update vocab_reviews set wrong = wrong + 1, box = 0, last_reviewed = now(), next_review = current_date
      where student_id = auth.uid() and word_id = wid;
  end if;
  perform award(auth.uid(), 1, 'Revisão de vocabulário');
  perform touch_study(auth.uid());
  perform check_badges(auth.uid());
end $$;

create or replace function public.save_grammar_score(tid uuid, score numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into grammar_progress(student_id, topic_id, best_score, attempts) values (auth.uid(), tid, score, 1)
  on conflict (student_id, topic_id) do update
    set best_score = greatest(grammar_progress.best_score, excluded.best_score),
        attempts = grammar_progress.attempts + 1, updated_at = now();
  perform award(auth.uid(), 5, 'Exercício de gramática');
  perform touch_study(auth.uid());
  perform check_badges(auth.uid());
end $$;

create or replace function public.ack_privacy() returns void
language sql security definer set search_path = public as $$
  update profiles set privacy_ack_at = now() where id = auth.uid();
$$;

-- Ranking por turma (somente se a professora habilitou)
create or replace function public.class_ranking(cid uuid)
returns table(student_id uuid, full_name text, points integer, streak integer)
language plpgsql stable security definer set search_path = public as $$
declare t uuid;
begin
  select teacher_id into t from classes where id = cid;
  if not (owns_class(cid) or in_class(cid)) then raise exception 'Sem acesso'; end if;
  if not owns_class(cid) and not coalesce((select ranking_enabled and gamification_enabled from teacher_settings where teacher_id = t), false) then
    return;
  end if;
  return query select p.id, p.full_name, p.points, p.streak from class_members m join profiles p on p.id = m.student_id
    where m.class_id = cid order by p.points desc limit 50;
end $$;

-- ---------------------------------------------------------------------
-- Estatísticas do painel da professora
-- ---------------------------------------------------------------------
create or replace function public.teacher_dashboard()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not is_teacher() then raise exception 'Apenas professora'; end if;
  return jsonb_build_object(
    'students', (select count(*) from profiles where teacher_id = me and role = 'student' and active),
    'classes', (select count(*) from classes where teacher_id = me and active),
    'lessons_done', (select count(*) from lessons where teacher_id = me and (status = 'done' or lesson_date < current_date) and status <> 'cancelled'),
    'pending', (select count(*) from submissions s join activities a on a.id = s.activity_id
                where a.teacher_id = me and s.status in ('submitted','ai_graded')),
    'graded', (select count(*) from submissions s join activities a on a.id = s.activity_id
               where a.teacher_id = me and s.status in ('graded','released')),
    'avg_score', (select round(avg(100.0 * coalesce(s.final_score, s.auto_score) / nullif(s.max_score,0)), 1)
                  from submissions s join activities a on a.id = s.activity_id where a.teacher_id = me),
    'tutor_minutes', (select coalesce(round(sum(duration_seconds)/60.0), 0) from tutor_sessions ts
                      join profiles p on p.id = ts.student_id where p.teacher_id = me),
    'attention', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select p.id, p.full_name, p.last_study_date,
               round(avg(100.0 * coalesce(s.final_score, s.auto_score) / nullif(s.max_score,0)), 1) as avg_score
        from profiles p left join submissions s on s.student_id = p.id
        where p.teacher_id = me and p.role = 'student' and p.active
        group by p.id
        having coalesce(avg(100.0 * coalesce(s.final_score, s.auto_score) / nullif(s.max_score,0)), 0) < 60
            or p.last_study_date is null or p.last_study_date < current_date - 7
        order by avg_score nulls first limit 8) x)
  );
end $$;

-- ---------------------------------------------------------------------
-- Storage: bucket privado "materials"
-- caminho: {teacher_id}/{uuid}-{arquivo}
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', false, 104857600)
on conflict (id) do nothing;

drop policy if exists "materials teacher write" on storage.objects;
create policy "materials teacher write" on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text and public.is_teacher());
drop policy if exists "materials teacher update" on storage.objects;
create policy "materials teacher update" on storage.objects for update to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "materials teacher delete" on storage.objects;
create policy "materials teacher delete" on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "materials read" on storage.objects;
create policy "materials read" on storage.objects for select to authenticated
  using (bucket_id = 'materials' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists(select 1 from public.materials m where m.file_path = name and m.published
              and public.can_see_content(m.teacher_id, m.class_id, null))
    or exists(select 1 from public.questions q join public.activities a on a.id = q.activity_id
              where q.media_path = name and a.published and public.can_see_content(a.teacher_id, a.class_id, a.student_id))
  ));

-- Permissões de execução das funções RPC
revoke execute on function public.award(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.grant_badge(uuid, text) from public, anon, authenticated;
revoke execute on function public.touch_study(uuid) from public, anon, authenticated;
revoke execute on function public.check_badges(uuid) from public, anon, authenticated;
revoke execute on function public.notify_targets(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
