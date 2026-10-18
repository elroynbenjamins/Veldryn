-- Keep the immutable claim trigger independent of caller-controlled schemas.
alter function public.guild_shop_claim_immutable_guard_v1()
  set search_path = '';
