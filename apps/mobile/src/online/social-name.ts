import {supabase} from './supabase';

/** One public name per account. Character identity is intentionally not modified. */
export interface AccountSocialName {
 socialName:string;
 selected:boolean;
 nextChangeAt:string|null;
}
function client(){
 if(!supabase)throw new Error('Online services are not configured in this build.');
 return supabase;
}
export async function accountSocialNameSelf():Promise<AccountSocialName>{
 const {data,error}=await client().rpc('account_social_name_self_v1');
 if(error)throw error;
 return data as AccountSocialName;
}
export async function setAccountSocialName(name:string):Promise<AccountSocialName>{
 const {data,error}=await client().rpc('set_account_social_name_v1',{p_name:name.trim()});
 if(error)throw error;
 return data as AccountSocialName;
}
/** Mirrors the backend's 2–20 letter-only identity contract for immediate UI feedback.
 * The server remains authoritative for collision and moderation checks. */
const VALID_SOCIAL_NAME=/^[A-Za-zÀ-ÖØ-öø-ÿĀ-ſƀ-ɏḀ-ỿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿĀ-ſƀ-ɏḀ-ỿ]+)*$/u;
export function isValidSocialName(input:string){
 const name=input.trim();
 return name.length>=2&&name.length<=20&&VALID_SOCIAL_NAME.test(name);
}

/** Keep server error codes actionable without showing database internals. */
export function socialNameError(error:unknown){
 const message=error instanceof Error?error.message:String(error??'');
 if(message.includes('SOCIAL_NAME_TAKEN'))return 'This name is already used by another player.';
 if(message.includes('SOCIAL_NAME_COOLDOWN'))return 'You can change your social name once every 30 days.';
 if(message.includes('SOCIAL_NAME_BLOCKED'))return 'Choose a different social name.';
 if(message.includes('INVALID_SOCIAL_NAME'))return 'Use 2–20 letters; spaces, hyphens and apostrophes are allowed.';
 if(message.includes('PROFILE_NOT_FOUND'))return 'Complete account setup before choosing a social name.';
 return 'Could not update your social name. Please try again.';
}
