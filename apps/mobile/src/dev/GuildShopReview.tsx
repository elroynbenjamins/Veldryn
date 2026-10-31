import {useRef,useState} from 'react';
import {Text,View} from 'react-native';
import {GuildTokenShopView} from '../components/GuildTokenShopView';
import type {GuildTokenShopSnapshot,GuildTokenShopCategory,GuildTokenShopStatus} from '../online/guild-token-shop';
import {useGameTheme} from '../theme/ThemeContext';

// Local memory fixture: Metro's mobile boundary intentionally excludes backend packages.
const GUILD_SHOP_CATALOGUE:readonly {id:string;name:string;category:GuildTokenShopCategory;guildLevel:number;tokenCost:number}[]=[
 {id:'guild_pet_01',name:'Stormwatch Fox',category:'pet',guildLevel:3,tokenCost:2000},
 {id:'guild_pet_02',name:'Oathwood Wyrmling',category:'pet',guildLevel:7,tokenCost:4000},
 {id:'guild_companion_01',name:'Stormwatch Sentinel',category:'companion',guildLevel:10,tokenCost:6000},
 {id:'guild_companion_02',name:'Oathbound Seeker',category:'companion',guildLevel:15,tokenCost:8000},
 {id:'guild_companion_03',name:'Dawncall Herald',category:'companion',guildLevel:20,tokenCost:10000},
 {id:'border_silver',name:'Fellowship Silver',category:'border',guildLevel:2,tokenCost:750},
 {id:'icon_guild',name:'Stormwatch Crest',category:'profile_icon',guildLevel:4,tokenCost:1000},
 {id:'emotes_fellowship',name:'Fellowship',category:'emote_set',guildLevel:5,tokenCost:1250},
 {id:'border_emerald',name:'Verdant Covenant',category:'border',guildLevel:8,tokenCost:1500},
 {id:'emotes_adventure',name:'Adventure',category:'emote_set',guildLevel:10,tokenCost:1750},
 {id:'border_royal',name:'Royal Concord',category:'border',guildLevel:14,tokenCost:2000},
 {id:'emotes_legends',name:'Legends',category:'emote_set',guildLevel:18,tokenCost:2500},
];
const guildShopEligibility=(entry:typeof GUILD_SHOP_CATALOGUE[number],level:number,balance:number,owned:boolean):GuildTokenShopStatus=>owned?'owned':level<entry.guildLevel?'guild_level_locked':balance<entry.tokenCost?'insufficient_tokens':'eligible';

/** Isolated visual/interaction fixture. Never authenticates or sends online mutations. */
export function GuildShopReview({failure=false,poor=false}:{failure?:boolean;poor?:boolean}){
 const C=useGameTheme(),[pending,setPending]=useState<string|null>(null),[notice,setNotice]=useState(''),[error,setError]=useState(''),guard=useRef(false);
 const [snapshot,setSnapshot]=useState<GuildTokenShopSnapshot>(()=>({guildLevel:8,balance:poor?0:2400,earnedThisWeek:170,weeklyCap:250,claimedDailyKinds:[],constructionTemplates:[],construction:[],eventBonuses:[{eventId:'veilbreak',milestonePercent:25,tokens:100,claimed:false}],weeklyRewards:[{kind:'attendance',tokens:50,eligible:true,claimed:false},{kind:'project',tokens:40,eligible:false,claimed:false},{kind:'boss',tokens:30,eligible:false,claimed:false}],cards:GUILD_SHOP_CATALOGUE.map(entry=>({id:entry.id,title:entry.name,category:entry.category,requiredGuildLevel:entry.guildLevel,price:entry.tokenCost,released:true,status:guildShopEligibility(entry,8,poor?0:2400,entry.id==='border_silver'),progressToPrice:Math.min(1,(poor?0:2400)/entry.tokenCost)}))}));
 const transact=async(id:string,amount:number,weekly:boolean)=>{
  if(guard.current)return;
  guard.current=true;setPending(id);setError('');
  try{await new Promise(resolve=>setTimeout(resolve,250));if(failure){setError('Preview request rejected. Your balance is unchanged.');return}
   setSnapshot(old=>{
    const card=old.cards.find(row=>row.id===id);
    if(card&&(!card.released||card.status!=='eligible'))return old;
    const credited=amount>0&&weekly?Math.min(amount,old.weeklyCap-old.earnedThisWeek):amount;
    const balance=old.balance+credited;
    setNotice(card?'Reward unlocked for your account!':`+${credited} Guild Tokens earned!`);
    return {...old,balance,earnedThisWeek:old.earnedThisWeek+(weekly?Math.max(0,credited):0),claimedDailyKinds:id==='attendance'||id==='contribution'?[...old.claimedDailyKinds,id]:old.claimedDailyKinds,weeklyRewards:old.weeklyRewards.map(row=>`weekly:${row.kind}`===id?{...row,claimed:true}:row),eventBonuses:old.eventBonuses.map(row=>`event:${row.eventId}:${row.milestonePercent}`===id?{...row,claimed:true}:row),cards:old.cards.map((row,index)=>({...row,status:guildShopEligibility(GUILD_SHOP_CATALOGUE[index],old.guildLevel,balance,row.id===id||row.status==='owned'),progressToPrice:Math.min(1,balance/row.price)}))};
   });
  }finally{guard.current=false;setPending(null)}
 };
 return <View style={{gap:8}}><Text accessibilityLabel="Memory token balance" style={{fontSize:11,color:C.muted}}>MEMORY ONLY · balance {snapshot.balance}</Text><GuildTokenShopView snapshot={snapshot} loading={false} pending={pending} error={error} notice={notice} onRefresh={async()=>setError('')} onBuy={id=>transact(id,-(snapshot.cards.find(row=>row.id===id)?.price??0),false)} onDaily={kind=>transact(kind,10,true)} onWeekly={kind=>transact(`weekly:${kind}`,snapshot.weeklyRewards.find(row=>row.kind===kind)?.tokens??0,true)} onEvent={(id,percent)=>transact(`event:${id}:${percent}`,100,false)}/></View>;
}
