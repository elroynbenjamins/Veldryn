import {useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,View,type StyleProp,type TextStyle} from 'react-native';
import {useAuthSession} from '../online/AuthSessionProvider';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import type {Language} from '../i18n/languages';
import {ChatTranslationError,translateChatMessage} from '../online/chat-translation';
import {CHAT_TRANSLATION_RELEASED} from '../core/release-flags';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import {ChatMessageText} from './ChatMessageText';

const COPY:Record<Language,{translate:string;original:string;loading:string;translated:string;error:string;limit:string;missing:string}>={
 en:{translate:'Translate',original:'Show original',loading:'Translating…',translated:'Translated',error:'Translation unavailable. Tap again to retry.',limit:'Translation limit reached. Try again later.',missing:'Message no longer available.'},
 de:{translate:'Übersetzen',original:'Original anzeigen',loading:'Wird übersetzt…',translated:'Übersetzt',error:'Übersetzung nicht verfügbar. Erneut tippen.',limit:'Übersetzungslimit erreicht. Später erneut versuchen.',missing:'Nachricht nicht mehr verfügbar.'},
 es:{translate:'Traducir',original:'Ver original',loading:'Traduciendo…',translated:'Traducido',error:'Traducción no disponible. Vuelve a tocar.',limit:'Límite de traducciones alcanzado. Inténtalo más tarde.',missing:'El mensaje ya no está disponible.'},
 nl:{translate:'Vertalen',original:'Origineel tonen',loading:'Vertalen…',translated:'Vertaald',error:'Vertaling niet beschikbaar. Tik opnieuw.',limit:'Vertaallimiet bereikt. Probeer later opnieuw.',missing:'Bericht niet meer beschikbaar.'},
 it:{translate:'Traduci',original:"Mostra l'originale",loading:'Traduzione…',translated:'Tradotto',error:'Traduzione non disponibile. Riprova.',limit:'Limite traduzioni raggiunto. Riprova più tardi.',missing:'Messaggio non più disponibile.'},
 fr:{translate:'Traduire',original:"Voir l'original",loading:'Traduction…',translated:'Traduit',error:'Traduction indisponible. Réessayez.',limit:'Limite de traduction atteinte. Réessayez plus tard.',missing:'Message indisponible.'},
 ru:{translate:'Перевести',original:'Показать оригинал',loading:'Перевод…',translated:'Переведено',error:'Перевод недоступен. Нажмите ещё раз.',limit:'Лимит переводов исчерпан. Попробуйте позже.',missing:'Сообщение больше недоступно.'},
 tr:{translate:'Çevir',original:'Orijinali göster',loading:'Çevriliyor…',translated:'Çevrildi',error:'Çeviri kullanılamıyor. Tekrar dokunun.',limit:'Çeviri sınırına ulaşıldı. Daha sonra deneyin.',missing:'Mesaj artık mevcut değil.'},
};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const memo=new Map<string,string>();
const pending=new Map<string,Promise<string>>();
const MAX_MEMO=120;
function remember(key:string,value:string){
 if(memo.has(key))memo.delete(key);
 memo.set(key,value);
 if(memo.size>MAX_MEMO)memo.delete(memo.keys().next().value!);
}
export function canTranslateChatBody(body:string){
 // Prevent empty, punctuation-only and emote-only chat rows from showing an action.
 return /[\p{L}]/u.test(body.replace(/:[a-z0-9_]+:/gi,''));
}

type TranslationViewState={
 key:string;
 translated:string|null;
 showing:boolean;
 busy:boolean;
 error:'unavailable'|'limit'|'missing'|null;
};
const initial=(key:string):TranslationViewState=>({key,translated:null,showing:false,busy:false,error:null});

/** Opt-in only. A new account, language, message or edit cannot display an older response. */
export function useManualChatTranslation(messageId:string|undefined,body:string){
 const language=useGameLanguage(),{session}=useAuthSession();
 const account=session?.user.id;
 const eligible=CHAT_TRANSLATION_RELEASED&&Boolean(account&&messageId&&UUID.test(messageId)&&canTranslateChatBody(body));
 const key=account&&messageId?account+':'+messageId+':'+language+':'+body:'';
 const copy=COPY[language];
 const [stored,setStored]=useState<TranslationViewState>(()=>initial(key));
 const state=stored.key===key?stored:initial(key);
 const generation=useRef(0);
 useEffect(()=>{generation.current++;setStored(initial(key));return()=>{generation.current++;};},[key]);
 const onToggle=async()=>{
  if(!eligible||!messageId||state.busy)return;
  if(state.showing){setStored({...state,showing:false,error:null});return;}
  const cached=state.translated??memo.get(key);
  if(cached){setStored({...state,translated:cached,showing:true,error:null});return;}
  const request=++generation.current;
  setStored({...state,busy:true,error:null});
  let work=pending.get(key);
  if(!work){
   work=translateChatMessage(messageId,language);
   pending.set(key,work);
   const active=work;
   void work.then(()=>{if(pending.get(key)===active)pending.delete(key);},()=>{if(pending.get(key)===active)pending.delete(key);});
  }
  try{
   const value=await work;
   if(generation.current!==request)return;
   remember(key,value);
   setStored({key,translated:value,showing:true,busy:false,error:null});
  }catch(error){
   if(generation.current!==request)return;
   const type=error instanceof ChatTranslationError?error.code:'unavailable';
   setStored({key,translated:null,showing:false,busy:false,error:type});
  }
 };
 return {eligible,body:state.showing&&state.translated?state.translated:body,showing:state.showing,busy:state.busy,error:state.error,copy,onToggle};
}

type Controller=ReturnType<typeof useManualChatTranslation>;
/** Small 28px header action with extended hit area; no additional height per message. */
export function ChatTranslateAction({controller}:{controller:Controller}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 if(!controller.eligible)return null;
 const title=controller.busy?controller.copy.loading:controller.showing?controller.copy.original:controller.copy.translate;
 return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled:controller.busy,busy:controller.busy}} accessibilityHint={controller.showing?controller.copy.original:controller.copy.translate} disabled={controller.busy} onPress={()=>void controller.onToggle()} hitSlop={8} style={({pressed})=>[s.action,pressed&&s.pressed]}>
  {controller.busy?<ActivityIndicator size="small" color={C.info}/>:<Text accessible={false} style={s.glyph}>{controller.showing?'↶':'文A'}</Text>}
 </Pressable>;
}

export function ChatTranslationMessage({controller,mentionName,compact=false,style}:{controller:Controller;mentionName?:string;compact?:boolean;style?:StyleProp<TextStyle>}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 return <View style={s.message}>
  <ChatMessageText body={controller.body} mentionName={mentionName} compact={compact} style={style}/>
  {controller.showing?<Text style={s.note} accessibilityLiveRegion="polite">{controller.copy.translated}</Text>:null}
  {controller.error?<Text accessibilityRole="alert" style={s.error}>{controller.error==='unavailable'?controller.copy.error:controller.copy[controller.error]}</Text>:null}
 </View>;
}

/** Convenience wrapper for surfaces without a separate chat-message header. */
export function ChatTranslatableBody({messageId,body,mentionName,compact=false,style}:{messageId?:string;body:string;mentionName?:string;compact?:boolean;style?:StyleProp<TextStyle>}){
 const controller=useManualChatTranslation(messageId,body);
 return <View>
  <ChatTranslationMessage controller={controller} mentionName={mentionName} compact={compact} style={style}/>
  <ChatTranslateAction controller={controller}/>
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 message:{minWidth:0},
 action:{minWidth:30,minHeight:28,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:7,backgroundColor:C.panelRaised},
 glyph:{fontSize:11,lineHeight:15,fontWeight:'900',color:C.info},
 note:{fontSize:10,lineHeight:14,color:C.muted,marginTop:2},
 error:{fontSize:10,lineHeight:14,color:C.bad,marginTop:3},
 pressed:{opacity:.65},
});}
