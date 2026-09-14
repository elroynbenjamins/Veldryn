import {registerRootComponent} from 'expo';
// Explicit developer-only fixture entry; normal and release builds use App.
const App=__DEV__&&process.env.EXPO_PUBLIC_VISUAL_QA==='1'
  ?require('./src/dev/NativeVisualReview').default
  :require('./App').default;
registerRootComponent(App);
