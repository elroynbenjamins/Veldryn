import {useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View,type StyleProp,type TextStyle} from 'react-native';
import {useAuthSession} from '../online/AuthSessionProvider';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import type {Language} from '../i18n/languages';
import {translateChatMessage} from '../online/chat-translation';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import {ChatMessageText} from './ChatMessageText';

const COPY:Record<Language,{translate:string;original:string;loading:string;translated:string;error:string}>={
 en:{translate:'Translate',original:'Show original',loading:'Translating…',translated:'Translated',error:'Translation unavailable. Try again.'},
 de:{translate:'Übersetzen',original:'Original anzeigen',loading:'Wird übersetzt…',translated:'Übersetzt',error:'Übersetzung nicht verfügbar. Erneut versuchen.'},
 es:{translate:'Traducir',original:'Ver original',loading:'Traduciendo…',translated:'Traducido',error:'Traducción no disponible. Inténtalo de nuevo.'},
 nl:{translate:'Vertalen',original:'Origineel tonen',loading:'Vertalen…',translated:'Vertaald',error:'Vertaling niet beschikbaar. Probeer opnieuw.'},
 it:{translate:'Traduci',original:"Mostra l'originale",loading:'Traduzione…',translated:'Tradotto',error:'Traduzione non disponibile. Riprova.'},
 fr:{translate:'Traduire',original:"Voir l'original",loading:'Traduction…',translated:'Traduit',error:'Traduction indisponible. Réessayez.'},
 ru:{translate:'Перевести',original:'Показать оригинал',loading:'Перевод…',translated:'Переведено',error:'Перевод недоступен. Повторите попытку.'},
 tr:{translate:'Çevir',original:'Orijinali göster',loading:'Çevriliyor…',translated:'Çevrildi',error:'Çeviri kullanılamıyor. Tekrar deneyin.'},
};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const memo=new Map<string,string>();
const MAX_MEMO=120;
function remember(key:string,value:string){
 if(memo.has(key))memo.delete(key);
 memo.set(key,value);
 if(memo.size>MAX_MEMO)memo.delete(memo.keys().next().value!);
}

/** Translation is opt-in per message and never changes the stored chat body. */
export function ChatTranslatableBody({messageId,body,mentionName,compact=false,style}:{messageId?:string;body:string;mentionName?:string;compact?:boolean;style?:StyleProp<TextStyle>}){
 const language=useGameLanguage(),{session}=useAuthSession(),C=useGameTheme();
 const s=useMemo(()=>makeStyles(C),[C]),copy=COPY[language];
 const account=session?.user.id;
 const enabled=Boolean(account&&messageId&&UUID.test(messageId)&&/[\p{L}]/u.test(body));
 const key=account&&messageId?account+':'+messageId+':'+language+':'+body:'';
 const [translated,setTranslated]=useState<string|null>(null);
 const [show,setShow]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState(false);
 const request=useRef(0);
 useEffect(()=>{request.current++;setTranslated(null);setShow(false);setBusy(false);setError(false);return()=>{request.current++;};},[key]);
 const toggle=async()=>{
  if(!enabled||!messageId||busy)return;
  if(show){setShow(false);return;}
  const saved=translated??memo.get(key);
  if(saved){setTranslated(saved);setShow(true);setError(false);return;}
  const token=++request.current;
  setBusy(true);setError(false);
  try{
   const value=await translateChatMessage(messageId,language);
   if(request.current!==token)return;
   remember(key,value);
   setTranslated(value);setShow(true);
  }catch{
   if(request.current===token)setError(true);
  }finally{
   if(request.current===token)setBusy(false);
  }
 };
 return <View style={s.root}>
  <ChatMessageText body={show&&translated?translated:body} mentionName={mentionName} compact={compact} style={style}/>
  {enabled?<View style={s.controls}>
   <Pressable accessibilityRole="button" accessibilityLabel={show?copy.original:copy.translate} accessibilityState={{disabled:busy}} disabled={busy} onPress={()=>void toggle()} hitSlop={5} style={({pressed})=>[s.button,pressed&&s.pressed]}>
    <Text style={s.buttonText}>🌐 {busy?copy.loading:show?copy.original:copy.translate}</Text>
   </Pressable>
   {show?<Text style={s.note}>{copy.translated}</Text>:null}
   {error?<Text accessibilityRole="alert" style={s.error}>{copy.error}</Text>:null}
  </View>:null}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{minWidth:0},
 controls:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:7,marginTop:2},
 button:{minHeight:30,justifyContent:'center',alignSelf:'flex-start',paddingVertical:2,paddingRight:6},
 buttonText:{fontSize:11,lineHeight:16,fontWeight:'800',color:C.info},
 note:{fontSize:10,color:C.muted},
 error:{fontSize:10,color:C.bad,flexShrink:1},
 pressed:{opacity:.7},
});}
