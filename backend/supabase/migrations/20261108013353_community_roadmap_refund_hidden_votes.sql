-- Free player voting power if an admin withdraws an idea from the public ballot.
create or replace function roadmap_internal.refund_community_votes()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if (old.status='considering' and new.status <> 'considering')
   or (old.published and not new.published) then
   delete from public.community_roadmap_votes where feature_id=new.id;
 end if;
 return new;
end;
$$;
drop trigger if exists community_roadmap_refund_votes on public.community_roadmap_features;
create trigger community_roadmap_refund_votes
 after update of status,published on public.community_roadmap_features
 for each row execute function roadmap_internal.refund_community_votes();
delete from public.community_roadmap_votes v
using public.community_roadmap_features f
where f.id=v.feature_id and (not f.published or f.status <> 'considering');
