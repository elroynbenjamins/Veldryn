-- VELDRYN mobile app update policy.
-- Uses the existing operations remote-config table and exposes client_safe values through a read-only RPC.

insert into public.ops_remote_config(
  config_key,category,label,description,value_type,default_value,current_value,
  exposure,risk_tier,live_change_safe,constraints_json,notes
) values
('app.mobile.latest_version','Mobile','Latest mobile version','Newest store version available to players.','string','"0.1.0"','"0.1.0"','client_safe','low',true,'{}','Informational; does not block the client.'),
('app.mobile.minimum_version','Mobile','Minimum supported mobile version','Clients below this version are blocked until they update.','string','"0.1.0"','"0.1.0"','client_safe','critical',true,'{}','Raise only after the replacement build is available in the store.'),
('app.mobile.update_title','Mobile','Required update title','Title shown when a client is below the minimum version.','string','"VELDRYN has been updated"','"VELDRYN has been updated"','client_safe','low',true,'{}','Keep short for small devices.'),
('app.mobile.update_message','Mobile','Required update message','Body copy shown by the required-update gate.','string','"This version is no longer supported. Update VELDRYN to continue your adventure."','"This version is no longer supported. Update VELDRYN to continue your adventure."','client_safe','low',true,'{}','Do not claim an update is available until Play distribution is live.'),
('app.mobile.android_store_url','Mobile','Google Play URL','Store destination used by the Android required-update button.','string','"https://play.google.com/store/apps/details?id=com.elroybenjamins.veldryn"','"https://play.google.com/store/apps/details?id=com.elroybenjamins.veldryn"','client_safe','low',true,'{}','Public Google Play listing URL.')
on conflict(config_key) do nothing;

create or replace function public.get_client_safe_remote_config()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(
    jsonb_object_agg(
      config_key,
      case
        when not enabled then default_value
        when active_from is not null and now() < active_from then default_value
        when active_until is not null and now() >= active_until then default_value
        else current_value
      end
    ),
    '{}'::jsonb
  )
  from public.ops_remote_config
  where exposure='client_safe';
$$;

revoke all on function public.get_client_safe_remote_config() from public;
grant execute on function public.get_client_safe_remote_config() to anon, authenticated;
