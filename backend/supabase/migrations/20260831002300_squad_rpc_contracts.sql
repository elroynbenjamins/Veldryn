create table if not exists squad_api_receipts (
 account_id uuid not null, request_id text not null, operation text not null,
 response_payload jsonb, created_at timestamptz not null default now(), primary key(account_id,request_id)
);
create or replace function squad_assert_three_members(p_squad_id uuid) returns void language plpgsql security definer as $$
declare n int; d int; pos int;
begin
 select count(*),count(distinct character_id),count(distinct position) into n,d,pos from account_squad_members where squad_id=p_squad_id;
 if n<>3 or d<>3 or pos<>3 then raise exception 'invalid_three_character_squad'; end if;
end $$;
-- Production write RPCs should call squad_assert_three_members(), validate account ownership,
-- pin the exact squad/formation snapshot version, acquire an idempotency receipt, and only
-- then mutate Arena/Trial state. Clients never submit authoritative ratings, rewards or RNG.
