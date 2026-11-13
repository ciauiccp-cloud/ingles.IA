-- Remove o acesso anônimo às funções SECURITY DEFINER (exceto public_info, usada na página inicial)
-- e impede que funções de gatilho sejam chamadas diretamente pela API.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef and p.proname <> 'public_info' loop
    execute format('revoke execute on function %s from public, anon', f.sig);
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('handle_new_user','protect_profile_fields','trg_notify','trg_submission_points') loop
    execute format('revoke execute on function %s from authenticated', f.sig);
  end loop;
end $$;
