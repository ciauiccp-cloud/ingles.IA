-- =====================================================================
-- Módulos de Listening e Reading (textos com questões de compreensão)
-- teacher_id nulo = conteúdo base da plataforma
-- =====================================================================
create table if not exists public.practice_texts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  skill text not null check (skill in ('listening','reading')),
  genre text not null default 'story' check (genre in ('story','news','dialogue','article','other')),
  title text not null,
  level english_level not null default 'beginner',
  body text not null,                       -- texto (reading) ou transcrição (listening)
  audio_path text,                          -- áudio enviado (opcional); sem áudio, usa síntese de voz
  video_url text,
  glossary jsonb not null default '[]',     -- [{word, translation}]
  questions jsonb not null default '[]',    -- [{prompt, options:[..], answer: index}]
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.practice_texts enable row level security;
drop policy if exists pt_select on public.practice_texts;
create policy pt_select on public.practice_texts for select to authenticated
  using (teacher_id is null or teacher_id = auth.uid()
         or (published and public.can_see_content(teacher_id, class_id, null)));
drop policy if exists pt_teacher on public.practice_texts;
create policy pt_teacher on public.practice_texts for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.is_teacher());

create table if not exists public.practice_results (
  student_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  text_id uuid not null references public.practice_texts(id) on delete cascade,
  best_score numeric not null default 0,
  attempts integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_id, text_id)
);
alter table public.practice_results enable row level security;
drop policy if exists pr_student on public.practice_results;
create policy pr_student on public.practice_results for select to authenticated
  using (student_id = auth.uid() or public.teaches_student(student_id));

create or replace function public.save_practice_score(tid uuid, score numeric)
returns void language plpgsql security definer set search_path = public as $$
declare sk text;
begin
  select skill into sk from practice_texts where id = tid;
  if sk is null then raise exception 'Texto não encontrado'; end if;
  insert into practice_results(student_id, text_id, best_score, attempts) values (auth.uid(), tid, score, 1)
  on conflict (student_id, text_id) do update
    set best_score = greatest(practice_results.best_score, excluded.best_score),
        attempts = practice_results.attempts + 1, updated_at = now();
  perform award(auth.uid(), 5, 'Prática de ' || sk);
  perform touch_study(auth.uid());
  if sk = 'listening' and (select count(*) from practice_results r join practice_texts t on t.id = r.text_id
                           where r.student_id = auth.uid() and t.skill = 'listening' and r.best_score >= 80) >= 5 then
    perform grant_badge(auth.uid(), 'Listening Expert');
  end if;
  if sk = 'reading' and (select count(*) from practice_results r join practice_texts t on t.id = r.text_id
                           where r.student_id = auth.uid() and t.skill = 'reading' and r.best_score >= 80) >= 5 then
    perform grant_badge(auth.uid(), 'Reading Star');
  end if;
end $$;

-- Storage: arquivos de áudio de practice_texts também podem ser lidos pelos alunos autorizados
drop policy if exists "practice audio read" on storage.objects;
create policy "practice audio read" on storage.objects for select to authenticated
  using (bucket_id = 'materials' and exists(
    select 1 from public.practice_texts t where t.audio_path = name and t.published
      and public.can_see_content(t.teacher_id, t.class_id, null)));

-- Usado pelas funções de servidor (service role) para pontuar o aluno
create or replace function public.award_internal(sid uuid, pts integer, why text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform award(sid, pts, why);
  perform touch_study(sid);
  perform check_badges(sid);
end $$;
revoke execute on function public.award_internal(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.award_internal(uuid, integer, text) to service_role;

-- Informações públicas para a página inicial (nome da plataforma e apresentação da professora)
create or replace function public.public_info()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object('platform_name', s.platform_name,
                              'teacher_name', coalesce(s.teacher_display_name, p.full_name),
                              'teacher_bio', coalesce(s.teacher_bio, p.bio))
    from profiles p left join teacher_settings s on s.teacher_id = p.id
    where p.role = 'teacher' order by p.created_at limit 1), '{}'::jsonb)
$$;
grant execute on function public.public_info() to anon, authenticated;
