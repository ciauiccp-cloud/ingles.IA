\set ON_ERROR_STOP 1
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
-- gabarito: max_attempts=1 e já usou => revela
select (get_answer_key((select id from submissions limit 1)) -> (select id::text from questions where type='multiple_choice' limit 1) -> 'data') ? 'answer' as reveals;
select save_grammar_score((select id from grammar_topics limit 1), 90);
select save_practice_score((select id from practice_texts limit 1), 100);
select ack_privacy();
select privacy_ack_at is not null as acked, points from profiles where id = auth.uid();
insert into tutor_sessions(topic, level) values ('free','beginner');
select count(*) as my_sessions from tutor_sessions;
-- aluno não consegue inserir mensagens direto
do $$ begin insert into tutor_messages(session_id, role, content) select id, 'user', 'x' from tutor_sessions limit 1; raise notice 'FALHA: inseriu'; exception when others then raise notice 'ok bloqueado: %', sqlerrm; end $$;
-- aluno não lê questões nem submissões diretamente
select count(*) as subs_direct from submissions;
select public_info();
reset role;
-- service role: award_internal
select award_internal('22222222-2222-2222-2222-222222222222', 15, 'Conversação');
select points from profiles where id='22222222-2222-2222-2222-222222222222';
-- professora libera nota
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
update submissions set status='released', teacher_comment='Bom!';
select count(*) as prof_sees_notes from student_notes;
insert into student_notes(student_id, note) values ('22222222-2222-2222-2222-222222222222','Precisa revisar past');
-- professora não pode cadastrar nota para aluno que não é dela
do $$ begin insert into student_notes(student_id, note) values ('33333333-3333-3333-3333-333333333333','x'); raise notice 'FALHA'; exception when others then raise notice 'ok bloqueado'; end $$;
select class_ranking((select id from classes limit 1));
