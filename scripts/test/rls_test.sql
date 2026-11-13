\set ON_ERROR_STOP 1
insert into auth.users(id,email) values ('11111111-1111-1111-1111-111111111111','prof@x.com'),('22222222-2222-2222-2222-222222222222','aluno@x.com'),('33333333-3333-3333-3333-333333333333','outro@x.com');
update profiles set role='teacher' where id='11111111-1111-1111-1111-111111111111';
update profiles set teacher_id='11111111-1111-1111-1111-111111111111' where id in ('22222222-2222-2222-2222-222222222222');
-- professora
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
insert into classes(name) values ('Turma A');
insert into class_members select id,'22222222-2222-2222-2222-222222222222' from classes;
insert into activities(class_id,title,published,feedback_mode) select id,'Quiz 1',false,'immediate' from classes;
insert into questions(activity_id,type,prompt,data,position) select id,'multiple_choice','Q1','{"options":["a","b"],"answer":1}',0 from activities;
insert into questions(activity_id,type,prompt,data,position) select id,'fill_blank','I ___ home','{"answers":["went|go"]}',1 from activities;
insert into questions(activity_id,type,prompt,data,position) select id,'ordering','Order','{"words":["I","am","happy"]}',2 from activities;
insert into questions(activity_id,type,prompt,data,position) select id,'matching','Match','{"pairs":[{"left":"dog","right":"cachorro"},{"left":"cat","right":"gato"}]}',3 from activities;
update activities set published=true;
select teacher_dashboard();
-- aluno
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select count(*) as notif from notifications;
select title from activities;
select count(*) as q_direct from questions;  -- deve ser 0
select jsonb_pretty(get_activity_for_student((select id from activities)))::text like '%"answer"%' as leaks_answer;
select submit_activity((select id from activities),
  jsonb_build_object(
   (select id from questions where false)::text, 1)) is null;
