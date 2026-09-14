import type {GameState} from '../core/types';
import {createOnlineGameRepository} from './gameplay';
import {supabase} from './supabase';
/** Compatibility entry point: refresh server-owned identity, never upload local progression. */
export async function syncCharacterProfile(_local:GameState){
 if(!supabase)throw new Error('Online services are not configured.');
 const {data:{user},error}=await supabase.auth.getUser();if(error)throw error;if(!user)throw new Error('Sign in first.');
 const state=await createOnlineGameRepository(user.id).load();if(!state.character)throw new Error('Create your online character first. Local save progress is kept separately.');
 return {characterName:state.character.name};
}
