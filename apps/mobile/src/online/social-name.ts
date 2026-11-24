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
/** Availability is advisory; the write RPC still wins if another player claims first. */
export async function checkAccountSocialNameAvailability(name:string):Promise<boolean>{
 const {data,error}=await client().rpc('account_social_name_availability_v1',{p_name:name.trim()});
 if(error)throw error;
 if(typeof data!=='boolean')throw new Error('SOCIAL_NAME_AVAILABILITY_UNAVAILABLE');
 return data;
}

/** Mirrors the backend's 2–20 letter-only identity contract for immediate UI feedback.
 * The server remains authoritative for collision and moderation checks. */
const VALID_SOCIAL_NAME=/^[A-Za-zÀ-ÖØ-öø-ÿĀ-ſƀ-ɏḀ-ỿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿĀ-ſƀ-ɏḀ-ỿ]+)*$/u;
export function isValidSocialName(input:string){
 const name=input.trim();
 return name.length>=2&&name.length<=20&&VALID_SOCIAL_NAME.test(name);
}

/** PostgREST errors are plain objects, not always instances of Error.
 * Extract only bounded string diagnostics; never expose raw SQL/server detail to players. */
function socialNameErrorDetails(error:unknown):string{
 if(typeof error==='string')return error.slice(0,1024);
 if(!error||typeof error!=='object')return '';
 const record=error as Record<string,unknown>;
 return ['message','code','details','hint']
  .map(key=>typeof record[key]==='string'?(record[key] as string).slice(0,1024):'')
  .join(' ');
}
export function socialNameError(error:unknown){
 const message=socialNameErrorDetails(error);
 if(message.includes('SOCIAL_NAME_TAKEN')||message.includes('23505'))return 'This name is already used by another player.' as const;
 if(message.includes('SOCIAL_NAME_COOLDOWN'))return 'You can change your social name once every 30 days.' as const;
 if(message.includes('SOCIAL_NAME_BLOCKED'))return 'Choose a different social name.' as const;
 if(message.includes('INVALID_SOCIAL_NAME'))return 'Use 2–20 letters. Spaces, hyphens and apostrophes are allowed.' as const;
 if(message.includes('PROFILE_NOT_FOUND'))return 'Complete account setup before choosing a social name.' as const;
 return 'Could not update your social name. Please try again.' as const;
}
