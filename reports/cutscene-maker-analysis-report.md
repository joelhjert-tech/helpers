# Cutscene Maker Analysis Report

Date: 2026-06-18
Repository: `joelhjert-tech/helpers`
Status checked: repository exists, default branch is `main`, repo size is `0`, and no `README.md` exists yet.

## Mission

Build a proper Stardew Valley cutscene maker for Moon Village and future story mods. The tool should not only write event strings. It should let the creator design, test, save, reload, validate, and export complete cutscenes without losing structure.

The goal is a visual story-command bridge:

1. Design scenes on real maps.
2. Place farmer, NPCs, viewport, props, sounds, music, emotes, and dialogue.
3. Save the work as editable project JSON.
4. Compile the scene into valid Stardew event data.
5. Test in-game through SMAPI/Event Repeater style tooling.
6. Export finished Content Patcher JSON.

## Current repository state

The `helpers` repository is empty. That is useful. It means the cutscene maker can be built cleanly instead of fighting old broken structure.

Recommended first repo structure:

```text
helpers/
  README.md
  reports/
    cutscene-maker-analysis-report.md
  apps/
    cutscene-maker/
    schedule-maker/
    animation-portrait-maker/
  packages/
    stardew-event-core/
    stardew-map-core/
    smapi-bridge-client/
  schemas/
    cutscene-project.schema.json
    cutscene-export.schema.json
  docs/
    codex-instructions.md
    event-format-notes.md
    testing-checklist.md
```

## Stardew event facts the tool must respect

Stardew events are stored per location in `Data/Events/<LocationName>`. Each event entry uses a key made from an event ID plus slash-delimited preconditions. Mod event IDs should use a unique string format with the mod ID prefix to avoid conflicts.

Event scripts are slash-separated command strings. They are quote-aware, so dialogue can contain spaces and slashes when written safely inside quotes.

Every event script must start with three required commands in this order:

1. music ID, `none`, or `continue`;
2. initial viewport/camera center tile;
3. initial character positions and directions.

The cutscene maker must treat this as a compiler target, not as the authoring format.

References:

- Stardew event data: https://stardewvalleywiki.com/Modding:Event_data
- Content Patcher author guide: https://github.com/Pathoschild/StardewMods/blob/develop/ContentPatcher/docs/author-guide.md

## Main problem to solve

The old approach appears to be too close to raw script editing. That causes the same failures again and again:

- Event test teleports the player but does not enter active event mode.
- Premade events can get stuck on Farmhouse until a custom map is manually loaded.
- Characters sometimes face the wrong direction.
- Music and emote IDs are hard to choose safely.
- The viewport is not always placed near the farmer or active scene.
- Finished event output is not separated from editable project data.
- Map collision, warps, doors, tables, and blocked paths are not treated as first-class validation data.

The fix is not only a better UI. The fix is a real event pipeline.

## Required pipeline

```text
Editable cutscene project
        ↓
Scene graph and timeline model
        ↓
Validator
        ↓
Compiler
        ↓
Content Patcher export
        ↓
SMAPI in-game test runner
        ↓
Test report and saved logs
```

The author should never have to hand-write the final slash command string unless they want to. The app should generate it from structured blocks.

## What the app must save

Save four different things. Do not mix them.

### 1. Editable project save

Path example:

```text
projects/moonvillage/cutscenes/moonvillage_intro.cutscene.json
```

This is the master save. It should contain the timeline, actors, dialogue, map name, viewport settings, preconditions, notes, and validation status.

### 2. Compiled event export

Path example:

```text
exports/moonvillage/content.json
```

This is the final Content Patcher-ready output. It should be disposable and regenerated from the editable project save.

### 3. Test session report

Path example:

```text
test-runs/moonvillage_intro/2026-06-18_001.json
```

This should record:

- selected event ID;
- location;
- farmer start tile;
- active event check result;
- loaded map result;
- NPC spawn result;
- blocked move warnings;
- facing-direction warnings;
- SMAPI errors;
- final pass/fail.

### 4. Human design notes

Path example:

```text
projects/moonvillage/cutscenes/moonvillage_intro.notes.md
```

This is where story intent, lore purpose, and manual notes stay. Do not bury narrative planning inside compiled JSON.

## Suggested project JSON format

```json
{
  "schemaVersion": 1,
  "projectId": "moonvillage_intro",
  "modId": "Joel.MoonVillage",
  "eventId": "Joel.MoonVillage_MoonVillageIntro",
  "target": {
    "location": "Custom_Moonvillage",
    "asset": "Data/Events/Custom_Moonvillage"
  },
  "preconditions": [
    { "type": "HostMail", "value": "Joel.MoonVillage_WizardLetter" },
    { "type": "Time", "min": 900, "max": 2200 }
  ],
  "start": {
    "music": "continue",
    "viewport": { "x": 31, "y": 14, "mode": "nearFarmer" },
    "actors": [
      { "id": "farmer", "x": 31, "y": 16, "direction": 0 },
      { "id": "Annette", "x": 31, "y": 14, "direction": 2 },
      { "id": "Wizard", "x": 29, "y": 14, "direction": 1 }
    ]
  },
  "timeline": [
    { "type": "pause", "ms": 500 },
    { "type": "speak", "actor": "Annette", "text": "Welcome to what remains of Moon Village." },
    { "type": "faceDirection", "actor": "farmer", "direction": 0 },
    { "type": "emote", "actor": "Wizard", "emote": 16 },
    { "type": "move", "actor": "Annette", "dx": 0, "dy": -1, "speed": 2 },
    { "type": "end", "mode": "dialogue", "actor": "Annette", "text": "We will need your help." }
  ],
  "notes": "Intro cutscene after Wizard letter. Shows ruined village and frozen villagers."
}
```

## Compiler output target

The compiler should generate a Content Patcher `EditData` patch against `Data/Events/<LocationName>`.

Example shape:

```json
{
  "Format": "2.9.0",
  "Changes": [
    {
      "Action": "EditData",
      "Target": "Data/Events/Custom_Moonvillage",
      "Entries": {
        "Joel.MoonVillage_MoonVillageIntro/HostMail Joel.MoonVillage_WizardLetter/Time 900 2200": "continue/31 14/farmer 31 16 0 Annette 31 14 2 Wizard 29 14 1/pause 500/speak Annette \"Welcome to what remains of Moon Village.\"/faceDirection farmer 0/emote Wizard 16/move Annette 0 -1 2/end dialogue Annette \"We will need your help.\""
      }
    }
  ]
}
```

The app should always show both:

- editable block timeline;
- generated raw script preview.

## UI design requirements

### Main screen layout

```text
┌─────────────────────────────────────────────────────────────┐
│ Top bar: project, location, event ID, save, validate, export │
├───────────────┬───────────────────────────┬─────────────────┤
│ Asset panel   │ Map / viewport canvas      │ Inspector       │
│ NPCs          │ actors, paths, camera box   │ selected block  │
│ Maps          │ collision and warp overlay  │ details         │
│ Music         │ live X/Y readout            │ warnings        │
│ Emotes        │                             │                 │
├───────────────┴───────────────────────────┴─────────────────┤
│ Timeline: command blocks, dialogue, movement, sound, choices │
└─────────────────────────────────────────────────────────────┘
```

### Map canvas

Must include:

- map render from loaded TMX/XNB-derived data;
- collision overlay;
- warp/door overlay;
- room bounds overlay;
- actor markers;
- selected path preview;
- viewport rectangle;
- visible X/Y tile coordinate under cursor;
- button: `Center on farmer`;
- button: `Center on current room`;
- button: `Set viewport here`.

### Timeline blocks

Minimum block types:

- `pause`
- `speak`
- `move`
- `warp`
- `faceDirection`
- `emote`
- `playSound`
- `playMusic`
- `stopMusic`
- `animate`
- `showFrame`
- `question`
- `choice branch`
- `mail/action reward`
- `viewport`
- `fade`
- `end`

Each block needs strict typed fields. No free raw string until advanced mode.

### Actor inspector

For each actor:

- internal name;
- display name;
- sprite preview;
- portrait preview;
- current X/Y;
- direction as readable dropdown:
  - up = `0`
  - right = `1`
  - down = `2`
  - left = `3`
- schedule/source location if available;
- warnings if actor is missing from assets.

### Music dropdown

Should be populated from indexed game/mod music references and existing events. It must include:

- music ID;
- readable label if known;
- source file/event where found;
- preview/play test button if possible.

### Emote dropdown

Should show:

- emote ID;
- meaning/name if known;
- small preview if possible;
- source reference.

## Validation rules

The validator is the heart of the tool. It should run constantly.

### Event identity

- event ID exists;
- event ID uses mod prefix;
- event ID is unique inside target location;
- no duplicate event key in export.

### Preconditions

- no empty broken precondition pieces;
- if event has no preconditions, output key still has the required slash;
- deprecated short aliases should be rejected for new events;
- precondition arguments are in the correct order.

### Script opening

- first command is music/ambient command;
- second command is viewport tile;
- third command initializes farmer/NPCs;
- actor initial direction is numeric.

### Map safety

- target location exists;
- viewport is inside map bounds;
- farmer start tile is walkable unless intentionally hidden;
- NPC start tile is valid;
- move commands do not cross blocked tiles;
- warps and doors match real map properties;
- actor paths avoid tables, walls, water, void, and non-passable front/building tiles.

### Timeline safety

- every actor referenced in a block exists in the scene;
- every dialogue line has a valid speaker or narrator mode;
- quotes are escaped safely;
- slash characters inside dialogue do not break commands;
- every animation has a matching stop when needed;
- every temporary sprite/prop added has a remove command if needed;
- event ends with a valid end command.

### Export safety

- generated JSON parses;
- Content Patcher `Format` exists;
- target uses `Data/Events/<LocationName>`;
- raw script preview is deterministic;
- export can be regenerated without hand edits.

## In-game test runner requirements

The test runner must do more than teleport the player.

Correct sequence:

1. Load the selected location.
2. Wait until the map is confirmed ready.
3. Place farmer at configured tile.
4. Apply date/time/weather/friendship/mail test state if supported.
5. Trigger the exact event ID.
6. Confirm the game entered active event mode.
7. Log `activeEvent=true/false`.
8. If false, report likely causes:
   - wrong event ID;
   - wrong location;
   - precondition failed;
   - script parse error;
   - event already seen;
   - event key collision;
   - map not loaded;
   - invalid first three commands.

This directly targets the previous bug where the player moved to the location but the event did not actually start.

## Build priority

### Phase 1: Repo bootstrap

Create:

- README;
- app skeleton;
- shared event-core package;
- project schema;
- report/docs folder;
- sample Moon Village cutscene project.

### Phase 2: Event parser and compiler

Build:

- slash-command tokenizer;
- quote-aware parser;
- typed command model;
- project JSON to Stardew event compiler;
- Stardew event to block timeline importer if possible.

### Phase 3: Map and asset indexer

Build:

- map loader;
- collision reader;
- warp/door reader;
- NPC list loader;
- music/emote index;
- event reference scanner.

### Phase 4: Visual editor

Build:

- map canvas;
- actor placement;
- viewport tool;
- timeline blocks;
- inspector panel;
- validation warnings.

### Phase 5: SMAPI bridge test runner

Build:

- local bridge endpoint;
- location load command;
- event trigger command;
- active event check;
- test report save.

### Phase 6: Export workflow

Build:

- Content Patcher export;
- single cutscene export;
- full mod export;
- JSON validation;
- finished event report.

## Codex-ready implementation instructions

Use this as the next Codex prompt:

```text
We are starting a clean helper repository for a Stardew Valley cutscene maker.

Repository: joelhjert-tech/helpers

Build the first version of the Cutscene Maker architecture. Do not make a raw text-only event editor. Build a structured pipeline:

editable project JSON → typed timeline blocks → validator → Stardew event compiler → Content Patcher export → test report.

Create these files/folders:

- README.md
- docs/codex-instructions.md
- docs/event-format-notes.md
- docs/testing-checklist.md
- reports/cutscene-maker-analysis-report.md if not already present
- schemas/cutscene-project.schema.json
- apps/cutscene-maker/README.md
- packages/stardew-event-core/README.md

Implement or stub the core package with clear TypeScript interfaces for:

- CutsceneProject
- EventTarget
- EventPrecondition
- SceneActor
- TimelineBlock
- ValidationIssue
- CompileResult
- TestRunReport

Add a sample project:

samples/moonvillage_intro.cutscene.json

The sample should target:

- location: Custom_Moonvillage
- asset: Data/Events/Custom_Moonvillage
- mod ID prefix: Joel.MoonVillage

Important rules:

1. Stardew events are stored by location in Data/Events/<LocationName>.
2. Event keys are event ID + slash-delimited preconditions.
3. Mod event IDs must use a unique mod ID prefix.
4. Event scripts must begin with music, viewport, and initial actor positions in that order.
5. Direction values are numeric in the actor initialization command.
6. The authoring save format must not be the same as the compiled raw event string.
7. Generated exports must be deterministic.
8. Save test reports separately from project JSON.
9. Add validation warnings for wrong location, missing actor, blocked tile, bad facing, broken quotes, and missing first commands.
10. Do not invent random Stardew event syntax. Use documented event structure and keep unsupported commands as typed raw advanced blocks.

End with a clear report of files created and what remains.
```

## Success criteria

The first useful version is done when the app can:

1. create a new cutscene project;
2. select a Stardew location;
3. place farmer and NPCs on a map;
4. set viewport near farmer or current room;
5. add dialogue, movement, emotes, sound, and end block;
6. validate the scene;
7. compile to a Stardew event string;
8. export Content Patcher JSON;
9. run an in-game test;
10. save a pass/fail test report.

## Final recommendation

Start with the data model and compiler before the pretty UI. A beautiful UI without a strict compiler will repeat the same bugs. The cutscene maker should feel visual, but underneath it must behave like a mission control system: every actor has coordinates, every command has a type, every export is reproducible, and every test produces a report.
