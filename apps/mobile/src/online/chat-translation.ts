import {supabase} from './supabase';
import type {Language} from '../i18n/languages';

type TranslationReply={text?:unknown;error?:unknown};
type TranslationFailure='unavailable'|'limit'|'missing';
export class ChatTranslationError extends Error{
 constructor(public readonly code:TranslationFailure){
  super(code);
  this.name='ChatTranslationError';
 }
}
/** The server fetches the original under the player's chat RLS; never send raw chat text from the app. */
export async function translateChatMessage(messageId:string,targetLanguage:Language):Promise<string>{
 if(!supabase)throw new ChatTranslationError('unavailable');
 const {data,error}=await supabase.functions.invoke<TranslationReply>('translate-chat-message',{
  body:{messageId,targetLanguage},
 });
 if(error){
  // Supabase FunctionsHttpError.context contains the Response on non-2xx.
  // Keep generic network faults distinct from account quotas and revoked access.
  const response=(error as {context?:unknown}).context;
  if(response&&typeof response==='object'&&'status'in response){
   const status=(response as {status?:unknown}).status;
   if(status===429)throw new ChatTranslationError('limit');
   if(status===404)throw new ChatTranslationError('missing');
  }
  throw new ChatTranslationError('unavailable');
 }
 if(!data||typeof data.text!=='string'||!data.text.trim())throw new ChatTranslationError('unavailable');
 return data.text;
}
