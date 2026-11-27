/** Ultra Luxe IV: review-only design and rendering contracts.
 * No catalogue registration, entitlements or live routes. */
export const PARADOX_IDS={
 background:'ascendant-paradox-beyond-the-veil',border:'ascendant-paradox-fractured-eternity',
 pet:'ascendant-paradox-aeon',showcase:'ascendant-paradox-reality-rewritten',badge:'ascendant_beyond_existence',
} as const;
export const PARADOX_COLLECTION={
 id:'ascendant-paradox-eternal',name:'Paradox Eternal',backgroundName:'Beyond the Veil',
 borderName:'Fractured Eternity',petName:'Aeon, the Timeless',showcaseName:'Reality Rewritten',
 badgeName:'Beyond Existence',accent:'#EDEBFF',softAccent:'#8E71C9',
} as const;
export const PARADOX_STAGE={width:340,height:205,minWidth:320,maxWidth:480,maxFontScale:1.05} as const;
export const PARADOX_BOXES={
 plate:{x:35,y:69,w:183,h:72},portrait:{x:40,y:76,w:54,h:54},
 identity:{x:100,y:74,w:112,h:45},badges:{x:100,y:119,w:110,h:21},guild:{x:35,y:143,w:183,h:16},
 aeon:{x:230,y:64,w:76,h:86},aura:{x:226,y:57,w:84,h:98},alternate:{x:245,y:89,w:46,h:46},
} as const;
export const PARADOX_CYCLE_MS=24000;
export const PARADOX_PHASE=[0,2/24,4/24,8/24,11/24,14/24,16/24,19/24,22/24,1] as const;
export const PARADOX_ENERGY=[0,.68,.85,.32,.58,.86,1,.66,.24,0] as const;
export function paradoxAwakeningCurve(){
 const phase:number[]=[0],energy:number[]=[0];
 for(let i=1;i<PARADOX_PHASE.length;i++)for(let j=1;j<=4;j++){
  const t=j/4,e=t*t*(3-2*t),a=PARADOX_PHASE[i-1],b=PARADOX_PHASE[i];
  phase.push(j===4?b:a+(b-a)*t);
  energy.push(j===4?PARADOX_ENERGY[i]:PARADOX_ENERGY[i-1]+(PARADOX_ENERGY[i]-PARADOX_ENERGY[i-1])*e);
 }
 return {phase,energy};
}
export function paradoxStageSupported(width:number,fontScale:number){
 const s=PARADOX_STAGE;
 return Number.isFinite(width)&&width>=s.minWidth&&width<=s.maxWidth&&Number.isFinite(fontScale)&&fontScale>0&&fontScale<=s.maxFontScale;
}
export function paradoxPetMode(pet?:string|null,alternateArt=false){
 return pet===PARADOX_IDS.pet?'matching':pet&&alternateArt?'alternate':'none';
}
export const PARADOX_BUDGET={standardBorderNodes:6,showcaseBorderNodes:8,ambientNodes:3,petAtlasFps:12,maxPetFrames:48,maxPetLift:3,badgeAnimatedNodes:0} as const;
/** Two opposing temporal glints fade to zero at the fold point before changing
 * direction. No full-card distortion, opacity flicker or shifting content. */
export const PARADOX_GLINT_PHASE=[0,2/24,6/24,10/24,12/24,14/24,16/24,20/24,22/24,1] as const;
export const PARADOX_GLINT_PATHS=[
 [[48,18],[75,18],[142,18],[280,18],[292,18],[280,18],[170,18],[75,18],[48,18],[48,18]],
 [[292,189],[265,189],[198,189],[60,189],[48,189],[60,189],[170,189],[265,189],[292,189],[292,189]],
] as const;
export const PARADOX_GLINT_OPACITY=[.18,.7,.48,.25,0,.4,.95,.48,.3,.18] as const;

export const PARADOX_REVIEW={collectionId:PARADOX_COLLECTION.id,titleId:'ascendant-paradox-title',effectId:'premium:paradox-eternal:reality-rewritten'} as const;
export type ParadoxSelection={background?:string|null;border?:string|null;pet?:string|null;effect?:string|null;verifiedTitleId?:string|null;displayedBadges?:readonly string[]};
/** Explicit trusted review grant, exact equipped pieces; does not grant or persist ownership. */
export function paradoxReviewTier(enabled:boolean,verifiedIds:readonly string[],selection:ParadoxSelection):'hidden'|'paired'|'awakened'|'ascendant'{
 if(!enabled||!verifiedIds.includes(PARADOX_REVIEW.collectionId))return 'hidden';
 if(selection.background!==PARADOX_IDS.background||selection.border!==PARADOX_IDS.border)return 'hidden';
 if(selection.effect&&selection.effect!==PARADOX_REVIEW.effectId)return 'hidden';
 if(selection.pet!==PARADOX_IDS.pet)return 'paired';
 return selection.verifiedTitleId===PARADOX_REVIEW.titleId&&selection.displayedBadges?.includes(PARADOX_IDS.badge)?'ascendant':'awakened';
}
export const PARADOX_IDLE_PHASE=Array.from({length:49},(_,i)=>i/48);
export const PARADOX_IDLE_LIFT=PARADOX_IDLE_PHASE.map(t=>t===0||t===1?0:-1.5*(1-Math.cos(2*Math.PI*6*t))/2);
export const PARADOX_AMBIENT_PATHS=[
 [[239,40],[266,29],[297,40],[310,53],[297,40],[266,29],[239,40]],
 [[239,165],[261,174],[287,165],[310,164],[287,165],[261,174],[239,165]],
 [[35,42],[75,37],[110,43],[145,36],[110,43],[75,37],[35,42]],
] as const;

/** One 3-second idle cycle repeated eight times by the existing scene clock. */
export const PARADOX_POSE_ATLAS={frameWidth:112,frameHeight:128,columns:6,rows:6,frames:36,seconds:3,cycles:8} as const;
export function paradoxPoseTimeline(){
 const a=PARADOX_POSE_ATLAS,inputRange=[0],frames=[0];
 for(let i=1;i<=a.frames;i++){
  inputRange.push(i/a.frames-.0005/a.seconds,i/a.frames);
  frames.push(i-1,i%a.frames);
 }
 return {inputRange,frames};
}
export function paradoxPoseCell(frame:number){
 return {column:frame%PARADOX_POSE_ATLAS.columns,row:Math.floor(frame/PARADOX_POSE_ATLAS.columns)};
}

/** Matching pet tap: three local shards orbit outward within the aura, plus
 * a single subtle halo. No extra ambient loop; the shared one-shot drives it. */
export const PARADOX_REACTION={center:{x:268,y:105},halo:{w:50,h:48,maxScale:1.20},moteRadius:3,shards:[
 {x:-13,y:-13,dx:-10,dy:-10},{x:13,y:-11,dx:11,dy:-12},{x:0,y:13,dx:0,dy:13},
]} as const;
