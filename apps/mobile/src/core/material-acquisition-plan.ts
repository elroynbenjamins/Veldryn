import {RECIPES,type Recipe} from '../content/skills';
import {itemDef} from '../content/items';
import type {GameState} from './types';
import {acquisitionProjectionForDestination,formatBalanceDuration} from './balance-projection';
import {isTimedProcessingRecipe} from './processing';
import {professionMasteryMultipliers} from './profession-mastery-v40';
import {characterPermanentMultipliers} from './permanent-boosts';
import {
  workingTowardDestinationAvailability,
  workingTowardItemSourceEntries,
  type WorkingTowardDestination,
  type WorkingTowardDestinationAvailability,
} from './working-toward';

export interface MaterialAcquisitionLeaf{
  itemId:string;
  name:string;
  quantity:number;
  sourceTypeLabel:string;
  sourceTitle:string;
  destination:WorkingTowardDestination;
  availability:WorkingTowardDestinationAvailability;
  etaSeconds?:number;
}

export interface MaterialAcquisitionCraftStep{
  recipeId:string;
  recipeName:string;
  batches:number;
  outputPerBatch:number;
  produced:number;
  excess:number;
  craftSeconds:number;
  gold:number;
}

export interface MaterialAcquisitionPlan{
  itemId:string;
  name:string;
  requested:number;
  ownedUsed:number;
  remaining:number;
  sourceTypeLabel:string;
  sourceTitle:string;
  destination?:WorkingTowardDestination;
  availability?:WorkingTowardDestinationAvailability;
  complete:boolean;
  etaSeconds?:number;
  knownEtaSeconds:number;
  totalGold:number;
  goldShortfall:number;
  craft?:MaterialAcquisitionCraftStep;
  craftSteps:number;
  depth:number;
  children:MaterialAcquisitionPlan[];
  leafNeeds:MaterialAcquisitionLeaf[];
  blockedReasons:string[];
}

type StockLedger=Map<string,number>;

function storedQuantity(state:GameState,itemId:string){
  return [...state.inventory.stacks,...state.bank.stacks]
    .filter(stack=>stack.itemId===itemId)
    .reduce((sum,stack)=>sum+stack.quantity,0);
}

function stockLedger(state:GameState){
  const ledger:StockLedger=new Map();
  for(const stack of [...state.inventory.stacks,...state.bank.stacks]){
    ledger.set(stack.itemId,(ledger.get(stack.itemId)??0)+stack.quantity);
  }
  return ledger;
}

function consumeOwned(ledger:StockLedger,itemId:string,quantity:number){
  const have=Math.max(0,ledger.get(itemId)??0),used=Math.min(have,Math.max(0,quantity));
  ledger.set(itemId,have-used);
  return used;
}

function addOwned(ledger:StockLedger,itemId:string,quantity:number){
  if(quantity<=0)return;
  ledger.set(itemId,(ledger.get(itemId)??0)+quantity);
}

function recipeForDestination(itemId:string,destination:WorkingTowardDestination):Recipe|undefined{
  if(destination.kind!=='skills'||!destination.recipeId)return undefined;
  return RECIPES.find(recipe=>recipe.id===destination.recipeId&&recipe.output.itemId===itemId);
}

function outputForBatches(state:GameState,recipe:Recipe,batches:number){
  const output=itemDef(recipe.output.itemId),eligible=output.type!=='gear'&&output.type!=='tool';
  const mastery=professionMasteryMultipliers(recipe.id,state.account.professionMasteryByAction?.[recipe.id]);
  const processing=isTimedProcessingRecipe(recipe.id);
  const remainderKey=`mastery:${processing?'processing':'craft'}:${recipe.id}:yield`;
  const remainder=Math.max(0,state.rewardRemainders?.[remainderKey]??0);
  return eligible?Math.floor(batches*recipe.output.quantity*mastery.yield+remainder+1e-10):batches*recipe.output.quantity;
}

function batchesForQuantity(state:GameState,recipe:Recipe,quantity:number){
  const target=Math.max(1,Math.ceil(quantity));
  const mastery=professionMasteryMultipliers(recipe.id,state.account.professionMasteryByAction?.[recipe.id]);
  const approximate=Math.max(1,Math.ceil(target/Math.max(.0001,recipe.output.quantity*mastery.yield)));
  let batches=approximate;
  while(outputForBatches(state,recipe,batches)<target&&batches<10000)batches++;
  return batches;
}

function craftSeconds(state:GameState,recipe:Recipe,batches:number){
  if(!isTimedProcessingRecipe(recipe.id))return 0;
  const mastery=professionMasteryMultipliers(recipe.id,state.account.professionMasteryByAction?.[recipe.id]);
  return Math.max(1,recipe.seconds/mastery.speed)*batches;
}

function ownedPlan(itemId:string,requested:number,ownedUsed:number):MaterialAcquisitionPlan{
  return {
    itemId,name:itemDef(itemId).name,requested,ownedUsed,remaining:0,
    sourceTypeLabel:'Owned',sourceTitle:'Inventory & Bank',
    complete:true,etaSeconds:0,knownEtaSeconds:0,totalGold:0,goldShortfall:0,
    craftSteps:0,depth:0,children:[],leafNeeds:[],blockedReasons:[],
  };
}

function unknownPlan(itemId:string,requested:number,ownedUsed:number,remaining:number,reason:string):MaterialAcquisitionPlan{
  return {
    itemId,name:itemDef(itemId).name,requested,ownedUsed,remaining,
    sourceTypeLabel:'Unknown',sourceTitle:'No modeled source',
    complete:false,knownEtaSeconds:0,totalGold:0,goldShortfall:0,
    craftSteps:0,depth:0,children:[],leafNeeds:[],blockedReasons:[reason],
  };
}

function planInternal(
  state:GameState,
  itemId:string,
  requested:number,
  preferredDestination:WorkingTowardDestination|undefined,
  ledger:StockLedger,
  consumeStock:boolean,
  visitedRecipes:Set<string>,
):MaterialAcquisitionPlan{
  const target=Math.max(0,requested),ownedUsed=consumeStock?consumeOwned(ledger,itemId,target):0,remaining=Math.max(0,target-ownedUsed);
  if(remaining<=0)return ownedPlan(itemId,target,ownedUsed);

  const entries=workingTowardItemSourceEntries(state,itemId);
  const entry=preferredDestination
    ?entries.find(row=>row.destination.kind===preferredDestination.kind&&(
      row.destination.kind==='skills'&&preferredDestination.kind==='skills'
        ?row.destination.recipeId===preferredDestination.recipeId&&row.destination.actionId===preferredDestination.actionId
        :row.destination.kind==='combat'&&preferredDestination.kind==='combat'
          ?row.destination.monsterId===preferredDestination.monsterId
          :row.destination.kind==='dungeon'&&preferredDestination.kind==='dungeon'
            ?row.destination.dungeonId===preferredDestination.dungeonId
            :true
    ))
    :entries[0];
  const destination=preferredDestination??entry?.destination;
  if(!destination)return unknownPlan(itemId,target,ownedUsed,remaining,'No direct or craftable source is currently modeled.');

  const availability=entry?.availability??workingTowardDestinationAvailability(state,destination);
  const sourceTypeLabel=entry?.typeLabel??(destination.kind==='combat'?'Monster Drop':destination.kind==='dungeon'?'Dungeon':destination.kind==='skills'&&destination.recipeId?'Crafting':destination.kind==='skills'?'Gathering':'Source');
  const sourceTitle=entry?.title??destination.button;
  const recipe=recipeForDestination(itemId,destination);

  if(!recipe){
    const projection=acquisitionProjectionForDestination(state,itemId,remaining,destination);
    const navigable=availability.status!=='locked'&&availability.status!=='info';
    const complete=Boolean(projection)&&navigable;
    const etaSeconds=complete?projection!.etaSeconds:undefined;
    const blockedReasons=[
      ...(!projection?['This source does not have a trustworthy acquisition-rate model yet.']:[]),
      ...(!navigable?[availability.detail]:[]),
    ];
    const leaf:MaterialAcquisitionLeaf={
      itemId,name:itemDef(itemId).name,quantity:remaining,sourceTypeLabel,sourceTitle,destination,availability,
      ...(projection?{etaSeconds:projection.etaSeconds}:{}),
    };
    return {
      itemId,name:itemDef(itemId).name,requested:target,ownedUsed,remaining,sourceTypeLabel,sourceTitle,destination,availability,
      complete,etaSeconds,knownEtaSeconds:projection?.etaSeconds??0,totalGold:0,goldShortfall:0,
      craftSteps:0,depth:0,children:[],leafNeeds:[leaf],blockedReasons,
    };
  }

  if(visitedRecipes.has(recipe.id)){
    return {
      ...unknownPlan(itemId,target,ownedUsed,remaining,`Recipe loop detected at ${recipe.name}.`),
      sourceTypeLabel:'Crafting',sourceTitle:recipe.name,destination,availability,
    };
  }

  const nextVisited=new Set(visitedRecipes);nextVisited.add(recipe.id);
  const batches=batchesForQuantity(state,recipe,remaining),produced=outputForBatches(state,recipe,batches),excess=Math.max(0,produced-remaining);
  const knowledgeLearned=!recipe.requiredKnowledgeId||(state.account.unlockedKnowledgeIds??[]).includes(recipe.requiredKnowledgeId);
  const knowledgeChildren=!knowledgeLearned&&recipe.knowledgeItemId
    ?[planInternal(state,recipe.knowledgeItemId,1,undefined,ledger,true,nextVisited)]
    :[];
  const children=[...knowledgeChildren,...recipe.inputs.map(input=>planInternal(state,input.itemId,input.quantity*batches,undefined,ledger,true,nextVisited))];
  addOwned(ledger,itemId,excess);

  const ownCraftSeconds=craftSeconds(state,recipe,batches),knownEtaSeconds=ownCraftSeconds+children.reduce((sum,child)=>sum+child.knownEtaSeconds,0);
  const totalGold=recipe.gold*batches+children.reduce((sum,child)=>sum+child.totalGold,0);
  const recipeUnlocked=availability.status!=='locked'&&availability.status!=='info';
  const prerequisiteReady=!recipe.requiresCraftedItemId||!!state.character?.craftedNoviceItemIds?.includes(recipe.requiresCraftedItemId);
  const childrenComplete=children.every(child=>child.complete);
  const complete=recipeUnlocked&&prerequisiteReady&&childrenComplete;
  const blockedReasons=[
    ...(!recipeUnlocked?[availability.detail]:[]),
    ...(!prerequisiteReady?[`Craft ${itemDef(recipe.requiresCraftedItemId!).name} first.`]:[]),
    ...children.flatMap(child=>child.blockedReasons),
  ];
  const depth=1+Math.max(0,...children.map(child=>child.depth)),craftSteps=1+children.reduce((sum,child)=>sum+child.craftSteps,0);
  return {
    itemId,name:itemDef(itemId).name,requested:target,ownedUsed,remaining,
    sourceTypeLabel:'Crafting',sourceTitle:recipe.name,destination,availability,
    complete,etaSeconds:complete?knownEtaSeconds:undefined,knownEtaSeconds,totalGold,goldShortfall:0,
    craft:{recipeId:recipe.id,recipeName:recipe.name,batches,outputPerBatch:recipe.output.quantity,produced,excess,craftSeconds:ownCraftSeconds,gold:recipe.gold*batches},
    craftSteps,depth,children,leafNeeds:children.flatMap(child=>child.leafNeeds),blockedReasons,
  };
}

function finalizeGold(state:GameState,plan:MaterialAcquisitionPlan):MaterialAcquisitionPlan{
  const goldShortfall=Math.max(0,plan.totalGold-(state.character?.gold??0));
  if(!goldShortfall)return plan;
  return {
    ...plan,
    complete:false,
    etaSeconds:undefined,
    goldShortfall,
    blockedReasons:[...plan.blockedReasons,`Need ${goldShortfall.toLocaleString()} more Gold for the crafting chain.`],
  };
}

export function materialAcquisitionPlanForDestination(
  state:GameState,
  itemId:string,
  quantity:number,
  destination:WorkingTowardDestination,
){
  return finalizeGold(state,planInternal(state,itemId,quantity,destination,stockLedger(state),false,new Set()));
}

export function materialAcquisitionPlan(state:GameState,itemId:string,quantity:number){
  const source=workingTowardItemSourceEntries(state,itemId)[0];
  if(!source)return finalizeGold(state,unknownPlan(itemId,quantity,0,quantity,'No modeled acquisition source is available.'));
  return materialAcquisitionPlanForDestination(state,itemId,quantity,source.destination);
}

function terminalNeeds(plan:MaterialAcquisitionPlan):Array<{itemId:string;name:string;quantity:number}>{
  if(plan.children.length)return plan.children.flatMap(child=>terminalNeeds(child));
  if(plan.remaining<=0)return [];
  return [{itemId:plan.itemId,name:plan.name,quantity:plan.remaining}];
}

function aggregateTerminalNeeds(plan:MaterialAcquisitionPlan){
  const rows=new Map<string,{itemId:string;name:string;quantity:number}>();
  for(const need of terminalNeeds(plan)){
    const row=rows.get(need.itemId)??{itemId:need.itemId,name:need.name,quantity:0};
    row.quantity+=need.quantity;rows.set(need.itemId,row);
  }
  return [...rows.values()].sort((a,b)=>b.quantity-a.quantity||a.name.localeCompare(b.name));
}

export function materialAcquisitionChainLabel(plan:MaterialAcquisitionPlan){
  if(!plan.craft)return undefined;
  const leaves=aggregateTerminalNeeds(plan),gold=plan.totalGold>0?` · ${plan.totalGold.toLocaleString()} Gold`:'';
  if(!leaves.length)return `Chain · ${plan.craftSteps} craft step${plan.craftSteps===1?'':'s'} · ingredients already owned${gold}`;
  const shown=leaves.slice(0,3).map(row=>`${Math.ceil(row.quantity)}× ${row.name}`);
  const extra=leaves.length>3?` · +${leaves.length-3} more`:'';
  return `Chain · ${plan.craftSteps} craft step${plan.craftSteps===1?'':'s'} · needs ${shown.join(' · ')}${extra}${gold}`;
}

export function materialAcquisitionEstimateLabel(plan:MaterialAcquisitionPlan){
  if(!plan.complete||plan.etaSeconds===undefined)return undefined;
  return `~${formatBalanceDuration(plan.etaSeconds)} · total chain`;
}

export function materialAcquisitionPlanSummary(plan:MaterialAcquisitionPlan){
  const estimate=materialAcquisitionEstimateLabel(plan),chain=materialAcquisitionChainLabel(plan);
  return {estimate,chain,complete:plan.complete,goldShortfall:plan.goldShortfall,blockedReasons:[...new Set(plan.blockedReasons)]};
}

export type RecipePreparationStepKind='gathering'|'monster_drop'|'dungeon'|'crafting'|'final_craft'|'info';
export type RecipePreparationStepState='ready'|'travel'|'locked'|'after'|'final'|'info';
export interface RecipePreparationStep{
  id:string;
  kind:RecipePreparationStepKind;
  state:RecipePreparationStepState;
  stateLabel:string;
  label:string;
  detail:string;
  destination?:WorkingTowardDestination;
  availability?:WorkingTowardDestinationAvailability;
  etaSeconds?:number;
}
export interface RecipePreparationBottleneck{
  stepId:string;
  label:string;
  state:RecipePreparationStepState;
  stateLabel:string;
  etaSeconds?:number;
}
export interface RecipePreparationReservedItem{
  itemId:string;
  name:string;
  quantity:number;
}
export interface RecipePreparationRoute{
  recipeId:string;
  steps:RecipePreparationStep[];
  acquisitionSteps:number;
  craftSteps:number;
  chainLabel:string;
  totalGold:number;
  goldShortfall:number;
  knownPreparationEtaSeconds:number;
  preparationEtaSeconds?:number;
  knownEtaSeconds:number;
  etaSeconds?:number;
  bottleneck?:RecipePreparationBottleneck;
  reservedItems:RecipePreparationReservedItem[];
  complete:boolean;
  blockedReasons:string[];
}

function stepState(availability:WorkingTowardDestinationAvailability|undefined,after=false):{state:RecipePreparationStepState;stateLabel:string}{
  if(!availability)return {state:'info',stateLabel:'INFO'};
  if(availability.status==='locked')return {state:'locked',stateLabel:'LOCKED'};
  if(availability.status==='info')return {state:'info',stateLabel:'INFO'};
  if(after)return {state:'after',stateLabel:'AFTER'};
  if(availability.status==='travel')return {state:'travel',stateLabel:'TRAVEL'};
  return {state:'ready',stateLabel:'READY'};
}

function directStepKind(plan:MaterialAcquisitionPlan):RecipePreparationStepKind{
  if(plan.destination?.kind==='combat')return 'monster_drop';
  if(plan.destination?.kind==='dungeon')return 'dungeon';
  if(plan.destination?.kind==='skills'&&plan.destination.mode==='gathering')return 'gathering';
  return 'info';
}

function directStepLabel(plan:MaterialAcquisitionPlan){
  const quantity=Math.ceil(plan.remaining);
  if(plan.sourceTypeLabel==='Gathering')return `Gather ${quantity}× ${plan.name}`;
  if(plan.sourceTypeLabel==='Monster Drop')return `Hunt for ${quantity}× ${plan.name}`;
  if(plan.sourceTypeLabel==='Dungeon')return `Run for ${quantity}× ${plan.name}`;
  return `Acquire ${quantity}× ${plan.name}`;
}

function planPreparationSteps(plan:MaterialAcquisitionPlan,path:string):RecipePreparationStep[]{
  if(plan.remaining<=0)return [];
  const children=plan.children.flatMap((child,index)=>planPreparationSteps(child,`${path}.${index}`));
  if(plan.craft){
    const timing=plan.craft.craftSeconds>0?` · ${formatBalanceDuration(plan.craft.craftSeconds)}`:'';
    const state=stepState(plan.availability,children.length>0);
    return [...children,{
      id:`${path}:craft:${plan.craft.recipeId}`,
      kind:'crafting',
      ...state,
      label:`${plan.craft.recipeName} ×${plan.craft.batches}`,
      detail:`Produces ${plan.craft.produced}× ${plan.name} · ${plan.craft.gold.toLocaleString()} Gold${timing}`,
      destination:plan.destination,
      availability:plan.availability,
      ...(plan.craft.craftSeconds>0?{etaSeconds:plan.craft.craftSeconds}:{}),
    }];
  }
  if(plan.destination){
    const state=stepState(plan.availability),eta=plan.knownEtaSeconds>0?` · ~${formatBalanceDuration(plan.knownEtaSeconds)}`:'';
    return [{
      id:`${path}:source:${plan.itemId}`,
      kind:directStepKind(plan),
      ...state,
      label:directStepLabel(plan),
      detail:`${plan.sourceTitle}${eta}`,
      destination:plan.destination,
      availability:plan.availability,
      ...(plan.knownEtaSeconds>0?{etaSeconds:plan.knownEtaSeconds}:{}),
    }];
  }
  return [{
    id:`${path}:info:${plan.itemId}`,
    kind:'info',
    state:'info',
    stateLabel:'INFO',
    label:`Resolve ${Math.ceil(plan.remaining)}× ${plan.name}`,
    detail:plan.blockedReasons[0]??'No actionable source is currently modeled.',
  }];
}

function finalRecipeSeconds(state:GameState,recipe:Recipe,batches:number){
  const mastery=professionMasteryMultipliers(recipe.id,state.account.professionMasteryByAction?.[recipe.id]);
  if(recipe.skillId==='alchemy'||isTimedProcessingRecipe(recipe.id))return Math.max(1,recipe.seconds/mastery.speed)*batches;
  const output=itemDef(recipe.output.itemId);
  if(output.type==='gear'&&!recipe.noviceSetId){
    const permanent=characterPermanentMultipliers(state),speed=Math.max(.1,permanent.craftingSpeedMultiplier*mastery.speed);
    return Math.max(1,Math.ceil(recipe.seconds/speed))*batches;
  }
  return 0;
}

function recipeDestination(recipe:Recipe):WorkingTowardDestination{
  return {kind:'skills',skillId:recipe.skillId,mode:'crafting',recipeId:recipe.id,button:`Open ${recipe.name}`,detail:`Open ${recipe.name}.`};
}

function representativePlanChain(plan:MaterialAcquisitionPlan):{labels:string[];depth:number;knownEtaSeconds:number}{
  if(plan.remaining<=0)return {labels:[],depth:0,knownEtaSeconds:0};
  if(!plan.craft)return {labels:[plan.name],depth:1,knownEtaSeconds:plan.knownEtaSeconds};
  const children=plan.children.map(representativePlanChain).filter(chain=>chain.labels.length).sort((a,b)=>b.depth-a.depth||b.knownEtaSeconds-a.knownEtaSeconds);
  const child=children[0];
  return {labels:[...(child?.labels??[]),plan.name],depth:(child?.depth??0)+1,knownEtaSeconds:plan.knownEtaSeconds};
}

function preparationChainLabel(plans:MaterialAcquisitionPlan[],finalOutputName:string){
  const active=plans.filter(plan=>plan.remaining>0),chains=active.map(representativePlanChain).filter(chain=>chain.labels.length).sort((a,b)=>b.depth-a.depth||b.knownEtaSeconds-a.knownEtaSeconds);
  const labels=[...(chains[0]?.labels??[]),finalOutputName].filter((label,index,array)=>index===0||label!==array[index-1]);
  const extra=Math.max(0,active.length-1),suffix=extra>0?` (+${extra} other input${extra===1?'':'s'})`:'';
  return labels.join(' → ')+suffix;
}

function preparationBottleneck(steps:RecipePreparationStep[]):RecipePreparationBottleneck|undefined{
  const blocked=steps.find(step=>step.state==='locked'||step.state==='info');
  const timed=[...steps].filter(step=>(step.etaSeconds??0)>0).sort((a,b)=>(b.etaSeconds??0)-(a.etaSeconds??0));
  const step=blocked??timed[0]??steps[0];
  if(!step)return undefined;
  return {stepId:step.id,label:step.label,state:step.state,stateLabel:step.stateLabel,...(step.etaSeconds!==undefined?{etaSeconds:step.etaSeconds}:{})};
}

function reservedItemsFromPlans(plans:MaterialAcquisitionPlan[]):RecipePreparationReservedItem[]{
  const rows=new Map<string,RecipePreparationReservedItem>();
  const visit=(plan:MaterialAcquisitionPlan)=>{
    if(plan.ownedUsed>0){
      const existing=rows.get(plan.itemId);
      rows.set(plan.itemId,{itemId:plan.itemId,name:plan.name,quantity:(existing?.quantity??0)+plan.ownedUsed});
    }
    for(const child of plan.children)visit(child);
  };
  for(const plan of plans)visit(plan);
  return [...rows.values()].sort((a,b)=>b.quantity-a.quantity||a.name.localeCompare(b.name));
}

export function recipePreparationRoute(state:GameState,recipe:Recipe,batches=1):RecipePreparationRoute{
  const count=Math.max(1,Math.floor(batches)),ledger=stockLedger(state),plans:MaterialAcquisitionPlan[]=[];
  if(recipe.requiresCraftedItemId&&!state.character?.craftedNoviceItemIds?.includes(recipe.requiresCraftedItemId)){
    const prerequisiteSource=workingTowardItemSourceEntries(state,recipe.requiresCraftedItemId).find(source=>source.type==='crafting');
    plans.push(prerequisiteSource
      ?planInternal(state,recipe.requiresCraftedItemId,1,prerequisiteSource.destination,ledger,false,new Set())
      :unknownPlan(recipe.requiresCraftedItemId,1,0,1,`Craft ${itemDef(recipe.requiresCraftedItemId).name} first.`));
  }
  const knowledgeLearned=!recipe.requiredKnowledgeId||(state.account.unlockedKnowledgeIds??[]).includes(recipe.requiredKnowledgeId);
  if(!knowledgeLearned&&recipe.knowledgeItemId)plans.push(planInternal(state,recipe.knowledgeItemId,1,undefined,ledger,true,new Set()));
  for(const input of recipe.inputs)plans.push(planInternal(state,input.itemId,input.quantity*count,undefined,ledger,true,new Set()));

  const preparationSteps=plans.flatMap((plan,index)=>planPreparationSteps(plan,`input:${index}`)),reservedItems=reservedItemsFromPlans(plans);
  const destination=recipeDestination(recipe),availability=workingTowardDestinationAvailability(state,destination),finalSeconds=finalRecipeSeconds(state,recipe,count);
  const finalOutputName=itemDef(recipe.output.itemId).name,chainLabel=preparationChainLabel(plans,finalOutputName);
  const totalGold=recipe.gold*count+plans.reduce((sum,plan)=>sum+plan.totalGold,0),goldShortfall=Math.max(0,totalGold-(state.character?.gold??0));
  const finalUnlocked=availability.status!=='locked'&&availability.status!=='info',plansComplete=plans.every(plan=>plan.complete);
  const complete=finalUnlocked&&plansComplete&&goldShortfall===0;
  const knownPreparationEtaSeconds=plans.reduce((sum,plan)=>sum+plan.knownEtaSeconds,0),preparationEtaSeconds=plansComplete?knownPreparationEtaSeconds:undefined;
  const knownEtaSeconds=finalSeconds+knownPreparationEtaSeconds,bottleneck=preparationBottleneck(preparationSteps);
  const blockers=[
    ...plans.flatMap(plan=>plan.blockedReasons),
    ...(!finalUnlocked?[availability.detail]:[]),
    ...(goldShortfall>0?[`Need ${goldShortfall.toLocaleString()} more Gold for the full route.`]:[]),
  ];
  const finalState=availability.status==='locked'||availability.status==='info'?stepState(availability):preparationSteps.length?{state:'final' as const,stateLabel:'FINAL'}:stepState(availability);
  const finalTiming=finalSeconds>0?` · ${formatBalanceDuration(finalSeconds)}`:'';
  const finalStep:RecipePreparationStep={
    id:`final:${recipe.id}`,
    kind:'final_craft',
    ...finalState,
    label:`${recipe.name}${count>1?` ×${count}`:''}`,
    detail:`Produces ${recipe.output.quantity*count}× ${itemDef(recipe.output.itemId).name} · ${(recipe.gold*count).toLocaleString()} Gold${finalTiming}`,
    destination,
    availability,
    ...(finalSeconds>0?{etaSeconds:finalSeconds}:{}),
  };
  return {
    recipeId:recipe.id,
    steps:[...preparationSteps,finalStep],
    acquisitionSteps:preparationSteps.filter(step=>step.kind==='gathering'||step.kind==='monster_drop'||step.kind==='dungeon').length,
    craftSteps:preparationSteps.filter(step=>step.kind==='crafting').length+1,
    chainLabel,totalGold,goldShortfall,knownPreparationEtaSeconds,
    ...(preparationEtaSeconds!==undefined?{preparationEtaSeconds}:{}),
    knownEtaSeconds,
    ...(complete?{etaSeconds:knownEtaSeconds}:{}),
    ...(bottleneck?{bottleneck}:{}),
    reservedItems,
    complete,
    blockedReasons:[...new Set(blockers)],
  };
}

export function recipePreparationRouteLabel(route:RecipePreparationRoute){
  const stepLabel=`${route.steps.length} step${route.steps.length===1?'':'s'}`;
  const prepLabel=route.preparationEtaSeconds!==undefined?`prep ~${formatBalanceDuration(route.preparationEtaSeconds)}`:route.knownPreparationEtaSeconds>0?'prep time needs attention':'prep time unavailable';
  const bottleneck=route.bottleneck?` · bottleneck ${route.bottleneck.label}${route.bottleneck.etaSeconds!==undefined&&route.bottleneck.state!=='locked'&&route.bottleneck.state!=='info'?` ~${formatBalanceDuration(route.bottleneck.etaSeconds)}`:route.bottleneck.state==='locked'||route.bottleneck.state==='info'?` (${route.bottleneck.stateLabel.toLowerCase()})`:''}`:'';
  return `${stepLabel} · ${prepLabel}${bottleneck}`;
}

export function materialStoredQuantity(state:GameState,itemId:string){return storedQuantity(state,itemId);}
