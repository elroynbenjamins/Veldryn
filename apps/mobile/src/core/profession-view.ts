import type {GameState} from './types';
import {HERB_NODES} from '../content/herbalism';
import {ALCHEMY_RECIPES} from '../content/alchemy';
import {storedQuantity} from './alchemy';
import {currentRegionId} from './combat-region';
export function professionSkillView(state:GameState,skillId:string,_now=Date.now()){const skill=state.skills.find(s=>s.skillId===skillId),regionId=currentRegionId(state);const nodes=HERB_NODES.filter(n=>n.skillId===skillId).map(n=>({id:n.id,name:n.name,zoneId:n.zoneId,level:n.unlockLevel,ready:(skill?.level??1)>=n.unlockLevel&&n.zoneId===regionId}));const next=nodes.find(n=>!n.ready);return {skill,level:skill?.level??1,nodes,accountTotal:state.skills.reduce((n,s)=>n+s.level,0)+(state.character?.classSkills?.reduce((n,s)=>n+s.level,0)??0),nextUnlock:next?{level:next.level}:undefined,remainingXp:skill?.level===100?0:1};}
export function alchemyRecipeView(state:GameState,id:string,batches=1,_now=Date.now()){const recipe=ALCHEMY_RECIPES.find(r=>r.id===id);if(!recipe)return {inputs:[],totalSeconds:0,sources:[]};return {inputs:recipe.inputs.map(i=>({...i,quantity:i.quantity*batches,available:storedQuantity([...state.inventory.stacks,...state.bank.stacks],i.itemId)})),totalSeconds:recipe.seconds*batches,sources:[{nodes:HERB_NODES.filter(n=>recipe.inputs.some(i=>i.itemId===n.itemId)).map(n=>({id:n.id,name:n.name,zoneId:n.zoneId}))}]};}
