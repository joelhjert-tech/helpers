# Moon Village Tools

Standalone web helpers for Moon Village event creation, NPC schedule testing, and portrait/animation assembly.

## Run

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
```

Open the local URL Vite prints. If port `5173` is busy, Vite will choose the next free port.

The launcher opens at `/` and links to the three focused apps:

- `/cutscene-maker`
- `/schedule-maker`
- `/animation-portrait-maker`

## Tests

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run test:e2e
```

`test` runs Vitest unit tests over the extracted core logic (`src/shared/stardew-core.test.js`). `test:e2e` runs Playwright against a local Vite server and checks the launcher plus all three tool routes (Cutscene, Schedule, Animation & Portrait) in Chromium.

## StardewLocalAPI Token

The Live API tools only work when Stardew Valley is running with StardewLocalAPI installed.

1. Launch Stardew Valley through SMAPI.
2. Watch the SMAPI console during startup.
3. Look for lines like:

```text
Local API token: abc123...
Local API listening: http://127.0.0.1:12345/api/v1/meta
```

4. Open `Cutscene Maker`, then open `Workspace` or `Test / Export`.
5. Put the base URL in `URL`, without `/api/v1/meta`.

Example:

```text
http://127.0.0.1:12345
```

6. Paste the value after `Local API token:` into `Token`.
7. Click `Connect`.
8. Click `Load Events` to import live vanilla/mod events into the Events list.

If StardewLocalAPI has `Token` set to an empty string in its `config.json`, the token field can usually be left blank. If `Port` is `0`, StardewLocalAPI chooses a free port each launch, so use the current `Local API listening` line from the SMAPI console.

If you cannot find those lines:

- StardewLocalAPI probably did not load in the current SMAPI session.
- Check that this folder exists in your active SMAPI mods folder:

```text
C:\Program Files (x86)\Steam\steamapps\common\Stardew Valley\Mods\StardewLocalAPI
```

- Restart Stardew Valley through SMAPI after installing it. SMAPI only scans mods during startup.
- If it still does not appear, open:

```text
%APPDATA%\StardewValley\ErrorLogs\SMAPI-latest.txt
```

Search for `StardewLocalAPI`, `Local API token`, or `Local API listening`.

## Current Scope

- Launcher:
  - Opens the three independent tool routes.
  - Each app has `Back to launcher`, `Save`, `Load`, `Export`, and `Validate` actions.
- `Cutscene Maker`:
  - Cutscene setup, actor placement, timeline commands, Live API testing, and export.
  - Keeps StardewLocalAPI map capture and event testing here only.
  - Does not show NPC schedule editing, portrait workflows, or animation tools.
- `Schedule Maker`:
  - Manual asset loading, schedule planning, path playback, validation, and schedule export.
  - Uses loaded TMX/TBIN/map assets for path validation instead of relying on SMAPI capture.
  - Does not show event script editing, portrait workflows, or animation tools.
- `Animation & Portrait Maker`:
  - Custom Portrait Maker, PixelLab handoff, reference checking, Godly Hand-style assembly, sprite/portrait validation, animation preview, and `Data/AnimationDescriptions` export.
  - Does not show event script editing or NPC schedule editing.
- Shared code structure:
  - App route metadata lives in `src/apps/cutscene-maker`, `src/apps/schedule-maker`, and `src/apps/animation-portrait-maker`.
  - Framework-agnostic logic (parsers, validators, compilers, TMX/TBIN decoding, route graph, constants) lives in `src/shared/stardew-core.js`, unit-tested by `src/shared/stardew-core.test.js`.
  - Reusable presentational components live in `src/shared/ui-common/components.jsx`.
  - The Animation & Portrait Maker's domain state, derived checks, and handlers live in the `useAnimationStudio` hook (`src/apps/animation-portrait-maker/useAnimationStudio.js`); `src/App.jsx` consumes it and still hosts the Cutscene and Schedule logic plus the shared map/canvas substrate.
  - The empty `src/shared/{project-files,map-loader,stardew-validators,export-utils,types}` folders are future homes for subdividing `stardew-core.js`.
- Import `.tmx`, `.tbin`, `.png`, and Content Patcher `.json` files.
- Parse CSV and base64+zlib TMX tile layers.
- Parse `EditData` entries targeting `Data/Events/<Location>`.
- Edit event premise, event ID, location, music, viewport, skippable flag, preconditions, actors, testing notes, and command timeline.
- Click the map canvas to capture tile coordinates.
- Actors tab:
  - Loads character names from StardewLocalAPI.
  - Search/select vanilla and modded NPCs exposed by SMAPI.
  - Place selected actors by clicking tiles on the map.
  - Uses in-game character sprites through StardewLocalAPI when available.
  - Falls back to labeled map markers when a sprite cannot be loaded.
- Export the event key, event script, or a full Content Patcher `EditData` patch.
- Schedule tab:
  - Use manual asset loading instead of SMAPI/StardewLocalAPI for schedule map validation.
  - Select or type an NPC ID from loaded schedules, event actors, or Live API suggestions when available.
  - Build schedule entries with time, location, X/Y, facing, optional animation, and optional dialogue/extra token.
  - Click the map to place the selected schedule stop.
  - Test schedules in the editor with Play/Pause/Stop/Restart/Step controls.
  - Preview NPC movement tile-by-tile with completed/upcoming path overlays, target tile highlighting, speed controls, and optional NPC-follow camera.
  - Resolve cross-map schedule playback with a World Navigator-inspired route graph built from loaded warps, fallback vanilla transitions, and custom Moon Village route edges.
  - Add custom transition edges for modded doors, buses, portals, locked rooms, or other travel actions the map parser cannot infer.
  - Validate unusual times, missing locations, invalid facing, out-of-bounds tiles, and blocked tiles when overlay data is loaded.
  - Report missing maps, unresolved warps, invalid coordinates, and blocked routes before export.
  - Export a Content Patcher `EditData` patch for `Characters/schedules/<NPC>`.
- Animation tab:
  - Use the Portrait Workflow to make Moon Village portrait sheets from a checked reference, a maker-created base portrait, PixelLab expression edits, and the Godly Hand-style combiner.
  - Open Jazzybee normal, Jazzybee masc, or the Picrew Farmer Portrait maker from the tool, then import the exported transparent `64x64` base PNG.
  - Compare reference portraits against the maker preview for hair, skin tone, face shape, eyes, clothes, palette, and Stardew-style consistency.
  - Build standard expression slots: neutral, happy, sad, angry, surprised, blushing, worried, annoyed, laughing, scared, plus custom slots.
  - Send the selected base/expression PNG to PixelLab as a download and import the edited PixelLab PNG back into the selected expression slot.
  - Validate portrait size, transparency, obvious blur/anti-aliasing, and expression alignment against the base portrait.
  - Export a 2-column Stardew portrait sheet named `<NPC>_Portraits.png` and an `<NPC>_portrait_export_log.json`.
  - Moon Village output paths follow `assets/Characters/<NPC>/Portraits/<NPC>_Portraits.png` and Content Patcher target `Portraits/Moonvillage_<NPC>`.
  - Load PixelLab or hand-edited transparent PNG sprite sheets.
  - Validate Stardew NPC sprite sheets: `64px` wide, `16x32` frames, 4 frames per row.
  - Load and validate portrait sheets with `64x64` portrait cells.
  - Import/export Content Patcher `Data/AnimationDescriptions` JSON.
  - Click sprite frames to build named animation sequences and preview them.
  - Compare animation names against loaded schedule animation fields.
- Preflight checks for common beginner event issues: missing location, duplicate IDs, missing `end`, loose triggers, and quick-question/fork reminders.
- Optional StardewLocalAPI bridge:
  - Connect to the local API URL/token printed in the SMAPI console.
  - Fetch live location and NPC names for authoring suggestions.
  - Load live vanilla and mod events from `/api/v1/events/all`.
  - Send the current compiled event script to `/api/v1/events/run` for in-game testing.
  - End the current event with `/api/v1/events/end`.
  - Event testing still uses Live API. Schedule testing uses loaded map assets and does not rely on SMAPI capture.
- Event Tool-style shorthand in exported commands:
  - `` `NpcName`` becomes `{{ModId}}_NpcName`.
  - Direction aliases like `$up`, `$right`, `$down`, `$left` become `0`, `1`, `2`, `3`.
  - Emote aliases like `$question`, `$happy`, `$heart`, `$exclamation` become vanilla emote IDs.
  - `question` supports Sugar's fork shorthand, e.g. ``1`OtherEvent`` compiles to `question fork1 .../fork {{ModId}}_OtherEvent`.

This app is separate from the Moonvillage mod folders and does not write into them automatically.

The Live API tools require Stardew Valley to be running with StardewLocalAPI installed and its local server enabled. Without it, the app remains an offline editor/exporter.
