import React, { memo } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

/** Supply already-resolved artwork; never build dynamic require() paths here. */
type Props = {
  instanceId: string;
  itemName: string;
  rarityLabel: string;
  icon: ImageSourcePropType;
  frame: ImageSourcePropType;
  selectionFrame?: ImageSourcePropType;
  upgradeRank: number;
  selected?: boolean;
  disabled?: boolean;
  size?: number;
  bodyFontFamily?: string;
  onSelect: (instanceId: string) => void;
};

export const EquipmentSlot = memo(function EquipmentSlot({
  instanceId,
  itemName,
  rarityLabel,
  icon,
  frame,
  selectionFrame,
  upgradeRank,
  selected = false,
  disabled = false,
  size = 72,
  bodyFontFamily,
  onSelect,
}: Props) {
  const side = Number.isFinite(size) ? Math.max(48, size) : 72;
  // The domain adapter validates the allowed rank range. This is a display guard.
  const rank = Number.isFinite(upgradeRank) ? Math.max(0, Math.trunc(upgradeRank)) : 0;

  return (
    <Pressable
      testID={`equipment-slot-${instanceId}`}
      accessibilityRole="button"
      accessibilityLabel={`${itemName}, ${rarityLabel}, upgrade plus ${rank}`}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={() => onSelect(instanceId)}
      style={({ pressed }) => [
        styles.slot,
        { width: side, height: side, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
      ]}
    >
      <View
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFillObject}
      >
        <Image source={icon} resizeMode="contain" fadeDuration={0} style={styles.icon} />
        <Image source={frame} resizeMode="contain" fadeDuration={0} style={styles.frame} />
        {selected && selectionFrame ? (
          <Image
            source={selectionFrame}
            resizeMode="contain"
            fadeDuration={0}
            style={styles.frame}
          />
        ) : null}
        {selected && !selectionFrame ? <View style={styles.selectionFallback} /> : null}
        {rank > 0 ? (
          <Text style={[styles.rank, bodyFontFamily ? { fontFamily: bodyFontFamily } : null]}>
            +{rank}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  slot: { position: 'relative', backgroundColor: '#10151F' },
  icon: { position: 'absolute', top: 8, right: 8, bottom: 8, left: 8, width: undefined, height: undefined },
  frame: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  selectionFallback: {
    position: 'absolute', top: 3, right: 3, bottom: 3, left: 3,
    borderWidth: 2, borderColor: '#F2C14E',
  },
  rank: {
    position: 'absolute', top: 5, right: 5, paddingHorizontal: 2,
    color: '#F2C14E', backgroundColor: '#10151F', fontSize: 13,
    fontWeight: '700', fontVariant: ['tabular-nums'],
  },
});
