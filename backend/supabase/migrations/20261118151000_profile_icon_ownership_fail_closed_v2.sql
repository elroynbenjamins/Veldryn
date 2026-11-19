-- Fail closed for nullable legacy game states when checking profile icon ownership.
-- SQL NULL is not false in PL/pgSQL; a missing hero snapshot must not unlock an icon.
do $patch$
declare
 v_def text:=pg_get_functiondef('public.profile_character_showcase_update_v2(uuid,text,text,text[],jsonb,text[],text[])'::regprocedure);
 v_old text:='if not v_owned_icon then raise exception ''COLLECTION_NOT_OWNED'';end if;';
 v_new text:='if not coalesce(v_owned_icon,false) then raise exception ''COLLECTION_NOT_OWNED'';end if;';
begin
 if position(v_new in v_def)>0 then return;end if;
 if position(v_old in v_def)=0 then raise exception 'profile_icon_ownership_guard_drift';end if;
 execute replace(v_def,v_old,v_new);
end $patch$;

-- Internal trigger functions are not authenticated RPC entrypoints. Explicitly
-- revoke PUBLIC/anon/authenticated EXECUTE after their triggers have been created.
revoke all on function public.store_character_showcase_from_extension_v1() from public,anon,authenticated;
revoke all on function public.protect_social_name_v1() from public,anon,authenticated;
