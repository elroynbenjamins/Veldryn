import type {ImageSourcePropType} from 'react-native';
import type {SkillId} from '../core/types';
export type ActivityIconId=SkillId|'combat'|'training';
export const skillIcons={
 combat:require('../../assets/navigation-icons-v3/combat.png'),
 mining:require('../../assets/activity-icons-v1/mining.png'),
 woodcutting:require('../../assets/activity-icons-v1/woodcutting.png'),
 fishing:require('../../assets/activity-icons-v1/fishing.png'),
 smithing:require('../../assets/activity-icons-v1/smithing.png'),
 cooking:require('../../assets/activity-icons-v1/cooking.png'),tailoring:require('../../assets/activity-icons-v1/tailoring.png'),enchanting:require('../../assets/activity-icons-v1/enchanting.png'),
 herbalism:require('../../assets/activity-icons-v1/herbalism.png'),alchemy:require('../../assets/activity-icons-v1/alchemy.png'),exploration:require('../../assets/activity-icons-v1/exploration.png'),faith:require('../../assets/activity-icons-v1/faith.png'),training:require('../../assets/activity-icons-v1/training.png'),
} satisfies Record<ActivityIconId,ImageSourcePropType>;
export const smallSkillIcons={
 combat:require('../../assets/navigation-icons-v3/small/combat.png'),
 mining:require('../../assets/activity-icons-v1/small/mining.png'),
 woodcutting:require('../../assets/activity-icons-v1/small/woodcutting.png'),
 fishing:require('../../assets/activity-icons-v1/small/fishing.png'),
 smithing:require('../../assets/activity-icons-v1/small/smithing.png'),
 cooking:require('../../assets/activity-icons-v1/small/cooking.png'),tailoring:require('../../assets/activity-icons-v1/small/tailoring.png'),enchanting:require('../../assets/activity-icons-v1/small/enchanting.png'),
 herbalism:require('../../assets/activity-icons-v1/small/herbalism.png'),alchemy:require('../../assets/activity-icons-v1/small/alchemy.png'),exploration:require('../../assets/activity-icons-v1/small/exploration.png'),faith:require('../../assets/activity-icons-v1/small/faith.png'),training:require('../../assets/activity-icons-v1/small/training.png'),
} satisfies Record<ActivityIconId,ImageSourcePropType>;
