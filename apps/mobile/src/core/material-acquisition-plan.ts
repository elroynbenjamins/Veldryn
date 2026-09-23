import {RECIPES,type Recipe} from '../content/skills';
import {itemDef} from '../content/items';
import type {GameState} from './types';
import {acquisitionProjectionForDestination,formatBalanceDuration} from './balance-projection';
import {isTimedProcessingRecipe} from './processing';
import {professionMasteryMultipliers} from './profession-mastery-v40';
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

export type MaterialPreparationStepKind='owned'|'acquire'|'craft';
export interface MaterialPreparationStep{
  id:string;
  kind:MaterialPreparationStepKind;
  label:string;
  detail:string;
  itemId:string;
  quantity:number;
  destination?:WorkingTowardDestination;
  availability?:WorkingTowardDestinationAvailability;
  status:'ready'|'action'|'blocked';
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
  const children=recipe.inputs.map(input=>planInternal(state,input.itemId,input.quantity*batches,undefined,ledger,true,nextVisited));
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

function acquisitionVerb(typeLabel:string){
  if(typeLabel==='Gathering')return 'Gather';
  if(typeLabel==='Monster Drop')return 'Hunt for';
  if(typeLabel==='Dungeon')return 'Earn';
  return 'Acquire';
}

// Post-order traversal keeps each dependency actionable before the craft that consumes it.
function preparationSteps(plan:MaterialAcquisitionPlan,path:string):MaterialPreparationStep[]{
  if(plan.remaining<=0){
    return [{
      id:path+':owned',kind:'owned',itemId:plan.itemId,quantity:plan.ownedUsed,
      label:`Use ${Math.ceil(plan.ownedUsed)}× ${plan.name}`,
      detail:'Already available in Inventory or Bank.',
      status:'ready',
    }];
  }
  if(!plan.craft){
    const availability=plan.availability,destination=plan.destination,status:MaterialPreparationStep['status']=availability?.status==='locked'||availability?.status==='info'?'blocked':'action';
    return [{
      id:path+':acquire',kind:'acquire',itemId:plan.itemId,quantity:plan.remaining,
      label:`${acquisitionVerb(plan.sourceTypeLabel)} ${Math.ceil(plan.remaining)}× ${plan.name}`,
      detail:plan.sourceTitle+(availability?.detail?` · ${availability.detail}`:''),
      destination,availability,status,
    }];
  }
  const childSteps=plan.children.flatMap((child,index)=>preparationSteps(child,`${path}:child:${index}`));
  const availability=plan.availability,status:MaterialPreparationStep['status']=availability?.status==='locked'||availability?.status==='info'?'blocked':'action';
  const action=isTimedProcessingRecipe(plan.craft.recipeId)?'Process':'Craft';
  return [...childSteps,{
    id:path+':craft',kind:'craft',itemId:plan.itemId,quantity:plan.remaining,
    label:`${action} ${Math.ceil(plan.remaining)}× ${plan.name}`,
    detail:`${plan.craft.recipeName} · ${plan.craft.batches} batch${plan.craft.batches===1?'':'es'}${plan.craft.gold?` · ${plan.craft.gold.toLocaleString()} Gold`:''}`,
    destination:plan.destination,availability,status,
  }];
}

export function materialPreparationSteps(plan:MaterialAcquisitionPlan){
  return preparationSteps(plan,'root');
}

export function materialStoredQuantity(state:GameState,itemId:string){return storedQuantity(state,itemId);}
