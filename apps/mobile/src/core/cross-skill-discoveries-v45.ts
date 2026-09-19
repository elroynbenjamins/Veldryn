export interface CrossSkillRequirement{skillId:string;skillName:string;level:number}
export interface CrossSkillReward{kind:'recipe_unlock'|'craft_option_unlock'|'knowledge_unlock'|'cosmetic_unlock';ref:string;label:string}
export interface CrossSkillDiscovery{ id:string;category:'production'|'gathering'|'combat'|'utility';name:string;description:string;requirements:CrossSkillRequirement[];reward:CrossSkillReward}
export interface CrossSkillState{schemaVersion:45;accountId:string;revision:number;unlockedByCharacter:Record<string,Record<string,number>>}
export interface CrossSkillSnapshot{skillLevels:Record<string,number>}

export const CROSS_SKILL_DISCOVERIES_V45:CrossSkillDiscovery[]=[
 {id:'ore_and_flame',category:'production',name:'Ore & Flame',description:'Mining and Smithing knowledge combine into better heat and alloy control.',requirements:[{skillId:'mining',skillName:'Mining',level:30},{skillId:'smithing',skillName:'Smithing',level:30}],reward:{kind:'craft_option_unlock',ref:'CRAFTOPT_ALLOY_TEMPERING',label:'Alloy Tempering'}},
 {id:'river_to_table',category:'production',name:'River to Table',description:'Fishing and Cooking together improve difficult-catch preparation.',requirements:[{skillId:'fishing',skillName:'Fishing',level:30},{skillId:'cooking',skillName:'Cooking',level:30}],reward:{kind:'knowledge_unlock',ref:'KNOWLEDGE_RIVER_TO_TABLE',label:'River-to-Table technique'}},
 {id:'forest_craft',category:'production',name:'Forest Craft',description:'Woodcutting and Smithing reveal stronger handles and utility fittings.',requirements:[{skillId:'woodcutting',skillName:'Woodcutting',level:35},{skillId:'smithing',skillName:'Smithing',level:35}],reward:{kind:'craft_option_unlock',ref:'CRAFTOPT_REINFORCED_HANDLES',label:'Reinforced Handles'}},
 {id:'stone_and_setting',category:'production',name:'Stone & Setting',description:'Mining and Enchanting reveal better gem-selection and fitting patterns.',requirements:[{skillId:'mining',skillName:'Mining',level:50},{skillId:'enchanting',skillName:'Enchanting',level:50}],reward:{kind:'craft_option_unlock',ref:'CRAFTOPT_GEM_SETTING',label:'Gem Setting'}},
 {id:'angler_artificer',category:'gathering',name:'Angler Artificer',description:'Fishing and Tailoring combine into specialized tackle work.',requirements:[{skillId:'fishing',skillName:'Fishing',level:55},{skillId:'tailoring',skillName:'Tailoring',level:55}],reward:{kind:'craft_option_unlock',ref:'CRAFTOPT_MASTER_TACKLE',label:'Master Tackle'}},
 {id:'smoke_and_timber',category:'production',name:'Smoke & Timber',description:'Woodcutting and Cooking reveal an advanced smoke-curing preparation.',requirements:[{skillId:'woodcutting',skillName:'Woodcutting',level:60},{skillId:'cooking',skillName:'Cooking',level:60}],reward:{kind:'craft_option_unlock',ref:'CRAFTOPT_SMOKEHOUSE_RACK',label:'Smokehouse Rack'}},
 {id:'master_of_materials',category:'production',name:'Master of Materials',description:'Deep gathering and forge knowledge unlocks the Material Codex.',requirements:[{skillId:'mining',skillName:'Mining',level:80},{skillId:'woodcutting',skillName:'Woodcutting',level:80},{skillId:'smithing',skillName:'Smithing',level:80}],reward:{kind:'knowledge_unlock',ref:'KNOWLEDGE_MATERIAL_CODEX',label:'Material Codex'}},
];
export function newCrossSkillState(accountId:string):CrossSkillState{if(!accountId)throw new Error('account_required');return {schemaVersion:45,accountId,revision:0,unlockedByCharacter:{}}}
export function crossSkillViews(state:CrossSkillState,characterId:string,snapshot:CrossSkillSnapshot){
 const unlocked=state.unlockedByCharacter[characterId]??{};
 return CROSS_SKILL_DISCOVERIES_V45.map(definition=>{const requirements=definition.requirements.map(r=>{const currentLevel=Math.max(0,Math.floor(snapshot.skillLevels[r.skillId]??0));return {...r,currentLevel,complete:currentLevel>=r.level,progress:Math.max(0,Math.min(1,currentLevel/r.level))}});return {definition,requirements,complete:requirements.every(r=>r.complete),unlocked:unlocked[definition.id]!==undefined,unlockedAtMs:unlocked[definition.id],progress:requirements.reduce((sum,r)=>sum+r.progress,0)/requirements.length}});
}
export function applyCrossSkillSnapshot(state:CrossSkillState,characterId:string,snapshot:CrossSkillSnapshot,nowMs:number){
 const unlocked=state.unlockedByCharacter[characterId]??(state.unlockedByCharacter[characterId]={}),grants:Array<{grantKey:string;discoveryId:string;reward:CrossSkillReward}>=[],newlyUnlockedDiscoveryIds:string[]=[];
 for(const row of crossSkillViews(state,characterId,snapshot)){if(!row.complete||unlocked[row.definition.id]!==undefined)continue;unlocked[row.definition.id]=nowMs;newlyUnlockedDiscoveryIds.push(row.definition.id);grants.push({grantKey:`cross-skill:${state.accountId}:${characterId}:${row.definition.id}`,discoveryId:row.definition.id,reward:row.definition.reward})}
 return {newlyUnlockedDiscoveryIds,grants};
}
