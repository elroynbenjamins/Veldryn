import {useEffect,useRef,useState} from 'react';
import {Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {buyGuildShopOffer,loadGuildShop,pendingGuildPurchase,type GuildShopOffer,type GuildShopSnapshot,type PendingGuildPurchase} from '../online/guild-shop';
import {useGameTheme} from '../theme/ThemeContext';
import {itemDef} from '../content/items';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {ItemArtwork} from './ItemArtwork';
import {Panel} from './Panel';
import {ResourceIcon} from './ResourceIcon';

export const guildShopApi={load:loadGuildShop,pending:pendingGuildPurchase,buy:buyGuildShopOffer};
export function GuildShopPanel({onRewardsChanged,api=guildShopApi}:{onRewardsChanged?:()=>void|Promise<unknown>;api?:typeof guildShopApi}){
 const C=useGameTheme(),lock=useRef(false);
 const {fontScale}=useWindowDimensions();
 const [width,setWidth]=useState(360),[showEarning,setShowEarning]=useState(false);
 const [data,setData]=useState<GuildShopSnapshot|null>(null),[pending,setPending]=useState<PendingGuildPurchase|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[selected,setSelected]=useState<GuildShopOffer|null>(null);
 const reload=async()=>{const nextPending=await api.pending();setPending(nextPending);setData(await api.load());};
 const refresh=async(syncInventory=false)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{if(syncInventory)await onRewardsChanged?.();await reload();}catch(e){setError(e instanceof Error?e.message:'Unable to load the shop.');}finally{lock.current=false;setBusy(false);}};
 useEffect(()=>{void refresh();},[]);
 const purchase=async(offerId:string)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');
  let purchased=false;
  try{await api.buy(offerId);purchased=true;setSelected(null);setPending(null);setNotice('Supplies delivered. Thank you for supporting your guild.');await onRewardsChanged?.();await reload();}
  catch(e){setError(purchased?'Purchase completed. Refresh to sync your inventory and balance.':e instanceof Error?e.message:'Purchase status unknown. Retry safely below.');try{setPending(await api.pending());}catch{/* Keep the existing pending state when storage is unavailable. */}}
  finally{lock.current=false;setBusy(false);}
 };
 const copy={color:C.muted,fontSize:13,lineHeight:19},heading={color:C.text,fontSize:18,fontWeight:'600' as const},row={flexDirection:'row' as const,alignItems:'center' as const,gap:8};
 return <View onLayout={event=>setWidth(event.nativeEvent.layout.width)} style={{gap:12}}>
  <Panel><Text style={{color:C.accent,fontSize:11,fontWeight:'600',letterSpacing:1}}>GUILD QUARTERMASTER</Text><Text style={heading}>Supplies earned together</Text><View style={{...row,backgroundColor:C.panel2,borderRadius:10,padding:12,marginVertical:4}}><ResourceIcon resourceId="guild_marks" size={28}/><Text style={{color:C.accent,fontSize:26,fontWeight:'600'}}>{data?.balance.toLocaleString()??'—'}</Text><Text style={copy}>Guild Marks</Text></View><Text style={copy}>Personal balance · Carries over each week and stays with you when changing guilds.</Text></Panel>
  {!!error&&<Text accessibilityRole="alert" style={{color:C.bad,fontSize:13}}>{error}</Text>}
  {!!notice&&<Text accessibilityLiveRegion="polite" style={{color:C.good,fontSize:13}}>{notice}</Text>}
  {pending?<Panel><Text style={heading}>Purchase awaiting confirmation</Text><Text style={copy}>A previous purchase needs checking. Retry uses the same receipt and cannot charge you twice.</Text><GameButton title={busy?'Checking…':'Resolve purchase'} disabled={busy} onPress={()=>void purchase(pending.offerId)}/></Panel>:null}
  {data&&!data.joined?<Panel><Text style={heading}>Join a guild to shop</Text><Text style={copy}>Guild members earn Marks through Muster and spend them here on supplies.</Text></Panel>:null}
  <View style={{gap:3}}><Text style={heading}>Weekly supplies</Text><Text style={copy}>Restocks Monday · 00:00 UTC</Text>{data?<Text style={{...copy,fontSize:12}}>Next reset: {new Date(data.resetsAt).toLocaleString()}</Text>:null}</View>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'stretch'}}>
   {data?.offers.map(offer=>{
    const remaining=Math.max(0,offer.weeklyLimit-offer.purchased),short=Math.max(0,offer.cost-data.balance),locked=!!offer.lockReason;
    return <View key={offer.id} style={{width:width>=310&&fontScale<1.4?'48%':'100%',flexGrow:1,padding:12,gap:8,borderWidth:1,borderColor:locked?C.line:C.selectionLine,borderRadius:14,backgroundColor:C.panel}}>
     <View style={{alignItems:'center',justifyContent:'center',height:84,borderRadius:10,backgroundColor:C.panel2}}><ItemArtwork itemId={offer.itemId} size={64}/></View>
     <Text style={{color:C.text,fontSize:15,lineHeight:20,fontWeight:'600',minHeight:40}}>{itemDef(offer.itemId).name}</Text>
     <Text style={copy}>×{offer.quantity} per pack</Text>
     <View style={{gap:3,minHeight:58}}><Text style={{color:locked?C.warning:C.good,fontSize:12,fontWeight:'600'}}>{locked?'LOCKED':'AVAILABLE'} · Lv. {offer.requiredLevel}</Text><Text style={{...copy,fontSize:12}}>{offer.regionName}</Text>{locked?<Text style={{color:C.warning,fontSize:12,lineHeight:17}}>{offer.lockReason}</Text>:null}</View>
     <View style={{...row,marginTop:'auto'}}><ResourceIcon resourceId="guild_marks" size={20}/><Text style={{color:C.accent,fontSize:15,fontWeight:'600'}}>{offer.cost} Marks</Text></View>
     <Text style={{...copy,fontSize:12}}>{remaining}/{offer.weeklyLimit} packs left</Text>
     {!locked&&short>0?<Text style={{color:C.muted,fontSize:12}}>Need {short} more Marks</Text>:null}
     <GameButton compact title={locked?'Locked':!remaining?'Sold out':short?'Not enough Marks':'Review purchase'} disabled={busy||!!pending||!data.joined||locked||!remaining||short>0} onPress={()=>setSelected(offer)}/>
    </View>;
   })}
  </View>
  <Panel><Pressable accessibilityRole="button" accessibilityState={{expanded:showEarning}} onPress={()=>setShowEarning(value=>!value)} style={{...row,justifyContent:'space-between',minHeight:44}}><View style={{flex:1,gap:2}}><Text style={{...heading,fontSize:16}}>Earn Marks</Text><Text style={copy}>Up to 55 per day through Muster</Text></View><Text style={{color:C.accent,fontSize:22}}>{showEarning?'−':'+'}</Text></Pressable>{showEarning?<View style={{gap:10,paddingTop:8}}><Text style={copy}>+5 for your daily Muster check-in{'\n'}+25 at 25 combat / skilling Muster points{'\n'}+25 at 75 combat / skilling Muster points</Text><Text style={copy}>Credited automatically when you open the shop, including eligible activity from the last 14 UTC days in your current guild. Each daily reward can only be earned once per account.</Text><Text style={copy}>Marks are personal, separate from the shared treasury. Balances and weekly purchase limits follow your account when changing guilds.</Text></View>:null}</Panel>
  <Text style={{...copy,fontSize:12}}>Unlock a region to buy its supplies—you do not need to travel there. Delivery: inventory → bank → overflow (collect within 3 days).</Text>
  <GameButton title={busy?'Syncing…':'Refresh shop & inventory'} tone="secondary" disabled={busy} onPress={()=>void refresh(true)}/>
  <GameModalSurface visible={!!selected} onClose={()=>{if(!busy)setSelected(null);}}><GameModalHeader title="Confirm purchase" onClose={()=>{if(!busy)setSelected(null);}}/>{selected?<ScrollView contentContainerStyle={{gap:14}}><View style={row}><ItemArtwork itemId={selected.itemId} size={48}/><Text style={{...heading,flex:1}}>{selected.quantity} × {itemDef(selected.itemId).name}</Text></View><View style={row}><ResourceIcon resourceId="guild_marks"/><Text style={{...copy,flex:1}}>Spend {selected.cost} Guild Marks · Balance after: {Math.max(0,(data?.balance??0)-selected.cost)}</Text></View><Text style={copy}>One supply pack. Purchases are final.</Text>{error?<Text accessibilityRole="alert" style={{color:C.bad}}>{error}</Text>:null}<GameButton title={busy?'Purchasing…':'Buy supplies'} disabled={busy} onPress={()=>void purchase(selected.id)}/><GameButton title="Cancel" tone="secondary" disabled={busy} onPress={()=>setSelected(null)}/></ScrollView>:null}</GameModalSurface>
 </View>;
}
