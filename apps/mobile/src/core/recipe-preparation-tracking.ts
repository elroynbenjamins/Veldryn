import {RECIPES} from '../content/skills';
import {itemDef} from '../content/items';
import {formatBalanceDuration} from './balance-projection';
import {recipePreparationRoute,type RecipePreparationRoute,type RecipePreparationStep} from './material-acquisition-plan';
import {recipeOutputOwnedQuantity,type RecipePreparationGoal} from './recipe-preparation-goals';
import type {GameState} from './types';
import type {WorkingTowardDestination} from './working-toward';

export interface RecipePreparationTrackingView{
 goal:RecipePreparationGoal;
 route?:RecipePreparationRoute;
 status:'active'|'complete'|'blocked';
 current:number;
 target:number;
 progress:number;
 etaSeconds?:number;
 etaLabel:string;
 nextStep?:RecipePreparationStep;
 nextLabel:string;
 destination:WorkingTowardDestination;
 blocker?:string;
 outputOwned:number;
}

function fallbackDestination(recipeId:string):WorkingTowardDestination{
 const recipe=RECIPES.find(row=>row.id===recipeId);
 return recipe
  ?{kind:'skills',skillId:recipe.skillId,mode:'crafting',recipeId:recipe.id,button:`Open ${recipe.name}`,detail:`Open the tracked recipe.`}
  :{kind:'info',button:'Recipe unavailable',detail:'This tracked recipe is no longer in the current catalog.'};
}

export function recipePreparationTrackingView(state:GameState,goal:RecipePreparationGoal):RecipePreparationTrackingView{
 const recipe=RECIPES.find(row=>row.id===goal.recipeId),outputOwned=recipeOutputOwnedQuantity(state,goal.outputItemId);
 const target=Math.max(1,goal.initialStepCount),crafted=outputOwned>=goal.targetOutputQuantity;
 if(!recipe){
  return {goal,status:'blocked',current:0,target,progress:0,etaLabel:'ETA unavailable',nextLabel:'Recipe unavailable',destination:fallbackDestination(goal.recipeId),blocker:'This tracked recipe is no longer in the current catalog.',outputOwned};
 }
 const route=recipePreparationRoute(state,recipe,goal.batches),remaining=Math.max(1,route.steps.length);
 const current=crafted?target:Math.max(0,Math.min(target-1,target-remaining));
 const nextStep=crafted?undefined:route.steps[0],goldBlocked=!crafted&&nextStep?.kind==='final_craft'&&route.goldShortfall>0;
 const blocked=!crafted&&(nextStep?.state==='locked'||nextStep?.state==='info'||goldBlocked);
 const destination=crafted?fallbackDestination(goal.recipeId):nextStep?.destination??fallbackDestination(goal.recipeId);
 const blocker=blocked?(goldBlocked?`Need ${route.goldShortfall.toLocaleString()} more Gold for the tracked craft.`:route.blockedReasons[0]??nextStep?.detail):undefined;
 const etaSeconds=crafted?0:route.etaSeconds,etaLabel=crafted?'Complete':etaSeconds!==undefined?`~${formatBalanceDuration(etaSeconds)}`:'ETA unavailable';
 return {
  goal,route,status:crafted?'complete':blocked?'blocked':'active',current,target,progress:crafted?1:Math.max(0,Math.min(1,current/target)),
  etaSeconds,etaLabel,nextStep,nextLabel:crafted?'Tracked craft complete':nextStep?.label??recipe.name,destination,blocker,outputOwned,
 };
}

export function firstTrackedRecipePreparation(state:GameState){
 const goals=(state.character?.progressionGoals??[]).filter((goal):goal is RecipePreparationGoal=>goal.kind==='recipe_preparation');
 for(const goal of goals){
  const view=recipePreparationTrackingView(state,goal);
  if(view.status!=='complete')return view;
 }
 return goals[0]?recipePreparationTrackingView(state,goals[0]):undefined;
}

export type RecipePreparationTransitionKind='advanced'|'blocked'|'resumed'|'regressed'|'complete';
export interface RecipePreparationTransitionNotice{
 goalId:string;
 recipeId:string;
 kind:RecipePreparationTransitionKind;
 tone:'success'|'info'|'warning';
 message:string;
 actionLabel:'Open next'|'Review'|'View goal';
 destination?:WorkingTowardDestination;
 priority:number;
}

function preparationOutputName(goal:RecipePreparationGoal){
 const recipe=RECIPES.find(row=>row.id===goal.recipeId);
 return recipe?itemDef(recipe.output.itemId).name:goal.title.replace(/^Prepare\s*·\s*/,'');
}

function noticeDetail(value:string|undefined){
 return (value??'').trim().replace(/[.!?]+$/,'');
}

export function recipePreparationTransitionNotices(before:GameState|null|undefined,after:GameState|null|undefined):RecipePreparationTransitionNotice[]{
 if(!before?.character||!after?.character||before.character.id!==after.character.id)return [];
 const previous=new Map((before.character.progressionGoals??[]).filter((goal):goal is RecipePreparationGoal=>goal.kind==='recipe_preparation').map(goal=>[goal.id,goal]));
 const notices:RecipePreparationTransitionNotice[]=[];
 for(const goal of (after.character.progressionGoals??[]).filter((entry):entry is RecipePreparationGoal=>entry.kind==='recipe_preparation')){
  const oldGoal=previous.get(goal.id);if(!oldGoal)continue;
  const oldView=recipePreparationTrackingView(before,oldGoal),nextView=recipePreparationTrackingView(after,goal),name=preparationOutputName(goal);
  if(oldView.status!=='complete'&&nextView.status==='complete'){
   notices.push({goalId:goal.id,recipeId:goal.recipeId,kind:'complete',tone:'success',message:`Working Toward complete · ${name} crafted.`,actionLabel:'View goal',priority:5});continue;
  }
  if(nextView.current>oldView.current){
   if(nextView.status==='blocked'){const reason=noticeDetail(nextView.blocker);notices.push({goalId:goal.id,recipeId:goal.recipeId,kind:'blocked',tone:'warning',message:`Preparation advanced · Next blocked: ${nextView.nextLabel}${reason?' · '+reason:''}.`,actionLabel:'Review',destination:nextView.destination,priority:4});}
   else notices.push({goalId:goal.id,recipeId:goal.recipeId,kind:'advanced',tone:'info',message:`Preparation advanced · Next: ${nextView.nextLabel}.`,actionLabel:'Open next',destination:nextView.destination,priority:3});
   continue;
  }
  if(oldView.status!=='blocked'&&nextView.status==='blocked'){
   {const reason=noticeDetail(nextView.blocker??nextView.nextLabel);notices.push({goalId:goal.id,recipeId:goal.recipeId,kind:'blocked',tone:'warning',message:`Preparation blocked · ${name}${reason?' · '+reason:''}.`,actionLabel:'Review',destination:nextView.destination,priority:4});}continue;
  }
  if(oldView.status==='blocked'&&nextView.status==='active'){
   notices.push({goalId:goal.id,recipeId:goal.recipeId,kind:'resumed',tone:'info',message:`Preparation resumed · Next: ${nextView.nextLabel}.`,actionLabel:'Open next',destination:nextView.destination,priority:2});continue;
  }
  if(nextView.current<oldView.current){
   notices.push({goalId:goal.id,recipeId:goal.recipeId,kind:'regressed',tone:'warning',message:`Preparation changed · Next: ${nextView.nextLabel}.`,actionLabel:'Review',destination:nextView.destination,priority:1});
  }
 }
 return notices.sort((a,b)=>b.priority-a.priority||a.goalId.localeCompare(b.goalId));
}
