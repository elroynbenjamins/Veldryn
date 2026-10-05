import type {ImageSourcePropType} from 'react-native';
import type {SkillId} from '../core/types';
export type ActivityIconId=SkillId|'combat'|'training';
export const skillIcons={
 combat:require('../../assets/navigation-icons-v3/combat.webp'),
 mining:require('../../assets/activity-icons-v1/mining.webp'),
 woodcutting:require('../../assets/activity-icons-v1/woodcutting.webp'),
 fishing:require('../../assets/activity-icons-v1/fishing.webp'),
 smithing:require('../../assets/activity-icons-v1/smithing.webp'),
 cooking:require('../../assets/activity-icons-v1/cooking.webp'),tailoring:require('../../assets/activity-icons-v1/tailoring.webp'),enchanting:require('../../assets/activity-icons-v1/enchanting.webp'),
 herbalism:require('../../assets/activity-icons-v1/herbalism.webp'),alchemy:require('../../assets/activity-icons-v1/alchemy.webp'),exploration:require('../../assets/activity-icons-v1/exploration.webp'),faith:require('../../assets/activity-icons-v1/faith.webp'),training:require('../../assets/activity-icons-v1/training.webp'),
} satisfies Record<ActivityIconId,ImageSourcePropType>;
export const smallSkillIcons={
 combat:require('../../assets/navigation-icons-v3/small/combat.webp'),
 mining:require('../../assets/activity-icons-v1/small/mining.webp'),
 woodcutting:require('../../assets/activity-icons-v1/small/woodcutting.webp'),
 fishing:require('../../assets/activity-icons-v1/small/fishing.webp'),
 smithing:require('../../assets/activity-icons-v1/small/smithing.webp'),
 cooking:require('../../assets/activity-icons-v1/small/cooking.webp'),tailoring:require('../../assets/activity-icons-v1/small/tailoring.webp'),enchanting:require('../../assets/activity-icons-v1/small/enchanting.webp'),
 herbalism:require('../../assets/activity-icons-v1/small/herbalism.webp'),alchemy:require('../../assets/activity-icons-v1/small/alchemy.webp'),exploration:require('../../assets/activity-icons-v1/small/exploration.webp'),faith:require('../../assets/activity-icons-v1/small/faith.webp'),training:require('../../assets/activity-icons-v1/small/training.webp'),
} satisfies Record<ActivityIconId,ImageSourcePropType>;
