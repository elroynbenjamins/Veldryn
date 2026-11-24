export type ProfileParticleKind='arcane'|'snowflake'|'ember'|'leaf'|'firefly';
export type ProfileMotionProfile='gloamward'|'frostbound'|'amberglass'|'briarbound';
export interface ProfileProceduralTrack{
 particle:ProfileParticleKind;points:readonly (readonly [number,number])[];phase:number;width:number;maxDp:number;opacity:number;rotation:number;cycles:number;
}
export interface ProfileProceduralGlow{x:number;y:number;size:number;periodMs:number;phaseMs:number;peakOpacity:number}
export interface ProfileCosmeticRuntime{
 borderId:string;effectId:string;collection:string;effectName:string;motionProfile:ProfileMotionProfile;
 accent:string;softAccent:string;effectPeriodMs:number;glows:readonly ProfileProceduralGlow[];tracks:readonly ProfileProceduralTrack[];
}
const G=(x:number,y:number,size:number,periodMs:number,phaseMs:number,peakOpacity=.72):ProfileProceduralGlow=>({x,y,size,periodMs,phaseMs,peakOpacity});
const T=(particle:ProfileParticleKind,points:readonly (readonly [number,number])[],phase:number,width:number,maxDp:number,opacity:number,rotation:number,cycles:number):ProfileProceduralTrack=>({particle,points,phase,width,maxDp,opacity,rotation,cycles});
export const PROFILE_COSMETIC_RUNTIME:readonly ProfileCosmeticRuntime[]=[
 {borderId:'frame_gloamward',effectId:'effect_gloamward_wisps',collection:'Gloamward',effectName:'Arcane Wisps',motionProfile:'gloamward',accent:'#B998FF',softAccent:'#6D46C7',effectPeriodMs:11800,
  glows:[G(.09,.16,8,2400,0),G(.28,.08,6,3100,700),G(.74,.09,7,2700,1200),G(.91,.18,9,3400,1800),G(.92,.63,7,2800,2300),G(.78,.91,9,3200,3000),G(.48,.94,6,2600,3500),G(.16,.87,8,3600,4100)],
  tracks:[
   T('arcane',[[.10,.74],[.22,.55],[.40,.43],[.58,.34]],3,.034,14,.54,110,1),
   T('arcane',[[.42,.82],[.55,.64],[.71,.52],[.88,.27]],19,.027,12,.45,-90,.9),
   T('arcane',[[.72,.72],[.82,.54],[.91,.38],[.95,.18]],43,.023,10,.42,140,1.2),
   T('arcane',[[.20,.42],[.31,.34],[.45,.28],[.62,.22]],68,.020,9,.32,-160,.8),
   T('firefly',[[.63,.76],[.73,.64],[.78,.47],[.86,.35]],81,.018,8,.34,0,1.1),
  ]},
 {borderId:'dungeon:frostmarch:frostbound-chime',effectId:'effect_frostbound_winter_veil',collection:'Frostbound Chime',effectName:'Winter Veil',motionProfile:'frostbound',accent:'#D8F3FF',softAccent:'#73BEE6',effectPeriodMs:12600,
  glows:[G(.07,.17,7,3000,0),G(.24,.07,6,2600,550),G(.50,.05,7,3200,1000),G(.76,.07,6,2700,1600),G(.93,.18,8,3500,2200),G(.91,.80,7,2800,2800),G(.68,.94,8,3300,3500),G(.28,.94,7,3000,4200)],
  tracks:[
   T('snowflake',[[.13,-.06],[.18,.30],[.15,.68],[.20,1.05]],7,.032,14,.55,190,1),
   T('snowflake',[[.36,-.10],[.42,.28],[.38,.66],[.44,1.04]],28,.024,11,.44,-230,1.15),
   T('snowflake',[[.62,-.08],[.57,.24],[.66,.61],[.61,1.06]],47,.028,13,.50,260,.95),
   T('snowflake',[[.86,-.06],[.91,.22],[.84,.56],[.90,1.04]],69,.022,10,.40,-190,1.2),
   T('snowflake',[[.72,.02],[.80,.19],[.88,.36],[.93,.58]],88,.018,8,.30,150,.8),
  ]},
 {borderId:'dungeon:sunscar:amberglass-loop',effectId:'effect_amberglass_ember_motes',collection:'Amberglass Loop',effectName:'Ember Motes',motionProfile:'amberglass',accent:'#FFD58A',softAccent:'#D47A27',effectPeriodMs:10800,
  glows:[G(.08,.25,7,3000,0),G(.11,.67,8,2600,500),G(.28,.92,7,3300,1100),G(.50,.95,8,2800,1700),G(.72,.91,7,3500,2300),G(.91,.69,8,3000,2900),G(.92,.30,7,2700,3500),G(.78,.09,6,3200,4100)],
  tracks:[
   T('ember',[[.18,1.02],[.23,.78],[.30,.52],[.38,.28]],5,.028,12,.55,-120,1),
   T('ember',[[.42,1.03],[.47,.76],[.55,.48],[.65,.18]],24,.022,10,.45,160,1.15),
   T('ember',[[.69,1.02],[.72,.74],[.78,.46],[.86,.14]],44,.026,11,.52,-180,.95),
   T('ember',[[.84,.88],[.88,.66],[.91,.43],[.95,.20]],63,.018,8,.36,130,1.25),
   T('arcane',[[.58,.80],[.69,.63],[.78,.42],[.88,.30]],87,.016,7,.27,80,.75),
  ]},
 {borderId:'dungeon:asterfall:briarbound-frame',effectId:'effect_briarbound_verdant_whispers',collection:'Briarbound',effectName:'Verdant Whispers',motionProfile:'briarbound',accent:'#9DE59A',softAccent:'#3E9D63',effectPeriodMs:13200,
  glows:[G(.08,.18,7,3500,0),G(.09,.50,8,2900,600),G(.13,.81,7,3300,1200),G(.34,.94,8,2800,1800),G(.66,.94,7,3600,2500),G(.90,.79,8,3100,3100),G(.92,.45,7,3400,3800),G(.88,.16,8,3000,4400)],
  tracks:[
   T('leaf',[[.08,.10],[.24,.27],[.43,.44],[.60,.65]],8,.034,15,.50,240,.75),
   T('leaf',[[.34,-.04],[.47,.22],[.60,.48],[.74,.78]],31,.028,13,.45,-260,.85),
   T('leaf',[[.76,.04],[.83,.24],[.88,.48],[.82,.78]],54,.024,11,.38,210,.95),
   T('firefly',[[.18,.72],[.31,.58],[.48,.47],[.66,.38]],70,.018,8,.42,0,1),
   T('firefly',[[.62,.82],[.72,.64],[.84,.43],[.93,.24]],92,.016,7,.36,0,1.15),
  ]},
] as const;
export const profileCosmeticRuntimeByBorder=new Map(PROFILE_COSMETIC_RUNTIME.map(row=>[row.borderId,row]));
export const profileCosmeticRuntimeByEffect=new Map(PROFILE_COSMETIC_RUNTIME.map(row=>[row.effectId,row]));
