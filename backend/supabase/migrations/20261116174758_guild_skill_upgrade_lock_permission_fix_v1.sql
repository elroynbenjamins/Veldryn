-- Fix Guild Skill upgrades rejected with "permission denied for table guilds".
-- The service_role intentionally lacks UPDATE on guilds in production, but the
-- purchase RPC used SELECT ... FOR UPDATE OF g, which requires UPDATE.
-- Keep purchases serialized by guild using a transaction-scoped advisory lock,
-- without granting any additional access to public.guilds.
DO $guild_skill_lock_fix$
DECLARE
  v_source text;
  v_old text := $old$where m.account_id=p_account_id for update of g;$old$;
  v_new text := $new$where m.account_id=p_account_id;
 if v_guild is not null then
  -- Serialize purchases across all members of the same guild.
  perform pg_advisory_xact_lock(hashtextextended('guild-skill-upgrade-v1:'||v_guild::text,0));
  -- Recheck membership, officer status and guild level after acquiring the lock.
  select m.role,g.level into v_role,v_level
  from public.guild_members m join public.guilds g on g.id=m.guild_id
  where m.account_id=p_account_id and m.guild_id=v_guild;
  if not found then raise exception 'guild_membership_required';end if;
 end if;$new$;
BEGIN
  select pg_get_functiondef('public.guild_skill_upgrade_server_v1(uuid,text,text)'::regprocedure) into v_source;
  if strpos(v_source,v_old)>0 then
    execute replace(v_source,v_old,v_new);
  elsif strpos(v_source,'guild-skill-upgrade-v1:')=0 then
    raise exception 'guild_skill_upgrade_lock_unexpected_source';
  end if;
  select pg_get_functiondef('public.guild_skill_upgrade_server_v1(uuid,text,text)'::regprocedure) into v_source;
  if strpos(v_source,v_old)>0 or strpos(v_source,'guild-skill-upgrade-v1:')=0
    then raise exception 'guild_skill_upgrade_lock_postcondition_failed'; end if;
END
$guild_skill_lock_fix$;
