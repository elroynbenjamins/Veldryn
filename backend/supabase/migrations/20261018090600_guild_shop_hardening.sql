-- Prevent direct invocation of unsafe low-level token mutation APIs.
-- Only a trusted, validated reward claim may credit tokens.
revoke all on function public.guild_shop_grant_tokens_server_v1(uuid,text,bigint,boolean)
 from public,anon,authenticated,service_role;
-- Purchases remain disabled until the canonical collectible grant is performed
-- atomically alongside the token debit. No backend may call this RPC yet.
revoke all on function public.guild_shop_purchase_server_v1(uuid,text,bigint)
 from public,anon,authenticated,service_role;
-- Lock verified reward metadata after insertion so a compromised gateway cannot
-- modify reward amount/type before redemption.
create or replace function public.guild_shop_claim_immutable_guard_v1()
returns trigger language plpgsql as $$
begin
 if new.account_id is distinct from old.account_id
 or new.claim_key is distinct from old.claim_key
 or new.reward_amount is distinct from old.reward_amount
 or new.reward_kind is distinct from old.reward_kind
 or new.verified_at is distinct from old.verified_at
 then raise exception 'guild_claim_metadata_immutable'; end if;
 if old.consumed_at is not null and new.consumed_at is distinct from old.consumed_at
 then raise exception 'guild_claim_already_consumed'; end if;
 return new;
end $$;
drop trigger if exists guild_shop_claim_immutable on public.guild_shop_claim_sources;
create trigger guild_shop_claim_immutable before update on public.guild_shop_claim_sources
 for each row execute function public.guild_shop_claim_immutable_guard_v1();
