import {useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../../theme/ThemeContext';
import {type ThemeColors,radii,spacing,typography} from '../../theme/theme';
import {ExpeditionMarkIcon} from '../ExpeditionMarkIcon';
import {GameButton} from '../GameButton';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import {formatLocalizedNumber} from '../../i18n/translator';
import {dungeonShopText,dungeonShopOfferName,dungeonShopOfferSummary,dungeonShopLockReason} from '../../i18n/dungeon-shop';

import type {DungeonMarksShopSnapshot} from '../../core/dungeon-marks-shop-types';
export type {DungeonMarksShopSnapshot,DungeonMarksShopCard,DungeonMarksShopItemStatus} from '../../core/dungeon-marks-shop-types';

type Shelf='Supplies'|'Collections'|'Owned';

/**
 * Hidden, reusable Dungeon Marks Shop presentation. Deliberately not mounted in
 * navigation until the server-only atomic purchasing + collectible grants ship.
 * The temporary dungeon room Merchant remains an unrelated resource system.
 */
export function DungeonMarksShopView({snapshot,onPurchase,onRefresh,busy=false}:{
 snapshot:DungeonMarksShopSnapshot|null;
 onPurchase?:(offerId:string)=>Promise<'purchased'|'already_owned'>;
 onRefresh?:()=>Promise<unknown>|void;
 busy?:boolean;
}){
 const C=useGameTheme(),s=makeStyles(C);
 const language=useGameLanguage();
 const t=(source:string,params:Record<string,string|number>={})=>dungeonShopText(language,source,params);
 const [shelf,setShelf]=useState<Shelf>('Supplies');
 const [selected,setSelected]=useState<string|null>(null);
 const [pending,setPending]=useState<string|null>(null);
 const [refreshing,setRefreshing]=useState(false);
 const requestLock=useRef(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const refresh=async()=>{
  if(requestLock.current||!onRefresh||busy||pending||refreshing)return;
  requestLock.current=true;setRefreshing(true);setError('');
  try{await onRefresh()}
  catch{setError(t('Unable to refresh the Dungeon Shop. Please retry.'));}
  finally{requestLock.current=false;setRefreshing(false)}
 };
 const purchase=async(id:string)=>{
  if(requestLock.current||!snapshot?.shopEnabled||!onPurchase||pending||busy)return;
  requestLock.current=true;setPending(id);setError('');setNotice('');
  try{
   const status=await onPurchase(id);
   setNotice(t(status==='purchased'?'Purchase confirmed. Refresh to view your balance and reward.':'Already owned. No Marks spent.'));
   setSelected(null);
   try{await onRefresh?.()}
   catch{setError(t('Purchase confirmed, but refresh failed. Reopen the shop to synchronize your account.'));}
  }catch(cause){
   setError(cause instanceof Error?cause.message:t('Unable to confirm purchase. Refresh before retrying.'));
  }finally{requestLock.current=false;setPending(null)}
 };
 const items=(snapshot?.offers??[]).filter(item=>
  shelf==='Owned'?item.owned||item.status==='already_owned':
  shelf==='Supplies'?item.category==='supply'||item.category==='companion':
  !['supply','companion'].includes(item.category)
 );
 return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <View style={s.wallet}>
   <ExpeditionMarkIcon size={34}/>
   <View style={s.fill}>
    <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85} style={s.walletAmount}>{snapshot?formatLocalizedNumber(language,snapshot.balance):'—'} {t('Expedition Marks')}</Text>
    <Text style={s.meta}>{t(snapshot?'Permanent account currency':'Shop not available yet')}</Text>
   </View>
   {onRefresh?<GameButton compact title={t("Refresh")} tone="secondary" loading={refreshing} disabled={busy||pending!==null||refreshing} onPress={()=>void refresh()}/>:null}
  </View>
  <Text style={s.meta}>{t('Weekly supplies reset Monday 00:00 UTC. Permanent collectibles do not rotate.')}</Text>
  <View accessibilityRole="tablist" style={s.tabs}>
   {(['Supplies','Collections','Owned'] as const).map(tab=><Pressable key={tab} accessibilityRole="tab"
    accessibilityState={{selected:shelf===tab,disabled:busy||!!pending||refreshing}} disabled={busy||!!pending||refreshing} onPress={()=>{setShelf(tab);setSelected(null)}}
    style={[s.tab,shelf===tab&&s.selectedTab]}><Text style={[s.tabLabel,shelf===tab&&s.activeLabel]}>{t(tab)}</Text></Pressable>)}
  </View>
  {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
  {notice?<Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>:null}
  {!snapshot?<Text style={s.meta}>{t('The server has not supplied a verified Dungeon Shop catalogue.')}</Text>:null}
  {snapshot&&!snapshot.shopEnabled?<Text style={s.meta}>{t('Dungeon Shop is being prepared. Purchases are unavailable.')}</Text>:null}
  {items.map(item=>{
   const expanded=selected===item.id;
   const offerEligible=!!snapshot?.shopEnabled&&item.status==='eligible'&&!!onPurchase;
   const statusSource=pending===item.id?'Processing purchase':item.owned||item.status==='already_owned'?'Owned'
    :!snapshot?.shopEnabled?'Not available yet':item.status==='eligible'?(onPurchase?'Available':'Preview only')
    :item.status==='insufficient_marks'?'Need more Marks':item.status==='region_locked'?'Region locked'
    :item.status==='weekly_limit'?'Weekly limit reached':'Coming soon';
   const offerStatus=t(statusSource);
   const localizedName=dungeonShopOfferName(language,item.id,item.name);
   const localizedMarks=formatLocalizedNumber(language,item.marks);
   const canPurchase=offerEligible&&!busy&&!pending&&!refreshing;
   return <View key={item.id} style={[s.card,expanded&&s.cardSelected]}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('{name}, {marks} Expedition Marks, {status}',{name:localizedName,marks:localizedMarks,status:offerStatus})} accessibilityState={{expanded,disabled:busy||!!pending||refreshing}}
     disabled={busy||!!pending||refreshing} onPress={()=>setSelected(expanded?null:item.id)} style={s.itemHead}>
     <View style={s.art}><Text style={s.artGlyph}>◇</Text></View>
     <View style={s.fill}>
      <Text numberOfLines={2} style={s.title}>{localizedName}</Text>
      <Text style={[s.offerStatus,{color:offerEligible?C.good:C.muted}]}>{offerStatus}</Text>
      <Text style={s.meta}>{[item.rarity,item.region,item.category].filter(Boolean).map(label=>t(label!)).join(' · ')}</Text>
      <View style={s.price}><ExpeditionMarkIcon size={16}/><Text style={s.priceText}>{localizedMarks}</Text></View>
     </View>
     <Text style={s.chevron}>{expanded?'−':'+'}</Text>
    </Pressable>
    {expanded?<View style={s.detail}>
     <Text style={s.description}>{dungeonShopOfferSummary(language,item.summary)}</Text>
     {item.remainingThisUtcWeek!==undefined&&item.remainingThisUtcWeek!==null?
      <Text style={s.meta}>{t('{count} purchases left this UTC week',{count:formatLocalizedNumber(language,item.remainingThisUtcWeek)})}</Text>:null}
     {item.status==='already_owned'||item.owned?<Text style={s.owned}>{t('Owned permanently')}</Text>:null}
     {item.lockReason?<Text style={s.meta}>{dungeonShopLockReason(language,item.lockReason)}</Text>:null}
     {offerEligible?<GameButton title={pending===item.id?t('Processing…'):t('Confirm purchase · {marks} Marks',{marks:localizedMarks})} loading={pending===item.id} disabled={!canPurchase} onPress={()=>void purchase(item.id)}/>:null}
     {!canPurchase&&item.status==='insufficient_marks'?<Text style={s.meta}>{t('Not enough Expedition Marks.')}</Text>:null}
    </View>:null}
   </View>;
  })}
  {snapshot&&items.length===0?<Text style={s.meta}>{t('No offers in this category yet.')}</Text>:null}
 </ScrollView>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:10,padding:spacing.md,paddingBottom:100},
 wallet:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:radii.md,borderWidth:1,borderColor:C.selectionLine,backgroundColor:C.panelRaised},
 fill:{flex:1,minWidth:0},walletAmount:{...typography.bodyStrong,color:C.text,fontSize:16},meta:{...typography.caption,color:C.muted,lineHeight:17},
 tabs:{flexDirection:'row',gap:6},tab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',padding:6,borderWidth:1,borderRadius:9,borderColor:C.line,backgroundColor:C.panel},
 selectedTab:{borderColor:C.selectionLine,backgroundColor:C.selection},tabLabel:{...typography.caption,color:C.muted,fontWeight:'800'},activeLabel:{color:C.text},
 card:{borderWidth:1,borderRadius:radii.md,borderColor:C.line,backgroundColor:C.panel,overflow:'hidden'},cardSelected:{borderColor:C.selectionLine},
 itemHead:{minHeight:70,flexDirection:'row',alignItems:'center',gap:11,padding:10},
 art:{width:48,height:48,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panelRaised,alignItems:'center',justifyContent:'center'},
 artGlyph:{color:C.accent,fontSize:25,fontWeight:'800'},
 title:{...typography.bodyStrong,color:C.text},
 price:{flexDirection:'row',alignItems:'center',gap:5,marginTop:3},priceText:{...typography.bodyStrong,color:C.accent},
 chevron:{fontSize:22,fontWeight:'700',color:C.muted,width:22,textAlign:'center'},
 detail:{borderTopWidth:1,borderTopColor:C.line,padding:12,gap:9},
 description:{...typography.body,color:C.text},
 offerStatus:{...typography.caption,fontWeight:'800'},
 owned:{...typography.caption,color:C.good,fontWeight:'800'},
 error:{...typography.caption,color:C.bad},notice:{...typography.caption,color:C.good},
});}
