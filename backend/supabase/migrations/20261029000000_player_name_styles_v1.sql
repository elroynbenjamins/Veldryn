-- Public-facing player-name cosmetic projection.
-- The authoritative online state remains the source of truth. This RPC exposes
-- only the effective cosmetic after VIP+/Supporter entitlement gating so chat
-- clients never need to trust another player's raw local selection.
create or replace function public.player_name_styles_v1(p_account_ids uuid[])
returns table(account_id uuid,name_style jsonb)
language sql
stable
security definer
set search_path=public
as $$
  with requested as (
    select distinct u.account_id
    from unnest(coalesce(p_account_ids,'{}'::uuid[])) as u(account_id)
    limit 100
  ),
  raw as (
    select
      s.account_id,
      coalesce(s.state#>'{account,playerNameStyle}','{}'::jsonb) as style,
      coalesce(s.state#>'{account,entitlements}','{}'::jsonb) as entitlements
    from public.online_game_states s
    join requested r on r.account_id=s.account_id
  ),
  gated as (
    select
      account_id,
      style,
      (
        entitlements @> '{"supporter":true}'::jsonb
        or entitlements @> '{"supporter_subscription":true}'::jsonb
      ) as supporter,
      (
        entitlements @> '{"vip_plus":true}'::jsonb
        or entitlements @> '{"vipplus":true}'::jsonb
        or entitlements @> '{"vip+":true}'::jsonb
      ) as vip_plus
    from raw
  )
  select
    account_id,
    case
      when supporter and style->>'mode' in ('solid','gradient') then style
      when vip_plus and style->>'mode'='solid' then style
      when vip_plus and style->>'mode'='gradient' then jsonb_build_object(
        'mode','solid',
        'solidColor',coalesce(nullif(style->>'solidColor',''),'#7BD7FF'),
        'gradientColors',coalesce(style->'gradientColors','[]'::jsonb),
        'animated',false
      )
      else jsonb_build_object(
        'mode','default',
        'solidColor','#7BD7FF',
        'gradientColors',jsonb_build_array('#42D9FF','#8B5CFF','#FF65C8'),
        'animated',false
      )
    end as name_style
  from gated;
$$;

revoke all on function public.player_name_styles_v1(uuid[]) from public,anon;
grant execute on function public.player_name_styles_v1(uuid[]) to authenticated;
