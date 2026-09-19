"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creationColors = void 0;
exports.CreationFrame = CreationFrame;
exports.CreationAction = CreationAction;
const react_1 = require("react");
const react_native_1 = require("react-native");
const creation_ui_assets_1 = require("../../theme/creation-ui-assets");
exports.creationColors = { ink: '#080E17', panel: '#111D2B', gold: '#E9C782', muted: '#A5B2C4', blue: '#8FDCF4', line: '#685333' };
const pixelImage = (react_native_1.Platform.OS === 'web' ? { imageRendering: 'pixelated' } : {});
/** Responsive nine-slice chrome; text/content determines height, caps never stretch. */
function CreationFrame({ children, frame = creation_ui_assets_1.creationFrames.input_default_9slice, style, contentStyle }) {
    const [size, setSize] = (0, react_1.useState)({ width: 0, height: 0 });
    const snap = react_native_1.PixelRatio.roundToNearestPixel;
    const { width: w, height: h } = size, c = frame.insets;
    const xs = [0, snap(c.left), snap(w - c.right), w], ys = [0, snap(c.top), snap(h - c.bottom), h];
    return <react_native_1.View style={[{ position: 'relative', minWidth: c.left + c.right + 8, minHeight: c.top + c.bottom + 8 }, style]} onLayout={({ nativeEvent: { layout } }) => { const width = snap(layout.width), height = snap(layout.height); setSize(old => old.width === width && old.height === height ? old : { width, height }); }}>
    {w > c.left + c.right && h > c.top + c.bottom && <react_native_1.View pointerEvents="none" accessible={false} style={react_native_1.StyleSheet.absoluteFill}>
      {['top', 'middle', 'bottom'].flatMap((row, r) => ['left', 'center', 'right'].map((column, col) => <react_native_1.Image key={`${row}_${column}`} source={frame.slices[`${row}_${column}`]} accessible={false} fadeDuration={0} resizeMode="stretch" style={[pixelImage, { position: 'absolute', left: xs[col], top: ys[r], width: xs[col + 1] - xs[col], height: ys[r + 1] - ys[r] }]}/>))}
    </react_native_1.View>}
    <react_native_1.View style={[{ paddingHorizontal: 28, paddingVertical: 12 }, contentStyle]}>{children}</react_native_1.View>
  </react_native_1.View>;
}
function CreationAction({ title, onPress, disabled = false, secondary = false, selected }) {
    return <react_native_1.Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ opacity: disabled ? .5 : pressed ? .78 : 1, minHeight: 52, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 16, borderWidth: secondary ? 0 : 1, borderColor: '#58788C', backgroundColor: secondary ? '#101B27' : '#203C50', justifyContent: 'center', alignItems: 'center' })}>
    <react_native_1.Text style={{ fontSize: 16, fontWeight: '600', color: disabled ? exports.creationColors.muted : exports.creationColors.gold, textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' }}>{title}</react_native_1.Text>
  </react_native_1.Pressable>;
}
