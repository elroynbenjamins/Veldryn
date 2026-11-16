-- Fix player directory searches failing with PostgreSQL ERROR 22025.
-- With standard_conforming_strings=on, a quoted '\\' is two characters;
-- ILIKE ESCAPE requires exactly one. chr(92) is an unambiguous backslash.
-- Preserve prefix-only search, literal wildcard escaping, relation status,
-- block filtering and the existing RPC interface. No player data changes.

CREATE OR REPLACE FUNCTION public.social_player_search(p_query text, p_limit integer DEFAULT 20)
RETURNS TABLE(account_id uuid, display_name text, character_name text, class_id text, level integer, profile_title text, relationship text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT pp.account_id,
         COALESCE(NULLIF(pp.display_name,''),'Adventurer'),
         c.name,c.class_id,c.level,c.profile_title,
         CASE WHEN f.account_a IS NOT NULL THEN 'friend'
              WHEN outgoing.id IS NOT NULL THEN 'outgoing_pending'
              WHEN incoming.id IS NOT NULL THEN 'incoming_pending'
              ELSE 'none' END
  FROM public.player_profiles pp
  LEFT JOIN LATERAL (
    SELECT name,class_id,level,profile_title
    FROM public.characters
    WHERE account_id=pp.account_id
    ORDER BY (id=pp.active_character_id) DESC,level DESC,updated_at DESC
    LIMIT 1
  ) c ON TRUE
  LEFT JOIN public.friendships f
    ON f.account_a=LEAST(auth.uid(),pp.account_id)
   AND f.account_b=GREATEST(auth.uid(),pp.account_id)
  LEFT JOIN public.friend_requests outgoing
    ON outgoing.requester_id=auth.uid()
   AND outgoing.recipient_id=pp.account_id AND outgoing.status='pending'
  LEFT JOIN public.friend_requests incoming
    ON incoming.requester_id=pp.account_id
   AND incoming.recipient_id=auth.uid() AND incoming.status='pending'
  WHERE auth.uid() IS NOT NULL
    AND pp.account_id<>auth.uid()
    AND char_length(trim(p_query))>=2
    AND pp.display_name ILIKE
      replace(replace(trim(p_query),'%',chr(92)||'%'),'_',chr(92)||'_')||'%' ESCAPE chr(92)
    AND NOT EXISTS (
      SELECT 1 FROM public.player_blocks b
      WHERE (b.blocker_id=auth.uid() AND b.blocked_id=pp.account_id)
         OR (b.blocker_id=pp.account_id AND b.blocked_id=auth.uid())
    )
  ORDER BY pp.display_name
  LIMIT LEAST(GREATEST(COALESCE(p_limit,20),1),20);
$function$;
