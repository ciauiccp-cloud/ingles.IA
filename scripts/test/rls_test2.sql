\set ON_ERROR_STOP 1
set role authenticated; select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
with a as (select get_activity_for_student((select id from activities)) j),
 qs as (select q from a, jsonb_array_elements(j->'questions') q)
select submit_activity((select id from activities), jsonb_object_agg(q->>'id',
  case q->>'type' when 'multiple_choice' then '1'::jsonb when 'fill_blank' then '["Went"]'::jsonb
   when 'ordering' then '["I","am","happy"]'::jsonb when 'matching' then '["cachorro","gato"]'::jsonb end)) from qs;
select points, streak from profiles where id = auth.uid();
select * from get_my_submissions();
select badge from student_badges;
-- aluno tenta se promover
update profiles set role='teacher', points=9999 where id=auth.uid();
select role, points from profiles where id=auth.uid();
-- aluno vê só seu perfil + professora
select count(*) from profiles;
-- outro aluno
select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
select count(*) as other_sees_act from activities;
select review_word((select id from vocab_words limit 1), true);
select count(*) from vocab_words;
