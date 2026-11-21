/** Canonical Skills 2.0 DESIGN identity. Combat effects are authored separately.
 * All names/variants come from the approved 2026-11-18 v0.4 concept catalogue.
 * This module is inert until an authoritative server adapter explicitly invokes it.
 */
import type {BuildCatalogV2,ClassIdV2,EquipmentInstanceV2,SetFamilyV2,ActiveSkillV2,PassiveNodeV2,SpecializationV2} from './build-contract';

export const CLASS_NAMES_V2:Readonly<Record<ClassIdV2,string>>={
  IRONWARDEN:'Ironwarden',BASTION:'Bastion',DREADGUARD:'Dreadguard',WAYFINDER:'Wayfinder',
  RAVAGER:'Ravager',HEXWEAVER:'Hexweaver',KNIFE_DANCER:'Knife Dancer',
  DAWNKEEPER:'Dawnkeeper',STONECALLER:'Stonecaller',
};
export const SKILL_CONCEPT_IDENTITY_V2={"Ironwarden":{"s":[["Sentinel","Oathkeeper"],["Warlord","Runic Retribution"]],"a":[["Rune Challenge",9,["Vow of Steel","Provocation","War Cry"]],["Oathwall",12,["Stone Oath","Shared Oath","Reflective Oath"]],["Rune Bash",7,["Silencing Rune","Breaker Rune","Guarding Rune"]],["Iron Riposte",8,["Unbroken","Punisher","Rallying"]],["Shieldline",14,["Hold Fast","Battle Line","Bastion Link"]],["Runic Judgment",11,["Execution Seal","Defiant Seal","Binding Seal"]]],"p":[["Iron Skin","Steady Guard","Last Bastion"],["Firm Challenge","Shared Resolve","Stand Together"],["Tempered Edge","Rune Sparks","Vengeful Rhythm"]]},"Bastion":{"s":[["Fortress","Immovable"],["Guardian","Sheltering Wall"]],"a":[["Bastion Challenge",9,["Anchor","Defender","Iron Threat"]],["Layered Fortress",12,["Granite","Shelter","Reinforced"]],["Fortress Rebuff",8,["Heavy Rebuff","Sentry Rebuff","Crushing Rebuff"]],["Stone Brace",10,["Enduring Brace","Shared Brace","Iron Counter"]],["Bulwark Pulse",15,["Deep Foundation","Wide Rampart","Renewing Stone"]],["Citadel Slam",11,["Quake","Unyielding","Siegebreak"]]],"p":[["Stonehide","Thick Walls","Immovability"],["Cover Line","Safe Passage","Last Refuge"],["Heavy Presence","Seismic Guard","Unbroken Line"]]},"Dreadguard":{"s":[["Bloodbound","Blood Oath"],["Harbinger","Dread Dominion"]],"a":[["Dread Challenge",9,["Grim Call","Blood Call","Terror Call"]],["Grim Resolve",8,["Sanguine","Defiance","Cruel Recovery"]],["Binding Chain",7,["Severing Chain","Barbed Chain","Iron Chain"]],["Soul Rend",9,["Blood Rend","Terror Rend","Savage Rend"]],["Dark Mantle",14,["Graveguard","Oppressive","Bloodveil"]],["Harbinger Strike",12,["Execution Chain","Unnerving","Reaper Guard"]]],"p":[["Blood Iron","Pain Dividend","Scar Pact"],["Dark Presence","Deep Terror","Oppressive Gaze"],["Cursed Chain","Predator","Unbroken Will"]]},"Wayfinder":{"s":[["Deadeye","Perfect Aim"],["Pathfinder","Unbroken Trail"]],"a":[["Perfect Quarry",7,["Sniper","Reliable","Hunting Party"]],["Windshot",5,["Gale","Piercing","Swift"]],["Hunter Mark",10,["Weak Point","Trapper","Coordinated"]],["Twin Arrows",8,["Volley","Twin Fang","Defensive Fire"]],["Snare Shot",11,["Binding","Predator","Escape"]],["Heartseeker",14,["Execution","Hawkeye","Steady Hand"]]],"p":[["Eagle Eye","Deadly Window","True Shot"],["Quick Nock","Relentless Arrows","Unbroken Pace"],["Lightfoot","Trail Sense","Second Wind"]]},"Ravager":{"s":[["Executioner","Final Verdict"],["Berserker","Unbound Fury"]],"a":[["Crush Guard",7,["Shatter","Maul","Rallybreak"]],["Titan Swing",5,["Brutal","Wild","Guarded"]],["Bloodrush",10,["Reckless","Measured","Predatory"]],["Sunder Blow",8,["Armor Break","Bonebreak","Seismic"]],["Overpower",12,["Finisher","Warpath","Skullguard"]],["War Cry",16,["Slaughter","Iron Will","Shared Roar"]]],"p":[["Heavy Hands","Weak Point","Merciless"],["Adrenaline","Relentless","Unchained"],["Scarred","Steel Nerves","Kill Sustain"]]},"Hexweaver":{"s":[["Cursebinder","Endless Weave"],["Voidcaller","Void Surge"]],"a":[["Black Thread",7,["Wither","Rupture","Deep Hex"]],["Null Script",8,["Silence Script","Erase Script","Siphon Script"]],["Curse of Frailty",12,["Withering","Exposed","Safeguard"]],["Arcane Needle",5,["Forked","Focused","Lingering"]],["Hex Detonation",11,["Voidburst","Soul Rend","Corruption"]],["Veil of Ash",15,["Twilight","Cinder Veil","Spell Echo"]]],"p":[["Deep Ink","Long Curse","Unravel"],["Spell Force","Thread Focus","Void Memory"],["Shadow Ward","Arcane Footing","Calm Mind"]]},"Knife Dancer":{"s":[["Bladedancer","Scarlet Crescendo"],["Shadowblade","Silent Answer"]],"a":[["Scarlet Loop",5,["Flurry","Red Edge","Shadow Arc"]],["Feintstep",4,["Ghoststep","Lunge","Counterstep"]],["Blade Flurry",8,["Rapid","Precise","Shadow"]],["Twin Fang",7,["Venom","Finisher","Safe Cut"]],["Shadow Veil",14,["Untouchable","Assassin","Smoke Screen"]],["Final Dance",12,["Blood Waltz","Perfect Finale","Flow State"]]],"p":[["Quick Steel","Chain Keeper","Endless Dance"],["Fine Edge","Critical Tempo","Perfect Point"],["Light Steps","Countercraft","Exit Wound"]]},"Dawnkeeper":{"s":[["Lightbringer","Dawn Renewal"],["Sunwarden","Solar Covenant"]],"a":[["Dawn Mend",5,["Mercy","Steady Dawn","Battle Dawn"]],["Sunthread",9,["Golden Thread","Shared Thread","Vital Thread"]],["Sun Smite",6,["Searing","Merciful","Dazzling"]],["Beacon of Hope",13,["Bastion Sun","Shared Light","Renewal"]],["Purifying Light",14,["Cleanse","Restoration","Shielded Purity"]],["Solar Hymn",17,["Sanctuary","War Hymn","Enduring Hymn"]]],"p":[["Gentle Hands","Healing Flow","Last Light"],["Blessed Shield","Safe Dawn","Grace"],["Burning Hope","Inspiring Light","Chorus"]]},"Stonecaller":{"s":[["Earthwarden","Living Mountain"],["Runeshaper","Ritual Surge"]],"a":[["Resonant Armor",7,["Granite","Conduit","Electric"]],["River Stone",7,["Spring","Cleansing Stream","Mender"]],["Thunder Totem",7,["Storm Drum","Runic Totem","Earth Totem"]],["Earthen Grasp",10,["Quake","Stormbind","Safeguard"]],["Seismic Shelter",14,["Deep Roots","Wide Roots","Living Stone"]],["Resonance Burst",16,["Earth Song","Storm Song","River Song"]]],"p":[["Stone Bond","Earthskin","Deep Shelter"],["Clear Tone","Echo Flow","Harmonic Circle"],["Storm Spark","Static Rhythm","Thundermark"]]}} as const;

export const idPartV2=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
export const specializationIdV2=(classId:ClassIdV2,name:string)=>'v2:spec:'+idPartV2(classId)+':'+idPartV2(name);
export const skillIdV2=(classId:ClassIdV2,name:string)=>'v2:skill:'+idPartV2(classId)+':'+idPartV2(name);
export const variantIdV2=(classId:ClassIdV2,skill:string,variant:string)=>skillIdV2(classId,skill)+':'+idPartV2(variant);
export const passiveIdV2=(classId:ClassIdV2,node:string)=>'v2:passive:'+idPartV2(classId)+':'+idPartV2(node);
export const capstoneIdV2=(classId:ClassIdV2,name:string)=>'v2:capstone:'+idPartV2(classId)+':'+idPartV2(name);
export interface SkillIdentityV2 {id:string;classId:ClassIdV2;name:string;cooldownMs:number;variants:readonly {id:string;name:string}[]}
export interface PassiveIdentityV2 {id:string;classId:ClassIdV2;name:string;branch:number;rank:number;}
export const SKILL_IDENTITIES_V2:readonly SkillIdentityV2[]=Object.entries(CLASS_NAMES_V2).flatMap(([classId,name])=>{
  const c=SKILL_CONCEPT_IDENTITY_V2[name as keyof typeof SKILL_CONCEPT_IDENTITY_V2];
  return c.a.map(([skillName,seconds,variants])=>({
    id:skillIdV2(classId as ClassIdV2,skillName as string),classId:classId as ClassIdV2,
    name:skillName as string,cooldownMs:(seconds as number)*1000,
    variants:(variants as readonly string[]).map(variant=>({id:variantIdV2(classId as ClassIdV2,skillName as string,variant),name:variant})),
  }));
});
export const SPECIALIZATIONS_V2:readonly SpecializationV2[]=Object.entries(CLASS_NAMES_V2).flatMap(([classId,name])=>
  SKILL_CONCEPT_IDENTITY_V2[name as keyof typeof SKILL_CONCEPT_IDENTITY_V2].s.map(([spec,capstone])=>({
    id:specializationIdV2(classId as ClassIdV2,spec),classId:classId as ClassIdV2,
    capstoneId:capstoneIdV2(classId as ClassIdV2,capstone),
  }))
);
export const SKILLS_V2:readonly ActiveSkillV2[]=SKILL_IDENTITIES_V2.map((s)=>{
  const index=SKILL_CONCEPT_IDENTITY_V2[CLASS_NAMES_V2[s.classId] as keyof typeof SKILL_CONCEPT_IDENTITY_V2].a.findIndex(a=>a[0]===s.name);
  const unlockLevel=[1,1,10,20,30,40][index];
  return {id:s.id,classId:s.classId,unlockLevel,defaultVariantId:s.variants[0].id,variantIds:s.variants.map(v=>v.id)};
});
export const PASSIVES_V2:readonly PassiveNodeV2[]=Object.entries(CLASS_NAMES_V2).flatMap(([classId,name])=>{
  const branches=SKILL_CONCEPT_IDENTITY_V2[name as keyof typeof SKILL_CONCEPT_IDENTITY_V2].p as readonly (readonly string[])[];
  return branches.flatMap(nodes=>nodes.map((node,i)=>({
    id:passiveIdV2(classId as ClassIdV2,node),classId:classId as ClassIdV2,unlockLevel:[10,20,30][i],
    maxRank:3 as const,
    ...(i>0?{prerequisite:{id:passiveIdV2(classId as ClassIdV2,nodes[i-1]),rank:i===2?2:1}}:{}),
  })));
});
export function serverBuildCatalogV2(itemsByInstanceId:Readonly<Record<string,EquipmentInstanceV2>>,
 setsById:Readonly<Record<string,SetFamilyV2>>):BuildCatalogV2{
 return {
  itemsByInstanceId,setsById,
  specializationsById:Object.fromEntries(SPECIALIZATIONS_V2.map(x=>[x.id,x])),
  skillsById:Object.fromEntries(SKILLS_V2.map(x=>[x.id,x])),
  passivesById:Object.fromEntries(PASSIVES_V2.map(x=>[x.id,x])),
 };
}
