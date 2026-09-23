import {RECIPES} from '../content/skills';
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
