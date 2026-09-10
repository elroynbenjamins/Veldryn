import React, { memo, type PropsWithChildren } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * Border artwork must be exported as eight PNG pieces with matching joins.
 * Corners stay fixed-size; plain edge strips stretch along one axis only.
 * The center is a native solid fill, not a stretched screenshot.
 * No production artwork is included with this reference component.
 */
export type PanelArtwork = Readonly<{
  topLeft: ImageSourcePropType;
  top: ImageSourcePropType;
  topRight: ImageSourcePropType;
  right: ImageSourcePropType;
  bottomRight: ImageSourcePropType;
  bottom: ImageSourcePropType;
  bottomLeft: ImageSourcePropType;
  left: ImageSourcePropType;
}>;

type Props = PropsWithChildren<{
  artwork: PanelArtwork;
  cornerSize?: number;
  fill?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}>;

export const NineSlicePanel = memo(function NineSlicePanel({
  artwork,
  cornerSize = 10,
  fill = '#192232',
  style,
  contentStyle,
  children,
  testID,
}: Props) {
  const c = Number.isFinite(cornerSize) && cornerSize > 0 ? cornerSize : 10;
  const parts: ReadonlyArray<readonly [keyof PanelArtwork, ImageStyle]> = [
    ['topLeft', { top: 0, left: 0, width: c, height: c }],
    ['top', { top: 0, left: c, right: c, height: c }],
    ['topRight', { top: 0, right: 0, width: c, height: c }],
    ['right', { top: c, bottom: c, right: 0, width: c }],
    ['bottomRight', { bottom: 0, right: 0, width: c, height: c }],
    ['bottom', { bottom: 0, left: c, right: c, height: c }],
    ['bottomLeft', { bottom: 0, left: 0, width: c, height: c }],
    ['left', { top: c, bottom: c, left: 0, width: c }],
  ];

  return (
    <View
      testID={testID}
      style={[styles.root, style, { minWidth: 2 * c, minHeight: 2 * c }]}
    >
      <View
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFillObject}
      >
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { top: c / 2, right: c / 2, bottom: c / 2, left: c / 2, backgroundColor: fill },
          ]}
        />
        {parts.map(([key, placement]) => (
          <Image
            key={key}
            source={artwork[key]}
            resizeMode="stretch"
            fadeDuration={0}
            accessible={false}
            style={[styles.part, placement]}
          />
        ))}
      </View>
      <View style={[{ padding: c + 6 }, contentStyle]}>{children}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { position: 'relative' },
  part: { position: 'absolute', width: undefined, height: undefined },
});
