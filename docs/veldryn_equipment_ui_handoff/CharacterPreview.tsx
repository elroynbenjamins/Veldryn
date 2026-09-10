import React, { memo } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

type Props = {
  /** Complete approved outfit, including the class weapon/offhand visual. */
  source: ImageSourcePropType;
  label: string;
  width?: number;
};

/**
 * Resolve source upstream from saved classId + skinId + appearance choice.
 * This component intentionally accepts no armor-piece list and no gender toggle.
 * Use equally padded source canvases; never independently auto-trim the figures.
 */
export const CharacterPreview = memo(function CharacterPreview({
  source,
  label,
  width = 128,
}: Props) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 128;
  return (
    <View style={{ width: safeWidth, aspectRatio: 128 / 160 }}>
      <Image
        source={source}
        accessibilityLabel={label}
        accessible
        resizeMode="contain"
        fadeDuration={0}
        style={styles.figure}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  figure: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
});
