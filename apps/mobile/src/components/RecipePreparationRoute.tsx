import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {Recipe} from '../content/skills';
import type {GameState} from '../core/types';
import {recipePreparationRoute,recipePreparationRouteLabel,type RecipePreparationStep} from '../core/material-acquisition-plan';
import type {WorkingTowardDestination} from '../core/working-toward';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function RecipePreparationRoute({
  state,recipe,batches=1,onNavigate,
}:{state:GameState;recipe:Recipe;batches?:number;onNavigate?:(destination:WorkingTowardDestination)=>void}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),[expanded,setExpanded]=useState(false);
  const route=useMemo(()=>recipePreparationRoute(state,recipe,batches),[state,recipe,batches]);
  if(route.steps.length<=1)return null;
  const attention=!route.complete&&route.blockedReasons.length>0;
  return <View style={s.box}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={(expanded?'Hide':'Show')+' prepare materials route for '+recipe.name} onPress={()=>setExpanded(value=>!value)} style={({pressed})=>[s.head,expanded&&s.headOpen,pressed&&s.pressed]}>
      <View style={s.copy}><Text style={s.eyebrow}>PREPARE MATERIALS</Text><Text style={s.title}>{recipePreparationRouteLabel(route)}</Text><Text style={s.sub}>Ordered route from current stock to the final craft.</Text></View>
      <Text style={s.mark}>{expanded?'−':'+'}</Text>
    </Pressable>
    {expanded?<View style={s.steps}>
      {route.steps.map((step,index)=><PreparationStepRow key={step.id} step={step} index={index} total={route.steps.length} onNavigate={onNavigate}/>)}
      {attention?<Text style={s.warning}>{route.blockedReasons[0]}</Text>:null}
      <Text style={s.footer}>{route.totalGold.toLocaleString()} Gold across route{route.goldShortfall>0?' · '+route.goldShortfall.toLocaleString()+' short':''}</Text>
    </View>:null}
  </View>;
}

function PreparationStepRow({step,index,total,onNavigate}:{step:RecipePreparationStep;index:number;total:number;onNavigate?:(destination:WorkingTowardDestination)=>void}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),actionable=step.kind!=='final_craft'&&!!step.destination&&!!onNavigate&&step.availability?.canNavigate!==false;
  const tone=step.state==='ready'?C.good:step.state==='travel'?C.info:step.state==='locked'?C.warning:step.state==='final'?C.special:C.muted;
  const content=<>
    <View style={[s.number,{borderColor:tone}]}><Text style={[s.numberText,{color:tone}]}>{index+1}</Text></View>
    <View style={s.copy}><View style={s.labelRow}><Text style={s.stepLabel}>{step.label}</Text><Text style={[s.state,{color:tone}]}>{step.stateLabel}</Text></View><Text style={s.stepDetail}>{step.detail}</Text></View>
    {actionable?<Text style={s.open}>OPEN ›</Text>:step.kind==='final_craft'?<Text style={s.here}>HERE</Text>:null}
  </>;
  return actionable?<Pressable accessibilityRole="button" accessibilityLabel={'Step '+(index+1)+' of '+total+': '+step.label} accessibilityHint={step.destination?.detail} onPress={()=>onNavigate?.(step.destination!)} style={({pressed})=>[s.step,pressed&&s.pressed]}>{content}</Pressable>:<View accessibilityRole="text" accessibilityLabel={'Step '+(index+1)+' of '+total+': '+step.label+', '+step.stateLabel} style={s.step}>{content}</View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
  box:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2,overflow:'hidden'},
  head:{minHeight:52,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10,paddingVertical:8},
  headOpen:{borderBottomWidth:1,borderBottomColor:C.line,backgroundColor:C.infoSurface},
  copy:{flex:1,minWidth:0,gap:2},eyebrow:{fontSize:8,lineHeight:11,color:C.info,fontWeight:'900',letterSpacing:.75},
  title:{...typography.bodyStrong,color:C.text,fontWeight:'800'},sub:{...typography.caption,color:C.muted},mark:{fontSize:18,lineHeight:20,color:C.info,fontWeight:'900'},
  steps:{paddingHorizontal:8,paddingBottom:8,gap:0},step:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},
  number:{width:24,height:24,borderWidth:1,borderRadius:99,alignItems:'center',justifyContent:'center',backgroundColor:C.panel},
  numberText:{fontSize:9,lineHeight:11,fontWeight:'900'},labelRow:{flexDirection:'row',alignItems:'center',gap:6},
  stepLabel:{...typography.caption,color:C.text,fontWeight:'900',flex:1},state:{fontSize:7.5,lineHeight:10,fontWeight:'900',letterSpacing:.5},
  stepDetail:{fontSize:9.5,lineHeight:13,color:C.muted},open:{fontSize:8.5,lineHeight:11,color:C.info,fontWeight:'900'},
  here:{fontSize:8.5,lineHeight:11,color:C.special,fontWeight:'900'},warning:{fontSize:9.5,lineHeight:13,color:C.warning,fontWeight:'800',paddingTop:7},
  footer:{fontSize:9,lineHeight:12,color:C.muted,fontWeight:'700',paddingTop:6},pressed:{opacity:.72},
});}
