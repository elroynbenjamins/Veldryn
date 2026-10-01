import type {ImageSourcePropType} from 'react-native';

export const classSkillIcons={
 guardcraft:require('../../assets/class-skill-icons-v1/guardcraft.png'),
 warding:require('../../assets/class-skill-icons-v1/warding.png'),
 might:require('../../assets/class-skill-icons-v1/might.png'),
 restoration:require('../../assets/class-skill-icons-v1/restoration.png'),
 sanctity:require('../../assets/class-skill-icons-v1/sanctity.png'),
 marksmanship:require('../../assets/class-skill-icons-v1/marksmanship.png'),
 tracking:require('../../assets/class-skill-icons-v1/tracking.png'),
 breaking:require('../../assets/class-skill-icons-v1/breaking.png'),
 spellcraft:require('../../assets/class-skill-icons-v1/spellcraft.png'),
 hexcraft:require('../../assets/class-skill-icons-v1/hexcraft.png'),
 blade_rhythm:require('../../assets/class-skill-icons-v1/blade_rhythm.png'),
 precision:require('../../assets/class-skill-icons-v1/precision.png'),
 resonance:require('../../assets/class-skill-icons-v1/resonance.png'),
 geomancy:require('../../assets/class-skill-icons-v1/geomancy.png'),
} satisfies Record<string,ImageSourcePropType>;

export function classSkillIcon(skillId:string):ImageSourcePropType|undefined{
 return classSkillIcons[skillId as keyof typeof classSkillIcons];
}

