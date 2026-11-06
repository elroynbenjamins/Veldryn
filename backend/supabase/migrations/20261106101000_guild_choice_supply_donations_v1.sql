-- Guild's Choice supplies: permanent item sink for common gatherable materials.
-- Donations never credit the Guild Bank, generate currency, or allow withdrawals.
BEGIN;
CREATE TABLE IF NOT EXISTS public.guild_project_supply_catalogue_v1(
 item_id text PRIMARY KEY,
 category text NOT NULL CHECK(category IN ('wood','fish','ore')),
 supply_value integer NOT NULL CHECK(supply_value BETWEEN 1 AND 10),
 item_name text NOT NULL
);
ALTER TABLE public.guild_project_supply_catalogue_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guild_project_supply_catalogue_v1 FROM public,anon,authenticated;
GRANT SELECT ON public.guild_project_supply_catalogue_v1 TO service_role;
INSERT INTO public.guild_project_supply_catalogue_v1(item_id,category,supply_value,item_name)
VALUES ('GREENWOOD_LOG','wood',1,'Greenwood Log'),
('IRONWOOD_LOG','wood',3,'Ironwood Log'),
('CROWNWOOD_LOG','wood',6,'Crownwood Log'),
('MEADOW_PERCH','fish',2,'Meadow Perch'),
('SILVERFIN','fish',3,'Silverfin'),
('ROOTSTREAM_TROUT','fish',4,'Rootstream Trout'),
('RIVER_EEL','fish',6,'River Eel'),
('COPPER_ORE','ore',3,'Copper Ore'),
('ASTER_IRON_ORE','ore',5,'Aster-Iron Ore'),
('OATHSTONE_ORE','ore',8,'Oathstone Ore')
ON CONFLICT(item_id) DO NOTHING;

-- Include a dedicated source in the existing contribution breakdown.
ALTER TABLE public.guild_project_effort_sources_v1
 DROP CONSTRAINT guild_project_effort_sources_v1_source_check;
ALTER TABLE public.guild_project_effort_sources_v1
 ADD CONSTRAINT guild_project_effort_sources_v1_source_check
 CHECK(source IN ('combat','gathering','crafting','donation'));

-- Ownership is established exclusively from auth.uid, not supplied by the caller.
-- A retry with the same request key never spends inventory twice.
CREATE OR REPLACE FUNCTION public.guild_project_supply_donate_v1(
 p_project uuid,p_item_id text,p_quantity integer,p_request_key text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $donate$
DECLARE
 v_uid uuid:=auth.uid();v_gid uuid;v_join timestamptz;v_game public.online_game_states;
 v_project public.guild_project_instances;v_material public.guild_project_supply_catalogue_v1;
 v_goal public.guild_project_resource_progress;v_request text;v_receipt public.guild_project_donation_receipts;
 v_stacks jsonb;v_new jsonb:='[]'::jsonb;v_stack jsonb;v_have integer;v_take integer;
 v_left integer;v_value integer;v_limit bigint;v_member_total bigint;v_share bigint;
 v_mode text;v_capped bigint;v_is_locked boolean;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF p_project IS NULL OR p_quantity IS NULL OR p_quantity<1 OR p_quantity>10000
 OR p_item_id IS NULL OR p_request_key IS NULL
 OR p_request_key !~ '^[A-Za-z0-9_-]{8,96}$' THEN RAISE EXCEPTION 'INVALID_GUILD_PROJECT_DONATION'; END IF;
 v_request:='choice:'||v_uid::text||':'||p_request_key;
 PERFORM pg_advisory_xact_lock(hashtextextended('guild-project-supply:'||v_uid::text,0));
 SELECT guild_id,joined_at INTO v_gid,v_join
 FROM public.guild_members WHERE account_id=v_uid FOR SHARE;
 IF v_gid IS NULL THEN RAISE EXCEPTION 'GUILD_MEMBERSHIP_REQUIRED'; END IF;
 SELECT * INTO v_material FROM public.guild_project_supply_catalogue_v1 WHERE item_id=p_item_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'GUILD_PROJECT_SUPPLY_NOT_ACCEPTED'; END IF;
 -- Project and player state share a single transaction, including the receipt.
 SELECT * INTO v_game FROM public.online_game_states WHERE account_id=v_uid FOR UPDATE;
 IF NOT FOUND OR v_game.character_id IS NULL THEN RAISE EXCEPTION 'CHARACTER_REQUIRED'; END IF;
 PERFORM 1 FROM public.guilds WHERE id=v_gid FOR UPDATE;
 SELECT * INTO v_receipt FROM public.guild_project_donation_receipts
 WHERE idempotency_key=v_request;
 IF FOUND THEN
  IF v_receipt.account_id<>v_uid OR v_receipt.guild_id<>v_gid OR
  v_receipt.project_instance_id<>p_project OR v_receipt.resource_id<>p_item_id OR
  v_receipt.resource_kind<>'item' OR v_receipt.amount<>p_quantity
  THEN RAISE EXCEPTION 'GUILD_PROJECT_DONATION_REQUEST_CONFLICT'; END IF;
  RETURN jsonb_build_object('alreadyProcessed',true,'itemId',p_item_id,'quantity',p_quantity);
 END IF;
 SELECT * INTO v_project FROM public.guild_project_instances WHERE id=p_project AND guild_id=v_gid FOR UPDATE;
 IF NOT FOUND OR v_project.slot_index<>2 OR v_project.cycle_key NOT LIKE 'choice:%'
 OR v_project.status<>'active' OR now()>=v_project.ends_at OR now()<v_project.started_at
 THEN RAISE EXCEPTION 'GUILD_PROJECT_DONATION_CLOSED'; END IF;
 IF v_join>now() THEN RAISE EXCEPTION 'GUILD_PROJECT_MEMBERSHIP_INVALID'; END IF;
 v_mode:=coalesce(v_project.definition_snapshot->>'mode','effort');
 IF v_mode NOT IN ('donation','hybrid') THEN RAISE EXCEPTION 'GUILD_PROJECT_DOES_NOT_ACCEPT_SUPPLIES'; END IF;
 SELECT * INTO v_goal FROM public.guild_project_resource_progress
 WHERE project_instance_id=p_project AND resource_kind='item'
 AND resource_id='supply:'||v_material.category FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'GUILD_PROJECT_SUPPLY_CATEGORY_NOT_REQUIRED'; END IF;
 v_value:=v_material.supply_value*p_quantity;
 IF v_value>v_goal.target_amount-v_goal.contributed_amount THEN
   RAISE EXCEPTION 'GUILD_PROJECT_SUPPLY_TARGET_EXCEEDED'; END IF;
 -- A single member cannot deliver over half a category target in a multi-member Guild.
 SELECT coalesce(sum(r.amount*c.supply_value),0) INTO v_member_total
 FROM public.guild_project_donation_receipts r
 JOIN public.guild_project_supply_catalogue_v1 c ON c.item_id=r.resource_id
 WHERE r.project_instance_id=p_project AND r.account_id=v_uid
 AND c.category=v_material.category AND r.resource_kind='item';
 v_limit:=ceil(v_goal.target_amount*v_project.single_account_completion_share_cap)::bigint;
 IF v_member_total+v_value>v_limit THEN
   RAISE EXCEPTION 'GUILD_PROJECT_PERSONAL_SUPPLY_CAP'; END IF;

 v_stacks:=coalesce(v_game.state#>'{inventory,stacks}','[]'::jsonb);
 IF jsonb_typeof(v_stacks)<>'array' THEN RAISE EXCEPTION 'INVALID_INVENTORY'; END IF;
 v_is_locked:=coalesce(v_game.state#>'{settings,lockedItemIds}','[]'::jsonb) ? p_item_id;
 IF v_is_locked THEN RAISE EXCEPTION 'GUILD_PROJECT_ITEM_LOCKED'; END IF;
 v_left:=p_quantity;
 FOR v_stack IN SELECT value FROM jsonb_array_elements(v_stacks) LOOP
  IF v_stack->>'itemId'=p_item_id AND v_left>0
     AND coalesce((v_stack->>'locked')::boolean,false)=false THEN
    v_have:=greatest(0,coalesce((v_stack->>'quantity')::integer,0));
    v_take:=least(v_have,v_left);v_left:=v_left-v_take;
    IF v_have>v_take THEN
       v_new:=v_new||jsonb_build_array(jsonb_set(v_stack,'{quantity}',to_jsonb(v_have-v_take)));
    END IF;
  ELSE v_new:=v_new||jsonb_build_array(v_stack); END IF;
 END LOOP;
 IF v_left>0 THEN RAISE EXCEPTION 'GUILD_PROJECT_INSUFFICIENT_ITEMS'; END IF;
 UPDATE public.online_game_states SET revision=revision+1,updated_at=now(),
 state=jsonb_set(state,'{inventory,stacks}',v_new) WHERE account_id=v_uid;

 INSERT INTO public.guild_project_donation_receipts(
 project_instance_id,guild_id,account_id,resource_kind,resource_id,amount,idempotency_key
 ) VALUES(p_project,v_gid,v_uid,'item',p_item_id,p_quantity,v_request);
 UPDATE public.guild_project_resource_progress
 SET contributed_amount=contributed_amount+v_value
 WHERE project_instance_id=p_project AND resource_kind='item'
   AND resource_id='supply:'||v_material.category;
 INSERT INTO public.guild_project_member_progress(
 project_instance_id,account_id,was_member_at_start,joined_at_snapshot,progress_fraction_at_join
 ) VALUES(
 p_project,v_uid,v_join<=v_project.started_at,greatest(v_join,v_project.started_at),
 least(1,v_project.completion_points::numeric/greatest(1,v_project.target_points)::numeric)
 ) ON CONFLICT DO NOTHING;
 SELECT greatest(0,ceil(v_project.target_points*v_project.single_account_completion_share_cap)-
                   m.completion_points) INTO v_share
 FROM public.guild_project_member_progress m WHERE m.project_instance_id=p_project AND m.account_id=v_uid;
 v_capped:=CASE WHEN v_mode='donation' THEN least(v_value,v_share) ELSE 0 END;
 UPDATE public.guild_project_member_progress SET
 raw_points=raw_points+v_value,
 completion_points=completion_points+v_capped,
 skilling_points=skilling_points+CASE WHEN v_mode='donation' THEN v_value ELSE 0 END,
 first_contribution_at=coalesce(first_contribution_at,now()),last_contribution_at=now()
 WHERE project_instance_id=p_project AND account_id=v_uid;
 INSERT INTO public.guild_project_effort_sources_v1(project_id,account_id,source,points)
 VALUES(p_project,v_uid,'donation',v_value)
 ON CONFLICT(project_id,account_id,source) DO UPDATE SET
 points=public.guild_project_effort_sources_v1.points+excluded.points;
 UPDATE public.guild_project_instances SET
 completion_points=completion_points+v_capped,
 skilling_points=skilling_points+CASE WHEN v_mode='donation' THEN v_value ELSE 0 END,
 meaningful_contributors=(SELECT count(*) FROM public.guild_project_member_progress
 WHERE project_instance_id=p_project AND raw_points>=v_project.meaningful_contributor_threshold)
 WHERE id=p_project;
 PERFORM public.guild_project_choice_maybe_complete_v1(p_project,now());
 RETURN jsonb_build_object('alreadyProcessed',false,'itemId',p_item_id,'quantity',p_quantity,
 'supplyValue',v_value,'category',v_material.category,
 'remaining',v_goal.target_amount-v_goal.contributed_amount-v_value);
END $donate$;
REVOKE ALL ON FUNCTION public.guild_project_supply_donate_v1(uuid,text,integer,text)
 FROM public,anon;
GRANT EXECUTE ON FUNCTION public.guild_project_supply_donate_v1(uuid,text,integer,text)
 TO authenticated,service_role;

-- Only return a caller's own available (unlocked) common materials.
CREATE OR REPLACE FUNCTION public.guild_project_supply_inventory_v1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $inventory$
DECLARE v_uid uuid:=auth.uid();v_guild uuid;v_state jsonb;v_locked jsonb;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT guild_id INTO v_guild FROM public.guild_members WHERE account_id=v_uid;
 IF v_guild IS NULL THEN RETURN '[]'::jsonb; END IF;
 SELECT state INTO v_state FROM public.online_game_states WHERE account_id=v_uid;
 v_locked:=coalesce(v_state#>'{settings,lockedItemIds}','[]'::jsonb);
 RETURN coalesce((
 SELECT jsonb_agg(jsonb_build_object(
    'itemId',c.item_id,'name',c.item_name,'category',c.category,'value',c.supply_value,
    'available',coalesce((
      SELECT sum(greatest(0,coalesce((stack->>'quantity')::integer,0)))
      FROM jsonb_array_elements(coalesce(v_state#>'{inventory,stacks}','[]'::jsonb)) stack
      WHERE stack->>'itemId'=c.item_id
      AND coalesce((stack->>'locked')::boolean,false)=false
    ),0)
 ) ORDER BY c.category,c.supply_value,c.item_id)
 FROM public.guild_project_supply_catalogue_v1 c WHERE NOT(v_locked ? c.item_id)
 ),'[]'::jsonb);
END $inventory$;
REVOKE ALL ON FUNCTION public.guild_project_supply_inventory_v1() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.guild_project_supply_inventory_v1() TO authenticated,service_role;
COMMIT;
