import type {ImageSourcePropType} from 'react-native';

export const equipmentSheetBySet:Record<string,ImageSourcePropType>={
  T1_001:require('../../assets/equipment-t1-ironwarden/T1_001-oathbound-rampart-icon-sheet.png'),
  T1_002:require('../../assets/equipment-t1-ironwarden/T1_002-chainmarshal-plate-icon-sheet.png'),
  T1_003:require('../../assets/equipment-t1-ironwarden/T1_003-emberwatch-reprisal-icon-sheet.png'),
};

const pieceIdsBySet:Record<string,readonly string[]>={
  T1_001:['T1P_001','T1P_002','T1P_003','T1P_004','T1P_005','T1P_006','T1P_007','T1X_001','T1X_002','T1X_003'],
  T1_002:['T1P_008','T1P_009','T1P_010','T1P_011','T1P_012','T1P_013','T1P_014','T1X_004','T1X_005','T1X_006'],
  T1_003:['T1P_015','T1P_016','T1P_017','T1P_018','T1P_019','T1P_020','T1P_021','T1X_007','T1X_008','T1X_009'],
};

export const equipmentArtworkSetByItemId:Partial<Record<string,string>>=Object.fromEntries(
  Object.entries(pieceIdsBySet).flatMap(([setId,ids])=>ids.map(id=>[id,setId])),
);
