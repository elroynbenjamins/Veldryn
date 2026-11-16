import {supabase} from './supabase';
import type {Language} from '../i18n/languages';

type TranslationReply={text?:unknown;error?:unknown};

/** The server fetches the original message under the player's RLS; never send raw chat text to a third party from the app. */
export async function translateChatMessage(messageId:string,targetLanguage:Language):Promise<string>{
 if(!supabase)throw new Error('Translation requires online services.');
 const {data,error}=await supabase.functions.invoke<TranslationReply>('translate-chat-message',{
  body:{messageId,targetLanguage},
 });
 if(error||!data||typeof data.text!=='string'||!data.text.trim())throw new Error('Translation unavailable.');
 return data.text;
}
