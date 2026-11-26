-- Read-only, account-scoped personal supply allowance for Guild's Choice.
-- Uses exactly the same category-weighted receipt math and ceiling as
-- guild_project_supply_donate_v1; the donation RPC remains final authority.
BEGIN;

CREATE OR REPLACE FUNCTION public.guild_project_supply_allowance_v1(p_project uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $allowance$
DECLARE
 v_uid uuid := auth.uid();
 v_guild uuid;
 v_project public.guild_project_instances;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF p_project IS NULL THEN RETURN '[]'::jsonb; END IF;

 -- Identity and guild scope come solely from the verified session.
 SELECT gm.guild_id INTO v_guild
 FROM public.guild_members gm WHERE gm.account_id=v_uid;
 IF v_guild IS NULL THEN RETURN '[]'::jsonb; END IF;

 SELECT p.* INTO v_project FROM public.guild_project_instances p
 WHERE p.id=p_project AND p.guild_id=v_guild
   AND p.slot_index=2 AND p.cycle_key LIKE 'choice:%'
   AND p.status='active' AND now()>=p.started_at AND now()<p.ends_at;
 IF NOT FOUND THEN RETURN '[]'::jsonb; END IF;
 IF coalesce(v_project.definition_snapshot->>'mode','effort')
    NOT IN ('donation','hybrid') THEN RETURN '[]'::jsonb; END IF;

 RETURN coalesce((
  SELECT jsonb_agg(jsonb_build_object(
    'category',split_part(g.resource_id,':',2),
    'personalLimit',ceil(g.target_amount*v_project.single_account_completion_share_cap)::bigint,
    'donated',coalesce(t.donated,0),
    'remainingPersonal',greatest(0,
      ceil(g.target_amount*v_project.single_account_completion_share_cap)::bigint-coalesce(t.donated,0)),
    'remainingGoal',greatest(0,g.target_amount-g.contributed_amount)
  ) ORDER BY g.resource_id)
  FROM public.guild_project_resource_progress g
  LEFT JOIN (
   SELECT c.category,sum(r.amount*c.supply_value)::bigint AS donated
   FROM public.guild_project_donation_receipts r
   JOIN public.guild_project_supply_catalogue_v1 c ON c.item_id=r.resource_id
   WHERE r.project_instance_id=p_project AND r.account_id=v_uid
     AND r.resource_kind='item'
   GROUP BY c.category
  ) t ON t.category=split_part(g.resource_id,':',2)
  WHERE g.project_instance_id=p_project AND g.resource_kind='item'
    AND g.resource_id LIKE 'supply:%'
 ),'[]'::jsonb);
END $allowance$;

-- SECURITY DEFINER is necessary because receipts have RLS and no client
-- SELECT grants. This endpoint never returns another account's receipts.
REVOKE ALL ON FUNCTION public.guild_project_supply_allowance_v1(uuid)
 FROM public,anon;
GRANT EXECUTE ON FUNCTION public.guild_project_supply_allowance_v1(uuid)
 TO authenticated,service_role;

COMMIT;
