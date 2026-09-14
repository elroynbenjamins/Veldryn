# Install the upgraded class emblems

1. Copy `assets/hero` and `assets/icon` into `apps/mobile/assets/class-emblems-v2/`, retaining every density sibling.
2. Copy `integration/class-emblem-assets.ts` into `apps/mobile/src/theme/`.
3. In `character-assets.ts`, replace the existing `classArtwork` map with:

```ts
export {
  classEmblemArtwork as classArtwork,
  classEmblemIconArtwork as classIconArtwork,
} from './class-emblem-assets';
```

4. Keep class selection on `classArtwork`. Import `classIconArtwork` in the Character screen for its existing 62 dp emblem. Use `resizeMode="contain"` and preserve square aspect ratio.

The accompanying repository includes these changes. Do not route class emblems into full-body character portrait registries. Class definitions, rewards, equipment skins and player data require no migration.

See `CLASS_ICON_SPEC.md` for native sizes, alpha, density scaling and design rules. `qa/integration.md` records validation and remaining device checks.
