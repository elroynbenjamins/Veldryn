import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Animated,Easing,Image,StyleSheet,View,type ImageSourcePropType,type StyleProp,type ViewStyle} from 'react-native';
import type {ActiveActivity} from '../core/types';
import {gatheringSceneModel,nextFishingPhase,type FishingScenePhase,type GatheringSceneModel} from '../core/gathering-scene';
import {ballisticTracks,clipDurationMs,frameStarts,heldSteps,windowTrack,type BallisticParticle} from '../core/sprite-animation';
import {BIOME_PARTICLES,CAVE_POOL_BACKGROUND,CHUNK_SIZE,GATHERER_SHEETS,GATHERING_LAYOUT as L,LOG_SIZE,ORE_NODES,PIXEL_SCENE,PIXEL_UNIT,SCENE_BACKGROUNDS,WATER_FX,WOOD_NODES} from '../theme/pixel-scene-assets';
import {SpriteFrames} from './anim/SpriteFrames';
import {LOOP_NATIVE_DRIVER,track,useActionCompleted,useLoopProgress,useMotionEnabled,type Progress} from './anim/motion';

const AMBIENT_MS=6_400;
const clamp='clamp' as const;

/**
 * A miniature pixel-art scene for a running Mining, Woodcutting or Fishing activity.
 *
 * Purely decorative: it reads the activity's node and clock, never writes game state and
 * never requests anything. The swing loops are aesthetic; the only moments tied to
 * progress (the ore/log pop and the fishing catch) fire when the activity clock crosses a
 * real action boundary. Motion stops in the background, when `working` is false, and
 * under either reduce-motion preference, leaving a still frame.
 */
export function GatheringScene({activity,cycleSeconds,reduceMotion=false,working=true,style}:{
  activity:ActiveActivity;cycleSeconds:number;reduceMotion?:boolean;working?:boolean;style?:StyleProp<ViewStyle>;
}){
  const model=useMemo(()=>gatheringSceneModel(activity),[activity.kind,activity.targetId]);
  const [width,setWidth]=useState(0);
  const motion=useMotionEnabled(reduceMotion,working);
  if(!model)return null;
  // Whole-number scale: the art never lands between device pixels.
  const unit=Math.max(PIXEL_UNIT,Math.min(6,Math.ceil(width/PIXEL_SCENE.width)));
  const clock={lastClaimAtMs:activity.lastClaimAtMs,progressFraction:activity.progressFraction,cycleSeconds};
  const Scene=model.kind==='fishing'?FishingScene:SwingScene;
  return <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden pointerEvents="none"
    onLayout={event=>{const next=Math.round(event.nativeEvent.layout.width);setWidth(current=>current===next?current:next);}}
    style={[s.window,{height:PIXEL_SCENE.height*unit},style]}>
    <View style={{width:PIXEL_SCENE.width*unit,height:PIXEL_SCENE.height*unit}}>
      <Scene key={model.kind+':'+model.itemId} model={model} unit={unit} motion={motion} clock={clock} startedAtMs={activity.startedAtMs}/>
    </View>
  </View>;
}

type SceneProps={model:GatheringSceneModel;unit:number;motion:boolean;clock:{lastClaimAtMs:number;progressFraction?:number;cycleSeconds:number};startedAtMs:number};

function Layer({source,left,top,width,height,unit,style}:{source:ImageSourcePropType;left:number;top:number;width:number;height:number;unit:number;style?:any}){
  return <Animated.Image source={source} fadeDuration={0} resizeMode="stretch" style={[{position:'absolute',left:left*unit,top:top*unit,width:width*unit,height:height*unit},style]}/>;
}
/** One flat-colour art pixel (or a small block of them). */
function Pixel({x,y,size=1,width,color,unit,opacity,translateX,translateY}:{x:number;y:number;size?:number;width?:number;color:string;unit:number;opacity?:any;translateX?:any;translateY?:any}){
  const transform=[...(translateX!==undefined?[{translateX}]:[]),...(translateY!==undefined?[{translateY}]:[])];
  return <Animated.View style={{position:'absolute',left:x*unit,top:y*unit,width:(width??size)*unit,height:size*unit,backgroundColor:color,opacity,transform}}/>;
}

// ------------------------------------------------------------------ mining & woodcutting
const SWING_PARTICLES:Record<'mining'|'woodcutting',readonly (Omit<BallisticParticle,'at'>&{tone:0|1|2;size:number})[]>={
  mining:[
    {dx:-8,dy:-9,gravity:11,life:.3,tone:0,size:2},{dx:-4,dy:-12,gravity:12,life:.34,tone:0,size:1},{dx:5,dy:-10,gravity:12,life:.3,tone:0,size:2},
    {dx:-10,dy:-4,gravity:8,life:.24,tone:1,size:1},{dx:2,dy:-13,gravity:10,life:.28,tone:2,size:1},{dx:-6,dy:-7,gravity:6,life:.2,tone:2,size:1},
  ],
  woodcutting:[
    {dx:-9,dy:-7,gravity:10,life:.3,tone:1,size:2},{dx:-5,dy:-11,gravity:12,life:.34,tone:1,size:1},{dx:-11,dy:-2,gravity:8,life:.26,tone:0,size:1},{dx:-3,dy:-6,gravity:9,life:.24,tone:0,size:2},
  ],
};

function SwingScene({model,unit,motion,clock}:SceneProps){
  const kind=model.kind as 'mining'|'woodcutting';
  const sheet=GATHERER_SHEETS[kind],ore=ORE_NODES[model.itemId],wood=WOOD_NODES[model.itemId];
  // A node without dedicated art keeps the region's generic rock or tree rather than a wrong one.
  const fallback=kind==='mining'
    ?Object.values(ORE_NODES).find(entry=>entry.biome===model.biome)??ORE_NODES.COPPER_ORE
    :Object.values(WOOD_NODES).find(entry=>entry.biome===model.biome)??WOOD_NODES.GREENWOOD_LOG;
  const oreNode=kind==='mining'?(ore??fallback as typeof ORE_NODES[string]):undefined;
  const woodNode=kind==='woodcutting'?(wood??fallback as typeof WOOD_NODES[string]):undefined;
  const swing=useLoopProgress(clipDurationMs(sheet.durationsMs),motion);
  const ambient=useLoopProgress(AMBIENT_MS,motion);
  const impactAt=frameStarts(sheet.durationsMs)[sheet.impactFrame];
  const contact=kind==='mining'?L.miningContact:L.choppingContact;
  const tones=oreNode?[oreNode.fragment,oreNode.spark,oreNode.sparkLight]:[woodNode!.chip,woodNode!.chipLight,woodNode!.chipLight];
  const particles=useMemo(()=>SWING_PARTICLES[kind].map(particle=>({particle,tracks:ballisticTracks({...particle,at:impactAt},unit)})),[kind,impactAt,unit]);
  // The node answers each blow with a one-pixel jolt.
  const jolt=useMemo(()=>heldSteps([0,impactAt,impactAt+.07,impactAt+.14,1],kind==='mining'?[0,unit,0,0]:[0,unit,-unit,0]),[impactAt,kind,unit]);
  const flash=useMemo(()=>windowTrack(impactAt,impactAt+.06),[impactAt]);
  const node=oreNode?L.rock:L.tree;
  const background=SCENE_BACKGROUNDS[kind==='mining'?'cave':'forest'][model.biome];
  return <>
    <Layer source={background} left={0} top={0} width={PIXEL_SCENE.width} height={PIXEL_SCENE.height} unit={unit}/>
    {kind==='mining'?<CaveAmbient biome={model.biome} ambient={ambient} unit={unit} motion={motion}/>:null}
    <Layer source={oreNode?oreNode.rock:woodNode!.tree} left={node.left} top={node.top} width={node.width} height={node.height} unit={unit}
      style={motion?{transform:[{translateX:swing.interpolate({...jolt,extrapolate:clamp})}]}:undefined}/>
    <SpriteFrames sheet={sheet} progress={motion?swing:undefined} unit={unit} style={{position:'absolute',left:L.swing.left*unit,top:L.swing.top*unit}}/>
    {motion?<>
      <Pixel x={contact.x-1} y={contact.y-1} size={3} color="#ffffff" unit={unit} opacity={swing.interpolate({...flash,extrapolate:clamp})}/>
      {particles.map(({particle,tracks},index)=><Pixel key={index} x={contact.x} y={contact.y} size={particle.size} color={tones[particle.tone]} unit={unit}
        opacity={swing.interpolate({...tracks.opacity,extrapolate:clamp})}
        translateX={swing.interpolate({...tracks.x,extrapolate:clamp})} translateY={swing.interpolate({...tracks.y,extrapolate:clamp})}/>)}
    </>:null}
    {kind==='woodcutting'?<ForestAmbient biome={model.biome} leaf={woodNode!.leaf} ambient={ambient} unit={unit} motion={motion}/>:null}
    <YieldPop source={oreNode?oreNode.chunk:woodNode!.log} size={oreNode?CHUNK_SIZE:LOG_SIZE} x={node.left+(oreNode?9:14)} y={oreNode?node.top-2:L.choppingContact.y-6}
      unit={unit} clock={clock} enabled={motion}/>
  </>;
}

/** A piece of the resource hops off the node when an action has actually completed. */
function YieldPop({source,size,x,y,unit,clock,enabled}:{source:ImageSourcePropType;size:{width:number;height:number};x:number;y:number;unit:number;clock:SceneProps['clock'];enabled:boolean}){
  const pop=useRef(new Animated.Value(0)).current,[shown,setShown]=useState(false);
  const play=useCallback(()=>{
    setShown(true);pop.stopAnimation();pop.setValue(0);
    Animated.timing(pop,{toValue:1,duration:760,easing:Easing.linear,useNativeDriver:true}).start(({finished})=>{if(finished)setShown(false);});
  },[pop]);
  useActionCompleted(clock,enabled,play);
  useEffect(()=>{if(!enabled){pop.stopAnimation();setShown(false);}},[enabled,pop]);
  const tracks=useMemo(()=>({
    y:heldSteps([0,.1,.2,.32,.46,.6,.72,1],[0,-4,-7,-9,-10,-9,-8].map(value=>value*unit)),
    opacity:heldSteps([0,.02,.8,.9,1],[0,1,.6,0]),
  }),[unit]);
  if(!shown)return null;
  return <Layer source={source} left={x} top={y} width={size.width} height={size.height} unit={unit}
    style={{opacity:pop.interpolate({...tracks.opacity,extrapolate:clamp}),transform:[{translateY:pop.interpolate({...tracks.y,extrapolate:clamp})}]}}/>;
}

// ------------------------------------------------------------------ ambient layers
/** A pixel drifting along a straight path during one window of the ambient loop. */
function Drifter({ambient,unit,color,x,y,dx,dy,from,to,size=1}:{ambient:Progress;unit:number;color:string;x:number;y:number;dx:number;dy:number;from:number;to:number;size?:number}){
  const tracks=useMemo(()=>{
    const samples=Math.max(2,Math.min(14,Math.max(Math.abs(dx),Math.abs(dy)))),starts=[0],xs=[0],ys=[0],alpha=[0];
    for(let i=0;i<samples;i++){
      const t=i/(samples-1);
      starts.push(from+(to-from)*i/samples);xs.push(Math.round(dx*t)*unit);ys.push(Math.round(dy*t)*unit);alpha.push(1);
    }
    starts.push(to);xs.push(0);ys.push(0);alpha.push(0);starts.push(1);
    return {x:heldSteps(starts,xs),y:heldSteps(starts,ys),opacity:heldSteps(starts,alpha)};
  },[dx,dy,from,to,unit]);
  return <Pixel x={x} y={y} size={size} color={color} unit={unit} opacity={track(ambient,tracks.opacity)}
    translateX={track(ambient,tracks.x)} translateY={track(ambient,tracks.y)}/>;
}
function Blink({ambient,unit,color,x,y,from,to,size=1,width,opacity=1}:{ambient:Progress;unit:number;color:string;x:number;y:number;from:number;to:number;size?:number;width?:number;opacity?:number}){
  const visible=useMemo(()=>windowTrack(from,to,opacity),[from,to,opacity]);
  return <Pixel x={x} y={y} size={size} width={width} color={color} unit={unit} opacity={track(ambient,visible)}/>;
}
/** Regional weather: restrained snow, embers or drifting sand. Temperate regions get none. */
function BiomeDrift({biome,ambient,unit}:{biome:GatheringSceneModel['biome'];ambient:Progress;unit:number}){
  const kind=BIOME_PARTICLES[biome].ambient;
  if(kind==='snow')return <>{[[18,.02,.5],[62,.3,.82],[104,.14,.66],[146,.46,.96],[182,.6,.99]].map(([x,from,to],index)=>
    <Drifter key={index} ambient={ambient} unit={unit} color="#ffffff" x={x} y={2} dx={index%2?-5:4} dy={36} from={from} to={to}/>)}</>;
  if(kind==='embers')return <>{[[30,.05,.42],[92,.34,.7],[136,.56,.94],[170,.2,.52]].map(([x,from,to],index)=>
    <Drifter key={index} ambient={ambient} unit={unit} color={index%2?'#ffb04a':'#ff7a3c'} x={x} y={46} dx={index%2?4:-3} dy={-26} from={from} to={to}/>)}</>;
  if(kind==='sand')return <>{[[10,40,.04,.4],[70,43,.5,.86],[130,41,.24,.6]].map(([x,y,from,to],index)=>
    <Drifter key={index} ambient={ambient} unit={unit} color="#f6dfa8" x={x} y={y} dx={22} dy={-2} from={from} to={to}/>)}</>;
  return null;
}
function CaveAmbient({biome,ambient,unit,motion}:{biome:GatheringSceneModel['biome'];ambient:Progress;unit:number;motion:boolean}){
  if(!motion)return null;
  const palette=BIOME_PARTICLES[biome];
  return <>
    {L.caveCrystals.map((crystal,index)=><Blink key={index} ambient={ambient} unit={unit} color="#ffffff" x={crystal.x+1} y={crystal.y} from={.06+index*.23} to={.11+index*.23}/>)}
    {/* Lantern flicker. */}
    <Blink ambient={ambient} unit={unit} color="#fff2c4" x={L.caveLamp.x-1} y={L.caveLamp.y-2} size={2} from={.18} to={.24} opacity={.55}/>
    <Blink ambient={ambient} unit={unit} color="#fff2c4" x={L.caveLamp.x-1} y={L.caveLamp.y-2} size={2} from={.64} to={.68} opacity={.55}/>
    {/* Slow dust motes. */}
    <Drifter ambient={ambient} unit={unit} color={palette.dust} x={86} y={14} dx={-3} dy={12} from={.08} to={.52}/>
    <Drifter ambient={ambient} unit={unit} color={palette.dust} x={132} y={10} dx={2} dy={14} from={.48} to={.94}/>
    {palette.ambient==='embers'?<BiomeDrift biome={biome} ambient={ambient} unit={unit}/>:null}
  </>;
}
function ForestAmbient({biome,leaf,ambient,unit,motion}:{biome:GatheringSceneModel['biome'];leaf:string;ambient:Progress;unit:number;motion:boolean}){
  if(!motion)return null;
  const tuft=BIOME_PARTICLES[biome].leaf;
  return <>
    {/* Occasional leaves let go of the canopy. */}
    <Drifter ambient={ambient} unit={unit} color={leaf} x={L.tree.left+8} y={L.tree.top+24} dx={-6} dy={22} from={.1} to={.5} size={2}/>
    <Drifter ambient={ambient} unit={unit} color={leaf} x={L.tree.left+36} y={L.tree.top+22} dx={5} dy={24} from={.56} to={.97}/>
    {/* Grass tips lean and return. */}
    {[[24,46],[58,47],[136,46],[172,47]].map(([x,y],index)=><Blink key={index} ambient={ambient} unit={unit} color={tuft} x={x} y={y} from={.12+index*.2} to={.24+index*.2}/>)}
    <BiomeDrift biome={biome} ambient={ambient} unit={unit}/>
  </>;
}

// ------------------------------------------------------------------ fishing
const SHIMMER:readonly [number,number,number,0|1][]=[[118,31,5,0],[150,33,4,1],[172,36,6,0],[132,40,4,1],[160,47,6,0],[112,51,5,1],[186,44,4,1]];
const RIPPLE_SHEET=WATER_FX.ripple,SPLASH_SHEET=WATER_FX.splash;

function FishingScene({model,unit,motion,clock,startedAtMs}:SceneProps){
  // A session that has only just begun opens with its cast; otherwise the line is already out.
  const [phase,setPhase]=useState<FishingScenePhase>(()=>Date.now()-startedAtMs<4_000?'cast':'wait');
  const sheet=phase==='cast'?GATHERER_SHEETS.fishingCast:phase==='pull'?GATHERER_SHEETS.fishingPull:GATHERER_SHEETS.fishingWait;
  const progress=useRef(new Animated.Value(0)).current;
  const ambient=useLoopProgress(AMBIENT_MS,motion);
  const palette=BIOME_PARTICLES[model.biome];
  useEffect(()=>{
    progress.stopAnimation();progress.setValue(0);
    if(!motion)return;
    const duration=clipDurationMs(sheet.durationsMs);
    const timing=Animated.timing(progress,{toValue:1,duration,easing:Easing.linear,useNativeDriver:phase==='wait'?LOOP_NATIVE_DRIVER:true});
    if(phase==='wait'){const loop=Animated.loop(timing);loop.start();return()=>loop.stop();}
    timing.start(({finished})=>{if(finished)setPhase(current=>nextFishingPhase(current,'clipEnded'));});
    return()=>timing.stop();
  },[phase,motion,progress,sheet]);
  useEffect(()=>{if(!motion)setPhase('wait');},[motion]);
  // The catch reaction is earned: it only starts when a fishing action has really completed.
  useActionCompleted(clock,motion,()=>setPhase(current=>nextFishingPhase(current,'actionCompleted')));
  const splash=useMemo(()=>{
    const landsAt=frameStarts(GATHERER_SHEETS.fishingCast.durationsMs)[GATHERER_SHEETS.fishingCast.frames-1];
    return phase==='cast'?{from:landsAt,to:.999}:{from:.002,to:.42};
  },[phase]);
  const shimmer=useMemo(()=>[0,1].map(group=>heldSteps([0,.125,.25,.375,.5,.625,.75,.875,1],[0,1,2,3,4,5,6,7].map(step=>step%2===group?.85:0))),[]);
  const waterLight=model.cavePool?'#8fd9d2':palette.waterLight;
  return <>
    <Layer source={model.cavePool?CAVE_POOL_BACKGROUND:SCENE_BACKGROUNDS.water[model.biome]} left={0} top={0} width={PIXEL_SCENE.width} height={PIXEL_SCENE.height} unit={unit}/>
    {motion?<>
      {SHIMMER.map(([x,y,width,group],index)=><Pixel key={index} x={x} y={y} width={width} color={waterLight} unit={unit} opacity={ambient.interpolate({...shimmer[group],extrapolate:clamp})}/>)}
      {/* A stray ring further out, so the water is alive between bites. */}
      <FxWindow sheet={RIPPLE_SHEET} source={ambient} from={.58} to={.76} x={148} y={36} unit={unit} tint={waterLight}/>
      {phase==='wait'?<FxWindow sheet={RIPPLE_SHEET} source={ambient} from={.12} to={.3} x={L.bobber.x-10} y={L.bobber.y-3} unit={unit} tint={waterLight}/>:null}
      {!model.cavePool?<BiomeDrift biome={model.biome} ambient={ambient} unit={unit}/>:null}
    </>:null}
    <SpriteFrames key={phase} sheet={sheet} progress={motion?progress:undefined} unit={unit} style={{position:'absolute',left:L.fishing.left*unit,top:L.fishing.top*unit}}/>
    {motion&&phase!=='wait'?<FxWindow key={'splash:'+phase} sheet={SPLASH_SHEET} source={progress} from={splash.from} to={splash.to} x={L.bobber.x-5} y={L.bobber.y-6} unit={unit}/>:null}
  </>;
}

/** Plays a small sheet during one window of a longer progress value, hidden outside it. */
function FxWindow({sheet,source,from,to,x,y,unit,tint}:{sheet:typeof RIPPLE_SHEET|typeof SPLASH_SHEET;source:Progress;from:number;to:number;x:number;y:number;unit:number;tint?:string}){
  const local=useMemo(()=>track(source,{inputRange:[from,to],outputRange:[0,1]}),[source,from,to]);
  const opacity=useMemo(()=>track(source,windowTrack(from,to)),[source,from,to]);
  return <Animated.View style={{position:'absolute',left:x*unit,top:y*unit,opacity}}><SpriteFrames sheet={sheet} progress={local} unit={unit} tintColor={tint}/></Animated.View>;
}

const s=StyleSheet.create({
  window:{width:'100%',overflow:'hidden',alignItems:'center',borderRadius:8,borderWidth:1,borderColor:'#1a1520',backgroundColor:'#10161d'},
});
