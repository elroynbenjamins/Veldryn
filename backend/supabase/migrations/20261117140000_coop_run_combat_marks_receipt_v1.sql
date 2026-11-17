-- Owner-scoped read-only breakdown of committed combat-room Marks.
-- These Marks have already been credited to the wallet by the combat trigger;
-- never insert a ledger row or award Marks from this function.
begin;

create or replace function public.coop_run_combat_marks_self_v1(p_run_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $function$
declare
  v_account_id uuid := auth.uid();
  v_total integer;
  v_normal integer;
  v_elite integer;
begin
  if v_account_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select coalesce(sum(l.amount),0)::integer,
         count(*) filter (where l.amount = 3)::integer,
         count(*) filter (where l.amount = 5)::integer
  into v_total, v_normal, v_elite
  from public.expedition_currency_ledger as l
  where l.account_id = v_account_id
    and l.run_id = p_run_id
    and l.reason = 'coop_combat_room'
    and l.currency = 'expedition_mark';

  return pg_catalog.jsonb_build_object(
    'total', v_total,
    'normal', v_normal,
    'elite', v_elite
  );
end;
$function$;

revoke all on function public.coop_run_combat_marks_self_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.coop_run_combat_marks_self_v1(uuid)
  to authenticated;

commit;
