import {useState,type ReactNode} from 'react';
import {ActivityIndicator,Image,Pressable,StyleSheet,Text,View} from 'react-native';
import type {GuildTokenShopCard,GuildTokenShopSnapshot,GuildWeeklyRewardKind} from '../online/guild-token-shop';
import {useGameTheme} from '../theme/ThemeContext';
import {guildTokenIcon,guildTokenShopOfferArt} from '../theme/guild-token-shop-art';
import {GUILD_COMBAT_COMPANIONS} from '../content/guild-companions-v1';
import {BoardTabs} from './BoardTabs';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {OnlineGuildConstructionPanel} from './OnlineGuildConstructionPanel';
import {OnlineGuildBankPanel} from './OnlineGuildBankPanel';

type Section='Browse'|'Earn'|'Projects';
type Category='all'|'pet'|'companion'|'identity';
const CATEGORIES=[{id:'all',label:'All'},{id:'pet',label:'Pets'},{id:'companion',label:'Companions'},{id:'identity',label:'Identity'}] as const;
const DETAILS:Record<string,{name:string;description:string}>={
 guild_pet_01:{name:'Stormwatch Fox',description:'A permanent guild pet. Equip it from your Pet collection.'},
 guild_pet_02:{name:'Oathwood Wyrmling',description:'A permanent guild pet. Equip it from your Pet collection.'},
 border_silver:{name:'Fellowship Silver',description:'A silver profile border. Equip it in profile customization.'},
 border_emerald:{name:'Verdant Covenant',description:'A verdant profile border. Equip it in profile customization.'},
 border_royal:{name:'Royal Concord',description:'A royal profile border. Equip it in profile customization.'},
 icon_guild:{name:'Stormwatch Crest',description:'A permanent profile icon celebrating guild fellowship.'},
 emotes_fellowship:{name:'Fellowship',description:'Five permanent emotes. Use them in the chat emote picker.'},
 emotes_adventure:{name:'Adventure',description:'Five permanent emotes. Use them in the chat emote picker.'},
 emotes_legends:{name:'Legends',description:'Five permanent emotes. Use them in the chat emote picker.'},
};
function details(card:GuildTokenShopCard){
 const ids:Record<string,string>={guild_companion_01:'GUILD_UNIT_001',guild_companion_02:'GUILD_UNIT_002',guild_companion_03:'GUILD_UNIT_003'};
 const companion=GUILD_COMBAT_COMPANIONS.find(row=>row.id===ids[card.id]);
 return companion?{name:companion.name,description:companion.description,kind:`Elite companion · ${companion.role.charAt(0).toUpperCase()+companion.role.slice(1)}`,ability:companion.activeAbility.name}:{...(DETAILS[card.id]??{name:card.title,description:'Permanent account reward.'}),kind:{pet:'Pet',companion:'Companion',border:'Profile border',profile_icon:'Profile icon',emote_set:'5 emotes'}[card.category],ability:undefined};
}
export interface GuildTokenShopViewProps{
 snapshot:GuildTokenShopSnapshot|null;loading:boolean;pending:string|null;error:string;notice:string;
 onRefresh:()=>Promise<unknown>;onBuy:(id:string)=>Promise<unknown>;
 onDaily:(kind:'attendance'|'contribution')=>Promise<unknown>;onWeekly:(kind:GuildWeeklyRewardKind)=>Promise<unknown>;
 onEvent:(eventId:string,percent:number)=>Promise<unknown>;onRewardsChanged?:()=>void|Promise<unknown>;constructionContent?:ReactNode;
}
/** Presentation-only. The authenticated server settles every claim and purchase. */
export function GuildTokenShopView({snapshot,loading,pending,error,notice,onRefresh,onBuy,onDaily,onWeekly,onEvent,onRewardsChanged,constructionContent}:GuildTokenShopViewProps){
 const C=useGameTheme(),[section,setSection]=useState<Section>('Browse'),[category,setCategory]=useState<Category>('all');
 const [selected,setSelected]=useState<string|null>(null),[affordable,setAffordable]=useState(false),[hideOwned,setHideOwned]=useState(false);
 const refreshBusy=loading||pending!==null,busy=refreshBusy||!!error,spendBlocked=busy,capReached=!!snapshot&&snapshot.earnedThisWeek>=snapshot.weeklyCap;
 const eligible=(card:GuildTokenShopCard)=>card.released&&card.status==='eligible';
 const categoryCards=snapshot?.cards.filter(card=>category==='all'||category==='identity'&&!['pet','companion'].includes(card.category)||card.category===category)??[];
 const visible=categoryCards.filter(card=>(!affordable||eligible(card))&&(!hideOwned||card.status!=='owned'));
 const text={color:C.text},muted={color:C.muted};
 return <View style={s.stack}>
  <View style={[s.wallet,{backgroundColor:C.panel,borderColor:C.line}]}>
   <Image accessible={false} source={guildTokenIcon} style={s.token}/>
   <View style={s.flex}><Text style={[s.walletAmount,text]}>{snapshot?snapshot.balance.toLocaleString():'—'} Guild Tokens</Text><Text style={[s.meta,muted]}>{snapshot?`${snapshot.earnedThisWeek} / ${snapshot.weeklyCap} earned this week`:'Permanent account rewards'}</Text><View style={[s.track,{backgroundColor:C.panel2}]}><View style={{height:4,width:`${snapshot?Math.min(100,snapshot.earnedThisWeek/Math.max(1,snapshot.weeklyCap)*100):0}%`,backgroundColor:C.good}}/></View></View>
   {loading?<ActivityIndicator color={C.accent}/>:<Pressable accessibilityRole="button" accessibilityLabel="Refresh Guild Token Shop" accessibilityState={{disabled:refreshBusy}} disabled={refreshBusy} onPress={()=>void onRefresh()} style={s.refresh}><Text style={[s.copy,{color:C.accent}]}>↻</Text></Pressable>}
  </View>
  <BoardTabs compact label="Guild Token Shop sections" items={(['Browse','Earn','Projects'] as const).map(id=>({id,label:id}))} value={section} onChange={value=>{setSection(value);setSelected(null)}}/>
  {!!notice&&<Text accessibilityLiveRegion="polite" style={[s.feedback,{color:C.good,backgroundColor:C.goodSurface}]}>{notice}</Text>}
  {!!error&&<View style={[s.feedback,{backgroundColor:C.badSurface}]}><Text accessibilityRole="alert" style={[s.copy,{color:C.bad}]}>{error}</Text><GameButton compact tone="secondary" title="Retry refresh" disabled={refreshBusy} onPress={onRefresh}/></View>}
  {!snapshot&&!loading&&!error?<Panel><Text style={[s.title,text]}>Join a guild to browse its rewards</Text><Text style={[s.copy,muted]}>Your Guild Tokens and purchased rewards stay with your account when you change guilds.</Text></Panel>:null}
  {section==='Browse'&&snapshot?<>
   <BoardTabs compact label="Guild reward categories" items={CATEGORIES} value={category} onChange={value=>{setCategory(value);setSelected(null)}}/>
   <View style={s.toolbar}><Text accessibilityLiveRegion="polite" style={[s.meta,muted]}>{visible.length} rewards</Text><View style={s.toggles}>{[{label:'Can afford',value:affordable,toggle:()=>setAffordable(!affordable)},{label:'Hide owned',value:hideOwned,toggle:()=>setHideOwned(!hideOwned)}].map(toggle=><Pressable key={toggle.label} accessibilityRole="checkbox" aria-checked={toggle.value} accessibilityState={{checked:toggle.value}} onPress={()=>{toggle.toggle();setSelected(null)}} style={[s.toggle,{borderColor:toggle.value?C.selectionLine:C.line,backgroundColor:toggle.value?C.selection:C.panel}]}><Text style={[s.meta,toggle.value?text:muted]}>{toggle.value?'✓ ':''}{toggle.label}</Text></Pressable>)}</View></View>
   {visible.map(card=>{
    const reward=details(card),art=guildTokenShopOfferArt(card.id),expanded=selected===card.id,owned=card.status==='owned',shortfall=Math.max(0,card.price-snapshot.balance);
    const lock=owned?'Owned':!card.released?'Coming soon':card.status==='guild_level_locked'?`Guild Level ${card.requiredGuildLevel} required`:shortfall?`Need ${shortfall.toLocaleString()} more Guild Tokens`:null;
    return <View key={card.id} style={[s.offer,{backgroundColor:C.panel,borderColor:expanded?C.selectionLine:C.line}]}>
     <Pressable accessibilityRole="button" accessibilityLabel={`${expanded?'Close':'Inspect'} ${reward.name}`} accessibilityState={{expanded}} aria-expanded={expanded} onPress={()=>setSelected(expanded?null:card.id)} style={s.rewardRow}>
      <View style={[s.art,{backgroundColor:C.panel2,borderColor:C.line}]}>{art?<Image accessible={false} source={art} resizeMode="contain" style={s.rewardArt}/>:null}</View><View style={s.flex}><Text style={[s.title,text]}>{reward.name}</Text><Text style={[s.meta,muted]}>{reward.kind} · Guild Lv {card.requiredGuildLevel}</Text><View style={s.price}><Image accessible={false} source={guildTokenIcon} style={s.coin}/><Text style={[s.copy,text]}>{card.price.toLocaleString()} Guild Tokens</Text></View></View><Text style={[s.inspect,muted]}>{expanded?'Close':'Inspect'}</Text>
     </Pressable>
     {!!lock&&<Text style={[s.availability,{color:owned?C.good:C.warning}]}>{owned?'✓ ':''}{lock}{card.requiredGuildLevel>10&&!owned?' · Future guild progression':''}</Text>}
     {expanded?<View style={[s.review,{borderTopColor:C.line}]}><Text style={[s.copy,text]}>{reward.description}</Text>{reward.ability?<Text style={[s.meta,{color:C.info}]}>Signature · {reward.ability}</Text>:null}<Text style={[s.meta,muted]}>Permanent account unlock · One purchase</Text>
      {!owned?<><View style={[s.numbers,{backgroundColor:C.panel2}]}>{[{label:'Balance',amount:snapshot.balance},{label:'Cost',amount:card.price},{label:shortfall?'Missing':'After',amount:shortfall||snapshot.balance-card.price}].map((item,index)=><View key={item.label} style={s.flex}><Text style={[s.meta,muted]}>{item.label}</Text><Text style={[s.amount,{color:index===2?(shortfall?C.warning:C.good):C.text}]}>{item.amount.toLocaleString()}</Text></View>)}</View><GameButton title={pending===card.id?'Purchasing…':lock??`Unlock for ${card.price.toLocaleString()} Guild Tokens`} disabled={spendBlocked||!eligible(card)} loading={pending===card.id} onPress={()=>onBuy(card.id)}/></>:<Text style={[s.copy,{color:C.good}]}>Unlocked for your account. No further purchase needed.</Text>}
     </View>:null}
    </View>;
   })}
   {!visible.length?<Panel><Text style={[s.title,text]}>No matching rewards</Text><Text style={[s.copy,muted]}>Adjust the filters to plan your next unlock.</Text><GameButton title="Reset filters" tone="secondary" onPress={()=>{setAffordable(false);setHideOwned(false);setCategory('all')}}/></Panel>:null}
   <Text style={[s.meta,muted]}>Permanent account unlocks. Rewards above Guild Level 10 remain locked until future guild progression.</Text>
  </>:null}
  {section==='Earn'&&snapshot?<>
   <Panel><Text style={[s.title,text]}>Daily Muster</Text><Text style={[s.copy,muted]}>Check in and contribute through Guild Muster. Each verified reward can be claimed once per UTC day.</Text>{(['attendance','contribution'] as const).map(kind=>{const claimed=snapshot.claimedDailyKinds.includes(kind);return <GameButton key={kind} tone="secondary" title={claimed?'✓ '+(kind==='attendance'?'Check-in claimed':'Activity claimed'):capReached?'Weekly cap reached':kind==='attendance'?'Claim 10 · Check-in':'Claim 10 · Activity'} loading={pending===kind} disabled={busy||claimed||capReached} onPress={()=>onDaily(kind)}/>})}</Panel>
   <Panel><Text style={[s.title,text]}>Earn together</Text><Text style={[s.copy,muted]}>Daily and weekly rewards count toward your {snapshot.weeklyCap}-token weekly earning cap.</Text>{snapshot.weeklyRewards.map(reward=><View key={reward.kind} style={[s.earningRow,{borderTopColor:C.line}]}><View style={s.flex}><Text style={[s.title,text]}>{reward.kind==='attendance'?'Four-day participation':reward.kind==='project'?'Guild Project contribution':'Guild Boss reward'}</Text><Text style={[s.meta,muted]}>+{reward.tokens} Guild Tokens · {reward.claimed?'Claimed':reward.eligible?'Ready to claim':'In progress'}</Text></View><GameButton compact tone="secondary" title={reward.claimed?'Claimed':capReached?'Cap reached':'Claim'} loading={pending===`weekly:${reward.kind}`} disabled={busy||reward.claimed||!reward.eligible||capReached} onPress={()=>onWeekly(reward.kind)}/></View>)}</Panel>
   {!!snapshot.eventBonuses.length&&<Panel><Text style={[s.title,text]}>Event bonuses</Text><Text style={[s.copy,muted]}>Earned community milestones award extra tokens outside the normal weekly cap.</Text>{snapshot.eventBonuses.map(reward=><View key={`${reward.eventId}:${reward.milestonePercent}`} style={[s.earningRow,{borderTopColor:C.line}]}><View style={s.flex}><Text style={[s.title,text]}>{reward.eventId.replace(/[_-]/g,' ')} · {reward.milestonePercent}%</Text><Text style={[s.meta,muted]}>+{reward.tokens} Guild Tokens</Text></View><GameButton compact tone="secondary" title={reward.claimed?'Claimed':'Claim'} loading={pending===`event:${reward.eventId}:${reward.milestonePercent}`} disabled={busy||reward.claimed} onPress={()=>onEvent(reward.eventId,reward.milestonePercent)}/></View>)}</Panel>}
   <Text style={[s.copy,muted]}>Your balance remains yours when changing guilds. Guild Tokens are separate from the Quartermaster’s Guild Marks.</Text>
  </>:null}
  {section==='Projects'&&snapshot?<View style={s.stack}><OnlineGuildBankPanel snapshot={snapshot} onReload={onRefresh}/>{constructionContent??<OnlineGuildConstructionPanel snapshot={snapshot} onRewardsChanged={onRewardsChanged} onReload={onRefresh}/>}</View>:null}
 </View>;
}
const s=StyleSheet.create({stack:{gap:10},wallet:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:10,borderWidth:1},token:{width:32,height:32},flex:{flex:1,minWidth:0,gap:3},walletAmount:{fontSize:16,lineHeight:22,fontWeight:'700'},meta:{fontSize:12,lineHeight:17},track:{height:4,overflow:'hidden',borderRadius:3,marginTop:5},refresh:{minHeight:44,minWidth:44,alignItems:'center',justifyContent:'center'},toolbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:6},toggles:{flexDirection:'row',flexWrap:'wrap',gap:6},toggle:{minHeight:44,paddingHorizontal:9,borderRadius:8,borderWidth:1,justifyContent:'center'},offer:{borderWidth:1,borderRadius:10,overflow:'hidden'},rewardRow:{flexDirection:'row',alignItems:'center',gap:10,padding:12,minHeight:96},art:{width:58,height:58,borderWidth:1,borderRadius:8,alignItems:'center',justifyContent:'center'},rewardArt:{width:52,height:52},title:{fontSize:15,lineHeight:21,fontWeight:'700'},copy:{fontSize:13,lineHeight:19},price:{flexDirection:'row',alignItems:'center',gap:4},coin:{width:17,height:17},inspect:{fontSize:12,lineHeight:17,width:44,textAlign:'center'},availability:{fontSize:12,lineHeight:18,paddingHorizontal:12,paddingBottom:10},review:{padding:12,gap:12,borderTopWidth:1},preview:{flexDirection:'row',alignItems:'center',gap:10},previewArt:{width:72,height:72},numbers:{flexDirection:'row',gap:8,padding:10,borderRadius:8},amount:{fontSize:17,lineHeight:24,fontWeight:'600'},feedback:{padding:10,borderRadius:8,gap:8,fontSize:13,lineHeight:19},earningRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:12,borderTopWidth:1}});
