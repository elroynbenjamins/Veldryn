"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrimaryNavigation = PrimaryNavigation;
const react_native_1 = require("react-native");
const PrimaryNavigationIcon_1 = require("./PrimaryNavigationIcon");
const theme_1 = require("../theme/theme");
function PrimaryNavigation({ destinations, active, labelFor, onNavigate }) {
    return <react_native_1.View accessibilityRole="tablist" style={s.nav}>{destinations.map(item => {
            const selected = active === item, label = labelFor(item);
            return <react_native_1.Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={label} onPress={() => onNavigate(item)} style={({ pressed }) => [s.item, pressed && s.pressed]}>
  {selected && <react_native_1.View pointerEvents="none" style={s.mark}/>}<react_native_1.View style={[s.iconShell, selected && s.iconActive]}><PrimaryNavigationIcon_1.PrimaryNavigationIcon destination={item} active={selected}/></react_native_1.View>
  <react_native_1.Text numberOfLines={2} textBreakStrategy="balanced" android_hyphenationFrequency="normal" style={[s.label, selected && s.active]}>{label}</react_native_1.Text>
 </react_native_1.Pressable>;
        })}</react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ nav: { minHeight: 78, flexDirection: 'row', alignItems: 'stretch', borderTopWidth: 1, borderColor: '#394657', backgroundColor: '#09131f', paddingHorizontal: 4, paddingTop: 4, paddingBottom: react_native_1.Platform.OS === 'android' ? 22 : 4 }, item: { position: 'relative', flex: 1, minWidth: 44, minHeight: 66, alignItems: 'center', justifyContent: 'flex-start', gap: 2, paddingHorizontal: 2 }, pressed: { opacity: .76 }, mark: { position: 'absolute', top: -4, width: 22, height: 2, backgroundColor: '#efd895' }, iconShell: { width: 40, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 }, iconActive: { backgroundColor: 'rgba(212,173,88,.13)' }, label: { width: '100%', fontSize: 11, lineHeight: 15, fontWeight: '600', textAlign: 'center', color: '#9eabbc' }, active: { color: theme_1.C.accent } });
