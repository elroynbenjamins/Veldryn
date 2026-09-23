import {RECIPES} from '../content/skills';
import type {GameState} from './types';
import type {ProgressionGoal} from './progression-goals-v40';
import {recipePreparationRoute,type RecipePreparationStep} from './material-acquisition-plan';
import type {WorkingTowardDestination} from './working-toward';

export interface RecipePreparationGoalRuntime{
  goal:Extract<ProgressionGoal,{kind:'recipe_preparation'}>;
  recipeName:string;
  current:number;
  target:number;
  progress:number;
  status:'active'|'complete'|'blocked';
  statusLabel:string;
  detail:string;
  destination:WorkingTowardDestination;
  nextStep?:RecipePreparationStep;
  route:ReturnType<typeof recipePreparationRoute>;
}

export function recipePreparationGoalRuntime(state:GameState,goal:Extract<ProgressionGoal,{kind:'recipe_preparation'}>):RecipePreparationGoalRuntime{
  const recipe=RECIPES.find(row=>row.id===goal.recipeId);
  if(!recipe){
    const destination:WorkingTowardDestination={kind:'info',button:'Recipe unavailable',detail:'This tracked recipe is no longer in the current catalog.'};
    return {goal,recipeName:goal.recipeId,current:0,target:1,progress:0,status:'blocked',statusLabel:'BLOCKED',detail:destination.detail,destination,route:{recipeId:goal.recipeId,steps:[],acquisitionSteps:0,craftSteps:0,chainLabel:'',totalGold:0,goldShortfall:0,knownPreparationEtaSeconds:0,knownEtaSeconds:0,complete:false,blockedReasons:[destination.detail]}};
  }
  const route=recipePreparationRoute(state,recipe,1),preparationSteps=route.steps.filter(step=>step.kind!=='final_craft'),nextStep=preparationSteps[0],finalStep=route.steps.find(step=>step.kind==='final_craft');
  const finalBlocked=finalStep?.state==='locked'||finalStep?.state==='info';
  const blocked=nextStep?.state==='locked'||nextStep?.state==='info'||(!nextStep&&(route.goldShortfall>0||finalBlocked));
  const complete=!nextStep&&route.goldShortfall===0&&!finalBlocked;
  const destination=nextStep?.destination??finalStep?.destination??{kind:'skills',skillId:recipe.skillId,mode:'crafting',recipeId:recipe.id,button:`Open ${recipe.name}`,detail:`Open ${recipe.name}.`};
  const detail=complete
    ?`Preparation complete · ${recipe.name} is ready to start.`
    :nextStep
      ?`Next · ${nextStep.label} · ${nextStep.detail}`
      :route.goldShortfall>0
        ?`Need ${route.goldShortfall.toLocaleString()} more Gold before ${recipe.name} can start.`
        :finalStep?.availability?.detail??route.blockedReasons[0]??`Review ${recipe.name} requirements.`;
  return {
    goal,recipeName:recipe.name,current:complete?1:0,target:1,progress:complete?1:0,
    status:complete?'complete':blocked?'blocked':'active',
    statusLabel:complete?'CRAFT READY':blocked?'BLOCKED':'ACTIVE',
    detail,destination,...(nextStep?{nextStep}:{}),route,
  };
}

export function isRecipePreparationGoal(goal:ProgressionGoal):goal is Extract<ProgressionGoal,{kind:'recipe_preparation'}>{
  return goal.kind==='recipe_preparation';
}

export function recipePreparationReadyCount(state:GameState){
  return (state.character?.progressionGoals??[]).filter(isRecipePreparationGoal).filter(goal=>recipePreparationGoalRuntime(state,goal).status==='complete').length;
}
