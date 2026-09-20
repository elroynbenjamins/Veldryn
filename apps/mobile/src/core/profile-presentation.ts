import type {GameState} from './types';
import type {ProfileCollectionRefV43,PublicPlayerProfileV43} from '../online/profile-extension-v43';
import {JOURNAL_ACHIEVEMENTS_V42} from './adventurers-journal-v42';
import {personalRecordDefinition} from './personal-records-v43';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {ITEMS} from '../content/items';
import {COLLECTIBLES} from '../content/collectibles';

const words=(value:string)=>value.replace(/^pet_|^bg_|^frame_/,'').replace(/[_:-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

export function formatProfileRecordValue(id:string,value:number){
 const def=personalRecordDefinition(id);
 if(!def)return Math.floor(value).toLocaleString();
 if(def.unit==='milliseconds'){const seconds=value/1000;return seconds>=60?Math.floor(seconds/60)+'m '+Math.round(seconds%60)+'s':seconds.toFixed(seconds<10?2:1)+'s';}
 if(def.unit==='seconds'){const h=Math.floor(value/3600),m=Math.floor((value%3600)/60);return h?h+'h '+m+'m':m?m+'m':Math.floor(value)+'s';}
 if(def.unit==='xp')return Math.floor(value).toLocaleString()+' XP';
 if(def.unit==='gold')return Math.floor(value).toLocaleString()+' Gold';
 return Math.floor(value).toLocaleString();
}

export function profileCollectionLabel(ref:ProfileCollectionRefV43){
 if(ref.kind==='companion')return COMBAT_COMPANIONS.find(row=>row.id===ref.id)?.name??words(ref.id);
 if(ref.kind==='item')return ITEMS.find(row=>row.id===ref.id)?.name??words(ref.id);
 if(ref.kind==='pet'||ref.kind==='background'||ref.kind==='border')return COLLECTIBLES.find(row=>row.id===ref.id)?.name??words(ref.id);
 return words(ref.id);
}

export function profileAchievementLabel(id:string){return JOURNAL_ACHIEVEMENTS_V42.find(row=>row.id===id)?.title??words(id)}
export function profileRecordLabel(id:string){return personalRecordDefinition(id)?.label??words(id)}

export function localProfileSummary(state:GameState){
 const skills=[...state.skills].sort((a,b)=>b.level-a.level||a.skillId.localeCompare(b.skillId));
 const achievements=Object.entries(state.account.journalState?.unlockedAchievements??{}).sort((a,b)=>b[1]-a[1]);
 const records=Object.entries(state.account.journalState?.records??{}).sort((a,b)=>b[1].achievedAtMs-a[1].achievedAtMs);
 const collectionOwned=(state.account.unlockedCosmeticPetIds?.length??0)+(state.account.unlockedProfileBackgroundIds?.length??0)+(state.account.unlockedProfileBorderIds?.length??0);
 const totalKills=state.account.longTermMetrics?.['combat.total_kills']??Object.values(state.character?.monsterMasteryPoints??{}).reduce((sum,value)=>sum+value,0);
 return {
  combinedSkillLevels:state.skills.reduce((sum,row)=>sum+row.level,0),
  highestSkill:skills[0],
  achievementCount:achievements.length,
  recordCount:records.length,
  collectionOwned,
  companionOwned:state.account.unlockedCombatCompanionIds?.length??0,
  bossesDefeated:state.defeatedBossIds.length,
  totalKills,
  recentAchievementIds:achievements.slice(0,3).map(([id])=>id),
  recentRecordIds:records.slice(0,3).map(([id])=>id),
 };
}

export function profileAchievementShowcase(state:GameState,profile?:PublicPlayerProfileV43|null){
 if(profile?.achievementShowcaseIds.length)return profile.achievementShowcaseIds;
 return localProfileSummary(state).recentAchievementIds;
}

export function profileRecordShowcase(state:GameState,profile?:PublicPlayerProfileV43|null){
 if(profile?.recordShowcaseIds.length)return profile.recordShowcaseIds;
 return localProfileSummary(state).recentRecordIds;
}

export function profileCollectionShowcase(state:GameState,profile?:PublicPlayerProfileV43|null):ProfileCollectionRefV43[]{
 if(profile?.collectionShowcase.length)return profile.collectionShowcase;
 const rows:ProfileCollectionRefV43[]=[];
 const add=(kind:ProfileCollectionRefV43['kind'],id?:string)=>{if(id&&!rows.some(row=>row.kind===kind&&row.id===id))rows.push({kind,id})};
 add('pet',state.character?.selectedCosmeticPetId);
 add('background',state.character?.profileBackgroundId);
 add('border',state.character?.profileBorderId);
 for(const id of state.account.unlockedCombatCompanionIds??[]){add('companion',id);if(rows.length>=3)break;}
 return rows.slice(0,3);
}
