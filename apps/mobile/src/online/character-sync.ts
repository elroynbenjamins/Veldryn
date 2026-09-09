import type {GameState} from '../core/types';
import {supabase} from './supabase';

/**
 * Writes only profile/character state. Inventory, economy, activities and rewards
 * remain server-authoritative work and deliberately are not trusted from a client save.
 */
export async function syncCharacterProfile(state:GameState){
  if(!supabase)throw new Error('Online services are not configured in this build.');
  const character=state.character;
  if(!character)throw new Error('Create a character before syncing.');
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user)throw new Error('Sign in before syncing.');
  const payload={
    account_id:user.id,
    name:character.name,
    class_id:character.classId,
    body_presentation:character.bodyPresentation??'male',
    level:character.level,
    xp:character.xp,
    gold:character.gold,
    base_stats:{hp:character.hp,currentHp:character.currentHp,attack:character.attack,defense:character.defense},
    equipment:character.equipment,
    profile_title:character.profileTitle??null,
    profile_background_id:character.profileBackgroundId??'asterfall-night',
    unlocked_pet_ids:character.ownedPetIds??[],
    unlocked_boost_ids:character.ownedBoostIds??[],
    unlocked_skin_ids:character.unlockedSkinIds??['starting'],
    updated_at:new Date().toISOString(),
  };
  const {data:syncedCharacter,error}=await supabase.from('characters').upsert(payload,{onConflict:'account_id,name'}).select('id').single();
  if(error)throw error;
  const {error:profileError}=await supabase.from('player_profiles').upsert({account_id:user.id,display_name:character.name,profile_title:character.profileTitle??null,profile_background_id:character.profileBackgroundId??'asterfall-night',active_character_id:syncedCharacter.id,updated_at:new Date().toISOString()});
  if(profileError)throw profileError;
  return {characterName:character.name};
}
