export type ProfileParticleKind='arcane'|'snowflake'|'ember'|'leaf'|'firefly';
export type ProfileMotionProfile='gloamward'|'frostbound'|'amberglass'|'briarbound'|'celestial'|'draconic'|'abyssal'|'paradox';
export interface ProfileProceduralTrack{
 particle:ProfileParticleKind;points:readonly (readonly [number,number])[];phase:number;width:number;maxDp:number;opacity:number;rotation:number;cycles:number;
}
export interface ProfileProceduralGlow{x:number;y:number;size:number;periodMs:number;phaseMs:number;peakOpacity:number}
export interface ProfileCosmeticRuntime{
 borderId:string;fallbackBorderId:string;effectId:string;collection:string;effectName:string;motionProfile:ProfileMotionProfile;
 accent:string;softAccent:string;effectPeriodMs:number;glows:readonly ProfileProceduralGlow[];tracks:readonly ProfileProceduralTrack[];
}
const G=(x:number,y:number,size:number,periodMs:number,phaseMs:number,peakOpacity=.72):ProfileProceduralGlow=>({x,y,size,periodMs,phaseMs,peakOpacity});
const T=(particle:ProfileParticleKind,points:readonly (readonly [number,number])[],phase:number,width:number,maxDp:number,opacity:number,rotation:number,cycles:number):ProfileProceduralTrack=>({particle,points,phase,width,maxDp,opacity,rotation,cycles});
export const PROFILE_COSMETIC_RUNTIME:readonly ProfileCosmeticRuntime[]=[
 {borderId:'cosmetic:gloamward:arcane-frame',fallbackBorderId:'frame_gloamward',effectId:'effect_gloamward_wisps',collection:'Gloamward',effectName:'Arcane Wisps',motionProfile:'gloamward',accent:'#B998FF',softAccent:'#6D46C7',effectPeriodMs:11800,
  glows:[G(.09,.16,9,2400,0,.86),G(.28,.08,7,3100,700,.86),G(.74,.09,8,2700,1200,.86),G(.91,.18,11,3400,1800,.86),G(.92,.63,8,2800,2300,.86),G(.78,.91,11,3200,3000,.86),G(.48,.94,7,2600,3500,.86),G(.16,.87,9,3600,4100,.86)],
  tracks:[
   T('arcane',[[.10,.74],[.22,.55],[.40,.43],[.58,.34]],3,.0415,17,.702,110,1),
   T('arcane',[[.42,.82],[.55,.64],[.71,.52],[.88,.27]],19,.0329,15,.585,-90,.9),
   T('arcane',[[.72,.72],[.82,.54],[.91,.38],[.95,.18]],43,.0281,12,.546,140,1.2),
   T('arcane',[[.20,.42],[.31,.34],[.45,.28],[.62,.22]],68,.0244,11,.416,-160,.8),
   T('firefly',[[.63,.76],[.73,.64],[.78,.47],[.86,.35]],81,.022,10,.442,0,1.1),
  ]},
 {borderId:'cosmetic:frostbound:chime-frame',fallbackBorderId:'dungeon:frostmarch:frostbound-chime',effectId:'effect_frostbound_winter_veil',collection:'Frostbound Chime',effectName:'Winter Veil',motionProfile:'frostbound',accent:'#D8F3FF',softAccent:'#73BEE6',effectPeriodMs:12600,
  glows:[G(.07,.17,8,3000,0,.86),G(.24,.07,7,2600,550,.86),G(.50,.05,8,3200,1000,.86),G(.76,.07,7,2700,1600,.86),G(.93,.18,9,3500,2200,.86),G(.91,.80,8,2800,2800,.86),G(.68,.94,9,3300,3500,.86),G(.28,.94,8,3000,4200,.86)],
  tracks:[
   T('snowflake',[[.13,-.06],[.18,.30],[.15,.68],[.20,1.05]],7,.039,17,.715,190,1),
   T('snowflake',[[.36,-.10],[.42,.28],[.38,.66],[.44,1.04]],28,.0293,13,.572,-230,1.15),
   T('snowflake',[[.62,-.08],[.57,.24],[.66,.61],[.61,1.06]],47,.0342,16,.65,260,.95),
   T('snowflake',[[.86,-.06],[.91,.22],[.84,.56],[.90,1.04]],69,.0268,12,.52,-190,1.2),
   T('snowflake',[[.72,.02],[.80,.19],[.88,.36],[.93,.58]],88,.022,10,.39,150,.8),
  ]},
 {borderId:'cosmetic:amberglass:loop-frame',fallbackBorderId:'dungeon:sunscar:amberglass-loop',effectId:'effect_amberglass_ember_motes',collection:'Amberglass Loop',effectName:'Ember Motes',motionProfile:'amberglass',accent:'#FFD58A',softAccent:'#D47A27',effectPeriodMs:10800,
  glows:[G(.08,.25,8,3000,0,.86),G(.11,.67,9,2600,500,.86),G(.28,.92,8,3300,1100,.86),G(.50,.95,9,2800,1700,.86),G(.72,.91,8,3500,2300,.86),G(.91,.69,9,3000,2900,.86),G(.92,.30,8,2700,3500,.86),G(.78,.09,7,3200,4100,.86)],
  tracks:[
   T('ember',[[.18,1.02],[.23,.78],[.30,.52],[.38,.28]],5,.0342,15,.715,-120,1),
   T('ember',[[.42,1.03],[.47,.76],[.55,.48],[.65,.18]],24,.0268,12,.585,160,1.15),
   T('ember',[[.69,1.02],[.72,.74],[.78,.46],[.86,.14]],44,.0317,13,.676,-180,.95),
   T('ember',[[.84,.88],[.88,.66],[.91,.43],[.95,.20]],63,.022,10,.468,130,1.25),
   T('arcane',[[.58,.80],[.69,.63],[.78,.42],[.88,.30]],87,.0195,9,.351,80,.75),
  ]},
 {borderId:'cosmetic:briarbound:verdant-frame',fallbackBorderId:'dungeon:asterfall:briarbound-frame',effectId:'effect_briarbound_verdant_whispers',collection:'Briarbound',effectName:'Verdant Whispers',motionProfile:'briarbound',accent:'#9DE59A',softAccent:'#3E9D63',effectPeriodMs:13200,
  glows:[G(.08,.18,8,3500,0,.86),G(.09,.50,9,2900,600,.86),G(.13,.81,8,3300,1200,.86),G(.34,.94,9,2800,1800,.86),G(.66,.94,8,3600,2500,.86),G(.90,.79,9,3100,3100,.86),G(.92,.45,8,3400,3800,.86),G(.88,.16,9,3000,4400,.86)],
  tracks:[
   T('leaf',[[.08,.10],[.24,.27],[.43,.44],[.60,.65]],8,.0415,18,.65,240,.75),
   T('leaf',[[.34,-.04],[.47,.22],[.60,.48],[.74,.78]],31,.0342,16,.585,-260,.85),
   T('leaf',[[.76,.04],[.83,.24],[.88,.48],[.82,.78]],54,.0293,13,.494,210,.95),
   T('firefly',[[.18,.72],[.31,.58],[.48,.47],[.66,.38]],70,.022,10,.546,0,1),
   T('firefly',[[.62,.82],[.72,.64],[.84,.43],[.93,.24]],92,.0195,9,.468,0,1.15),
  ]},
 {borderId:'premium:celestial-sovereign:crown-of-cosmos',fallbackBorderId:'guild-border-royal',effectId:'premium:celestial-sovereign:celestial-alignment',collection:'Celestial Sovereign',effectName:'Celestial Alignment',motionProfile:'celestial',accent:'#F5D982',softAccent:'#7181C8',effectPeriodMs:15000,
  glows:[G(.10,.12,9,3200,0),G(.30,.05,7,4000,700),G(.50,.04,10,3600,1400),G(.70,.05,7,4200,2100),G(.90,.13,9,3400,2800),G(.88,.88,8,3800,3500),G(.50,.95,9,4500,4200),G(.12,.86,8,3700,4800)],
  tracks:[T('arcane',[[.12,.72],[.28,.52],[.48,.34],[.70,.18]],5,.028,13,.58,170,1),T('firefly',[[.38,.82],[.52,.58],[.68,.34],[.86,.16]],28,.020,10,.48,0,1.2),T('arcane',[[.82,.68],[.88,.46],[.91,.28],[.88,.10]],52,.024,11,.48,-150,.9),T('firefly',[[.18,.34],[.34,.26],[.54,.22],[.76,.30]],78,.016,8,.38,0,.75),T('arcane',[[.62,.76],[.70,.58],[.78,.42],[.90,.30]],96,.018,9,.36,220,1.1)]},
 {borderId:'premium:draconic-dominion:throne-of-embers',fallbackBorderId:'dungeon:sunscar:amberglass-loop',effectId:'premium:draconic-dominion:awakening-of-the-dragon',collection:'Draconic Dominion',effectName:'Awakening of the Dragon',motionProfile:'draconic',accent:'#FF8A45',softAccent:'#9E332D',effectPeriodMs:9800,
  glows:[G(.08,.20,9,2400,0),G(.18,.88,8,3000,500),G(.42,.95,10,2200,1100),G(.70,.92,9,2800,1700),G(.92,.76,10,2500,2300),G(.94,.38,8,3200,2900),G(.85,.10,8,2600,3500)],
  tracks:[T('ember',[[.12,1.02],[.22,.76],[.34,.48],[.46,.18]],4,.032,15,.66,-180,1.3),T('ember',[[.38,1.04],[.48,.74],[.60,.44],[.74,.12]],22,.026,13,.56,210,1.1),T('ember',[[.68,1.02],[.76,.70],[.84,.40],[.92,.14]],44,.030,14,.60,-230,1.25),T('arcane',[[.20,.74],[.42,.60],[.66,.50],[.88,.34]],70,.018,9,.34,120,.8),T('ember',[[.78,.88],[.84,.68],[.90,.45],[.94,.22]],91,.020,10,.40,160,1.4)]},
 {borderId:'premium:abyssal-majesty:crown-of-the-depths',fallbackBorderId:'frame_gloamward',effectId:'premium:abyssal-majesty:call-of-the-deep',collection:'Abyssal Majesty',effectName:'Call of the Deep',motionProfile:'abyssal',accent:'#6CF2EB',softAccent:'#176F83',effectPeriodMs:14200,
  glows:[G(.07,.16,8,4200,0),G(.14,.82,9,3600,700),G(.38,.94,7,4500,1500),G(.66,.93,8,3900,2200),G(.91,.78,9,4300,3000),G(.93,.30,8,3700,3800),G(.76,.08,7,4600,4500)],
  tracks:[T('firefly',[[.14,.20],[.24,.38],[.38,.58],[.54,.76]],8,.024,12,.52,0,.7),T('arcane',[[.82,.14],[.72,.32],[.66,.52],[.58,.78]],31,.022,11,.44,200,.8),T('firefly',[[.20,.72],[.36,.60],[.54,.50],[.74,.42]],55,.018,9,.38,0,1),T('arcane',[[.70,.82],[.78,.62],[.86,.42],[.92,.18]],77,.020,10,.42,-190,.75),T('firefly',[[.36,.18],[.50,.26],[.64,.34],[.80,.30]],100,.016,8,.32,0,.65)]},
 {borderId:'premium:paradox-eternal:fractured-eternity',fallbackBorderId:'guild-border-silver',effectId:'premium:paradox-eternal:reality-rewritten',collection:'Paradox Eternal',effectName:'Reality Rewritten',motionProfile:'paradox',accent:'#EDEBFF',softAccent:'#8E71C9',effectPeriodMs:12000,
  glows:[G(.06,.12,8,2800,0),G(.30,.05,7,3500,700),G(.56,.08,9,2400,1500),G(.90,.14,8,3200,2200),G(.94,.64,9,2600,3000),G(.72,.93,7,3700,3700),G(.38,.95,8,2900,4400),G(.10,.78,9,3300,5000)],
  tracks:[T('arcane',[[.08,.28],[.32,.36],[.58,.24],[.88,.34]],3,.025,12,.54,300,1.4),T('snowflake',[[.86,.08],[.72,.30],[.78,.54],[.60,.78]],26,.022,11,.42,-280,1.1),T('arcane',[[.18,.82],[.40,.64],[.58,.46],[.82,.22]],49,.020,10,.44,260,1.25),T('snowflake',[[.36,.12],[.52,.32],[.44,.56],[.64,.82]],72,.018,9,.32,-220,.95),T('firefly',[[.68,.78],[.82,.60],[.74,.38],[.90,.18]],96,.016,8,.36,0,1.5)]},
] as const;
export const profileCosmeticRuntimeByBorder=new Map(PROFILE_COSMETIC_RUNTIME.map(row=>[row.borderId,row]));
export const profileCosmeticRuntimeByEffect=new Map(PROFILE_COSMETIC_RUNTIME.map(row=>[row.effectId,row]));
