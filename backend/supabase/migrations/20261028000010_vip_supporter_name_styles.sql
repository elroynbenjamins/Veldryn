begin;

create table if not exists private.account_commerce_entitlements_v1(
  account_id uuid primary key references auth.users(id) on delete cascade,
  vip boolean not null default false,
  vip_plus boolean not null default false,
  supporter_active boolean not null default false,
  supporter_expires_at timestamptz,
  source text not null default 'store',
  updated_at timestamptz not null default now()
);

create table if not exists public.player_name_styles_v1(
  account_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null default 'default' check(mode in('default','solid','gradient')),
  solid_color text,
  vip_fallback_color text,
  gradient_colors text[] not null default '{}'::text[],
  animation text not null default 'none' check(animation in('none','flow','prismatic')),
  updated_at timestamptz not null default now(),
  check(solid_color is null or solid_color ~ '^#[0-9A-Fa-f]{6}$'),
  check(vip_fallback_color is null or vip_fallback_color ~ '^#[0-9A-Fa-f]{6}$'),
  check(cardinality(gradient_colors)<=3)
);

alter table private.account_commerce_entitlements_v1 enable row level security;
alter table public.player_name_styles_v1 enable row level security;
revoke all on private.account_commerce_entitlements_v1 from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.account_commerce_entitlements_v1 to service_role;
revoke all on public.player_name_styles_v1 from public,anon;
grant select,insert,update on public.player_name_styles_v1 to authenticated;

drop policy if exists "read own name style v1" on public.player_name_styles_v1;
create policy "read own name style v1" on public.player_name_styles_v1
 for select to authenticated using(account_id=auth.uid());
drop policy if exists "insert own name style v1" on public.player_name_styles_v1;
create policy "insert own name style v1" on public.player_name_styles_v1
 for insert to authenticated with check(account_id=auth.uid());
drop policy if exists "update own name style v1" on public.player_name_styles_v1;
create policy "update own name style v1" on public.player_name_styles_v1
 for update to authenticated using(account_id=auth.uid()) with check(account_id=auth.uid());

create or replace function private.commerce_entitlements_v1(p_account_id uuid)
returns table(vip boolean,vip_plus boolean,supporter boolean)
language sql stable security definer set search_path=''
as $$
 select
   coalesce(e.vip,false) or coalesce(e.vip_plus,false),
   coalesce(e.vip_plus,false),
   coalesce(e.supporter_active,false) and (e.supporter_expires_at is null or e.supporter_expires_at>now())
 from (select 1) seed
 left join private.account_commerce_entitlements_v1 e on e.account_id=p_account_id;
$$;

create or replace function public.commerce_entitlements_self_v1()
returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v record;v_exp timestamptz;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into v from private.commerce_entitlements_v1(v_uid);
 select supporter_expires_at into v_exp from private.account_commerce_entitlements_v1 where account_id=v_uid;
 return jsonb_build_object('vip',v.vip,'vipPlus',v.vip_plus,'supporter',v.supporter,'supporterExpiresAt',v_exp);
end $$;

create or replace function public.update_player_name_style_v1(
 p_mode text,
 p_solid_color text default null,
 p_gradient_colors text[] default '{}'::text[],
 p_animation text default 'none'
)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();v_ent record;v_mode text:=lower(trim(coalesce(p_mode,'default')));
 v_solid text:=upper(trim(coalesce(p_solid_color,'')));v_colors text[]:=coalesce(p_gradient_colors,'{}'::text[]);
 v_animation text:=lower(trim(coalesce(p_animation,'none')));v_color text;v_fallback text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select * into v_ent from private.commerce_entitlements_v1(v_uid);
 if v_mode not in('default','solid','gradient') then raise exception 'INVALID_NAME_STYLE';end if;
 if v_animation not in('none','flow','prismatic') then raise exception 'INVALID_NAME_ANIMATION';end if;
 if v_mode='solid' and not (v_ent.vip_plus or v_ent.supporter) then raise exception 'VIP_PLUS_OR_SUPPORTER_REQUIRED';end if;
 if v_mode='gradient' and not v_ent.supporter then raise exception 'SUPPORTER_REQUIRED';end if;
 if v_animation<>'none' and not v_ent.supporter then raise exception 'SUPPORTER_REQUIRED';end if;
 if v_mode='solid' and v_solid !~ '^#[0-9A-F]{6}$' then raise exception 'INVALID_NAME_COLOR';end if;
 if v_mode='gradient' and (cardinality(v_colors)<2 or cardinality(v_colors)>3) then raise exception 'INVALID_NAME_GRADIENT';end if;
 foreach v_color in array v_colors loop
   if upper(trim(v_color)) !~ '^#[0-9A-F]{6}$' then raise exception 'INVALID_NAME_COLOR';end if;
 end loop;
 select vip_fallback_color into v_fallback from public.player_name_styles_v1 where account_id=v_uid;
 if v_mode='solid' and v_ent.vip_plus then v_fallback:=v_solid;end if;
 insert into public.player_name_styles_v1(account_id,mode,solid_color,vip_fallback_color,gradient_colors,animation,updated_at)
 values(v_uid,v_mode,case when v_mode='solid' then v_solid else null end,v_fallback,
   case when v_mode='gradient' then array(select upper(trim(x)) from unnest(v_colors) x) else '{}'::text[] end,
   case when v_mode='gradient' then v_animation else 'none' end,now())
 on conflict(account_id) do update set mode=excluded.mode,solid_color=excluded.solid_color,
   vip_fallback_color=excluded.vip_fallback_color,gradient_colors=excluded.gradient_colors,animation=excluded.animation,updated_at=now();
 return jsonb_build_object('mode',v_mode,'solidColor',case when v_mode='solid' then v_solid else null end,
   'vipFallbackColor',v_fallback,'gradientColors',case when v_mode='gradient' then v_colors else '{}'::text[] end,
   'animation',case when v_mode='gradient' then v_animation else 'none' end);
end $$;

drop function if exists public.guild_identities(uuid[]);
create function public.guild_identities(p_account_ids uuid[])
returns table(account_id uuid,guild_tag text,guild_tag_color_id text,player_name_style jsonb)
language sql security definer set search_path=''
as $$
  select ids.account_id,g.tag,g.tag_color_id,
    case
      when ent.supporter and ns.mode='gradient' then jsonb_build_object('mode','gradient','gradientColors',ns.gradient_colors,'animation',ns.animation)
      when (ent.vip_plus or ent.supporter) and ns.mode='solid' then jsonb_build_object('mode','solid','solidColor',ns.solid_color,'animation','none')
      when ent.vip_plus and ns.vip_fallback_color is not null then jsonb_build_object('mode','solid','solidColor',ns.vip_fallback_color,'animation','none')
      else jsonb_build_object('mode','default','animation','none')
    end
  from unnest(p_account_ids) ids(account_id)
  left join public.guild_members gm on gm.account_id=ids.account_id
  left join public.guilds g on g.id=gm.guild_id
  left join public.player_name_styles_v1 ns on ns.account_id=ids.account_id
  left join lateral private.commerce_entitlements_v1(ids.account_id) ent on true
  where auth.uid() is not null;
$$;

revoke all on function private.commerce_entitlements_v1(uuid) from public,anon,authenticated;
revoke all on function public.commerce_entitlements_self_v1(),public.update_player_name_style_v1(text,text,text[],text),public.guild_identities(uuid[]) from public,anon;
grant execute on function public.commerce_entitlements_self_v1(),public.update_player_name_style_v1(text,text,text[],text),public.guild_identities(uuid[]) to authenticated;

comment on table private.account_commerce_entitlements_v1 is 'Server-owned VIP, VIP+ and Supporter entitlement projection. Client saves are not authoritative for paid access.';
comment on table public.player_name_styles_v1 is 'Player-selected public name style. Entitlement validation is enforced by update_player_name_style_v1.';
commit;
