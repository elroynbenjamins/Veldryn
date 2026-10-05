import type {ImageSourcePropType} from 'react-native';

export const classSkillIcons={
 guardcraft:require('../../assets/class-skill-icons-v1/guardcraft.webp'),
 warding:require('../../assets/class-skill-icons-v1/warding.webp'),
 might:require('../../assets/class-skill-icons-v1/might.webp'),
 restoration:require('../../assets/class-skill-icons-v1/restoration.webp'),
 sanctity:require('../../assets/class-skill-icons-v1/sanctity.webp'),
 marksmanship:require('../../assets/class-skill-icons-v1/marksmanship.webp'),
 tracking:require('../../assets/class-skill-icons-v1/tracking.webp'),
 breaking:require('../../assets/class-skill-icons-v1/breaking.webp'),
 spellcraft:require('../../assets/class-skill-icons-v1/spellcraft.webp'),
 hexcraft:require('../../assets/class-skill-icons-v1/hexcraft.webp'),
 blade_rhythm:require('../../assets/class-skill-icons-v1/blade_rhythm.webp'),
 precision:require('../../assets/class-skill-icons-v1/precision.webp'),
 resonance:require('../../assets/class-skill-icons-v1/resonance.webp'),
 geomancy:require('../../assets/class-skill-icons-v1/geomancy.webp'),
} satisfies Record<string,ImageSourcePropType>;

export function classSkillIcon(skillId:string):ImageSourcePropType|undefined{
 return classSkillIcons[skillId as keyof typeof classSkillIcons];
}

