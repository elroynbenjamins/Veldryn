import {registerRootComponent} from 'expo';
// Explicit developer-only fixture entry; normal and release builds use App.
const App=__DEV__&&process.env.EXPO_PUBLIC_VISUAL_QA==='1'
  ?(process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN==='guild-pve'
    ?require('./src/dev/GuildPveReview').default
    :process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN==='companions'
    ?require('./src/dev/CompanionScreenReview').default
    :process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN==='crafting'
    ?require('./src/dev/SmithingReview').default
    :process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN==='store'
    ?require('./src/dev/StoreCaptureReview').default
    :require('./src/dev/NativeVisualReview').default)
  :require('./App').default;
registerRootComponent(App);
