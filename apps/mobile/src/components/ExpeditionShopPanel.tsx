import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {buyExpeditionShopOffer,loadExpeditionShop,pendingExpeditionPurchase,type ExpeditionShopCategory,type ExpeditionShopLockReason,type ExpeditionShopOffer,type ExpeditionShopSnapshot,type PendingExpeditionPurchase} from '../online/expedition-shop';
import {ExpeditionMarkIcon} from './ExpeditionMarkIcon';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {Panel} from './Panel';

/** The server owns prices, locks and weekly counts. The UI owns displayed
 * names, descriptions and the category icon; adding a new item requires both
 * a server catalogue row AND a copy entry here. */
const OFFER_COPY:Record<string,{name:string;description:string}>={
 exp_border_bronze:{name:'Expeditioner Border (Bronze)',description:'Profile border earned through steady dungeon progress.'},
 exp_border_silver:{name:'Vaultbreaker Border (Silver)',description:'A refined border for seasoned runners.'},
 exp_icon_wayfinder:{name:'Wayfinder Profile Icon',description:'Mark your profile with the Wayfinder sigil.'},
 exp_icon_vaultbreaker:{name:'Vaultbreaker Profile Icon',description:'Earned by those who clear the deepest routes.'},
 exp_consumable_boon_reroll:{name:'Shrine Reroll Token',description:'Reroll a shrine boon offer once per run.'},
 exp_consumable_second_chance:{name:'Phoenix Draught',description:'Revive the party once on a failed encounter.'},
 exp_currency_relic_pack:{name:'Relic Fragment Pack',description:'A supply of relic fragments for the Forge.'},
 exp_currency_commendation_pack:{name:'Commendation Pack',description:'Commendations useful for reputation rewards.'},
 exp_utility_charge_refresh:{name:'Enhanced Reward Charge',description:'Restore one enhanced reward charge instantly.'},
};

const CATEGORY_LABEL:Record<ExpeditionShopCategory,string>={
 cosmetic_border:'Border',
 cosmetic_icon:'Icon',
 consumable:'Consumable',
 currency_pack:'Currency pack',
 utility:'Utility',
};

const LOCK_COPY:Record<ExpeditionShopLockReason,string>={
 account_level_locked:'Requires a higher account level.',
 already_owned:'You already own this item.',
 weekly_limit_reached:'Weekly limit reached — restocks Monday 00:00 UTC.',
};

export const expeditionShopApi={load:loadExpeditionShop,pending:pendingExpeditionPurchase,buy:buyExpeditionShopOffer};

function offerCopy(itemId:string){
 return OFFER_COPY[itemId]??{name:itemId,description:'Expedition supplies.'};
}

export function ExpeditionShopPanel({onRewardsChanged,api=expeditionShopApi,onBack}:{onRewardsChanged?:()=>void|Promise<unknown>;api?:typeof expeditionShopApi;onBack?:()=>void}){
 const C=useGameTheme(),lock=useRef(false);
 const [data,setData]=useState<ExpeditionShopSnapshot|null>(null);
 const [pending,setPending]=useState<PendingExpeditionPurchase|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [selected,setSelected]=useState<ExpeditionShopOffer|null>(null);
 const reload=async()=>{setPending(await api.pending());setData(await api.load());};
 const refresh=async(syncInventory=false)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{if(syncInventory)await onRewardsChanged?.();await reload();}
  catch(e){setError(e instanceof Error?e.message:'Unable to load the Expedition shop.');}
  finally{lock.current=false;setBusy(false);}
 };
 useEffect(()=>{void refresh();},[]);
 const purchase=async(itemId:string)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');
  let purchased=false;
  try{
   await api.buy(itemId);purchased=true;setSelected(null);setPending(null);
   setNotice('Purchase complete. Enjoy your reward.');
   await onRewardsChanged?.();await reload();
  }catch(e){
   setError(purchased?'Purchase completed. Refresh to sync your balance.':e instanceof Error?e.message:'Purchase status unknown. Retry safely below.');
   try{setPending(await api.pending());}catch{/* keep existing pending state */}
  }finally{lock.current=false;setBusy(false);}
 };
 const copy={color:C.muted,fontSize:13,lineHeight:19};
 const heading={color:C.text,fontSize:18,fontWeight:'600' as const};
 const row={flexDirection:'row' as const,alignItems:'center' as const,gap:8};
 return <View style={{gap:12}}>
  {onBack?<Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={({pressed})=>({paddingVertical:8,opacity:pressed?.6:1})}><Text style={{color:C.accent,fontSize:14,fontWeight:'600'}}>‹ Back</Text></Pressable>:null}
  <Panel>
   <Text style={{color:C.accent,fontSize:11,fontWeight:'600',letterSpacing:1}}>EXPEDITION QUARTERMASTER</Text>
   <Text style={heading}>Spend your Expedition Marks</Text>
   <View style={{...row,backgroundColor:C.panel2,borderRadius:10,padding:12,marginVertical:4}}>
    <ExpeditionMarkIcon size={28}/>
    <Text style={{color:C.accent,fontSize:26,fontWeight:'600'}}>{data?.balance.toLocaleString()??'—'}</Text>
    <Text style={copy}>Expedition Marks</Text>
   </View>
   <Text style={copy}>Earned by clearing dungeons and seasonal expeditions.</Text>
  </Panel>
  {!!error&&<Text accessibilityRole="alert" style={{color:C.bad,fontSize:13}}>{error}</Text>}
  {!!notice&&<Text accessibilityLiveRegion="polite" style={{color:C.good,fontSize:13}}>{notice}</Text>}
  {pending?<Panel>
   <Text style={heading}>Purchase awaiting confirmation</Text>
   <Text style={copy}>A previous purchase needs checking. Retry uses the same receipt and cannot charge you twice.</Text>
   <GameButton title={busy?'Checking…':'Resolve purchase'} disabled={busy} onPress={()=>purchase(pending.itemId)}/>
  </Panel>:null}
  {busy&&!data?<View style={{alignItems:'center',paddingVertical:24}}><ActivityIndicator color={C.accent}/><Text style={{...copy,marginTop:8}}>Loading the shop…</Text></View>:null}
  {data&&data.offers.length===0&&!busy?<Panel>
   <Text style={heading}>Nothing in stock yet</Text>
   <Text style={copy}>The Expedition Quartermaster is preparing new goods. Check back after the next patch.</Text>
  </Panel>:null}
  <View style={{gap:10}}>
   {data?.offers.map(offer=>{
    const info=offerCopy(offer.itemId),locked=!!offer.lockedReason;
    const short=Math.max(0,offer.markCost-(data?.balance??0));
    const remaining=offer.weeklyLimit>0?Math.max(0,offer.weeklyLimit-offer.weeklyPurchased):undefined;
    return <View key={offer.itemId} style={{padding:12,gap:8,borderWidth:1,borderColor:locked?C.line:C.selectionLine,borderRadius:14,backgroundColor:C.panel}}>
     <View style={row}>
      <Text style={{color:C.accent,fontSize:10,fontWeight:'700',letterSpacing:.8,textTransform:'uppercase'}}>{CATEGORY_LABEL[offer.category]}</Text>
      <View style={{flex:1}}/>
      <Text style={{color:locked?C.warning:C.good,fontSize:11,fontWeight:'700'}}>{locked?'LOCKED':'AVAILABLE'}</Text>
     </View>
     <Text style={{color:C.text,fontSize:15,lineHeight:20,fontWeight:'600'}}>{info.name}</Text>
     <Text style={copy}>{info.description}</Text>
     {offer.requiredAccountLevel>1?<Text style={{...copy,fontSize:12}}>Account level {offer.requiredAccountLevel}+</Text>:null}
     {remaining!==undefined?<Text style={{...copy,fontSize:12}}>{remaining}/{offer.weeklyLimit} left this week</Text>:null}
     {locked?<Text style={{color:C.warning,fontSize:12,lineHeight:17}}>{LOCK_COPY[offer.lockedReason!]}</Text>:null}
     <View style={{...row,marginTop:4}}>
      <ExpeditionMarkIcon size={20}/>
      <Text style={{color:C.accent,fontSize:15,fontWeight:'600'}}>{offer.markCost.toLocaleString()} Marks</Text>
     </View>
     {!locked&&short>0?<Text style={{color:C.muted,fontSize:12}}>Need {short.toLocaleString()} more Marks</Text>:null}
     <GameButton compact title={locked?'Locked':short?'Not enough Marks':'Review purchase'} disabled={busy||!!pending||locked||short>0} onPress={()=>setSelected(offer)}/>
    </View>;
   })}
  </View>
  <GameButton title={busy?'Syncing…':'Refresh shop'} tone="secondary" disabled={busy} onPress={()=>refresh(true)}/>
  <GameModalSurface visible={!!selected} onClose={()=>{if(!busy)setSelected(null);}}>
   <GameModalHeader title="Confirm purchase" onClose={()=>{if(!busy)setSelected(null);}}/>
   {selected?<ScrollView contentContainerStyle={{gap:14}} showsVerticalScrollIndicator={false}>
    <Text style={heading}>{offerCopy(selected.itemId).name}</Text>
    <Text style={copy}>{offerCopy(selected.itemId).description}</Text>
    <View style={row}>
     <ExpeditionMarkIcon/>
     <Text style={{...copy,flex:1}}>Spend {selected.markCost.toLocaleString()} Expedition Marks · Balance after: {Math.max(0,(data?.balance??0)-selected.markCost).toLocaleString()}</Text>
    </View>
    <Text style={copy}>{selected.weeklyLimit>0?'Weekly purchase. Restocks Monday 00:00 UTC.':'One-time purchase. Final.'}</Text>
    {error?<Text accessibilityRole="alert" style={{color:C.bad}}>{error}</Text>:null}
    <GameButton title={busy?'Purchasing…':'Buy'} disabled={busy} onPress={()=>purchase(selected.itemId)}/>
    <GameButton title="Cancel" tone="secondary" disabled={busy} onPress={()=>setSelected(null)}/>
   </ScrollView>:null}
  </GameModalSurface>
 </View>;
}
