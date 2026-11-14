import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Text,View} from 'react-native';
import {DungeonMarksShopView} from './coop/DungeonMarksShopView';
import {GameButton} from './GameButton';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {dungeonShopText} from '../i18n/dungeon-shop';
import {useGameTheme} from '../theme/ThemeContext';
import type {DungeonMarksShopSnapshot} from '../core/dungeon-marks-shop-types';
import {buyExpeditionShopOffer,loadExpeditionShop} from '../online/expedition-shop';

export const expeditionShopApi={load:loadExpeditionShop,buy:buyExpeditionShopOffer};

/** Single Expedition Quartermaster surface. Live prices, ownership, unlocks
 * and offer release flags always come from the server-owned Dungeon Shop.
 * The command journal preserves a purchase request across network failures. */
export function ExpeditionShopPanel({onRewardsChanged,api=expeditionShopApi,onBack}:{
 onRewardsChanged?:()=>void|Promise<unknown>;
 api?:typeof expeditionShopApi;
 onBack?:()=>void;
}){
 const C=useGameTheme(),mounted=useRef(true);
 const language=useGameLanguage();
 const t=(source:string)=>dungeonShopText(language,source);
 const [snapshot,setSnapshot]=useState<DungeonMarksShopSnapshot|null>(null);
 const [loading,setLoading]=useState(true),[purchasing,setPurchasing]=useState(false);
 const [error,setError]=useState(''),[syncWarning,setSyncWarning]=useState('');
 const refresh=async()=>{
  setLoading(true);setError('');
  try{
   const next=await api.load();
   if(mounted.current)setSnapshot(next);
  }catch(cause){
   if(mounted.current)setError(cause instanceof Error?cause.message:t('The Expedition Shop is temporarily unavailable.'));
  }finally{if(mounted.current)setLoading(false);}
 };
 useEffect(()=>{mounted.current=true;void refresh();return()=>{mounted.current=false};},[]);
 const purchase=async(id:string):Promise<'purchased'|'already_owned'>=>{
  setPurchasing(true);
  try{
   const status=await api.buy(id);
   if(status==='purchased'){
    try{await onRewardsChanged?.();}
    catch{if(mounted.current)setSyncWarning(t('Purchase confirmed. Reopen your inventory to refresh rewards.'));}
   }
   return status;
  }finally{if(mounted.current)setPurchasing(false);}
 };
 return <View style={{flex:1,gap:8}}>
  {onBack?<GameButton compact title={t('‹ Back to Dungeons')} tone="secondary" disabled={loading||purchasing} onPress={onBack}/>:null}
  {!!error?<Text accessibilityRole="alert" style={{color:C.bad,fontSize:13}}>{error}</Text>:null}
  {!!syncWarning?<Text accessibilityLiveRegion="polite" style={{color:C.warning,fontSize:12}}>{syncWarning}</Text>:null}
  {loading&&!snapshot?<View style={{paddingVertical:24,alignItems:'center',gap:8}}><ActivityIndicator color={C.accent}/><Text style={{color:C.muted}}>{t('Loading Expedition Shop…')}</Text></View>:null}
  <DungeonMarksShopView snapshot={snapshot}
   onRefresh={refresh} busy={loading||purchasing}
   onPurchase={snapshot?.shopEnabled?purchase:undefined}/>
 </View>;
}
