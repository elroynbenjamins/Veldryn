-- Read-only synthetic equivalence review of online_player_count_v1.
-- Does not create tables/functions, assume a real account, or write presence.
-- Every row's passed column must be true.
with anchor(t) as (values ('2026-11-26 16:00:00+00'::timestamptz)),
viewers(id, viewer) as (values ('no_session',null::text),('unblocked','viewer-u'),('outgoing_block','viewer-out'),('incoming_block','viewer-in'),('both_directions','viewer-both'),('self','a')),
presence(account_id,bucket_age,last_seen_age) as (values
 ('a',0,1),('a',5,4),('b',35,30),('c',36,1),('d',30,31),
 ('e',5,1),('f',5,1),('g',5,1),('h',5,1),('i',5,1)),
profiles(account_id,active_character_id) as (values
 ('a','char-a'),('b','char-b'),('c','char-c'),('d','char-d'),('f','missing'),('g','char-h'),('h','char-h'),('i',null::text)),
characters(id,account_id) as (values ('char-a','a'),('char-b','b'),('char-c','c'),('char-d','d'),('char-h','h')),
blocks(blocker_id,blocked_id) as (values ('viewer-out','a'),('b','viewer-in'),('viewer-both','a'),('b','viewer-both')),
presence_rows as (select account_id,t-make_interval(mins=>bucket_age) bucket_start,t-make_interval(mins=>last_seen_age) last_seen_at from presence cross join anchor),
old_recent as (select account_id,max(last_seen_at) last_seen_at from presence_rows cross join anchor where bucket_start>=t-interval '35 minutes' and last_seen_at>=t-interval '30 minutes' group by account_id),
new_recent as (select distinct account_id from presence_rows cross join anchor where bucket_start>=t-interval '35 minutes' and last_seen_at>=t-interval '30 minutes'),
old_eligible as (select v.id,r.account_id from old_recent r cross join viewers v join profiles p on p.account_id=r.account_id join characters c on c.id=p.active_character_id and c.account_id=r.account_id where v.viewer is not null and not exists(select 1 from blocks b where (b.blocker_id=v.viewer and b.blocked_id=r.account_id) or (b.blocker_id=r.account_id and b.blocked_id=v.viewer))),
new_eligible as (select v.id,r.account_id from new_recent r cross join viewers v join profiles p on p.account_id=r.account_id join characters c on c.id=p.active_character_id and c.account_id=r.account_id where v.viewer is not null and not exists(select 1 from blocks b where (b.blocker_id=v.viewer and b.blocked_id=r.account_id) or (b.blocker_id=r.account_id and b.blocked_id=v.viewer))),
expected(id,n) as (values ('no_session',0),('unblocked',3),('outgoing_block',2),('incoming_block',2),('both_directions',1),('self',3)),
actual as (select e.id,e.n expected_count,(select count(*) from old_eligible o where o.id=e.id) old_count,(select count(*) from new_eligible n where n.id=e.id) new_count from expected e),
delta as ((select * from old_eligible except all select * from new_eligible) union all (select * from new_eligible except all select * from old_eligible))
select id,expected_count,old_count,new_count,old_count=expected_count and new_count=expected_count and not exists(select 1 from delta) as passed from actual order by id;
