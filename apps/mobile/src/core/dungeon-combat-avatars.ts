import type {ClassId} from './types';

export type DungeonCombatRole='tank'|'damage'|'support';
export type DungeonCombatFormationSlot='front_left'|'mid_left'|'mid_right'|'rear_right';

export interface DungeonCombatAvatarDefinition{
 classId:ClassId;
 label:string;
 role:DungeonCombatRole;
 canonicalSkinId:string;
 stanceId:string;
 weaponSilhouette:string;
 canvas:{width:number;height:number};
 facing:'three_quarter_right';
 cosmeticPolicy:'class_locked';
}

export const DUNGEON_COMBAT_AVATARS:Readonly<Record<ClassId,DungeonCombatAvatarDefinition>>=Object.freeze({
 IRONWARDEN:{classId:'IRONWARDEN',label:'Ironwarden',role:'tank',canonicalSkinId:'combat_ironwarden_v1',stanceId:'sword_shield_guard',weaponSilhouette:'sword + shield',canvas:{width:512,height:640},facing:'three_quarter_right',cosmeticPolicy:'class_locked'},
 BASTION:{classId:'BASTION',label:'Bastion',role:'tank',canonicalSkinId:'combat_bastion_v1',stanceId:'hammer_tower_shield_guard',weaponSilhouette:'war hammer + tower shield',canvas:{width:512,height:640},facing:'three_quarter_right',cosmeticPolicy:'class_locked'},
 DREADGUARD:{classId:'DREADGUARD',label:'Dreadguard',role:'tank',canonicalSkinId:'combat_dreadguard_v1',stanceId:'chained_mace_dread_shield',weaponSilhouette:'chained mace + dread shield',canvas:{width:512,height:640},facing:'three_quarter_right',cosmeticPolicy:'class_locked'},
 WAYFINDER:{classId:'WAYFINDER',label:'Wayfinder',role:'damage',canonicalSkinId:'combat_wayfinder_v1',stanceId:'bow_draw',weaponSilhouette:'bow',canvas:{width:512,height:640},facing:'three_quarter_right',cosmeticPolicy:'class_locked'},
 RAVAGER:{classId:'RAVAGER',label:'Ravager',role:'damage',canonicalSkinId:'combat_ravager_v1',stanceId:'two_handed_breaker',weaponSilhouette:'two-handed weapon',canvas:{width:512,height:640},facing:'three_quarter_right',cosmeticPolicy:'class_locked'},
 HEXWEAVER:{classId:'HEXWEAVER',label:'Hexweaver',role:'damage',canonicalSkinId:'combat_hexweaver_v1',stanceId:'wand_focus_cast',weaponSilhouette:'wand + focus',canvas:{width:512,height:640},facing:'three_quarter_right',cosmeticPolicy:'class_locked'},
 KNIFE_DANCER:{classId:'KNIFE_DANCER',label:'Knife Dancer',role:'damage',canonicalSkinId:'combat_knife_dancer_v1',stanceId:'dual_blade_precision',weaponSilhouette:'dual blades',canvas:{width:512,height:640},facing:'three_quarter_right',cosmeticPolicy:'class_locked'},
 DAWNKEEPER:{classId:'DAWNKEEPER',label:'Dawnkeeper',role:'support',canonicalSkinId:'combat_dawnkeeper_v1',stanceId:'mace_light_channel',weaponSilhouette:'mace + light focus',canvas:{width:512,height:640},facing:'three_quarter_right',cosmeticPolicy:'class_locked'},
 STONECALLER:{classId:'STONECALLER',label:'Stonecaller',role:'support',canonicalSkinId:'combat_stonecaller_v1',stanceId:'staff_resonance_channel',weaponSilhouette:'staff',canvas:{width:512,height:640},facing:'three_quarter_right',cosmeticPolicy:'class_locked'},
});

export const DUNGEON_COMBAT_FORMATION:Readonly<Record<DungeonCombatRole,readonly DungeonCombatFormationSlot[]>>=Object.freeze({
 tank:['front_left'],
 damage:['mid_left','mid_right'],
 support:['rear_right'],
});

/** Equipped companions remain owner-bound assists in dungeon combat.
 * They may appear as a small portrait/cameo when their existing assist ability procs,
 * but they never create extra party slots or persistent full-size arena actors.
 */
export const DUNGEON_COMPANION_PRESENTATION=Object.freeze({
 mode:'owner_assist_cameo' as const,
 occupiesPartySlot:false,
 persistentArenaActor:false,
 maximumVisibleOwnerAssists:4,
 portraitSize:26,
});

export function dungeonCombatAvatar(classId:string|undefined):DungeonCombatAvatarDefinition|undefined{
 if(!classId)return undefined;
 return DUNGEON_COMBAT_AVATARS[classId.toUpperCase() as ClassId];
}
