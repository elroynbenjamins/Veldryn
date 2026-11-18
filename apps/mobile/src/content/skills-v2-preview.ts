/** Design-time preview data generated from server v2/skill-catalog.ts.
 * This file is NOT a gameplay source of truth. Build saving, stat calculations,
 * unlocks, and server combat must never trust this client-side catalogue.
 * Never route the preview to live navigation without localization and server API.
 */
import type {ClassId} from '../core/types';
export const SKILLS_V2_PUBLIC_ENABLED=false as const;
export const SKILLS_V2_CLASS_NAMES:Readonly<Record<ClassId,string>>={"IRONWARDEN":"Ironwarden","BASTION":"Bastion","DREADGUARD":"Dreadguard","WAYFINDER":"Wayfinder","RAVAGER":"Ravager","HEXWEAVER":"Hexweaver","KNIFE_DANCER":"Knife Dancer","DAWNKEEPER":"Dawnkeeper","STONECALLER":"Stonecaller"} as const;
export const SKILLS_V2_DESIGN_CATALOGUE={"Ironwarden":{"s":[["Sentinel","Oathkeeper"],["Warlord","Runic Retribution"]],"a":[["Rune Challenge",9,["Vow of Steel","Provocation","War Cry"]],["Oathwall",12,["Stone Oath","Shared Oath","Reflective Oath"]],["Rune Bash",7,["Silencing Rune","Breaker Rune","Guarding Rune"]],["Iron Riposte",8,["Unbroken","Punisher","Rallying"]],["Shieldline",14,["Hold Fast","Battle Line","Bastion Link"]],["Runic Judgment",11,["Execution Seal","Defiant Seal","Binding Seal"]]],"p":[["Iron Skin","Steady Guard","Last Bastion"],["Firm Challenge","Shared Resolve","Stand Together"],["Tempered Edge","Rune Sparks","Vengeful Rhythm"]]},"Bastion":{"s":[["Fortress","Immovable"],["Guardian","Sheltering Wall"]],"a":[["Bastion Challenge",9,["Anchor","Defender","Iron Threat"]],["Layered Fortress",12,["Granite","Shelter","Reinforced"]],["Fortress Rebuff",8,["Heavy Rebuff","Sentry Rebuff","Crushing Rebuff"]],["Stone Brace",10,["Enduring Brace","Shared Brace","Iron Counter"]],["Bulwark Pulse",15,["Deep Foundation","Wide Rampart","Renewing Stone"]],["Citadel Slam",11,["Quake","Unyielding","Siegebreak"]]],"p":[["Stonehide","Thick Walls","Immovability"],["Cover Line","Safe Passage","Last Refuge"],["Heavy Presence","Seismic Guard","Unbroken Line"]]},"Dreadguard":{"s":[["Bloodbound","Blood Oath"],["Harbinger","Dread Dominion"]],"a":[["Dread Challenge",9,["Grim Call","Blood Call","Terror Call"]],["Grim Resolve",8,["Sanguine","Defiance","Cruel Recovery"]],["Binding Chain",7,["Severing Chain","Barbed Chain","Iron Chain"]],["Soul Rend",9,["Blood Rend","Terror Rend","Savage Rend"]],["Dark Mantle",14,["Graveguard","Oppressive","Bloodveil"]],["Harbinger Strike",12,["Execution Chain","Unnerving","Reaper Guard"]]],"p":[["Blood Iron","Pain Dividend","Scar Pact"],["Dark Presence","Deep Terror","Oppressive Gaze"],["Cursed Chain","Predator","Unbroken Will"]]},"Wayfinder":{"s":[["Deadeye","Perfect Aim"],["Pathfinder","Unbroken Trail"]],"a":[["Perfect Quarry",7,["Sniper","Reliable","Hunting Party"]],["Windshot",5,["Gale","Piercing","Swift"]],["Hunter Mark",10,["Weak Point","Trapper","Coordinated"]],["Twin Arrows",8,["Volley","Twin Fang","Defensive Fire"]],["Snare Shot",11,["Binding","Predator","Escape"]],["Heartseeker",14,["Execution","Hawkeye","Steady Hand"]]],"p":[["Eagle Eye","Deadly Window","True Shot"],["Quick Nock","Relentless Arrows","Unbroken Pace"],["Lightfoot","Trail Sense","Second Wind"]]},"Ravager":{"s":[["Executioner","Final Verdict"],["Berserker","Unbound Fury"]],"a":[["Crush Guard",7,["Shatter","Maul","Rallybreak"]],["Titan Swing",5,["Brutal","Wild","Guarded"]],["Bloodrush",10,["Reckless","Measured","Predatory"]],["Sunder Blow",8,["Armor Break","Bonebreak","Seismic"]],["Overpower",12,["Finisher","Warpath","Skullguard"]],["War Cry",16,["Slaughter","Iron Will","Shared Roar"]]],"p":[["Heavy Hands","Weak Point","Merciless"],["Adrenaline","Relentless","Unchained"],["Scarred","Steel Nerves","Kill Sustain"]]},"Hexweaver":{"s":[["Cursebinder","Endless Weave"],["Voidcaller","Void Surge"]],"a":[["Black Thread",7,["Wither","Rupture","Deep Hex"]],["Null Script",8,["Silence Script","Erase Script","Siphon Script"]],["Curse of Frailty",12,["Withering","Exposed","Safeguard"]],["Arcane Needle",5,["Forked","Focused","Lingering"]],["Hex Detonation",11,["Voidburst","Soul Rend","Corruption"]],["Veil of Ash",15,["Twilight","Cinder Veil","Spell Echo"]]],"p":[["Deep Ink","Long Curse","Unravel"],["Spell Force","Thread Focus","Void Memory"],["Shadow Ward","Arcane Footing","Calm Mind"]]},"Knife Dancer":{"s":[["Bladedancer","Scarlet Crescendo"],["Shadowblade","Silent Answer"]],"a":[["Scarlet Loop",5,["Flurry","Red Edge","Shadow Arc"]],["Feintstep",4,["Ghoststep","Lunge","Counterstep"]],["Blade Flurry",8,["Rapid","Precise","Shadow"]],["Twin Fang",7,["Venom","Finisher","Safe Cut"]],["Shadow Veil",14,["Untouchable","Assassin","Smoke Screen"]],["Final Dance",12,["Blood Waltz","Perfect Finale","Flow State"]]],"p":[["Quick Steel","Chain Keeper","Endless Dance"],["Fine Edge","Critical Tempo","Perfect Point"],["Light Steps","Countercraft","Exit Wound"]]},"Dawnkeeper":{"s":[["Lightbringer","Dawn Renewal"],["Sunwarden","Solar Covenant"]],"a":[["Dawn Mend",5,["Mercy","Steady Dawn","Battle Dawn"]],["Sunthread",9,["Golden Thread","Shared Thread","Vital Thread"]],["Sun Smite",6,["Searing","Merciful","Dazzling"]],["Beacon of Hope",13,["Bastion Sun","Shared Light","Renewal"]],["Purifying Light",14,["Cleanse","Restoration","Shielded Purity"]],["Solar Hymn",17,["Sanctuary","War Hymn","Enduring Hymn"]]],"p":[["Gentle Hands","Healing Flow","Last Light"],["Blessed Shield","Safe Dawn","Grace"],["Burning Hope","Inspiring Light","Chorus"]]},"Stonecaller":{"s":[["Earthwarden","Living Mountain"],["Runeshaper","Ritual Surge"]],"a":[["Resonant Armor",7,["Granite","Conduit","Electric"]],["River Stone",7,["Spring","Cleansing Stream","Mender"]],["Thunder Totem",7,["Storm Drum","Runic Totem","Earth Totem"]],["Earthen Grasp",10,["Quake","Stormbind","Safeguard"]],["Seismic Shelter",14,["Deep Roots","Wide Roots","Living Stone"]],["Resonance Burst",16,["Earth Song","Storm Song","River Song"]]],"p":[["Stone Bond","Earthskin","Deep Shelter"],["Clear Tone","Echo Flow","Harmonic Circle"],["Storm Spark","Static Rhythm","Thundermark"]]}} as const;
export type ClassV2Preview ={
  name:string;
  resource:string;
  cap:number;
  specializations:readonly {name:string;capstone:string}[];
  skills:readonly {name:string;cooldownSeconds:number;variants:readonly string[]}[];
  branches:readonly {name:string;nodes:readonly string[]}[];
};
const RESOURCES:Readonly<Record<ClassId,{name:string;cap:number}>>={
 IRONWARDEN:{name:'Guard Marks',cap:3},BASTION:{name:'Barrier Layers',cap:3},
 DREADGUARD:{name:'Dread',cap:5},WAYFINDER:{name:'Focus',cap:3},
 RAVAGER:{name:'Fury',cap:5},HEXWEAVER:{name:'Threads',cap:5},
 KNIFE_DANCER:{name:'Rhythm',cap:5},DAWNKEEPER:{name:'Radiance',cap:5},
 STONECALLER:{name:'Resonance',cap:5},
};
const BRANCHES:Readonly<Record<ClassId,readonly [string,string,string]>>={
 IRONWARDEN:['Bulwark','Command','Retribution'],BASTION:['Foundation','Shelter','Control'],
 DREADGUARD:['Blood','Dread','Dominion'],WAYFINDER:['Precision','Momentum','Survival'],
 RAVAGER:['Execution','Fury','Survival'],HEXWEAVER:['Affliction','Void','Veil'],
 KNIFE_DANCER:['Tempo','Precision','Shadows'],DAWNKEEPER:['Restoration','Sanctity','Radiance'],
 STONECALLER:['Geomancy','Resonance','Stormcraft'],
};
export function skillsV2PreviewFor(classId:ClassId):ClassV2Preview{
 const name=SKILLS_V2_CLASS_NAMES[classId],c=SKILLS_V2_DESIGN_CATALOGUE[name as keyof typeof SKILLS_V2_DESIGN_CATALOGUE];
 const resource=RESOURCES[classId];
 return {
  name,resource:resource.name,cap:resource.cap,
  specializations:c.s.map(([spec,capstone])=>({name:spec,capstone})),
  skills:c.a.map(([skill,cooldownSeconds,variants])=>({name:skill,cooldownSeconds,variants})),
  branches:c.p.map((nodes,index)=>({name:BRANCHES[classId][index],nodes})),
 };
}
