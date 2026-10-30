import {useState} from 'react';
import {Image,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {EventReward,EventShopOffer,LiveEventDef} from '../content/live-events';
import {eventCandies} from '../content/live-events';
import type {GameState} from '../core/types';
import {eventOfferPurchaseCount} from '../core/live-events';
import {useGameTheme} from '../theme/ThemeContext';
import {liveEventVisuals} from '../ui/live-event-visuals-active';
import {BoardTabs} from './BoardTabs';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {RewardArt,eventRewardRarity} from './EventRewardArt';
import {ProfileScenePreview} from './ProfileScenePreview';

const FILTERS=[{id:'all',label:'All'},{id:'collectibles',label:'Collectibles'},{id:'supplies',label:'Supplies'}] as const;
type Filter=typeof FILTERS[number]['id'];
const supply=(reward:EventReward)=>['candy','gold','companion_essence','bondstones'].includes(reward.kind);
function kindLabel(reward:EventReward){
 const names:Record<EventReward['kind'],string>={pet:'Pet',companion:'Companion',emote:'Emote',title:'Title',candy:'Consumable',gold:'Gold',companion_essence:'Companion Essence',bondstones:'Bondstone',profile_icon:'Profile icon',background:'Personal profile background',border:'Border',guild_name_color:'Guild name color',guild_frame:'Guild frame',guild_banner:'Guild banner'};
 return names[reward.kind];
}
function description(reward:EventReward,definition:LiveEventDef){
 if(reward.kind==='candy')return eventCandies(definition).find(row=>row.id===reward.id)?.description??'Event consumable.';
 if(reward.kind==='gold')return `Adds ${(reward.quantity??0).toLocaleString()} Gold to this character.`;
 if(reward.kind==='companion_essence')return `Adds ${(reward.quantity??0).toLocaleString()} Companion Essence to your account.`;
 if(reward.kind==='bondstones')return `Adds ${(reward.quantity??0).toLocaleString()} Bondstone to your account.`;
 if(reward.kind==='background')return 'Permanent background for your personal profile card. Equip it from Character → Customize → Backgrounds after unlocking.';
 return `Permanent ${kindLabel(reward).toLowerCase()} · Account unlock`;
}
export function EventShopCatalogue({state,definition,offers,currency,prestige,busy,pendingId,onBuy}:{state:GameState;definition:LiveEventDef;offers:EventShopOffer[];currency:number;prestige:number;busy:boolean;pendingId:string|null;onBuy:(offer:EventShopOffer)=>Promise<void>}){
 const C=useGameTheme(),[filter,setFilter]=useState<Filter>('all'),[selected,setSelected]=useState<string|null>(null),[affordableOnly,setAffordableOnly]=useState(false),visuals=liveEventVisuals(definition.visualKey);
 const {width,fontScale}=useWindowDimensions(),twoColumns=width>=350&&fontScale<1.35;
 const entries=offers.map(offer=>{
  const count=eventOfferPurchaseCount(state,definition.id,offer.id),left=Math.max(0,offer.limit-count),locked=(state.character?.level??0)<(offer.minLevel??1),sold=left===0,balance=offer.currency==='common'?currency:prestige,shortfall=Math.max(0,offer.cost-balance);
  return {offer,left,locked,sold,balance,shortfall,owned:sold&&!supply(offer.reward)&&offer.limit===1,canBuy:!locked&&!sold&&shortfall===0};
 });
 const categoryEntries=entries.filter(({offer})=>filter==='all'||supply(offer.reward)===(filter==='supplies'));
 const available=categoryEntries.filter(row=>row.canBuy).length;
 const visible=categoryEntries.filter(row=>!affordableOnly||row.canBuy);
 return <View style={s.stack}>
  <View style={s.toolbar}><View style={s.categories}><BoardTabs compact items={FILTERS} value={filter} label="Shop categories" onChange={next=>{setFilter(next);setSelected(null)}}/></View><Pressable accessibilityRole="checkbox" aria-checked={affordableOnly} accessibilityState={{checked:affordableOnly}} accessibilityLabel={`Show offers I can afford · ${available} available`} onPress={()=>{setAffordableOnly(value=>!value);setSelected(null)}} style={({pressed})=>[s.affordable,{borderColor:affordableOnly?C.selectionLine:C.line,backgroundColor:affordableOnly?C.selection:C.panel},pressed&&s.pressed]}><Text style={[s.meta,{color:affordableOnly?C.text:C.muted}]}>{affordableOnly?'✓ ':''}Can afford</Text></Pressable></View>
  <Text accessibilityLiveRegion="polite" style={[s.meta,{color:C.muted}]}>{visible.length} offers{affordableOnly?' · affordable':''}</Text>
  <View style={[s.offers,twoColumns&&s.offersGrid]}>{visible.map(({offer,left,locked,sold,balance,shortfall,owned})=>{
   const name=offer.currency==='common'?definition.currencyName:definition.prestigeCurrencyName,icon=offer.currency==='common'?visuals.commonCurrencyIcon:visuals.prestigeCurrencyIcon,expanded=selected===offer.id;
   const unavailable=sold?(owned?'Owned':'Sold out'):locked?`Level ${offer.minLevel}+ required`:shortfall?`Need ${shortfall.toLocaleString()} more ${name}`:null;
   return <View key={offer.id} style={[s.offer,twoColumns&&s.offerHalf,{borderColor:expanded?C.selectionLine:C.line,backgroundColor:C.panel}]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${expanded?'Close':'Inspect'} ${offer.reward.name}`} aria-expanded={expanded} accessibilityState={{expanded}} onPress={()=>setSelected(expanded?null:offer.id)} style={({pressed})=>[s.row,twoColumns&&s.rowCompact,pressed&&s.pressed]}>
     <View style={[s.art,{backgroundColor:C.panel2,borderColor:C.line}]}><RewardArt reward={offer.reward} definition={definition} size={52}/></View>
     <View style={[s.flex,twoColumns&&s.compactInfo]}><Text style={[s.eyebrow,{color:eventRewardRarity[offer.reward.rarity]}]}>{offer.reward.rarity.toUpperCase()}</Text><Text numberOfLines={2} style={[s.title,twoColumns&&s.compactTitle,{color:C.text}]}>{offer.reward.name}</Text>{!twoColumns?<Text style={[s.meta,{color:C.muted}]}>{kindLabel(offer.reward)} · {owned?'Owned':`${left} / ${offer.limit} left`}</Text>:null}<View style={s.price}>{icon?<Image accessible={false} source={icon} style={s.currency}/>:null}<Text numberOfLines={1} style={[s.copy,twoColumns&&s.compactCost,{color:sold?C.muted:C.text,flexShrink:1}]}>{offer.cost.toLocaleString()}{twoColumns?'':' '+name}</Text></View></View>
     <Text style={[s.inspect,twoColumns&&s.inspectCompact,{color:expanded?C.accent:C.muted}]}>{expanded?'Selected':'Details'}</Text>
    </Pressable>
    {unavailable&&!owned?<Text numberOfLines={1} style={[s.availability,{color:sold?C.muted:C.warning}]}>{unavailable}</Text>:null}
    
   </View>;
  })}</View>
  <GameModalSurface visible={selected!==null} presentation="sheet" reduceMotion={state.settings.reduceMotion} onClose={()=>setSelected(null)}>
  {selected?visible.filter(({offer})=>offer.id===selected).map(({offer,left,locked,sold,balance,shortfall,owned})=>{
   const name=offer.currency==='common'?definition.currencyName:definition.prestigeCurrencyName;
   const unavailable=sold?(owned?'Owned':'Sold out'):locked?'Level '+offer.minLevel+'+ required':shortfall?'Need '+shortfall.toLocaleString()+' more '+name:null;
   return <View key={offer.id} style={s.detailShell}><GameModalHeader eyebrow={kindLabel(offer.reward).toUpperCase()} title={offer.reward.name} onClose={()=>setSelected(null)}/><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalBody}><View style={[s.detail,{borderColor:C.selectionLine,backgroundColor:C.panel}]}>
     {offer.reward.kind==='background'&&state.character?<ProfileScenePreview state={state} backgroundId={offer.reward.id}/>:null}
     <View style={s.preview}>{offer.reward.kind!=='background'?<RewardArt reward={offer.reward} definition={definition} size={92}/>:null}<View style={s.flex}><Text style={[s.eyebrow,{color:C.info}]}>{offer.reward.rarity.toUpperCase()} · {kindLabel(offer.reward).toUpperCase()}</Text><Text style={[s.copy,{color:C.text}]}>{description(offer.reward,definition)}</Text></View></View>
     {owned?<Text style={[s.copy,{color:C.good}]}>Permanently unlocked on your account.</Text>:<View style={[s.balanceReview,{backgroundColor:C.panel2}]}><Text style={[s.meta,{color:C.muted}]}>{name}</Text><View style={s.balanceNumbers}><View style={s.flex}><Text style={[s.meta,{color:C.muted}]}>Balance</Text><Text style={[s.amount,{color:C.text}]}>{balance.toLocaleString()}</Text></View><View style={s.flex}><Text style={[s.meta,{color:C.muted}]}>Cost</Text><Text style={[s.amount,{color:C.text}]}>{offer.cost.toLocaleString()}</Text></View><View style={s.flex}><Text style={[s.meta,{color:C.muted}]}>{shortfall?'Missing':'After'}</Text><Text style={[s.amount,{color:shortfall?C.warning:C.good}]}>{(shortfall||balance-offer.cost).toLocaleString()}</Text></View></View></View>}
     <GameButton title={pendingId===offer.id?'Purchasing…':owned?'Owned':sold?'Sold out':locked?`Level ${offer.minLevel}+ required`:`Buy · ${offer.cost.toLocaleString()} ${name}`} disabled={busy||!!unavailable} loading={pendingId===offer.id} onPress={()=>onBuy(offer)}/>
    </View></ScrollView></View>;
  }):null}
  </GameModalSurface>
  {!visible.length?<View style={[s.empty,{borderColor:C.line,backgroundColor:C.panel}]}><Text style={[s.title,{color:C.text}]}>{affordableOnly?'No affordable offers':'No offers in this category'}</Text><Text style={[s.copy,{color:C.muted}]}>{affordableOnly?'Earn more event currency or browse all offers to plan your next unlock.':'Try another category.'}</Text>{affordableOnly?<GameButton title="Show all offers" tone="secondary" onPress={()=>setAffordableOnly(false)}/>:null}</View>:null}
 </View>;
}
const s=StyleSheet.create({offers:{gap:10},offersGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},offerHalf:{width:'48.5%',height:224},rowCompact:{flexDirection:'column',alignItems:'center',minHeight:185,gap:6,padding:10},inspectCompact:{alignSelf:'center',width:'auto'},toolbar:{flexDirection:'row',alignItems:'stretch',flexWrap:'wrap',gap:6},categories:{flex:1,minWidth:180},affordable:{minHeight:44,paddingHorizontal:8,justifyContent:'center',borderWidth:1,borderRadius:8},balanceReview:{padding:10,borderRadius:8,gap:7},balanceNumbers:{flexDirection:'row',gap:10},amount:{fontSize:16,lineHeight:22,fontWeight:'600'},empty:{padding:16,gap:10,borderWidth:1,borderRadius:10},stack:{gap:10},offer:{borderWidth:1,borderRadius:10,overflow:'hidden'},row:{flexDirection:'row',alignItems:'center',gap:12,padding:12,minHeight:96},flex:{flex:1,minWidth:0,gap:3},art:{width:58,height:58,flexShrink:0,borderWidth:1,borderRadius:8,alignItems:'center',justifyContent:'center',overflow:'hidden'},title:{fontSize:15,lineHeight:20,fontWeight:'700'},copy:{fontSize:13,lineHeight:19},meta:{fontSize:12,lineHeight:17},price:{flexDirection:'row',alignItems:'center',gap:5,marginTop:3},currency:{width:18,height:18},inspect:{fontSize:12,lineHeight:17,width:44,textAlign:'center',fontWeight:'600'},availability:{fontSize:12,lineHeight:18,paddingHorizontal:12,paddingBottom:10},compactInfo:{width:'100%',alignItems:'center',gap:2},compactTitle:{fontSize:12,lineHeight:16,textAlign:'center',minHeight:32},compactCost:{fontWeight:'900',fontSize:15},modalBody:{gap:10,paddingTop:8,paddingBottom:20},detailShell:{flexShrink:1},detail:{borderWidth:1,borderRadius:12,padding:12,gap:12},preview:{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'},eyebrow:{fontSize:10,lineHeight:15,fontWeight:'700',letterSpacing:.6},pressed:{opacity:.76}});
