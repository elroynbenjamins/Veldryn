/** Development-only crafting review. All commands affect this memory fixture only. */
import {useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {createCharacter,newGame} from '../core/game';
import {executeGameCommand,type GameCommand} from '../core/game-commands';
import {ITEMS} from '../content/items';
import {EQUIPMENT_SETS} from '../content/equipment-sets';
import {RECIPES} from '../content/skills';
import {EQUIPMENT_CRAFT_SKILL_BY_CLASS} from '../content/equipment-recipes-v33';
import {totalXpAtLevel} from '../core/progression';
import {SkillsScreen} from '../screens/SkillsScreen';
import {GameThemeProvider} from '../theme/ThemeContext';
import {resolveTheme,type UiThemeId} from '../theme/theme';
import {equipmentSheetBySet} from '../theme/equipment-assets';
import {newEquipmentReviewSheetBySet} from './new-equipment-review-assets';

// This fixture deliberately previews the November 9 candidates without changing production.
Object.assign(equipmentSheetBySet,newEquipmentReviewSheetBySet);

/** Endgame level so every authored tier, up to the T7 sets, lists its artwork. */
const REVIEW_LEVEL=95;
const CLASS_IDS=['IRONWARDEN','BASTION','DREADGUARD','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','DAWNKEEPER','STONECALLER'] as const;
type ReviewClass=typeof CLASS_IDS[number];
const initialClass=():ReviewClass=>{
 const id=typeof window==='undefined'?null:new URLSearchParams(window.location.search).get('class');
 return CLASS_IDS.find(value=>value===id?.toUpperCase())??'IRONWARDEN';
};
const reviewParams=()=>typeof window==='undefined'?new URLSearchParams():new URLSearchParams(window.location.search);
const initialRecipeId=()=>{
 const setId=reviewParams().get('set')?.toUpperCase();
 return setId?RECIPES.find(recipe=>recipe.v33SetId===setId)?.id:undefined;
};

function fixture(classId:ReviewClass,missing=false){
 const state=createCharacter(newGame(Date.now()),classId,'Smithing Review');
 state.character!.level=REVIEW_LEVEL;state.character!.gold=4500;
 state.skills=state.skills.map(s=>({...s,level:99,xp:totalXpAtLevel(99)+320}));
 state.inventory.capacity=2000;
 state.inventory.stacks=missing?[]:ITEMS.filter(i=>i.type==='material').map(i=>({itemId:i.id,quantity:100}));
 state.bank.stacks=[];
 for(const id of EQUIPMENT_SETS.find(s=>s.id==='T1_001')!.itemIds.slice(1,5))state.inventory.stacks.push({itemId:id,quantity:1});
 return state;
}
const noop=()=>{};
export default function SmithingReview(){
 const [classId,setClassId]=useState<ReviewClass>(initialClass);
 const [state,setState]=useState(()=>fixture(initialClass())),[theme,setTheme]=useState<UiThemeId>('obsidian'),[message,setMessage]=useState('');
 const pickClass=(next:ReviewClass)=>{setClassId(next);setState(fixture(next));setMessage('')};
 const clean=reviewParams().get('clean')==='1';
 const C=resolveTheme(theme);
 const command=(cmd:GameCommand)=>{try{setState(s=>executeGameCommand(s,cmd,Date.now(),{randomRoll:.5}).state);setMessage('')}catch(e){setMessage(String(e))}};
 return <SafeAreaProvider><GameThemeProvider themeId={theme}><View style={{flex:1,width:clean?390:undefined,maxWidth:'100%',overflow:clean?'hidden':undefined,backgroundColor:C.bg}}>{!clean?<><View style={{paddingHorizontal:8,paddingTop:6}}><Text style={{color:C.good,fontSize:11,fontWeight:'900'}}>REGENERATED T3/T4 · SAFE-AREA NORMALIZED · 36/36</Text></View><View style={{padding:8,flexDirection:'row',flexWrap:'wrap',gap:8}}>{(['obsidian','ember','ivory'] as const).map(id=><Pressable key={id} accessibilityRole="button" onPress={()=>setTheme(id)}><Text style={{color:C.muted}}>{resolveTheme(id).name}</Text></Pressable>)}<Pressable accessibilityRole="button" onPress={()=>setState(fixture(classId,true))}><Text style={{color:C.muted}}>Missing materials</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>setState(fixture(classId))}><Text style={{color:C.muted}}>Ready fixture</Text></Pressable></View><View style={{paddingHorizontal:8,paddingBottom:8,flexDirection:'row',flexWrap:'wrap',gap:8}}>{CLASS_IDS.map(id=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:id===classId}} onPress={()=>pickClass(id)}><Text style={{color:id===classId?C.text:C.muted}}>{id}</Text></Pressable>)}</View></>:null}{message?<Text style={{color:C.bad}}>{message}</Text>:null}<SkillsScreen key={classId} state={state} initialSkill={EQUIPMENT_CRAFT_SKILL_BY_CLASS[classId]} initialMode="crafting" initialRecipeId={initialRecipeId()} onBackToHub={noop} onCraft={id=>command({type:'craft',args:{id}})} onClaimCraft={id=>command({type:'craft_claim',args:{id}})} onClaimAllCrafts={()=>command({type:'craft_claim_all'})} onCancelCraft={id=>command({type:'craft_cancel',args:{id}})} onMoveCraftWaiting={(id,direction)=>command({type:'craft_move',args:{id,direction}})} onCraftPrerequisites={id=>command({type:'craft_prerequisites',args:{id}})} onGather={noop} onQueueGather={noop} onQueueRemove={noop} onQueueMove={noop} onQueueClear={noop} onQueueStart={noop} onEquipTool={noop} onCharacter={noop} onInventory={noop} onViewToolRecipes={noop} onNavigateCraftingSource={destination=>setMessage(destination.detail)} onCommand={async cmd=>command(cmd)}/></View></GameThemeProvider></SafeAreaProvider>;
}
