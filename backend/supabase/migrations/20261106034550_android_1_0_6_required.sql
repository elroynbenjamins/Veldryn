-- Require VELDRYN Android v1.0.6 immediately now that Google Play rollout is live.
-- Keep other platforms and maintenance settings unchanged. Older migrations may
-- be applied to staging; never downgrade a newer release policy during replay.
update public.app_release_policy
set latest_version='1.0.6',
    minimum_version='1.0.6',
    force_after=null,
    title='VELDRYN 1.0.6 update required',
    message='Update VELDRYN to version 1.0.6 on Google Play to continue your adventure.',
    updated_at=now()
where platform='android'
  and string_to_array(latest_version, '.')::integer[] <= array[1,0,6]
  and string_to_array(minimum_version, '.')::integer[] <= array[1,0,6];
