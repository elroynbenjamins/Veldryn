# Native Android review — v9

Reviewed the actual ProfileEditor and ProfileScenePreview on Android 35 in Expo Go at 720×1280, density 320 (360dp), font scale 1.0. The isolated fixture used a local female Ironwarden at level 25 with Harvestwake background, Amber Vine border, Harvest Fox companion, and Warden of the First Light title.

The complete profile composition, background tiles, border previews, selected status badge, companion preview, and horizontal wardrobe navigation were inspected. A border-thumbnail sizing issue found during review was corrected by giving the overlay explicit absolute width and height; the corrected capture is included.

The normal app entry was restored. Display overrides and port reverses were removed and the task-owned processes stopped. This review did not mount account/save providers or apply a cosmetic to persistent state.
