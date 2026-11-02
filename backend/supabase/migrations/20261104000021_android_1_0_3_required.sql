-- Keep source-controlled Android release enforcement aligned with the live
-- production policy switched on 2026-11-02.
-- Does not affect the 'other' platform, maintenance mode or release notes.
-- Never downgrade a newer rollout if this migration is replayed later.
update public.app_release_policy
set latest_version = '1.0.3',
    minimum_version = '1.0.3',
    force_after = null,
    title = 'VELDRYN 1.0.3 update required',
    message = 'Update VELDRYN to version 1.0.3 on Google Play to continue your adventure.',
    updated_at = now()
where platform = 'android'
  and latest_version in ('0.1.0','1.0.0','1.0.1','1.0.2','1.0.3')
  and minimum_version in ('0.1.0','1.0.0','1.0.1','1.0.2','1.0.3');
