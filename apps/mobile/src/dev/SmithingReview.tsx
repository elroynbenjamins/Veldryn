/** Development-only crafting review. All commands affect this memory fixture only. */
import {useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {createCharacter,newGame} from '../core/game';
import {executeGameCommand,type GameCommand} from '../core/game-commands';
import {ITEMS} from '../content/items';
import {EQUIPMENT_SETS} from '../content/equipment-sets';
import {totalXpAtLevel} from '../core/progression';
import {SkillsScreen} from '../screens/SkillsScreen';
import {GameThemeProvider} from '../theme/ThemeContext';
import {resolveTheme,type UiThemeId} from '../theme/theme';

function fixture(missing=false){
 const state=createCharacter(newGame(Date.now()),'IRONWARDEN','Smithing Review');
 state.character!.level=25;state.character!.gold=4500;
 state.skills=state.skills.map(s=>({...s,level:12,xp:totalXpAtLevel(12)+320}));
 state.inventory.capacity=2000;
 state.inventory.stacks=missing?[]:ITEMS.filter(i=>i.type==='material').map(i=>({itemId:i.id,quantity:100}));
 state.bank.stacks=[];
 for(const id of EQUIPMENT_SETS.find(s=>s.id==='T1_001')!.itemIds.slice(1,5))state.inventory.stacks.push({itemId:id,quantity:1});
 return state;
}
const noop=()=>{};
export default function SmithingReview(){
 const [state,setState]=useState(()=>fixture()),[theme,setTheme]=useState<UiThemeId>('obsidian'),[message,setMessage]=useState('');
 const C=resolveTheme(theme);
 const command=(cmd:GameCommand)=>{try{setState(s=>executeGameCommand(s,cmd,Date.now(),{randomRoll:.5}).state);setMessage('')}catch(e){setMessage(String(e))}};
 return <SafeAreaProvider><GameThemeProvider themeId={theme}><View style={{flex:1,backgroundColor:C.bg}}><View style={{padding:8,flexDirection:'row',flexWrap:'wrap',gap:8}}>{(['obsidian','ember','ivory'] as const).map(id=><Pressable key={id} accessibilityRole="button" onPress={()=>setTheme(id)}><Text style={{color:C.muted}}>{resolveTheme(id).name}</Text></Pressable>)}<Pressable accessibilityRole="button" onPress={()=>setState(fixture(true))}><Text style={{color:C.muted}}>Missing materials</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>setState(fixture())}><Text style={{color:C.muted}}>Ready fixture</Text></Pressable></View>{message?<Text style={{color:C.bad}}>{message}</Text>:null}<SkillsScreen state={state} initialSkill="smithing" initialMode="crafting" onBackToHub={noop} onCraft={id=>command({type:'craft',args:{id}})} onClaimCraft={id=>command({type:'craft_claim',args:{id}})} onClaimAllCrafts={()=>command({type:'craft_claim_all'})} onCancelCraft={id=>command({type:'craft_cancel',args:{id}})} onMoveCraftWaiting={(id,direction)=>command({type:'craft_move',args:{id,direction}})} onCraftPrerequisites={id=>command({type:'craft_prerequisites',args:{id}})} onGather={noop} onQueueGather={noop} onQueueRemove={noop} onQueueMove={noop} onQueueClear={noop} onQueueStart={noop} onEquipTool={noop} onCharacter={noop} onInventory={noop} onViewToolRecipes={noop} onNavigateCraftingSource={destination=>setMessage(destination.detail)} onCommand={async cmd=>command(cmd)}/></View></GameThemeProvider></SafeAreaProvider>;
}
