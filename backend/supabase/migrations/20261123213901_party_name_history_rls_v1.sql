-- Defense in depth: Party identity history is private and has no client policies.
alter table private.party_name_history_v1 enable row level security;
revoke all on private.party_name_history_v1 from public, anon, authenticated;