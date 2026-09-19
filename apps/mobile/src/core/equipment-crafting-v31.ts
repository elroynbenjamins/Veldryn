export type CraftingCtaV31='Craft'|'Craft prerequisites'|'View blockers';
export interface MobileCraftRequirementV31{key:string;label:string;progressLabel:string;state:'ready'|'missing'|'blocked';source?:string;actionLabel?:string;}
export interface MobileCraftingCardV31{pieceId:string;itemName:string;rarityLine:string;skillLine:string;timeLine:string;setLine?:string;requirements:readonly MobileCraftRequirementV31[];pveLines:readonly string[];primaryCta:CraftingCtaV31;secondaryActions:readonly ('Compare'|'Recipe source'|'Set details'|'Cancel queue')[];}
export interface MobileCraftQueueRowV31{id:string;label:string;kind:'process'|'component'|'final';status:'pending'|'running'|'done'|'blocked'|'cancelled';timeLabel:string;dependencyCount:number;}

export const CRAFTING_UI_RULES_V31={
  recipeSheetOrder:['Result','Set bonuses','Requirements','Crafting chain','Sources'] as const,
  requirementGroups:['Available','Can craft','Need materials','Need PvE','Need skill'] as const,
  showRawExpansionCollapsedByDefault:true,
  neverAutoQueueGathering:true,
  neverAutoQueueCombat:true,
  neverAutoQueueDungeon:true,
  queueProcessesAndComponentsOnly:true,
  alwaysShowCraftedRarityOdds:true,
  showUpgradeAndGemEligibilityOnResult:true,
  rarityOdds:'Common 88.8% · Uncommon 8% · Rare 2.5% · Epic 0.6% · Mythic 0.1%',
} as const;

export function formatQueueTimeV31(seconds:number){if(seconds<60)return `${seconds}s`;const m=Math.ceil(seconds/60);return m<60?`${m}m`:`${Math.floor(m/60)}h ${m%60}m`;}
export function sourceActionLabelV31(action:string){return ({gather:'Go gather',train_skill:'Train skill',hunt:'Hunt source',run_content:'Open content',unlock_recipe:'View unlock',register_item:'Content setup',level_character:'Level character'} as Record<string,string>)[action]??'View';}
