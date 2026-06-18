import { getToolAppByPath, LAUNCHER_ROUTE, normalizeToolPath } from "./ui-common/toolNavigation";

export const DIRECTIONS = ["Up", "Right", "Down", "Left"];

export const EMOTE_OPTIONS = [
  { value: "0", label: "0 - Exclamation / alert" },
  { value: "8", label: "8 - Question / confused" },
  { value: "16", label: "16 - Angry / annoyed" },
  { value: "20", label: "20 - Heart / love or affection" },
  { value: "24", label: "24 - Sleep / tired" },
  { value: "28", label: "28 - Sad / unhappy" },
  { value: "32", label: "32 - Happy / happy" },
  { value: "36", label: "36 - X / no or wrong" },
  { value: "40", label: "40 - Pause / wait or awkward pause" },
  { value: "52", label: "52 - Music / singing or music" },
  { value: "56", label: "56 - Blush / embarrassed" },
  { value: "60", label: "60 - Uh / unsure" },
  { value: "64", label: "64 - Yes / approval" },
  { value: "68", label: "68 - No / refusal" },
  { value: "72", label: "72 - Sick / ill" },
  { value: "76", label: "76 - Laugh / laughing" },
  { value: "80", label: "80 - Surprised / shocked" },
  { value: "84", label: "84 - Hi / greeting" },
  { value: "88", label: "88 - Taunt / teasing" },
  { value: "92", label: "92 - Jar / jar emote" },
];

export const SHORTHANDS = {
  "`": "{{ModId}}_",
  "$empty": "4",
  "$question": "8",
  "$angry": "12",
  "$exclamation": "16",
  "$heart": "20",
  "$sleep": "24",
  "$sad": "28",
  "$happy": "32",
  "$x": "36",
  "$pause": "40",
  "$videogame": "52",
  "$musicnote": "56",
  "$blush": "60",
  "$up": "0",
  "$right": "1",
  "$down": "2",
  "$left": "3",
  "$aup": "4",
  "$aright": "1",
  "$adown": "2",
  "$aleft": "3",
};

export const COMMAND_DEFINITIONS = [
  { verb: "pause", label: "Pause", fields: [{ key: "duration", label: "Duration", type: "number", defaultValue: "500" }] },
  { verb: "speak", label: "Speak", fields: [{ key: "actor", label: "Actor", type: "actor", defaultValue: "farmer" }, { key: "text", label: "Text", type: "text", defaultValue: "{{i18n:event.line}}" }] },
  { verb: "message", label: "Message", fields: [{ key: "text", label: "Text", type: "text", defaultValue: "{{i18n:event.message}}" }] },
  { verb: "move", label: "Move", fields: [{ key: "actor", label: "Actor", type: "actor", defaultValue: "farmer" }, { key: "dx", label: "Delta X", type: "number", defaultValue: "0" }, { key: "dy", label: "Delta Y", type: "number", defaultValue: "1" }, { key: "direction", label: "Facing", type: "direction", defaultValue: "2" }, { key: "continue", label: "Continue", type: "boolean", optional: true }] },
  { verb: "warp", label: "Warp", fields: [{ key: "actor", label: "Actor", type: "actor", defaultValue: "farmer" }, { key: "x", label: "X", type: "number", defaultValue: "0" }, { key: "y", label: "Y", type: "number", defaultValue: "0" }, { key: "continue", label: "Continue", type: "boolean", optional: true }] },
  { verb: "viewport", label: "Viewport", fields: [{ key: "args", label: "Target", type: "raw", defaultValue: "0 0 true" }] },
  { verb: "faceDirection", label: "Face Direction", fields: [{ key: "actor", label: "Actor", type: "actor", defaultValue: "farmer" }, { key: "direction", label: "Facing", type: "direction", defaultValue: "2" }, { key: "continue", label: "Continue", type: "boolean", optional: true }] },
  { verb: "emote", label: "Emote", fields: [{ key: "actor", label: "Actor", type: "actor", defaultValue: "farmer" }, { key: "emote", label: "Emote", type: "text", defaultValue: "8" }, { key: "continue", label: "Continue", type: "boolean", optional: true }] },
  { verb: "jump", label: "Jump", fields: [{ key: "actor", label: "Actor", type: "actor", defaultValue: "farmer" }, { key: "intensity", label: "Intensity", type: "number", optional: true }] },
  { verb: "playSound", label: "Play Sound", fields: [{ key: "sound", label: "Sound", type: "text", defaultValue: "dwop" }] },
  { verb: "playMusic", label: "Play Music", fields: [{ key: "track", label: "Track", type: "text", defaultValue: "WizardSong" }] },
  { verb: "stopMusic", label: "Stop Music", fields: [] },
  { verb: "screenFlash", label: "Screen Flash", fields: [{ key: "alpha", label: "Alpha", type: "text", defaultValue: "1" }, { key: "duration", label: "Duration", type: "number", optional: true }] },
  { verb: "globalFade", label: "Fade Out", fields: [{ key: "speed", label: "Speed", type: "text", optional: true }, { key: "continue", label: "Continue", type: "boolean", optional: true }] },
  { verb: "globalFadeToClear", label: "Fade In", fields: [{ key: "speed", label: "Speed", type: "text", optional: true }, { key: "continue", label: "Continue", type: "boolean", optional: true }] },
  { verb: "question", label: "Question", fields: [{ key: "fork", label: "Fork", type: "text", defaultValue: "fork1" }, { key: "payload", label: "Question / Answers", type: "text", defaultValue: "{{i18n:event.question}}#{{i18n:event.answer_1}}#{{i18n:event.answer_2}}" }] },
  { verb: "quickQuestion", label: "Quick Question", fields: [{ key: "question", label: "Question", type: "text", defaultValue: "Question?" }, { key: "answers", label: "Answers / Scripts", type: "text", defaultValue: "Yes#No(break)Yes script(break)No script" }] },
  { verb: "fork", label: "Fork", fields: [{ key: "target", label: "Target Event", type: "text", defaultValue: "event_choice" }] },
  { verb: "friendship", label: "Friendship", fields: [{ key: "npc", label: "NPC", type: "text", defaultValue: "Lewis" }, { key: "amount", label: "Amount", type: "number", defaultValue: "25" }] },
  { verb: "addItem", label: "Add Item", fields: [{ key: "item", label: "Item", type: "text", defaultValue: "(O)74" }, { key: "count", label: "Count", type: "number", optional: true }] },
  { verb: "addMailReceived", label: "Add Mail Received", fields: [{ key: "mail", label: "Mail", type: "text", defaultValue: "Mail.Flag" }] },
  { verb: "mailToday", label: "Mail Today", fields: [{ key: "mail", label: "Mail", type: "text", defaultValue: "Mail.Flag" }] },
  { verb: "action", label: "Action", fields: [{ key: "args", label: "Action", type: "raw", defaultValue: "AddMail Current Mail.Flag Received" }] },
  { verb: "setSkipActions", label: "Skip Actions", fields: [{ key: "args", label: "Actions", type: "raw", defaultValue: "AddMail Current Mail.Flag Received" }] },
  { verb: "addConversationTopic", label: "Conversation Topic", fields: [{ key: "topic", label: "Topic", type: "text", defaultValue: "topic_id" }, { key: "days", label: "Days", type: "number", optional: true }] },
  { verb: "end", label: "End", fields: [{ key: "mode", label: "Mode", type: "raw", optional: true }] },
];

export const DEFINITION_BY_VERB = new Map(COMMAND_DEFINITIONS.map((definition) => [definition.verb.toLowerCase(), definition]));

export const DEFAULT_OVERLAYS = {
  grid: true,
  walkable: false,
  blocked: true,
  npcPaths: true,
  playerPath: true,
  warpTiles: true,
  doorTiles: true,
  actions: true,
  viewport: true,
  scheduleStops: true,
  coordinates: false,
  cpSource: true,
};

export const SPRITE_FRAME_WIDTH = 16;
export const SPRITE_FRAME_HEIGHT = 32;
export const SPRITE_FRAMES_PER_ROW = 4;
export const PORTRAIT_CELL_SIZE = 64;
export const DEFAULT_ANIMATION_ENTRY = { id: "anim-1", name: "MyAnimation", frames: [0, 1, 2, 3], speed: 1000, loop: 20000 };
export const DEFAULT_CUSTOM_ROUTE_EDGE = {
  id: "edge-1",
  fromLocation: "Custom_Moonvillage",
  fromX: 0,
  fromY: 0,
  toLocation: "BusStop",
  toX: 0,
  toY: 0,
  travelType: "custom warp",
  touchActivated: true,
  openTime: "600",
  closeTime: "2600",
  enabled: true,
};
export const MOONVILLAGE_PORTRAIT_NPCS = [
  "Agust",
  "Annette",
  "AshBrightleaf",
  "BlazeStormglow",
  "Elowen",
  "EmberStormglow",
  "FinnBrightleaf",
  "Grandmother",
  "Kira",
  "Lorilai",
  "Lowa",
  "LyrenBrightleaf",
  "Molly",
  "RoryBrightleaf",
  "RowanStormglow",
  "Venessa",
];
export const PORTRAIT_EXPRESSIONS = ["neutral", "happy", "sad", "angry", "surprised", "blushing", "worried", "annoyed", "laughing", "scared"];
export const PORTRAIT_COMPARE_ITEMS = ["hair", "skin tone", "face shape", "eyes", "clothes", "palette", "Stardew-style consistency"];
export const CUSTOM_PORTRAIT_EXPRESSIONS = ["neutral", "happy", "sad", "angry", "surprised", "worried", "annoyed", "laughing", "scared", "blushing", "custom_01", "custom_02"];
export const CUSTOM_PORTRAIT_PARTS = [
  "back hair",
  "head/skin base",
  "ears",
  "eyes",
  "eyebrows",
  "nose",
  "mouth",
  "blush/shadow",
  "front hair",
  "shirt",
  "jacket/collar",
  "accessories",
  "special overlays",
];
export const PIXELLAB_MCP_CONFIG_SNIPPET = `{
  "mcpServers": {
    "pixellab": {
      "url": "https://api.pixellab.ai/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer YOUR_API_TOKEN"
      }
    }
  }
}`;
export const JAZZYBEE_URLS = {
  normal: "https://jazzybee.itch.io/sdvcharactercreator",
  masc: "https://jazzybee.itch.io/sdv-creator-masc",
};
export const PICREW_PORTRAIT_URL = "https://picrew.me/en/image_maker/1913943";

export const MAIN_SECTIONS = [
  {
    id: "event",
    label: "Event",
    defaultTab: "workspace",
    tabs: [
      { id: "workspace", label: "Workspace" },
      { id: "actors", label: "Actors" },
      { id: "timeline", label: "Timeline" },
      { id: "export", label: "Test / Export" },
    ],
  },
  {
    id: "schedule",
    label: "Schedule",
    defaultTab: "schedule",
    tabs: [
      { id: "schedule", label: "Planner / Test" },
      { id: "workspace", label: "Assets" },
    ],
  },
  {
    id: "animation",
    label: "Animation",
    defaultTab: "animation",
    tabs: [
      { id: "animation", label: "Builder" },
      { id: "workspace", label: "Assets" },
    ],
  },
];

export function sectionForTab(tab, fallback = "event") {
  if (tab === "schedule") return "schedule";
  if (tab === "animation") return "animation";
  if (["actors", "timeline", "export"].includes(tab)) return "event";
  return fallback;
}

export function getInitialToolApp() {
  if (typeof window === "undefined") return null;
  return getToolAppByPath(window.location.pathname);
}

export function getInitialToolRoute() {
  if (typeof window === "undefined") return LAUNCHER_ROUTE;
  return normalizeToolPath(window.location.pathname);
}

export const VANILLA_MAPS = [
  "Town",
  "Forest",
  "Mountain",
  "SeedShop",
  "AdventureGuild",
  "WizardHouse",
  "Woods",
  "BusStop",
  "Farm",
  "FarmHouse",
  "Saloon",
  "CommunityCenter",
  "Beach",
  "Hospital",
  "Blacksmith",
  "ManorHouse",
  "ScienceHouse",
  "Railroad",
  "Desert",
  "IslandSouth",
  "IslandWest",
  "IslandNorth",
  "IslandEast",
].map((name) => ({ name, displayName: name }));

export const blankCutscene = () => ({
  uid: crypto.randomUUID(),
  id: `{{ModId}}_Event_${Math.floor(Math.random() * 900000 + 100000)}`,
  name: "New Event",
  premise: "NPC X talks to NPC Y about a specific topic.",
  testingNotes: "Test on a fresh day, enter the target location during the time window, then check SMAPI for event parse errors.",
  location: "Custom_Moonvillage",
  music: "none",
  viewportX: 25,
  viewportY: 25,
  customViewport: false,
  skippable: true,
  farmer: { uid: "farmer", actor: "farmer", x: 25, y: 25, facing: 2 },
  actors: [{ uid: crypto.randomUUID(), actor: "Moonvillage_Annette", x: 25, y: 23, facing: 2 }],
  preconditions: ["t 600 2400"],
  commands: [
    makeCommand("pause"),
    makeCommand("speak"),
    makeCommand("end"),
  ],
  sourceFile: "",
  rawTarget: "",
});

export function makeCommand(verb) {
  const definition = DEFINITION_BY_VERB.get(verb.toLowerCase());
  if (!definition) {
    return { id: crypto.randomUUID(), verb: "raw", label: "Raw", values: { raw: verb } };
  }

  const values = {};
  for (const field of definition.fields) {
    values[field.key] = field.defaultValue ?? "";
  }
  return { id: crypto.randomUUID(), verb: definition.verb, label: definition.label, values };
}

export function quoteAwareSplit(text, delimiter) {
  const parts = [];
  let current = "";
  let inQuote = false;
  let escaped = false;

  for (const character of text) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }

    if (character === "\\") {
      current += character;
      escaped = true;
      continue;
    }

    if (character === '"') {
      current += character;
      inQuote = !inQuote;
      continue;
    }

    if (!inQuote && character === delimiter) {
      parts.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  parts.push(current);
  return parts;
}

export function splitWords(text) {
  return quoteAwareSplit(text.trim(), " ").filter(Boolean);
}

export function unquote(value = "") {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"');
  }
  return trimmed;
}

export function quoteIfNeeded(value = "") {
  value = expandShorthand(value);
  if (value.includes("{{")) return value;
  if (value === "" || /[\s/]/.test(value)) return `"${value.replace(/"/g, '\\"')}"`;
  return value;
}

export function expandShorthand(value = "") {
  return Object.entries(SHORTHANDS).reduce(
    (text, [from, to]) => text.split(from).join(to),
    String(value),
  );
}

export function isNumberPair(value) {
  const parts = splitWords(value);
  return parts.length >= 2 && Number.isFinite(Number(parts[0])) && Number.isFinite(Number(parts[1]));
}

export function parsePlacementHeader(value) {
  const parts = splitWords(value);
  if (parts.length < 4 || parts.length % 4 !== 0) return null;
  const placements = [];
  for (let index = 0; index < parts.length; index += 4) {
    const x = Number(parts[index + 1]);
    const y = Number(parts[index + 2]);
    const facing = Number(parts[index + 3]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(facing)) return null;
    placements.push({ uid: parts[index].toLowerCase() === "farmer" ? "farmer" : crypto.randomUUID(), actor: parts[index], x, y, facing });
  }
  return placements;
}

export function isPlacementHeader(value) {
  const parts = splitWords(value);
  if (parts.length < 4 || parts.length % 4 !== 0) return false;
  for (let index = 0; index < parts.length; index += 4) {
    if (!parts[index]) return false;
    if (!Number.isFinite(Number(parts[index + 1]))) return false;
    if (!Number.isFinite(Number(parts[index + 2]))) return false;
    if (!isValidFacing(parts[index + 3])) return false;
  }
  return true;
}

export function parseCommand(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parts = splitWords(trimmed);
  const verb = parts[0] ?? "raw";
  const definition = DEFINITION_BY_VERB.get(verb.toLowerCase());

  if (!definition) {
    return { id: crypto.randomUUID(), verb: "raw", label: "Raw", values: { raw: trimmed } };
  }

  const command = makeCommand(definition.verb);
  if (definition.verb === "question") {
    command.values.fork = unquote(parts[1] ?? "null");
    command.values.payload = unquote(parts.slice(2).join(" "));
    return command;
  }

  let argIndex = 1;
  for (const field of definition.fields) {
    if (argIndex >= parts.length) break;
    if (field.type === "raw" || field.key === "text" || field.key === "payload") {
      command.values[field.key] = unquote(parts.slice(argIndex).join(" "));
      argIndex = parts.length;
    } else {
      command.values[field.key] = unquote(parts[argIndex]);
      argIndex += 1;
    }
  }

  return command;
}

export function compileCommand(command) {
  if (command.verb === "raw") return expandShorthand(command.values.raw ?? "");
  const definition = DEFINITION_BY_VERB.get(command.verb.toLowerCase());
  if (!definition) return command.values.raw ?? "";
  const values = command.values ?? {};

  if (command.verb === "speak") {
    const actor = expandShorthand(values.actor || "farmer");
    const text = quoteIfNeeded(values.text || "");
    return actor.toLowerCase() === "farmer" ? `message ${text}` : `speak ${actor} ${text}`;
  }

  if (command.verb === "message") return `message ${quoteIfNeeded(values.text || "")}`;
  if (command.verb === "question") {
    const fork = expandShorthand(values.fork || "null");
    const eventToolFork = fork.match(/^(\d)(.+)$/);
    if (eventToolFork && !fork.toLowerCase().startsWith("fork")) {
      return `question fork${eventToolFork[1]} ${quoteIfNeeded(values.payload || "")}/fork ${eventToolFork[2]}`;
    }
    return `question ${fork || "null"} ${quoteIfNeeded(values.payload || "")}`;
  }
  if (command.verb === "quickQuestion") {
    return `quickQuestion ${expandShorthand(values.question || "")}#${expandShorthand(values.answers || "")}`;
  }

  const parts = [definition.verb];
  for (const field of definition.fields) {
    const value = expandShorthand(values[field.key] ?? "");
    if (field.optional && String(value).trim() === "") continue;
    if (field.type === "raw") {
      if (String(value).trim()) parts.push(value);
    } else if (field.type === "text" && field.key !== "actor") {
      parts.push(quoteIfNeeded(value));
    } else if (String(value).trim()) {
      parts.push(value);
    }
  }
  return expandShorthand(parts.join(" "));
}

export function parseEventEntry(eventKey, script, location, sourceFile = "", rawTarget = "") {
  const cutscene = blankCutscene();
  const keyParts = quoteAwareSplit(eventKey, "/").filter((part) => part.trim() !== "");
  cutscene.id = keyParts.shift() ?? cutscene.id;
  cutscene.name = cutscene.id;
  cutscene.location = location || cutscene.location;
  cutscene.sourceFile = sourceFile;
  cutscene.rawTarget = rawTarget;
  cutscene.preconditions = keyParts;

  const scriptParts = quoteAwareSplit(script, "/").map((part) => part.trim()).filter(Boolean);
  cutscene.music = scriptParts[0] ?? "none";
  let index = 1;

  if (scriptParts[index] && isNumberPair(scriptParts[index])) {
    const [x, y] = splitWords(scriptParts[index]);
    cutscene.viewportX = Number(x);
    cutscene.viewportY = Number(y);
    cutscene.customViewport = true;
    index += 1;
  }

  cutscene.actors = [];
  cutscene.farmer = { uid: "farmer", actor: "farmer", x: cutscene.viewportX, y: cutscene.viewportY, facing: 2 };
  const placements = parsePlacementHeader(scriptParts[index] ?? "");
  if (placements) {
    for (const placement of placements) {
      if (placement.actor.toLowerCase() === "farmer") {
        cutscene.farmer = placement;
        if (!cutscene.customViewport) {
          cutscene.viewportX = placement.x;
          cutscene.viewportY = placement.y;
        }
      } else {
        cutscene.actors.push(placement);
      }
    }
    index += 1;
  }

  cutscene.skippable = false;
  while (scriptParts[index] === "skippable") {
    cutscene.skippable = true;
    index += 1;
  }

  cutscene.commands = scriptParts.slice(index).map(parseCommand).filter(Boolean);
  if (!cutscene.commands.some((command) => command.verb === "end")) {
    cutscene.commands.push(makeCommand("end"));
  }
  return cutscene;
}

export function compileEventKey(cutscene) {
  return [cutscene.id, ...cutscene.preconditions.filter(Boolean)].join("/");
}

export function compileScript(cutscene) {
  const placements = [];
  if (cutscene.farmer) {
    placements.push(`farmer ${cutscene.farmer.x} ${cutscene.farmer.y} ${cutscene.farmer.facing}`);
  }
  for (const actor of cutscene.actors) {
    if (actor.actor) placements.push(`${actor.actor} ${actor.x} ${actor.y} ${actor.facing}`);
  }

  const parts = [
    cutscene.music || "none",
    `${cutscene.viewportX ?? 0} ${cutscene.viewportY ?? 0}`,
    placements.join(" "),
  ];
  if (cutscene.skippable) parts.push("skippable");
  parts.push(...cutscene.commands.map(compileCommand).filter(Boolean));
  if (!parts.some((part) => part === "end" || part.startsWith("end "))) parts.push("end");
  return parts.join("/");
}

export function buildContentPatch(cutscene) {
  return JSON.stringify({
    Format: "2.0.0",
    Changes: [
      {
        Action: "EditData",
        Target: `Data/Events/${cutscene.location}`,
        Entries: {
          [compileEventKey(cutscene)]: compileScript(cutscene),
        },
      },
    ],
  }, null, 2);
}

export function buildRawEventEntry(cutscene) {
  return JSON.stringify({
    [compileEventKey(cutscene)]: compileScript(cutscene),
  }, null, 2);
}

export function isInsideMap(map, x, y) {
  if (!map) return true;
  return Number.isFinite(Number(x)) && Number.isFinite(Number(y)) && x >= 0 && y >= 0 && x < map.width && y < map.height;
}

export function isValidFacing(value) {
  return [0, 1, 2, 3].includes(Number(value));
}

export function getKnownMusicIds(musicOptions = []) {
  return new Set(musicOptions.map((option) => option.value).filter(Boolean));
}

export function validateCutscene(cutscene, allCutscenes = [], map = null, musicOptions = [], liveNpcs = []) {
  const checks = [];
  const add = (level, message) => checks.push({ level, message });
  const ids = allCutscenes.filter((item) => item.id === cutscene.id);
  const musicIds = getKnownMusicIds(musicOptions);
  const npcIds = new Set(liveNpcs.map((npc) => npc.name).filter(Boolean));

  if (!cutscene.id.trim()) add("error", "Event ID is required.");
  if (ids.length > 1) add("warning", "Another event in this workspace uses the same event ID.");
  if (!cutscene.location.trim()) add("error", "Location is required for Data/Events/<Location>.");
  if (!cutscene.music.trim()) add("error", "Music section is required; use none or continue if no track should start.");
  if (musicIds.size && !musicIds.has(cutscene.music)) add("warning", `Music ID "${cutscene.music}" was not found in the loaded music cue list.`);
  if (!isInsideMap(map, Number(cutscene.viewportX), Number(cutscene.viewportY))) add("error", "Viewport X/Y is outside the loaded map bounds.");
  if (!cutscene.farmer) add("error", "Farmer starting placement is required in the third event script section.");
  if (cutscene.farmer && !isInsideMap(map, Number(cutscene.farmer.x), Number(cutscene.farmer.y))) add("error", "Farmer starting position is outside the loaded map bounds.");
  if (cutscene.farmer && map && isBlockedTile(map, Number(cutscene.farmer.x), Number(cutscene.farmer.y))) {
    const suggestions = getSafeTileSuggestions(map, { x: Number(cutscene.farmer.x), y: Number(cutscene.farmer.y) });
    add("warning", `Farmer cannot start at ${cutscene.farmer.x},${cutscene.farmer.y} because this tile is blocked by ${describeTileBlock(map, Number(cutscene.farmer.x), Number(cutscene.farmer.y))}. Suggested safe tile: ${suggestions.map((tile) => `${tile.x},${tile.y}`).join(" / ") || "none nearby"}.`);
  }
  if (cutscene.farmer && !isValidFacing(cutscene.farmer.facing)) add("error", "Farmer direction must be 0 up, 1 right, 2 down, or 3 left.");
  if (!cutscene.premise.trim()) add("tip", "Add a one-line premise before scripting; it keeps the scene focused.");
  if (cutscene.preconditions.length === 0) add("warning", "No preconditions are set; the event may trigger whenever the location loads.");
  if (!cutscene.preconditions.some((item) => /^t(ime)?\s+/i.test(item) || /^Time\s+/i.test(item))) add("tip", "Consider adding a time window so testing and triggering are predictable.");
  if (!cutscene.commands.some((command) => command.verb === "end" || compileCommand(command).startsWith("end"))) add("error", "Event script should end with an end command.");
  if (!cutscene.farmer && cutscene.actors.length === 0) add("error", "At least one actor placement is needed.");
  const sections = quoteAwareSplit(compileScript(cutscene), "/");
  if (sections.length < 4) add("error", "Event script must start with music, viewport, actor placements, then commands.");
  if (!sections[0]?.trim()) add("error", "First event section must be the music ID.");
  if (!isNumberPair(sections[1] ?? "")) add("error", "Second event section must be viewport X Y.");
  if (!isPlacementHeader(sections[2] ?? "")) add("error", "Third event section must contain actor placements like farmer x y direction NPC x y direction.");
  if (!cutscene.commands.some((command) => !["end", "raw"].includes(command.verb) || (command.verb === "raw" && !compileCommand(command).startsWith("end")))) {
    add("warning", "Add at least one event command after actor placement before end.");
  }

  const occupied = new Map();
  for (const actor of [cutscene.farmer, ...cutscene.actors].filter(Boolean)) {
    const key = tileKey(Number(actor.x), Number(actor.y));
    if (occupied.has(key)) add("error", `${actor.actor} and ${occupied.get(key)} both start on tile ${key}.`);
    occupied.set(key, actor.actor);
  }

  for (const actor of cutscene.actors) {
    if (!actor.actor?.trim()) add("error", "NPC actor placement has a missing actor name.");
    if (npcIds.size && actor.actor && !npcIds.has(actor.actor)) add("warning", `${actor.actor} is not in the loaded SMAPI NPC list.`);
    if (!isInsideMap(map, Number(actor.x), Number(actor.y))) add("error", `${actor.actor || "NPC"} starting position is outside the loaded map bounds.`);
    if (map && isBlockedTile(map, Number(actor.x), Number(actor.y))) {
      const suggestions = getSafeTileSuggestions(map, { x: Number(actor.x), y: Number(actor.y) }, occupied);
      add("warning", `${actor.actor || "NPC"} cannot start at ${actor.x},${actor.y} because this tile is blocked by ${describeTileBlock(map, Number(actor.x), Number(actor.y))}. Suggested safe tile: ${suggestions.map((tile) => `${tile.x},${tile.y}`).join(" / ") || "none nearby"}.`);
    }
    if (!isValidFacing(actor.facing)) add("error", `${actor.actor || "NPC"} direction must be 0 up, 1 right, 2 down, or 3 left.`);
  }

  for (const command of cutscene.commands) {
    const compiled = compileCommand(command);
    if (compiled.includes("\n")) add("warning", `${command.label || command.verb} contains a line break; JSON export can handle it, but Stardew event strings are easier to debug on one line.`);
    if (command.verb === "quickQuestion" && !compiled.includes("(break)")) add("tip", "quickQuestion usually needs (break) answer scripts after the answer list.");
    if (command.verb === "fork") add("tip", "Fork target scripts should omit the normal music/viewport/placement header.");
    if (command.verb === "move" && map) {
      const actorName = expandShorthand(command.values.actor || "farmer").toLowerCase();
      const actor = [cutscene.farmer, ...cutscene.actors].find((candidate) => candidate.actor.toLowerCase() === actorName || candidate.uid.toLowerCase() === actorName);
      const invalid = buildMovePath(actor, command).find((tile) => isPathBlockedTile(map, tile.x, tile.y));
      if (invalid) add("error", `${command.values.actor || "Actor"} cannot path through ${invalid.x},${invalid.y} because it is blocked by ${describeTileBlock(map, invalid.x, invalid.y)}.`);
    }
    if (command.verb === "warp" && map) {
      const x = Number(command.values.x);
      const y = Number(command.values.y);
      if (!isInsideMap(map, x, y)) add("error", `Warp target ${x},${y} is outside the loaded map.`);
      if (isPathBlockedTile(map, x, y)) add("warning", `Warp target ${x},${y} is blocked by ${describeTileBlock(map, x, y)}.`);
    }
  }

  if (checks.length === 0) add("ok", "Looks ready for an in-game test pass.");
  return checks;
}

export function parseContentPatcherEvents(json, sourceFile) {
  const found = [];
  const visitChanges = (changes) => {
    for (const change of changes ?? []) {
      if (!change || typeof change !== "object") continue;
      const action = String(change.Action ?? "").toLowerCase();
      const target = String(change.Target ?? "");
      const entries = change.Entries;
      if (action === "editdata" && target.toLowerCase().startsWith("data/events/") && entries && typeof entries === "object") {
        const location = target.slice("Data/Events/".length);
        for (const [eventKey, script] of Object.entries(entries)) {
          if (typeof script === "string") {
            found.push(parseEventEntry(eventKey, script, location, sourceFile, target));
          }
        }
      }
    }
  };

  if (Array.isArray(json)) visitChanges(json);
  if (json?.Changes && Array.isArray(json.Changes)) visitChanges(json.Changes);
  if (json?.Entries && typeof json.Entries === "object") {
    for (const [eventKey, script] of Object.entries(json.Entries)) {
      if (typeof script === "string") found.push(parseEventEntry(eventKey, script, "Unknown", sourceFile, "Data/Events/Unknown"));
    }
  }
  return found;
}

export function parseScheduleEntry(npc, key, script) {
  const schedule = blankSchedule(npc);
  schedule.key = key;
  schedule.points = quoteAwareSplit(script, "/")
    .map((part) => splitWords(part))
    .filter((parts) => parts.length >= 5 && Number.isFinite(Number(parts[0])) && Number.isFinite(Number(parts[2])) && Number.isFinite(Number(parts[3])))
    .map((parts) => ({
      uid: crypto.randomUUID(),
      time: parts[0],
      location: parts[1],
      x: Number(parts[2]),
      y: Number(parts[3]),
      facing: Number(parts[4]),
      animation: parts[5] ?? "",
      dialogue: parts.slice(6).map(unquote).join(" "),
    }));
  if (!schedule.points.length) schedule.points = [blankSchedulePoint()];
  return schedule;
}

export function parseContentPatcherSchedules(json, sourceFile) {
  const found = [];
  const visitChanges = (changes) => {
    for (const change of changes ?? []) {
      if (!change || typeof change !== "object") continue;
      const action = String(change.Action ?? "").toLowerCase();
      const target = String(change.Target ?? "");
      const entries = change.Entries;
      const normalizedTarget = target.toLowerCase().replace(/\\/g, "/");
      if (action !== "editdata" || !normalizedTarget.startsWith("characters/schedules/") || !entries || typeof entries !== "object") continue;
      const npc = target.slice("Characters/Schedules/".length).replace(/^Characters\/schedules\//i, "");
      for (const [key, script] of Object.entries(entries)) {
        if (typeof script === "string") {
          const schedule = parseScheduleEntry(npc, key, script);
          schedule.sourceFile = sourceFile;
          found.push(schedule);
        }
      }
    }
  };

  if (Array.isArray(json)) visitChanges(json);
  if (json?.Changes && Array.isArray(json.Changes)) visitChanges(json.Changes);
  return found;
}

export function parseContentPatcherMapEdits(json) {
  const edits = [];
  const visitChanges = (changes) => {
    for (const [index, change] of (changes ?? []).entries()) {
      if (!change || typeof change !== "object") continue;
      const action = String(change.Action ?? "").toLowerCase();
      const target = String(change.Target ?? "");
      if (action !== "editmap" || !target.toLowerCase().replace(/\\/g, "/").startsWith("maps/")) continue;
      const mapId = target.replace(/^Maps[\\/]/i, "");
      const warps = [];
      for (const warp of change.AddWarps ?? []) {
        warps.push(...parseWarpProperty(warp, `${json.__sourceFile ?? "content.json"} > EditMap ${target} > AddWarps`));
      }
      const mapProperties = change.MapProperties ?? {};
      for (const [key, value] of Object.entries(mapProperties)) {
        if (String(key).toLowerCase().includes("warp")) {
          warps.push(...parseWarpProperty(value, `${json.__sourceFile ?? "content.json"} > EditMap ${target} > MapProperties.${key}`));
        }
      }
      const tileProperties = [];
      for (const edit of change.SetProperties ?? []) {
        const layer = edit.Layer ?? "";
        const area = edit.Area ?? {};
        const properties = edit.Properties ?? {};
        if (!properties || typeof properties !== "object") continue;
        const width = Number(area.Width ?? 1);
        const height = Number(area.Height ?? 1);
        const startX = Number(area.X ?? edit.X ?? 0);
        const startY = Number(area.Y ?? edit.Y ?? 0);
        for (let dy = 0; dy < Math.max(1, height); dy += 1) {
          for (let dx = 0; dx < Math.max(1, width); dx += 1) {
            tileProperties.push({
              x: startX + dx,
              y: startY + dy,
              layer,
              properties,
              source: `${json.__sourceFile ?? "content.json"} > EditMap ${target} > SetProperties #${index + 1}`,
            });
          }
        }
      }
      edits.push({
        mapId,
        warps,
        tileProperties,
        source: `${json.__sourceFile ?? "content.json"} > EditMap ${target}`,
      });
    }
  };

  if (Array.isArray(json)) visitChanges(json);
  if (json?.Changes && Array.isArray(json.Changes)) visitChanges(json.Changes);
  return edits;
}

export function parseContentPatcherMapSources(json) {
  const sources = [];
  const visitChanges = (changes) => {
    for (const [index, change] of (changes ?? []).entries()) {
      if (!change || typeof change !== "object") continue;
      const action = String(change.Action ?? "");
      const normalizedAction = action.toLowerCase();
      const target = String(change.Target ?? "");
      const normalizedTarget = target.toLowerCase().replace(/\\/g, "/");
      if (normalizedAction === "load" && normalizedTarget.startsWith("maps/")) {
        sources.push({
          type: "load",
          mapId: target.replace(/^Maps[\\/]/i, ""),
          fromFile: String(change.FromFile ?? ""),
          source: `${json.__sourceFile ?? "content.json"} > Load ${target} #${index + 1}`,
          when: change.When ?? null,
        });
      }
      if (normalizedAction === "include") {
        sources.push({
          type: "include",
          fromFile: String(change.FromFile ?? ""),
          source: `${json.__sourceFile ?? "content.json"} > Include #${index + 1}`,
          when: change.When ?? null,
        });
      }
    }
  };

  if (Array.isArray(json)) visitChanges(json);
  if (json?.Changes && Array.isArray(json.Changes)) visitChanges(json.Changes);
  return sources;
}

export function guessSourceBucket(path = "") {
  const normalized = String(path).toLowerCase();
  if (normalized.includes("reference mods")) return "Reference mods";
  if (normalized.includes("mainmoonvillage-git") || normalized.includes("[cp] moonvillage") || normalized.includes("moonvillage")) return "Current Moon Village mod";
  return "Custom path";
}

export function buildMapCatalog(maps, mapSources = []) {
  const byKey = new Map();
  const add = (entry) => {
    const key = normalizeMapName(entry.name || entry.target || entry.fromFile);
    if (!key) return;
    const existing = byKey.get(key);
    byKey.set(key, {
      ...existing,
      ...entry,
      aliases: [...new Set([...(existing?.aliases ?? []), ...(entry.aliases ?? []), entry.name, entry.target].filter(Boolean))],
      patches: [...new Set([...(existing?.patches ?? []), ...(entry.patches ?? []), entry.patch].filter(Boolean))],
    });
  };

  for (const source of mapSources) {
    if (source.type === "load") {
      add({
        name: source.mapId,
        target: `Maps/${source.mapId}`,
        fromFile: source.fromFile,
        sourceMod: guessSourceBucket(source.source || source.fromFile),
        sourceKind: guessSourceBucket(source.source || source.fromFile),
        patch: source.source,
        when: source.when,
      });
    }
    if (source.type === "include") {
      add({
        name: source.fromFile,
        fromFile: source.fromFile,
        sourceMod: guessSourceBucket(source.source || source.fromFile),
        sourceKind: guessSourceBucket(source.source || source.fromFile),
        patch: source.source,
      });
    }
  }

  for (const map of Object.values(maps)) {
    add({
      name: map.id,
      target: map.locationNames?.[0] ? `Maps/${map.locationNames[0]}` : `Maps/${map.id}`,
      fromFile: map.sourceFile,
      sourceMod: guessSourceBucket(map.sourceFile),
      sourceKind: guessSourceBucket(map.sourceFile),
      mapId: map.id,
      aliases: [map.fileId, ...(map.locationNames ?? [])],
      patches: map.contentPatcherSources ?? [],
    });
  }

  return [...byKey.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

export function findMapCatalogMatches(query, catalog, maps) {
  const normalized = normalizeMapName(query);
  if (!normalized) return [];
  const candidates = [];
  for (const item of catalog) {
    const names = [item.name, item.target, item.fromFile, ...(item.aliases ?? [])].filter(Boolean);
    if (names.some((name) => {
      const value = normalizeMapName(name);
      return value === normalized || value.includes(normalized) || normalized.includes(value);
    })) {
      candidates.push(item);
    }
  }
  for (const map of Object.values(maps)) {
    const names = [map.id, map.fileId, map.sourceFile, ...(map.locationNames ?? [])].filter(Boolean);
    if (names.some((name) => {
      const value = normalizeMapName(name);
      return value === normalized || value.includes(normalized) || normalized.includes(value);
    })) {
      candidates.push({ name: map.id, mapId: map.id, fromFile: map.sourceFile, sourceMod: guessSourceBucket(map.sourceFile), sourceKind: guessSourceBucket(map.sourceFile) });
    }
  }
  return [...new Map(candidates.map((item) => [`${item.name}|${item.fromFile}`, item])).values()]
    .sort((a, b) => {
      const aExact = [a.name, a.target, ...(a.aliases ?? [])].some((name) => normalizeMapName(name) === normalized);
      const bExact = [b.name, b.target, ...(b.aliases ?? [])].some((name) => normalizeMapName(name) === normalized);
      if (aExact !== bExact) return aExact ? -1 : 1;
      return String(a.name).localeCompare(String(b.name));
    });
}

export function isLocationNotReady(errorText = "") {
  return String(errorText).toLowerCase().includes("location_not_ready");
}

export function isWorldNotReady(errorText = "") {
  return String(errorText).toLowerCase().includes("world_not_ready");
}

export function formatMapLoadFailure({ requestedLocation, cleanPath, chosen, chosenMapId, maps, matches, apiBaseUrl, apiFailure }) {
  const exactMatches = matches.filter((match) => [match.name, match.target, ...(match.aliases ?? [])].some((name) => normalizeMapName(name) === normalizeMapName(requestedLocation)));
  const displayMatches = (exactMatches.length ? exactMatches : matches).slice(0, exactMatches.length ? 3 : 8);
  const found = Boolean(exactMatches.length || chosen);
  const notReady = isLocationNotReady(apiFailure);
  const worldNotReady = isWorldNotReady(apiFailure);
  const source = exactMatches[0]?.sourceMod || chosen?.sourceMod || chosen?.sourceKind || "-";
  const statusLines = notReady || worldNotReady
    ? [
      "Status:",
      worldNotReady
        ? `${requestedLocation} was found, but StardewLocalAPI says the game world is not ready yet.`
        : `${requestedLocation} was found as a ${String(source).toLowerCase().includes("vanilla") ? "vanilla" : source} map, but StardewLocalAPI says the location is not ready yet.`,
      "",
      "Resolver:",
      `Map found: ${found}`,
      `Map source: ${source}${String(source).toLowerCase().includes("vanilla") ? " via StardewLocalAPI" : ""}`,
      `Capture status: ${worldNotReady ? "world_not_ready" : "location_not_ready"}`,
      "Load status: waiting_for_live_location",
      "",
    ]
    : [];
  return [
    `Could not load ${requestedLocation || cleanPath}.`,
    "",
    ...statusLines,
    "Checked:",
    `- Content Patcher target: Maps/${requestedLocation}`,
    `- FromFile: ${chosen?.fromFile || cleanPath || "-"}`,
    `- File already loaded: ${Boolean(chosenMapId && maps[chosenMapId])}`,
    `- StardewLocalAPI URL: ${apiBaseUrl.trim() || "-"}`,
    `- API capture: ${worldNotReady ? "world_not_ready" : notReady ? "location_not_ready" : (apiFailure || (apiBaseUrl.trim() ? "not needed or no location name" : "not configured"))}`,
    "",
    "Possible matches found:",
    ...(displayMatches.length ? displayMatches.map((match) => `- ${match.name || "-"} | ${match.fromFile || "-"} | ${match.sourceMod || "-"}`) : ["- none"]),
    "",
    "Suggested fix:",
    ...(worldNotReady
      ? [
        "- Load a save in Stardew Valley, wait until the farmer is controllable, then click Retry Live API Capture.",
        `- After the world is ready, enter ${requestedLocation} in-game if needed and click Use Current In-Game Map.`,
        `- Or load ${requestedLocation} from TMX/vanilla assets if available.`,
      ]
      : notReady
      ? [
        `- Enter ${requestedLocation} in-game, then click Use Current In-Game Map.`,
        "- Or click Connect in Live API, then Load Map again.",
        `- Or load ${requestedLocation} from the vanilla asset cache if available.`,
      ]
      : [
        `- If this is a vanilla map like ${requestedLocation}, click Connect in Live API, enter that location in-game if needed, then Load Map again.`,
        "- Use Asset Upload to select the Moon Village git folder or Reference mods folder, then choose the discovered map.",
        "- Check content.json Target and FromFile spelling if this map should be registered by Content Patcher.",
      ]),
  ].join("\n");
}

export function applyMapEditsToMaps(mapUpdates, mapEdits) {
  if (!mapEdits.length) return mapUpdates;
  const next = { ...mapUpdates };
  for (const edit of mapEdits) {
    const mapId = findBestMapForLocation(edit.mapId, next);
    if (!mapId || !next[mapId]) continue;
    const map = next[mapId];
    const mergedWarps = [...(map.warps ?? []), ...edit.warps];
    const tileDetails = { ...(map.tileDetails ?? {}) };
    const blockedTiles = new Set(map.blockedTiles ?? []);
    for (const propertyPatch of edit.tileProperties ?? []) {
      const key = tileKey(propertyPatch.x, propertyPatch.y);
      const existing = tileDetails[key] ?? blankTileDetails(propertyPatch.x, propertyPatch.y);
      const layer = propertyPatch.layer || "EditMap";
      existing.layers[layer] = {
        ...(existing.layers[layer] ?? {}),
        properties: { ...(existing.layers[layer]?.properties ?? {}), ...propertyPatch.properties },
        source: propertyPatch.source,
      };
      const action = propertyPatch.properties.Action ?? propertyPatch.properties.TouchAction ?? propertyPatch.properties.Warp;
      if (action) {
        existing.action = String(action);
        existing.actionSource = propertyPatch.source;
        existing.isDoor = isDoorAction(action);
        existing.isWarp = existing.isDoor || parseWarpProperty(action, propertyPatch.source, propertyPatch.x, propertyPatch.y).length > 0;
      }
      const blockReason = getBlockingReasonFromProperties(propertyPatch.properties);
      if (blockReason) {
        existing.blocked = true;
        existing.blockedReasons.push(`${blockReason} (${layer})`);
        blockedTiles.add(key);
      }
      tileDetails[key] = existing;
    }
    next[mapId] = {
      ...map,
      contentPatcherSources: [...(map.contentPatcherSources ?? []), edit.source].filter(Boolean),
      tileDetails,
      blockedTiles,
      warps: [...new Map(mergedWarps.map((warp) => [`${warp.x},${warp.y},${warp.targetMap},${warp.targetX},${warp.targetY}`, warp])).values()],
    };
  }
  return next;
}

export function applyMapSourcesToMaps(mapUpdates, mapSources) {
  if (!mapSources.length) return mapUpdates;
  const next = { ...mapUpdates };
  for (const source of mapSources) {
    if (source.type !== "load") continue;
    const fromName = source.fromFile.split(/[\\/]/).pop()?.replace(/\.(tmx|tbin|xnb)$/i, "") ?? "";
    const mapId = findBestMapForLocation(source.mapId, next) || findBestMapForLocation(fromName, next);
    if (!mapId || !next[mapId]) continue;
    const map = next[mapId];
    next[mapId] = {
      ...map,
      id: source.mapId || map.id,
      fileId: map.fileId ?? map.id,
      sourceFile: source.fromFile || map.sourceFile,
      contentPatcherSources: [...(map.contentPatcherSources ?? []), source.source].filter(Boolean),
      locationNames: [...new Set([...(map.locationNames ?? []), source.mapId, map.id, fromName].filter(Boolean))],
    };
    if (source.mapId && source.mapId !== mapId) {
      next[source.mapId] = next[mapId];
      delete next[mapId];
    }
  }
  return next;
}

export function normalizeMapName(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/^maps[\\/]/, "")
    .replace(/^custom_?/, "")
    .replace(/[^a-z0-9]/g, "");
}

export function findBestMapForLocation(location, maps) {
  if (!location || !maps) return "";
  if (maps[location]) return location;

  const normalizedLocation = normalizeMapName(location);
  const entries = Object.values(maps);
  const exact = entries.find((map) => [map.id, map.fileId, ...(map.locationNames ?? [])].some((name) => normalizeMapName(name) === normalizedLocation));
  if (exact) return exact.id;

  const customMatch = entries.find((map) => [map.id, map.fileId, ...(map.locationNames ?? [])].some((name) => normalizeMapName(name).endsWith(normalizedLocation) || normalizedLocation.endsWith(normalizeMapName(name))));
  if (customMatch) return customMatch.id;

  return "";
}

export function buildApiUrl(baseUrl, token, path, params = {}) {
  const base = baseUrl.trim().replace(/\/+$/, "");
  if (!base) return "";
  const url = new URL(path, base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  if (token.trim()) url.searchParams.set("token", token.trim());
  return url.toString();
}

export function readProperties(node) {
  const properties = {};
  for (const property of node.querySelectorAll(":scope > properties > property")) {
    const name = property.getAttribute("name");
    if (!name) continue;
    properties[name] = property.getAttribute("value") ?? property.textContent ?? "";
  }
  return properties;
}

export function isBlockingLayerName(name = "") {
  const normalized = name.toLowerCase().replace(/[\s_-]+/g, "");
  return [
    "buildings",
    "collision",
    "collisions",
    "building",
    "walls",
    "wall",
    "water",
    "cliffs",
    "fences",
  ].some((fragment) => normalized.includes(fragment));
}

export function isLayerPropertyBlocking(name = "") {
  const normalized = name.toLowerCase().replace(/[\s_-]+/g, "");
  return normalized.includes("front") || normalized.includes("alwaysfront") || normalized.includes("buildings");
}

export function blankTileDetails(x, y) {
  return {
    x,
    y,
    layers: {},
    blocked: false,
    blockedReasons: [],
    action: "",
    actionSource: "",
    isWarp: false,
    isDoor: false,
  };
}

export function isDoorAction(value = "") {
  const text = String(value).toLowerCase();
  return text.includes("door") || text.includes("lockeddoorwarp") || text.includes("buildingsindoors") || text.includes("house");
}

export function getBlockingReasonFromProperties(properties = {}) {
  const entries = Object.entries(properties).map(([key, value]) => [key.toLowerCase(), String(value).toLowerCase()]);
  if (entries.some(([key, value]) => key === "passable" && ["t", "true", "1", "yes"].includes(value))) return "";
  const blocking = entries.find(([key, value]) => {
    if (["impassable", "blocked", "nopath", "npcbarrier", "building", "collision", "water", "nofurniture"].includes(key)) {
      return value === "" || !["f", "false", "0", "no"].includes(value);
    }
    if (key.includes("passable") || key.includes("walk")) return ["f", "false", "0", "no"].includes(value);
    if (key.includes("block") || key.includes("collision") || key.includes("barrier") || key.includes("water")) {
      return !["f", "false", "0", "no"].includes(value);
    }
    return false;
  });
  return blocking ? `${blocking[0]}=${blocking[1] || "true"}` : "";
}

export function getActionBlockReason(details, options = {}) {
  if (!details) return "";
  if (details.isWarp && !options.allowWarps) return details.isDoor ? "door/warp tile" : "warp tile";
  if (details.isDoor && !options.allowDoors) return "door tile";
  if (details.action && !options.allowActions) return `action tile: ${details.action}`;
  return "";
}

export function parseWarpParts(parts, source, fallbackX = null, fallbackY = null) {
  const warps = [];
  for (let index = 0; index + 4 < parts.length; index += 5) {
    const x = Number(parts[index]);
    const y = Number(parts[index + 1]);
    const targetMap = parts[index + 2];
    const targetX = Number(parts[index + 3]);
    const targetY = Number(parts[index + 4]);
    if (Number.isFinite(x) && Number.isFinite(y) && targetMap) {
      warps.push({ x, y, targetMap, targetX, targetY, source });
    }
  }

  if (!warps.length && fallbackX !== null && fallbackY !== null && parts.length >= 4) {
    const maybeTargetX = Number(parts[1]);
    const maybeTargetY = Number(parts[2]);
    const maybeTargetMap = parts[3];
    if (Number.isFinite(maybeTargetX) && Number.isFinite(maybeTargetY) && maybeTargetMap) {
      warps.push({ x: fallbackX, y: fallbackY, targetMap: maybeTargetMap, targetX: maybeTargetX, targetY: maybeTargetY, source });
    }
  }
  return warps;
}

export function parseWarpProperty(value, source, fallbackX = null, fallbackY = null) {
  const parts = splitWords(String(value ?? ""));
  if (!parts.length) return [];
  const command = parts[0].toLowerCase();
  if (fallbackX !== null && fallbackY !== null) {
    if (command === "warp" && parts.length >= 4) {
      const actionX = Number(parts[1]);
      const actionY = Number(parts[2]);
      const touchX = Number(parts[2]);
      const touchY = Number(parts[3]);
      if (Number.isFinite(actionX) && Number.isFinite(actionY) && parts[3]) {
        return [{ x: fallbackX, y: fallbackY, targetMap: parts[3], targetX: actionX, targetY: actionY, source }];
      }
      if (parts[1] && Number.isFinite(touchX) && Number.isFinite(touchY)) {
        return [{ x: fallbackX, y: fallbackY, targetMap: parts[1], targetX: touchX, targetY: touchY, source }];
      }
    }
    if (command === "magicwarp" && parts.length >= 4) {
      const targetX = Number(parts[2]);
      const targetY = Number(parts[3]);
      if (parts[1] && Number.isFinite(targetX) && Number.isFinite(targetY)) {
        return [{ x: fallbackX, y: fallbackY, targetMap: parts[1], targetX, targetY, source }];
      }
    }
    if (command === "lockeddoorwarp" && parts.length >= 4) {
      const targetX = Number(parts[1]);
      const targetY = Number(parts[2]);
      if (Number.isFinite(targetX) && Number.isFinite(targetY) && parts[3]) {
        return [{ x: fallbackX, y: fallbackY, targetMap: parts[3], targetX, targetY, source }];
      }
    }
    if (command === "obeliskwarp" && parts.length >= 4) {
      const targetX = Number(parts[2]);
      const targetY = Number(parts[3]);
      if (parts[1] && Number.isFinite(targetX) && Number.isFinite(targetY)) {
        return [{ x: fallbackX, y: fallbackY, targetMap: parts[1], targetX, targetY, source }];
      }
    }
  }
  return parseWarpParts(parts, source, fallbackX, fallbackY);
}

export function tileKey(x, y) {
  return `${x},${y}`;
}

export function readTileCoordinate(value) {
  if (!value && value !== 0) return null;
  if (Array.isArray(value) && value.length >= 2) {
    const x = Number(value[0]);
    const y = Number(value[1]);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  }
  if (typeof value === "string") {
    const match = value.match(/-?\d+(?:\.\d+)?/g);
    if (match?.length >= 2) {
      const x = Number(match[0]);
      const y = Number(match[1]);
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    }
  }
  if (typeof value === "object") {
    const x = Number(value.x ?? value.X ?? value.tileX ?? value.TileX ?? value.tile?.x ?? value.Tile?.X);
    const y = Number(value.y ?? value.Y ?? value.tileY ?? value.TileY ?? value.tile?.y ?? value.Tile?.Y);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  }
  return null;
}

export function collectTileCoordinates(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(readTileCoordinate).filter(Boolean);
  if (typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) => {
      const direct = readTileCoordinate(entry);
      if (direct) return [direct];
      const fromKey = readTileCoordinate(key);
      return fromKey ? [fromKey] : [];
    });
  }
  return [];
}

export function addLiveBlockedTile(mapData, tile, reason) {
  if (!tile) return;
  const key = tileKey(tile.x, tile.y);
  mapData.blockedTiles.add(key);
  const details = mapData.tileDetails[key] ?? blankTileDetails(tile.x, tile.y);
  details.blocked = true;
  if (reason && !details.blockedReasons.includes(reason)) details.blockedReasons.push(reason);
  details.layers.Live = {
    ...(details.layers.Live ?? {}),
    source: "StardewLocalAPI live collision",
  };
  mapData.tileDetails[key] = details;
}

export function applyLiveCollisionData(mapData, result = {}) {
  const overlay = result.overlay ?? result.Overlay ?? result.collision ?? result.Collision ?? result.pathing ?? result.Pathing ?? result.map ?? result.Map ?? {};
  const sourceObjects = [
    ["blockedTiles", "live passability blocked"],
    ["blocked", "live passability blocked"],
    ["impassableTiles", "live impassable tile"],
    ["collisionTiles", "live collision tile"],
    ["noPathTiles", "live NoPath tile"],
    ["waterTiles", "live water tile"],
    ["objectTiles", "object/furniture present"],
    ["objects", "object/furniture present"],
    ["furnitureTiles", "object/furniture present"],
    ["furniture", "object/furniture present"],
    ["terrainFeatures", "terrain feature collision"],
    ["largeTerrainFeatures", "large terrain feature collision"],
    ["npcTiles", "occupied by NPC"],
    ["npcs", "occupied by NPC"],
    ["playerTile", "occupied by player"],
    ["player", "occupied by player"],
  ];

  for (const [key, reason] of sourceObjects) {
    for (const tile of collectTileCoordinates(result[key] ?? result[capitalize(key)] ?? overlay[key] ?? overlay[capitalize(key)])) {
      addLiveBlockedTile(mapData, tile, reason);
    }
  }

  const walkableTiles = collectTileCoordinates(result.walkableTiles ?? result.WalkableTiles ?? overlay.walkableTiles ?? overlay.WalkableTiles);
  if (walkableTiles.length) {
    mapData.liveWalkableTiles = new Set(walkableTiles.map((tile) => tileKey(tile.x, tile.y)));
    for (let y = 0; y < mapData.height; y += 1) {
      for (let x = 0; x < mapData.width; x += 1) {
        if (!mapData.liveWalkableTiles.has(tileKey(x, y))) addLiveBlockedTile(mapData, { x, y }, "not marked walkable by live passability grid");
      }
    }
  }

  const liveWarps = result.warps ?? result.Warps ?? overlay.warps ?? overlay.Warps ?? [];
  for (const warp of Array.isArray(liveWarps) ? liveWarps : Object.values(liveWarps)) {
    const source = readTileCoordinate(warp);
    if (!source) continue;
    const targetMap = warp.targetMap ?? warp.TargetMap ?? warp.location ?? warp.Location ?? "";
    const targetX = Number(warp.targetX ?? warp.TargetX ?? warp.xTarget ?? warp.XTarget ?? 0);
    const targetY = Number(warp.targetY ?? warp.TargetY ?? warp.yTarget ?? warp.YTarget ?? 0);
    mapData.warps.push({ x: source.x, y: source.y, targetMap, targetX, targetY, source: "StardewLocalAPI live warp" });
    const key = tileKey(source.x, source.y);
    const details = mapData.tileDetails[key] ?? blankTileDetails(source.x, source.y);
    details.isWarp = true;
    details.action = details.action || `Warp ${targetX} ${targetY} ${targetMap}`;
    details.actionSource = "StardewLocalAPI live warp";
    mapData.tileDetails[key] = details;
  }

  mapData.liveCollisionStatus = mapData.blockedTiles.size || mapData.liveWalkableTiles?.size ? "loaded" : "visual_only";
  return mapData;
}

export function getCollisionSource(map) {
  if (!map) return "-";
  if (map.liveCollisionStatus === "loaded") return "Live Stardew API";
  if (map.liveCollisionStatus === "visual_only") return "Missing";
  const source = String(map.sourceFile || "");
  const sources = (map.contentPatcherSources ?? []).join(" ");
  const combined = `${source} ${sources}`.toLowerCase();
  if (source === "StardewLocalAPI") return "Missing";
  if (combined.includes("reference")) return "Reference mod asset";
  if (combined.includes("vanilla") || combined.includes(".xnb")) return "Vanilla asset cache";
  if (source || map.layers?.length || map.tileDetails) return "TMX/assets";
  return "Missing";
}

export function getMapRenderSource(map) {
  if (!map) return "-";
  if (map.sourceFile === "StardewLocalAPI") return "Live Stardew API screenshot";
  if (map.previewImage) return map.sourceFile || "Loaded image/map asset";
  return map.sourceFile || "Parsed map data";
}

export function capitalize(value) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

export function isBlockedTile(map, x, y) {
  if (!map) return false;
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true;
  return map.blockedTiles?.has(tileKey(x, y)) ?? false;
}

export function isPathBlockedTile(map, x, y, options = {}) {
  if (!map) return false;
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true;
  const details = map.tileDetails?.[tileKey(x, y)];
  return isBlockedTile(map, x, y) || Boolean(getActionBlockReason(details, options));
}

export function buildMovePath(actor, command) {
  if (!actor || command?.verb !== "move") return [];
  const dx = Number(command.values.dx ?? 0);
  const dy = Number(command.values.dy ?? 0);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return [];
  const path = [];
  let x = Number(actor.x);
  let y = Number(actor.y);
  const stepX = Math.sign(dx);
  for (let index = 0; index < Math.abs(dx); index += 1) {
    x += stepX;
    path.push({ x, y });
  }
  const stepY = Math.sign(dy);
  for (let index = 0; index < Math.abs(dy); index += 1) {
    y += stepY;
    path.push({ x, y });
  }
  return path;
}

export async function loadImageFromFile(file) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = URL.createObjectURL(file);
  });
}

export async function loadImageFromUrl(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export function defaultPortraitFolder(npcName) {
  const cleanName = String(npcName || "NPCName").replace(/^Moonvillage_/i, "").trim() || "NPCName";
  return `assets/Characters/${cleanName}/Portraits`;
}

export function defaultPortraitFile(npcName) {
  const cleanName = String(npcName || "NPCName").replace(/^Moonvillage_/i, "").trim() || "NPCName";
  return `${defaultPortraitFolder(cleanName)}/${cleanName}_Portraits.png`;
}

export function canvasForImage(image) {
  if (!image) return null;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0);
  return { canvas, context };
}

export function imageAlphaBounds(image) {
  const drawable = canvasForImage(image);
  if (!drawable) return null;
  const { context } = drawable;
  const data = context.getImageData(0, 0, image.width, image.height).data;
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  let semiTransparent = 0;
  let visible = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = data[((y * image.width + x) * 4) + 3];
      if (alpha > 0 && alpha < 255) semiTransparent += 1;
      if (alpha > 16) {
        visible += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (!visible) return { visible: 0, semiTransparent, transparentCorners: false, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const corners = [
    data[3],
    data[((image.width - 1) * 4) + 3],
    data[(((image.height - 1) * image.width) * 4) + 3],
    data[(((image.height - 1) * image.width + image.width - 1) * 4) + 3],
  ];
  return {
    visible,
    semiTransparent,
    transparentCorners: corners.every((alpha) => alpha === 0),
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export function validatePortraitExpression(image, label, baseImage = null) {
  const checks = [];
  const add = (level, message) => checks.push({ level, message });
  if (!image) {
    add("warning", `${label} is not loaded yet.`);
    return checks;
  }
  if (image.width !== PORTRAIT_CELL_SIZE || image.height !== PORTRAIT_CELL_SIZE) {
    add("error", `${label} must be exactly 64 x 64px. Current size is ${image.width} x ${image.height}px.`);
  } else {
    add("ok", `${label} is 64 x 64px.`);
  }
  const bounds = imageAlphaBounds(image);
  if (!bounds?.visible) add("error", `${label} has no visible pixels.`);
  if (bounds && !bounds.transparentCorners) add("warning", `${label} corners are not transparent. Check the background.`);
  if (bounds && bounds.semiTransparent > Math.max(12, bounds.visible * 0.08)) {
    add("warning", `${label} has many semi-transparent pixels. PixelLab may have blurred or anti-aliased the art.`);
  }
  if (baseImage && image !== baseImage) {
    const baseBounds = imageAlphaBounds(baseImage);
    if (baseBounds?.visible && bounds?.visible) {
      const shiftX = Math.abs(baseBounds.minX - bounds.minX);
      const shiftY = Math.abs(baseBounds.minY - bounds.minY);
      if (shiftX > 1 || shiftY > 1) {
        add("warning", `${label} appears shifted ${shiftX}px horizontally and ${shiftY}px vertically from the base portrait.`);
      } else {
        add("ok", `${label} alignment matches the base portrait.`);
      }
    }
  }
  return checks;
}

export function normalizeTilesheetSource(value = "") {
  const fileName = String(value || "").split(/[\\/]/).pop() || "";
  if (!fileName) return "";
  return `${fileName.replace(/(\.png)+$/i, "")}.png`.toLowerCase();
}

export function parseFrameList(value) {
  if (Array.isArray(value)) return value.map(Number).filter((frame) => Number.isInteger(frame) && frame >= 0);
  return String(value || "")
    .split(/[\s,]+/)
    .map((frame) => Number(frame.trim()))
    .filter((frame) => Number.isInteger(frame) && frame >= 0);
}

export function formatFrameList(frames) {
  return parseFrameList(frames).join(" ");
}

export function stripJsonComments(text) {
  const output = [];
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      output.push(char);
      escaped = false;
      continue;
    }
    if (char === "\\") {
      output.push(char);
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      output.push(char);
      continue;
    }
    if (!inString && char === "/" && text[index + 1] === "/") {
      while (index < text.length && text[index] !== "\n") index += 1;
      output.push("\n");
      continue;
    }
    output.push(char);
  }
  return output.join("").replace(/,(\s*[}\]])/g, "$1");
}

export function parseAnimationDescriptions(json) {
  const entries = {};
  for (const change of json?.Changes ?? []) {
    const target = String(change.Target || "").toLowerCase();
    if (target === "data/animationdescriptions" && change.Entries && typeof change.Entries === "object") {
      Object.assign(entries, change.Entries);
    }
  }
  return Object.entries(entries).map(([name, value], index) => {
    const parts = String(value || "").split("/");
    return {
      id: crypto.randomUUID?.() ?? `anim-${Date.now()}-${index}`,
      name,
      speed: Number(parts[0]) || 1000,
      frames: parseFrameList(parts[1] || ""),
      loop: Number(parts[2]) || 20000,
    };
  });
}

export function buildAnimationDescriptions(animations) {
  const entries = {};
  for (const animation of animations) {
    const name = String(animation.name || "").trim();
    const frames = parseFrameList(animation.frames);
    if (!name || !frames.length) continue;
    entries[name] = `${Number(animation.speed) || 1000}/${frames.join(" ")}/${Number(animation.loop) || 20000}`;
  }
  return JSON.stringify({
    Changes: [
      {
        Action: "EditData",
        Target: "Data/AnimationDescriptions",
        Entries: entries,
      },
    ],
  }, null, 2);
}

export function validateSpriteSheet(image) {
  const checks = [];
  const add = (level, message) => checks.push({ level, message });
  if (!image) {
    add("warning", "No sprite sheet loaded.");
    return checks;
  }
  if (image.width !== SPRITE_FRAME_WIDTH * SPRITE_FRAMES_PER_ROW) add("error", `Sprite sheet width must be 64px. Current width is ${image.width}px.`);
  if (image.height % SPRITE_FRAME_HEIGHT !== 0) add("error", `Sprite sheet height must be a multiple of 32px. Current height is ${image.height}px.`);
  const totalFrames = image.width === 64 && image.height % 32 === 0 ? (image.height / SPRITE_FRAME_HEIGHT) * SPRITE_FRAMES_PER_ROW : 0;
  if (totalFrames && totalFrames < 16) add("warning", "Sprite sheet has fewer than 16 frames, so walking rows may be incomplete.");
  if (!checks.some((check) => check.level === "error")) add("ok", totalFrames ? `Sprite sheet is Stardew-sized with ${totalFrames} frames.` : "Sprite sheet dimensions look usable.");
  return checks;
}

export function validatePortraitSheet(image) {
  const checks = [];
  const add = (level, message) => checks.push({ level, message });
  if (!image) {
    add("warning", "No portrait sheet loaded.");
    return checks;
  }
  if (image.width % PORTRAIT_CELL_SIZE !== 0) add("error", `Portrait sheet width must be a multiple of 64px. Current width is ${image.width}px.`);
  if (image.height % PORTRAIT_CELL_SIZE !== 0) add("error", `Portrait sheet height must be a multiple of 64px. Current height is ${image.height}px.`);
  const cells = image.width % 64 === 0 && image.height % 64 === 0 ? (image.width / 64) * (image.height / 64) : 0;
  if (cells && cells < 6) add("warning", "Portrait sheet has fewer than 6 expressions.");
  if (!checks.some((check) => check.level === "error")) add("ok", cells ? `Portrait sheet has ${cells} portrait cell(s).` : "Portrait sheet dimensions look usable.");
  return checks;
}

export function validateAnimationEntries(animations, totalFrames, scheduleNames = []) {
  const checks = [];
  const add = (level, message) => checks.push({ level, message });
  const seen = new Set();
  for (const animation of animations) {
    const name = String(animation.name || "").trim();
    const frames = parseFrameList(animation.frames);
    if (!name) add("error", "Animation is missing a name.");
    if (name && /\s/.test(name)) add("warning", `Animation "${name}" contains spaces. Schedule animation names must match exactly.`);
    if (name && seen.has(name.toLowerCase())) add("error", `Duplicate animation name: ${name}.`);
    if (name) seen.add(name.toLowerCase());
    if (!frames.length) add("error", `Animation "${name || "unnamed"}" has no frames.`);
    if (!Number.isFinite(Number(animation.speed)) || Number(animation.speed) <= 0) add("error", `Animation "${name || "unnamed"}" speed must be greater than 0.`);
    if (totalFrames && frames.some((frame) => frame >= totalFrames)) add("error", `Animation "${name || "unnamed"}" uses a frame outside the loaded sheet.`);
    if (name && scheduleNames.length && !scheduleNames.some((scheduleName) => scheduleName === name)) add("tip", `Animation "${name}" is not currently used by a loaded schedule stop.`);
  }
  if (!checks.length) add("ok", "Animations look ready to export.");
  return checks;
}

export function frameInfoForImage(image) {
  if (!image || image.width !== 64 || image.height % 32 !== 0) return { rows: 0, totalFrames: 0 };
  const rows = image.height / SPRITE_FRAME_HEIGHT;
  return { rows, totalFrames: rows * SPRITE_FRAMES_PER_ROW };
}

export function zlibInflate(data) {
  return rawInflate(data, 2);
}

export function rawInflate(data, startByte = 0) {
  let pos = startByte * 8;
  const output = [];

  const readBits = (count) => {
    let value = 0;
    for (let index = 0; index < count; index += 1) {
      value |= ((data[pos >> 3] >> (pos & 7)) & 1) << index;
      pos += 1;
    }
    return value;
  };

  const buildCanonical = (lengths, count) => {
    const blCount = new Array(16).fill(0);
    for (let index = 0; index < count; index += 1) blCount[lengths[index]] += 1;
    blCount[0] = 0;
    let code = 0;
    const nextCode = new Array(16).fill(0);
    for (let bits = 1; bits < 16; bits += 1) {
      code = (code + blCount[bits - 1]) << 1;
      nextCode[bits] = code;
    }
    const table = {};
    for (let symbol = 0; symbol < count; symbol += 1) {
      const length = lengths[symbol];
      if (!length) continue;
      table[`${length}_${nextCode[length]}`] = symbol;
      nextCode[length] += 1;
    }
    return table;
  };

  const decodeSymbol = (table) => {
    let code = 0;
    for (let length = 1; length < 16; length += 1) {
      code = (code << 1) | readBits(1);
      const key = `${length}_${code}`;
      if (key in table) return table[key];
    }
    return -1;
  };

  const lengthBase = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  const lengthExtra = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  const distanceBase = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  const distanceExtra = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  const codeLengthOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
  const fixedLiteralLengths = new Array(288);
  for (let index = 0; index < 144; index += 1) fixedLiteralLengths[index] = 8;
  for (let index = 144; index < 256; index += 1) fixedLiteralLengths[index] = 9;
  for (let index = 256; index < 280; index += 1) fixedLiteralLengths[index] = 7;
  for (let index = 280; index < 288; index += 1) fixedLiteralLengths[index] = 8;
  const fixedDistanceLengths = new Array(32).fill(5);

  const inflateBlock = (literalTable, distanceTable) => {
    while (true) {
      const symbol = decodeSymbol(literalTable);
      if (symbol < 0) throw new Error("inflate: bad literal symbol");
      if (symbol < 256) {
        output.push(symbol);
      } else if (symbol === 256) {
        break;
      } else {
        const lengthIndex = symbol - 257;
        const length = lengthBase[lengthIndex] + readBits(lengthExtra[lengthIndex]);
        const distanceSymbol = decodeSymbol(distanceTable);
        if (distanceSymbol < 0) throw new Error("inflate: bad distance symbol");
        const distance = distanceBase[distanceSymbol] + readBits(distanceExtra[distanceSymbol]);
        const start = output.length - distance;
        for (let index = 0; index < length; index += 1) output.push(output[start + (index % distance)]);
      }
    }
  };

  let finalBlock = 0;
  while (!finalBlock) {
    finalBlock = readBits(1);
    const blockType = readBits(2);

    if (blockType === 0) {
      pos = (pos + 7) & ~7;
      const length = data[pos >> 3] | (data[(pos >> 3) + 1] << 8);
      pos += 32;
      for (let index = 0; index < length; index += 1) output.push(data[(pos >> 3) + index]);
      pos += length * 8;
    } else if (blockType === 1) {
      inflateBlock(buildCanonical(fixedLiteralLengths, 288), buildCanonical(fixedDistanceLengths, 32));
    } else if (blockType === 2) {
      const literalCount = readBits(5) + 257;
      const distanceCount = readBits(5) + 1;
      const codeLengthCount = readBits(4) + 4;
      const codeLengths = new Array(19).fill(0);
      for (let index = 0; index < codeLengthCount; index += 1) codeLengths[codeLengthOrder[index]] = readBits(3);
      const codeLengthTable = buildCanonical(codeLengths, 19);
      const lengths = [];
      while (lengths.length < literalCount + distanceCount) {
        const symbol = decodeSymbol(codeLengthTable);
        if (symbol < 0) throw new Error("inflate: bad code length symbol");
        if (symbol < 16) {
          lengths.push(symbol);
        } else if (symbol === 16) {
          const repeat = lengths[lengths.length - 1] ?? 0;
          const count = readBits(2) + 3;
          for (let index = 0; index < count; index += 1) lengths.push(repeat);
        } else if (symbol === 17) {
          const count = readBits(3) + 3;
          for (let index = 0; index < count; index += 1) lengths.push(0);
        } else {
          const count = readBits(7) + 11;
          for (let index = 0; index < count; index += 1) lengths.push(0);
        }
      }
      inflateBlock(buildCanonical(lengths.slice(0, literalCount), literalCount), buildCanonical(lengths.slice(literalCount), distanceCount));
    } else {
      throw new Error("inflate: invalid block type");
    }
  }

  return new Uint8Array(output);
}

export function decodeBase64Bytes(text = "") {
  const raw = atob(String(text).replace(/\s+/g, ""));
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

export function decodeTmxLayerData(dataNode, totalTiles) {
  if (!dataNode) return [];
  const encoding = dataNode.getAttribute("encoding") || "xml";
  if (encoding === "csv") {
    return dataNode.textContent.trim().split(",").map((tile) => (Number(tile.trim()) || 0) & 0x1fffffff);
  }
  if (encoding === "base64") {
    const compression = (dataNode.getAttribute("compression") || "none").toLowerCase();
    let bytes = decodeBase64Bytes(dataNode.textContent);
    if (compression === "zlib" || compression === "gzip") {
      bytes = zlibInflate(bytes);
    } else if (compression && compression !== "none") {
      throw new Error(`Unsupported TMX compression: ${compression}`);
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const gids = [];
    for (let index = 0; index < totalTiles && index * 4 + 4 <= bytes.length; index += 1) {
      gids.push(view.getUint32(index * 4, true) & 0x1fffffff);
    }
    while (gids.length < totalTiles) gids.push(0);
    return gids;
  }
  return [...dataNode.querySelectorAll(":scope > tile")]
    .slice(0, totalTiles)
    .map((tile) => (Number(tile.getAttribute("gid") ?? 0) || 0) & 0x1fffffff);
}

export function parseTmx(text, fileName) {
  const xml = new DOMParser().parseFromString(text, "text/xml");
  const mapNode = xml.querySelector("map");
  if (!mapNode) return null;
  const baseFileName = fileName.split(/[\\/]/).pop() || fileName;
  const baseId = baseFileName.replace(/\.(tmx|tbin)$/i, "");

  const tileProperties = {};
  const tileWarpTemplates = {};
  const tileActionTemplates = {};

  const tilesets = [...xml.querySelectorAll("tileset")].map((node) => {
    const image = node.querySelector("image");
    const source = normalizeTilesheetSource(image?.getAttribute("source") ?? "");
    const firstgid = Number(node.getAttribute("firstgid") ?? 1);
    for (const tileNode of node.querySelectorAll(":scope > tile")) {
      const localId = Number(tileNode.getAttribute("id") ?? 0);
      const gid = firstgid + localId;
      const properties = readProperties(tileNode);
      tileProperties[gid] = properties;
      const action = properties.Action ?? properties.TouchAction ?? properties.Warp;
      if (action) {
        tileWarpTemplates[gid] = action;
        tileActionTemplates[gid] = action;
      }
    }
    return {
      firstgid,
      name: node.getAttribute("name") ?? source,
      source,
      tileWidth: Number(node.getAttribute("tilewidth") ?? mapNode.getAttribute("tilewidth") ?? 16),
      tileHeight: Number(node.getAttribute("tileheight") ?? mapNode.getAttribute("tileheight") ?? 16),
      imageWidth: Number(image?.getAttribute("width") ?? 0),
      imageHeight: Number(image?.getAttribute("height") ?? 0),
    };
  });

  const layers = [...xml.querySelectorAll("layer")].map((layer) => {
    const data = layer.querySelector("data");
    const width = Number(layer.getAttribute("width") ?? mapNode.getAttribute("width") ?? 0);
    const height = Number(layer.getAttribute("height") ?? mapNode.getAttribute("height") ?? 0);
    return {
      name: layer.getAttribute("name") ?? "Layer",
      width,
      height,
      data: decodeTmxLayerData(data, width * height),
    };
  });

  const mapProperties = readProperties(mapNode);
  const warps = [];
  for (const [key, value] of Object.entries(mapProperties)) {
    if (key.toLowerCase().includes("warp")) {
      warps.push(...parseWarpProperty(value, `map:${key}`));
    }
  }

  for (const group of xml.querySelectorAll("objectgroup")) {
    for (const object of group.querySelectorAll(":scope > object")) {
      const properties = readProperties(object);
      const x = Math.floor(Number(object.getAttribute("x") ?? 0) / Number(mapNode.getAttribute("tilewidth") ?? 16));
      const y = Math.floor(Number(object.getAttribute("y") ?? 0) / Number(mapNode.getAttribute("tileheight") ?? 16));
      const action = properties.Action ?? properties.TouchAction ?? properties.Warp ?? object.getAttribute("type") ?? object.getAttribute("name");
      if (action) warps.push(...parseWarpProperty(action, `object:${group.getAttribute("name") ?? "Objects"}`, x, y));
    }
  }

  const blockedTiles = new Set();
  const tileDetails = {};
  const blockingLayerNames = [];
  for (const layer of layers) {
    const layerBlocks = isBlockingLayerName(layer.name);
    if (layerBlocks) blockingLayerNames.push(layer.name);
    for (let index = 0; index < layer.data.length; index += 1) {
      const gid = layer.data[index];
      if (!gid) continue;
      const x = index % layer.width;
      const y = Math.floor(index / layer.width);
      const key = tileKey(x, y);
      const details = tileDetails[key] ?? blankTileDetails(x, y);
      const properties = tileProperties[gid] ?? {};
      const propertyBlockReason = getBlockingReasonFromProperties(properties);
      details.layers[layer.name] = {
        gid,
        properties,
        source: `${fileName} > ${layer.name}`,
      };
      const layerPropertyBlocks = isLayerPropertyBlocking(layer.name) && propertyBlockReason;
      if (layerBlocks || layerPropertyBlocks || propertyBlockReason) {
        details.blocked = true;
        details.blockedReasons.push(propertyBlockReason || `${layer.name} layer`);
        blockedTiles.add(key);
      }
      if (tileWarpTemplates[gid]) {
        warps.push(...parseWarpProperty(tileWarpTemplates[gid], `${fileName} > tile:${layer.name}`, x, y));
      }
      if (tileActionTemplates[gid]) {
        details.action = String(tileActionTemplates[gid]);
        details.actionSource = `${fileName} > tile:${layer.name}`;
        details.isDoor = isDoorAction(details.action);
        details.isWarp = details.isDoor || parseWarpProperty(details.action, details.actionSource, x, y).length > 0;
      }
      tileDetails[key] = details;
    }
  }

  const uniqueWarps = [...new Map(warps.map((warp) => [`${warp.x},${warp.y},${warp.targetMap},${warp.targetX},${warp.targetY}`, { ...warp, isDoor: isDoorAction(warp.source) }])).values()];
  for (const warp of uniqueWarps) {
    const key = tileKey(warp.x, warp.y);
    const details = tileDetails[key] ?? blankTileDetails(warp.x, warp.y);
    details.isWarp = true;
    details.isDoor = details.isDoor || isDoorAction(details.action) || isDoorAction(warp.source);
    details.action = details.action || `Warp ${warp.targetX} ${warp.targetY} ${warp.targetMap}`;
    details.actionSource = details.actionSource || warp.source;
    tileDetails[key] = details;
  }

  return {
    id: baseId,
    fileId: baseId,
    sourceFile: fileName,
    width: Number(mapNode.getAttribute("width") ?? 0),
    height: Number(mapNode.getAttribute("height") ?? 0),
    tileWidth: Number(mapNode.getAttribute("tilewidth") ?? 16),
    tileHeight: Number(mapNode.getAttribute("tileheight") ?? 16),
    tilesets,
    layers,
    mapProperties,
    tileProperties,
    tileDetails,
    blockedTiles,
    blockingLayerNames,
    warps: uniqueWarps,
    contentPatcherSources: [],
    locationNames: [baseId],
  };
}

export function parseTbin(buffer, fileName) {
  const data = new Uint8Array(buffer);
  const size = data.length;
  let pos = 14;

  const readUint32 = () => {
    if (pos + 4 > size) throw new Error("Unexpected end of TBIN file.");
    const value = data[pos] | (data[pos + 1] << 8) | (data[pos + 2] << 16) | (data[pos + 3] << 24);
    pos += 4;
    return value >>> 0;
  };

  const readString = () => {
    const length = readUint32();
    if (pos + length > size) throw new Error("TBIN string is out of bounds.");
    let value = "";
    for (let index = 0; index < length; index += 1) value += String.fromCharCode(data[pos + index]);
    pos += length;
    return value;
  };

  const readProperties = () => {
    const properties = {};
    const count = readUint32();
    for (let index = 0; index < count; index += 1) {
      const key = readString();
      if (pos >= size) return properties;
      const valueType = data[pos];
      pos += 1;
      if (valueType === 0) {
        properties[key] = Boolean(data[pos]);
        pos += 1;
      } else if (valueType === 1 || valueType === 2) {
        const value = readUint32();
        properties[key] = valueType === 1 ? value : String(value);
      } else {
        properties[key] = readString();
      }
    }
    return properties;
  };

  try {
    const baseFileName = fileName.split(/[\\/]/).pop() || fileName;
    const baseId = baseFileName.replace(/\.(tmx|tbin)$/i, "");
    const mapProperties = readProperties();
    const tilesheetCount = readUint32();
    const tilesets = [];
    let firstgid = 1;

    for (let index = 0; index < tilesheetCount; index += 1) {
      const id = readString();
      readString();
      const imageName = readString();
      const sheetWidth = readUint32();
      const sheetHeight = readUint32();
      const tileWidth = readUint32();
      const tileHeight = readUint32();
      pos += 16;
      readProperties();
      const source = normalizeTilesheetSource(imageName || id);
      const tileCount = Math.max(1, sheetWidth * sheetHeight);
      tilesets.push({
        id,
        firstgid,
        name: id || source,
        source,
        tileWidth: tileWidth || 16,
        tileHeight: tileHeight || 16,
        imageWidth: (sheetWidth || 0) * (tileWidth || 16),
        imageHeight: (sheetHeight || 0) * (tileHeight || 16),
        tileCount,
      });
      firstgid += tileCount;
    }

    const resolveTilesheet = (id) => {
      const normalized = normalizeTilesheetSource(id);
      return tilesets.find((tileset) => (
        tileset.id === id
        || tileset.name === id
        || tileset.source === normalized
        || normalizeMapName(tileset.id) === normalizeMapName(id)
      )) ?? tilesets[0] ?? null;
    };

    const layerCount = readUint32();
    const layers = [];

    for (let layerIndex = 0; layerIndex < layerCount; layerIndex += 1) {
      const layerName = readString() || `Layer ${layerIndex + 1}`;
      pos += 1;
      readString();
      const width = readUint32();
      const height = readUint32();
      const tileWidth = readUint32();
      const tileHeight = readUint32();
      readProperties();
      const total = width * height;
      const layerData = new Array(total).fill(0);
      let tileIndex = 0;
      let currentTilesheet = null;

      while (tileIndex < total && pos < size) {
        const token = data[pos];
        if (token === 0x00) {
          pos += 1;
          tileIndex += 1;
        } else if (token === 0x4e) {
          pos += 1;
          tileIndex += Math.min(readUint32(), total - tileIndex);
        } else if (token === 0x54) {
          pos += 1;
          currentTilesheet = readString();
        } else if (token === 0x53) {
          pos += 1;
          const localIndex = readUint32();
          pos += 1;
          readProperties();
          const tileset = resolveTilesheet(currentTilesheet);
          layerData[tileIndex] = tileset ? tileset.firstgid + localIndex : 0;
          tileIndex += 1;
        } else if (token === 0x41) {
          pos += 1;
          readUint32();
          const frameCount = readUint32();
          let firstFrame = null;
          let frameTilesheet = currentTilesheet;
          for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
            if (data[pos] === 0x54) {
              pos += 1;
              frameTilesheet = readString();
            }
            if (data[pos] === 0x53) {
              pos += 1;
              const localIndex = readUint32();
              pos += 1;
              readProperties();
              if (!firstFrame) firstFrame = [frameTilesheet, localIndex];
            }
          }
          currentTilesheet = frameTilesheet;
          readProperties();
          const tileset = resolveTilesheet(firstFrame?.[0]);
          layerData[tileIndex] = tileset && firstFrame ? tileset.firstgid + firstFrame[1] : 0;
          tileIndex += 1;
        } else {
          pos += 1;
          tileIndex += 1;
        }
      }

      layers.push({
        name: layerName,
        width,
        height,
        tileWidth: tileWidth || 16,
        tileHeight: tileHeight || 16,
        data: layerData,
      });
    }

    const warps = [];
    for (const [key, value] of Object.entries(mapProperties)) {
      if (key.toLowerCase().includes("warp")) {
        warps.push(...parseWarpProperty(value, `map:${key}`));
      }
    }

    const blockedTiles = new Set();
    const tileDetails = {};
    const blockingLayerNames = [];
    for (const layer of layers) {
      const layerBlocks = isBlockingLayerName(layer.name);
      if (layerBlocks) blockingLayerNames.push(layer.name);
      for (let index = 0; index < layer.data.length; index += 1) {
        const gid = layer.data[index];
        if (!gid) continue;
        const x = index % layer.width;
        const y = Math.floor(index / layer.width);
        const key = tileKey(x, y);
        const details = tileDetails[key] ?? blankTileDetails(x, y);
        details.layers[layer.name] = {
          gid,
          properties: {},
          source: `${fileName} > ${layer.name}`,
        };
        if (layerBlocks) {
          details.blocked = true;
          details.blockedReasons.push(`${layer.name} layer`);
          blockedTiles.add(key);
        }
        tileDetails[key] = details;
      }
    }

    const width = layers[0]?.width ?? 0;
    const height = layers[0]?.height ?? 0;
    const tileWidth = layers[0]?.tileWidth ?? tilesets[0]?.tileWidth ?? 16;
    const tileHeight = layers[0]?.tileHeight ?? tilesets[0]?.tileHeight ?? 16;

    return {
      id: baseId,
      fileId: baseId,
      sourceFile: fileName,
      width,
      height,
      tileWidth,
      tileHeight,
      tilesets,
      layers,
      mapProperties,
      tileProperties: {},
      tileDetails,
      blockedTiles,
      blockingLayerNames,
      warps,
      contentPatcherSources: [],
      locationNames: [baseId],
    };
  } catch (error) {
    console.warn(`Could not parse TBIN ${fileName}: ${error.message}`);
    return null;
  }
}

export function findTileset(tilesets, gid) {
  let match = null;
  for (const tileset of tilesets) {
    if (gid >= tileset.firstgid) match = tileset;
  }
  return match;
}

export const SCHEDULE_KEYS = [
  "spring",
  "summer",
  "fall",
  "winter",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
  "rain",
  "marriage",
  "GOTO spring",
];

export const SCHEDULE_ANIMATIONS = [
  "",
  "square_3_3_0",
  "square_3_3_1",
  "square_3_3_2",
  "square_3_3_3",
  "faceDirection 0",
  "faceDirection 1",
  "faceDirection 2",
  "faceDirection 3",
];

export const FALLBACK_WARPS = [
  { map: "BusStop", x: 42, y: 23, targetMap: "Town", targetX: 0, targetY: 54, source: "fallback:vanilla" },
  { map: "BusStop", x: 42, y: 24, targetMap: "Town", targetX: 0, targetY: 55, source: "fallback:vanilla" },
  { map: "BusStop", x: 0, y: 21, targetMap: "Custom_Moonvillage", targetX: 37, targetY: 21, source: "fallback:moonvillage" },
  { map: "BusStop", x: 0, y: 22, targetMap: "Custom_Moonvillage", targetX: 37, targetY: 21, source: "fallback:moonvillage" },
  { map: "BusStop", x: 0, y: 23, targetMap: "Custom_Moonvillage", targetX: 37, targetY: 21, source: "fallback:moonvillage" },
  { map: "BusStop", x: 0, y: 24, targetMap: "Custom_Moonvillage", targetX: 37, targetY: 21, source: "fallback:moonvillage" },
  { map: "Town", x: 0, y: 54, targetMap: "BusStop", targetX: 42, targetY: 23, source: "fallback:vanilla" },
  { map: "Town", x: 0, y: 55, targetMap: "BusStop", targetX: 42, targetY: 24, source: "fallback:vanilla" },
  { map: "Town", x: 0, y: 89, targetMap: "Forest", targetX: 118, targetY: 25, source: "fallback:vanilla" },
  { map: "Town", x: 0, y: 90, targetMap: "Forest", targetX: 118, targetY: 25, source: "fallback:vanilla" },
  { map: "Town", x: 0, y: 91, targetMap: "Forest", targetX: 118, targetY: 25, source: "fallback:vanilla" },
  { map: "Forest", x: 119, y: 24, targetMap: "Town", targetX: 0, targetY: 90, source: "fallback:vanilla" },
  { map: "Forest", x: 119, y: 25, targetMap: "Town", targetX: 0, targetY: 90, source: "fallback:vanilla" },
  { map: "Forest", x: 119, y: 26, targetMap: "Town", targetX: 0, targetY: 90, source: "fallback:vanilla" },
  { map: "Forest", x: 119, y: 27, targetMap: "Town", targetX: 0, targetY: 90, source: "fallback:vanilla" },
  { map: "Forest", x: 9, y: 34, targetMap: "WizardHouse", targetX: 4, targetY: 16, source: "fallback:vanilla" },
  { map: "WizardHouse", x: 4, y: 16, targetMap: "Forest", targetX: 9, targetY: 35, source: "fallback:vanilla" },
  { map: "WizardHouse", x: 5, y: 16, targetMap: "Forest", targetX: 9, targetY: 35, source: "fallback:vanilla" },
];

export function blankSchedulePoint(location = "Custom_Moonvillage", time = "900") {
  return {
    uid: crypto.randomUUID(),
    time,
    location,
    x: 25,
    y: 25,
    facing: 2,
    animation: "",
    dialogue: "",
  };
}

export function blankSchedule(npc = "NPC_Name") {
  return {
    uid: crypto.randomUUID(),
    npc,
    key: "spring",
    points: [
      blankSchedulePoint("Custom_Moonvillage", "900"),
      blankSchedulePoint("Custom_Moonvillage", "1800"),
    ],
  };
}

export function quoteScheduleToken(value = "") {
  const text = expandShorthand(String(value || "").trim());
  if (!text) return "";
  if (/[\s/"]/.test(text)) return `"${text.replace(/"/g, '\\"')}"`;
  return text;
}

export function compileSchedulePoint(point) {
  const parts = [
    String(point.time || "900").trim(),
    expandShorthand(point.location || "Farm"),
    Number(point.x) || 0,
    Number(point.y) || 0,
    Number(point.facing) || 2,
  ];
  if (String(point.animation || "").trim()) parts.push(expandShorthand(point.animation));
  if (String(point.dialogue || "").trim()) parts.push(quoteScheduleToken(point.dialogue));
  return parts.join(" ");
}

export function compileSchedule(schedule) {
  if (!schedule?.points?.length) return "GOTO spring";
  return schedule.points.map(compileSchedulePoint).join("/");
}

export function buildSchedulePatch(schedule) {
  return JSON.stringify({
    Format: "2.0.0",
    Changes: [
      {
        Action: "EditData",
        Target: `Characters/schedules/${expandShorthand(schedule.npc || "NPC_Name")}`,
        Entries: {
          [schedule.key || "spring"]: compileSchedule(schedule),
        },
      },
    ],
  }, null, 2);
}

export function validateSchedule(schedule, map = null, liveNpcs = []) {
  const checks = [];
  const add = (level, message) => checks.push({ level, message });
  const knownNpc = liveNpcs.some((npc) => npc.name === schedule.npc);
  if (!String(schedule.npc || "").trim()) add("error", "Schedule needs an NPC name.");
  if (schedule.npc && liveNpcs.length && !knownNpc) add("warning", `${schedule.npc} is not in the loaded NPC/schedule list.`);
  if (!String(schedule.key || "").trim()) add("error", "Schedule needs an entry key like spring, Mon, rain, or spring_15.");
  if (!schedule.points.length) add("error", "Schedule needs at least one time/location point.");
  for (const point of schedule.points) {
    const label = `${point.time || "time"} ${point.location || "location"}`;
    const time = Number(point.time);
    if (!Number.isInteger(time) || time < 0 || time > 2600) add("warning", `${label} has an unusual time value.`);
    if (!String(point.location || "").trim()) add("error", `${label} is missing a location.`);
    if (!isValidFacing(point.facing)) add("error", `${label} has an invalid facing direction.`);
    if (map && normalizeMapName(point.location) === normalizeMapName(map.id)) {
      if (!isInsideMap(map, Number(point.x), Number(point.y))) add("error", `${label} is outside the loaded map bounds.`);
      if (isPathBlockedTile(map, Number(point.x), Number(point.y))) add("warning", `${label} is on a blocked tile.`);
    }
  }
  if (!checks.length) add("ok", "Schedule looks ready to export.");
  return checks;
}

export function inferFacing(from, to, fallback = 2) {
  if (!from || !to) return Number(fallback) || 2;
  if (to.x > from.x) return 1;
  if (to.x < from.x) return 3;
  if (to.y < from.y) return 0;
  if (to.y > from.y) return 2;
  return Number(fallback) || 2;
}

export function findTilePath(map, start, end, options = {}) {
  if (!map) return { ok: false, status: "missing map", path: [] };
  if (!isInsideMap(map, start.x, start.y) || !isInsideMap(map, end.x, end.y)) return { ok: false, status: "invalid coordinates", path: [] };
  if (map.liveCollisionStatus === "visual_only") {
    return {
      ok: false,
      status: "collision_data_missing",
      path: [],
      incomplete: true,
      missingCollision: true,
      problem: "The live map loaded, but no collision/passability grid was available.",
      reason: "The helper cannot know which tiles are walkable yet, so it cannot confirm or reject this path.",
    };
  }
  if (isPathBlockedTile(map, start.x, start.y, { allowWarps: options.allowStartWarp })) {
    const suggestion = getSafeTileSuggestions(map, start)[0];
    return { ok: false, status: "start_tile_blocked", path: [], problem: "Start tile is blocked.", reason: describeTileBlock(map, start.x, start.y), suggestion };
  }
  if (isPathBlockedTile(map, end.x, end.y, { allowWarps: options.allowEndWarp })) {
    const suggestion = getSafeTileSuggestions(map, end)[0];
    return { ok: false, status: "target_tile_blocked", path: [], problem: "Target tile is blocked.", reason: describeTileBlock(map, end.x, end.y), suggestion };
  }

  const startKey = tileKey(start.x, start.y);
  const endKey = tileKey(end.x, end.y);
  if (startKey === endKey) return { ok: true, status: "valid", path: [{ x: start.x, y: start.y }] };

  const queue = [{ x: start.x, y: start.y }];
  const cameFrom = new Map([[startKey, null]]);
  const directions = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  while (queue.length) {
    const current = queue.shift();
    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const key = tileKey(next.x, next.y);
      if (cameFrom.has(key)) continue;
      if (!isInsideMap(map, next.x, next.y) || isPathBlockedTile(map, next.x, next.y, { allowWarps: options.allowEndWarp && key === endKey })) continue;
      cameFrom.set(key, current);
      if (key === endKey) {
        const path = [next];
        let cursor = current;
        while (cursor) {
          path.push(cursor);
          cursor = cameFrom.get(tileKey(cursor.x, cursor.y));
        }
        return { ok: true, status: "valid", path: path.reverse() };
      }
      queue.push(next);
    }
  }

  const suggestion = getSafeTileSuggestions(map, end)[0];
  return { ok: false, status: "path_blocked_by_tile_collision", path: [], problem: "No legal Stardew path found.", reason: "The walkable grid has no connected route between start and target.", suggestion };
}

export function formatPathFailure(npc, start, target, pathResult) {
  if (pathResult?.missingCollision || pathResult?.status === "collision_data_missing") {
    return [
      "Path test incomplete.",
      "",
      `Status: ${pathResult.status}`,
      `NPC: ${npc || "-"}`,
      `Start: ${start?.x ?? "-"},${start?.y ?? "-"}`,
      `Target: ${target?.x ?? "-"},${target?.y ?? "-"}`,
      "",
      "Problem:",
      pathResult.problem || "The live map loaded, but no collision/passability grid was available.",
      "",
      "What this means:",
      pathResult.reason || "The helper cannot know which tiles are walkable yet, so it cannot confirm or reject this path.",
      "",
      "Loaded data:",
      "- Map image/live capture: present",
      "- Collision grid: missing",
      "- Manual TMX/TBIN/assets: not loaded or not matched to this location",
      "",
      "Suggested fix:",
      "- Scan the Moon Village git folder or Reference mods folder.",
      "- Or load the TMX/TBIN map and its PNG tilesheets manually.",
      "- Then retry the schedule path test.",
      "",
      "Suggested nearby valid tile:",
      "Unavailable because collision data is missing.",
    ].join("\n");
  }
  return [
    "No legal Stardew path found.",
    "",
    `Status: ${pathResult?.status || "blocked"}`,
    `NPC: ${npc || "-"}`,
    `Start: ${start?.x ?? "-"},${start?.y ?? "-"}`,
    `Target: ${target?.x ?? "-"},${target?.y ?? "-"}`,
    `Problem: ${pathResult?.problem || pathResult?.status || "blocked"}`,
    "Reason:",
    `- ${pathResult?.reason || "Unknown collision grid failure."}`,
    `Suggested nearby valid tile: ${pathResult?.suggestion ? `${pathResult.suggestion.x},${pathResult.suggestion.y}` : "none found"}`,
  ].join("\n");
}

export function appendPathSteps(route, path, location, command, target, startIndex = 0) {
  for (let index = startIndex; index < path.length; index += 1) {
    const previous = route.at(-1);
    const tile = path[index];
    route.push({
      location,
      x: tile.x,
      y: tile.y,
      facing: inferFacing(previous, tile, target.facing),
      targetX: target.x,
      targetY: target.y,
      command,
      status: "valid",
    });
  }
}

export function routeEdgeKey(edge) {
  return [
    normalizeMapName(edge.fromLocation),
    Number(edge.fromX),
    Number(edge.fromY),
    normalizeMapName(edge.toLocation),
    Number(edge.toX),
    Number(edge.toY),
    edge.travelType || "warp",
  ].join("|");
}

export function mapLocationNames(map) {
  return [...new Set([map?.id, ...(map?.locationNames ?? [])].filter(Boolean))];
}

export function buildWorldRouteGraph(maps, customRouteEdges = []) {
  const edges = [];
  const mapByNormalizedLocation = new Map();
  const addMapAlias = (name, map) => {
    if (!name || !map) return;
    mapByNormalizedLocation.set(normalizeMapName(name), map);
  };
  for (const map of Object.values(maps ?? {})) {
    for (const name of mapLocationNames(map)) addMapAlias(name, map);
  }
  const addEdge = (edge) => {
    if (!edge?.fromLocation || !edge?.toLocation) return;
    const fromMap = mapByNormalizedLocation.get(normalizeMapName(edge.fromLocation));
    const toMap = mapByNormalizedLocation.get(normalizeMapName(edge.toLocation));
    const normalized = {
      ...edge,
      id: edge.id || routeEdgeKey(edge),
      fromLocation: fromMap?.id ?? edge.fromLocation,
      toLocation: toMap?.id ?? edge.toLocation,
      fromX: Number(edge.fromX),
      fromY: Number(edge.fromY),
      toX: Number(edge.toX),
      toY: Number(edge.toY),
      travelType: edge.travelType || "warp",
      source: edge.source || "loaded map warp",
    };
    if (![normalized.fromX, normalized.fromY, normalized.toX, normalized.toY].every(Number.isFinite)) return;
    edges.push(normalized);
  };
  for (const map of Object.values(maps ?? {})) {
    for (const warp of map.warps ?? []) {
      addEdge({
        id: `warp-${map.id}-${warp.x}-${warp.y}-${warp.targetMap}-${warp.targetX}-${warp.targetY}`,
        fromLocation: map.id,
        fromX: warp.x,
        fromY: warp.y,
        toLocation: warp.targetMap,
        toX: warp.targetX,
        toY: warp.targetY,
        travelType: warp.isDoor ? "door" : "warp",
        touchActivated: !warp.isDoor,
        source: warp.source || "loaded map warp",
      });
    }
  }
  for (const warp of FALLBACK_WARPS) {
    addEdge({
      id: `fallback-${warp.map}-${warp.x}-${warp.y}-${warp.targetMap}-${warp.targetX}-${warp.targetY}`,
      fromLocation: warp.map,
      fromX: warp.x,
      fromY: warp.y,
      toLocation: warp.targetMap,
      toX: warp.targetX,
      toY: warp.targetY,
      travelType: "fallback warp",
      touchActivated: true,
      source: "fallback vanilla edge",
    });
  }
  for (const custom of customRouteEdges ?? []) {
    if (custom.enabled === false) continue;
    addEdge({
      ...custom,
      id: custom.id || crypto.randomUUID(),
      fromX: custom.fromX,
      fromY: custom.fromY,
      toX: custom.toX,
      toY: custom.toY,
      travelType: custom.travelType || "custom warp",
      source: "custom route edge",
    });
  }
  const uniqueEdges = [...new Map(edges.map((edge) => [routeEdgeKey(edge), edge])).values()];
  const adjacency = new Map();
  for (const edge of uniqueEdges) {
    const key = normalizeMapName(edge.fromLocation);
    if (!adjacency.has(key)) adjacency.set(key, []);
    adjacency.get(key).push(edge);
  }
  return { edges: uniqueEdges, adjacency, mapByNormalizedLocation };
}

export function findWorldRouteEdges(graph, fromLocation, toLocation) {
  const start = normalizeMapName(fromLocation);
  const goal = normalizeMapName(toLocation);
  if (!start || !goal) return null;
  if (start === goal) return [];
  const queue = [{ location: start, edges: [] }];
  const visited = new Set([start]);
  while (queue.length) {
    const current = queue.shift();
    for (const edge of graph.adjacency.get(current.location) ?? []) {
      const next = normalizeMapName(edge.toLocation);
      if (visited.has(next)) continue;
      const nextEdges = [...current.edges, edge];
      if (next === goal) return nextEdges;
      visited.add(next);
      queue.push({ location: next, edges: nextEdges });
    }
  }
  return null;
}

export function validateTransitionEdge(edge, maps, route, schedule) {
  const fromMapId = findBestMapForLocation(edge.fromLocation, maps);
  const toMapId = findBestMapForLocation(edge.toLocation, maps);
  const fromMap = fromMapId ? maps[fromMapId] : null;
  const toMap = toMapId ? maps[toMapId] : null;
  if (!fromMap) return { ok: false, status: "map_assets_missing", route, error: `Schedule test failed: missing map for route edge ${edge.fromLocation}.` };
  if (!toMap) return { ok: false, status: "map_assets_missing", route, error: `Schedule test failed: missing map for route edge ${edge.toLocation}.` };
  if (!isInsideMap(fromMap, edge.fromX, edge.fromY)) return { ok: false, status: "invalid coordinates", route, error: `Schedule test failed: route edge starts outside ${edge.fromLocation} at X:${edge.fromX} Y:${edge.fromY}.` };
  if (!isInsideMap(toMap, edge.toX, edge.toY)) return { ok: false, status: "invalid coordinates", route, error: `Schedule test failed: route edge arrives outside ${edge.toLocation} at X:${edge.toX} Y:${edge.toY}.` };
  if (fromMap.liveCollisionStatus === "visual_only" || toMap.liveCollisionStatus === "visual_only") {
    return { ok: false, status: "collision_data_missing", route, error: `Schedule test failed: ${edge.fromLocation} -> ${edge.toLocation} needs TMX/TBIN collision data before legal route testing.` };
  }
  if (isPathBlockedTile(fromMap, edge.fromX, edge.fromY, { allowWarps: true })) {
    return { ok: false, status: "transition_start_blocked", route, error: `Schedule test failed: ${schedule.npc} cannot use ${edge.travelType} at ${edge.fromLocation} ${edge.fromX},${edge.fromY}.\nReason: ${describeTileBlock(fromMap, edge.fromX, edge.fromY)}` };
  }
  if (isPathBlockedTile(toMap, edge.toX, edge.toY, { allowWarps: true })) {
    return { ok: false, status: "transition_arrival_blocked", route, error: `Schedule test failed: ${edge.travelType} arrives on blocked tile in ${edge.toLocation} at X:${edge.toX} Y:${edge.toY}.\nReason: ${describeTileBlock(toMap, edge.toX, edge.toY)}` };
  }
  return { ok: true, fromMap, toMap };
}

export function buildSchedulePlaybackRoute(schedule, maps, customRouteEdges = []) {
  if (!schedule?.npc || schedule.npc === "NPC_Name") return { ok: false, status: "missing npc", route: [], error: "Schedule test failed: select an NPC before testing." };
  if (!schedule.key) return { ok: false, status: "missing schedule", route: [], error: "Schedule test failed: schedule entry key is missing." };
  if (!schedule.points?.length) return { ok: false, status: "missing schedule", route: [], error: "Schedule test failed: schedule entry has no stops." };

  const sorted = [...schedule.points].sort((a, b) => Number(a.time) - Number(b.time));
  const route = [];
  const worldGraph = buildWorldRouteGraph(maps, customRouteEdges);

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const currentMapId = findBestMapForLocation(current.location, maps);
    const currentMap = currentMapId ? maps[currentMapId] : null;
    const currentPoint = {
      x: Number(current.x),
      y: Number(current.y),
      facing: Number(current.facing),
    };

    if (!currentMap) return { ok: false, status: "map_assets_missing", route, error: `Schedule test failed: missing map for ${current.location}.` };
    if (!isInsideMap(currentMap, currentPoint.x, currentPoint.y)) return { ok: false, status: "invalid coordinates", route, error: `Schedule test failed: invalid coordinates in ${current.location} at X:${currentPoint.x} Y:${currentPoint.y}.` };
    if (currentMap.liveCollisionStatus === "visual_only") {
      const missingCollision = findTilePath(currentMap, currentPoint, currentPoint);
      return { ok: false, status: missingCollision.status, route, error: formatPathFailure(schedule.npc, currentPoint, currentPoint, missingCollision) };
    }
    if (isPathBlockedTile(currentMap, currentPoint.x, currentPoint.y)) return { ok: false, status: "start_tile_blocked", route, error: `Schedule test failed: start tile is blocked in ${current.location} at X:${currentPoint.x} Y:${currentPoint.y}.\nReason: ${describeTileBlock(currentMap, currentPoint.x, currentPoint.y)}` };

    if (route.length === 0) {
      route.push({
        location: currentMap.id,
        x: currentPoint.x,
        y: currentPoint.y,
        facing: currentPoint.facing,
        targetX: currentPoint.x,
        targetY: currentPoint.y,
        command: compileSchedulePoint(current),
        status: "valid",
      });
    }

    const next = sorted[index + 1];
    if (!next) continue;

    const nextMapId = findBestMapForLocation(next.location, maps);
    const nextMap = nextMapId ? maps[nextMapId] : null;
    const nextPoint = { x: Number(next.x), y: Number(next.y), facing: Number(next.facing) };
    if (!nextMap) return { ok: false, status: "map_assets_missing", route, error: `Schedule test failed: missing map for ${next.location}.` };

    const sameMap = normalizeMapName(currentMap.id) === normalizeMapName(nextMap.id);
    if (sameMap) {
      const pathResult = findTilePath(currentMap, currentPoint, nextPoint);
      if (!pathResult.ok) return { ok: false, status: pathResult.status, route, error: formatPathFailure(schedule.npc, currentPoint, nextPoint, pathResult) };
      appendPathSteps(route, pathResult.path, currentMap.id, compileSchedulePoint(next), nextPoint, 1);
      continue;
    }

    const routeEdges = findWorldRouteEdges(worldGraph, currentMap.id, nextMap.id);
    if (!routeEdges) {
      return {
        ok: false,
        status: "missing warp",
        route,
        error: `Schedule test failed: missing or unresolved route from ${current.location} to ${next.location}. Add a custom transition edge if this uses a Moon Village door, bus, portal, or custom travel action.`,
      };
    }

    let walkFrom = currentPoint;
    for (const edge of routeEdges) {
      const edgeCheck = validateTransitionEdge(edge, maps, route, schedule);
      if (!edgeCheck.ok) return edgeCheck;
      const pathToEdge = findTilePath(edgeCheck.fromMap, walkFrom, { x: edge.fromX, y: edge.fromY }, { allowEndWarp: true });
      if (!pathToEdge.ok) return { ok: false, status: pathToEdge.status, route, error: formatPathFailure(schedule.npc, walkFrom, { x: edge.fromX, y: edge.fromY }, pathToEdge) };
      appendPathSteps(route, pathToEdge.path, edgeCheck.fromMap.id, `${edge.travelType} -> ${edge.toLocation}`, { x: edge.fromX, y: edge.fromY, facing: currentPoint.facing }, 1);

      const arrival = { x: edge.toX, y: edge.toY, facing: currentPoint.facing };
      route.push({
        location: edgeCheck.toMap.id,
        x: arrival.x,
        y: arrival.y,
        facing: inferFacing(route.at(-1), arrival, nextPoint.facing),
        targetX: nextPoint.x,
        targetY: nextPoint.y,
        command: `${edge.travelType} ${edge.fromLocation} ${edge.fromX},${edge.fromY} -> ${edge.toLocation} ${edge.toX},${edge.toY}`,
        status: "valid",
        source: edge.source,
      });
      walkFrom = arrival;
    }

    const pathAfterWarp = findTilePath(nextMap, walkFrom, nextPoint);
    if (!pathAfterWarp.ok) return { ok: false, status: pathAfterWarp.status, route, error: formatPathFailure(schedule.npc, walkFrom, nextPoint, pathAfterWarp) };
    appendPathSteps(route, pathAfterWarp.path, nextMap.id, compileSchedulePoint(next), nextPoint, 1);
  }

  return { ok: true, status: "valid", route, error: "" };
}

export function getSafeTileSuggestions(map, origin, occupied = new Set(), maxRadius = 5) {
  if (!map || !origin) return [];
  const suggestions = [];
  const warpKeys = new Set((map.warps ?? []).map((warp) => tileKey(warp.x, warp.y)));
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let y = origin.y - radius; y <= origin.y + radius; y += 1) {
      for (let x = origin.x - radius; x <= origin.x + radius; x += 1) {
        if (Math.max(Math.abs(x - origin.x), Math.abs(y - origin.y)) !== radius) continue;
        const key = tileKey(x, y);
        if (!isInsideMap(map, x, y) || isPathBlockedTile(map, x, y) || occupied.has(key) || warpKeys.has(key)) continue;
        const adjacentWalkable = [
          { x: x + 1, y },
          { x: x - 1, y },
          { x, y: y + 1 },
          { x, y: y - 1 },
        ].some((tile) => isInsideMap(map, tile.x, tile.y) && !isPathBlockedTile(map, tile.x, tile.y));
        if (adjacentWalkable) suggestions.push({ x, y });
        if (suggestions.length >= 3) return suggestions;
      }
    }
  }
  return suggestions;
}

export function describeTileBlock(map, x, y) {
  if (!map) return "map not loaded";
  if (!isInsideMap(map, x, y)) return "outside map bounds";
  const details = map.tileDetails?.[tileKey(x, y)];
  if (details?.blockedReasons?.length) return details.blockedReasons.join(", ");
  const actionReason = getActionBlockReason(details);
  if (actionReason) return actionReason;
  if (isBlockedTile(map, x, y)) return "blocked by collision overlay";
  return "";
}

export function getTileDebug(map, selectedTile) {
  if (!map || !selectedTile) return null;
  const key = tileKey(selectedTile.x, selectedTile.y);
  const details = map.tileDetails?.[key] ?? blankTileDetails(selectedTile.x, selectedTile.y);
  const warp = (map.warps ?? []).find((item) => item.x === selectedTile.x && item.y === selectedTile.y);
  const layerText = Object.entries(details.layers ?? {})
    .map(([name, value]) => `${name}${value.gid ? ` #${value.gid}` : ""}`)
    .join(", ");
  const propertyText = Object.entries(details.layers ?? {})
    .flatMap(([name, value]) => Object.entries(value.properties ?? {}).map(([keyName, valueText]) => `${name}.${keyName}=${valueText}`))
    .join("; ");
  return {
    x: selectedTile.x,
    y: selectedTile.y,
    layer: layerText || "-",
    properties: propertyText || "-",
    blocked: isPathBlockedTile(map, selectedTile.x, selectedTile.y) ? (describeTileBlock(map, selectedTile.x, selectedTile.y) || getActionBlockReason(details) || "yes") : "no",
    walkable: isPathBlockedTile(map, selectedTile.x, selectedTile.y) ? "false" : "true",
    reasons: [
      ...(details.blockedReasons ?? []),
      getActionBlockReason(details),
    ].filter(Boolean).join("; ") || "none",
    warp: warp ? `${map.id} ${warp.x},${warp.y} -> ${warp.targetMap} ${warp.targetX},${warp.targetY}` : "no",
    door: details.isDoor ? "yes" : "no",
    action: details.action || "-",
    source: details.actionSource || warp?.source || "-",
  };
}

export function buildCutsceneDebugReport(cutscene, map, selectedMovePreview, checks) {
  if (!cutscene) return "";
  const occupied = new Set();
  const lines = [
    `Map tested: ${map?.id ?? cutscene.location}`,
    `Event tested: ${cutscene.id}`,
    "NPCs tested:",
    ...cutscene.actors.map((actor) => `- ${actor.actor} at ${actor.x},${actor.y} facing ${DIRECTIONS[Number(actor.facing)] ?? actor.facing}`),
    "Errors:",
  ];
  const errors = checks.filter((check) => check.level === "error");
  lines.push(...(errors.length ? errors.map((check) => `- ${check.message}`) : ["- none"]));
  lines.push("Warnings:");
  const warnings = checks.filter((check) => check.level === "warning");
  lines.push(...(warnings.length ? warnings.map((check) => `- ${check.message}`) : ["- none"]));
  lines.push("Suggested fixes:");
  for (const actor of [cutscene.farmer, ...cutscene.actors]) {
    const key = tileKey(Number(actor.x), Number(actor.y));
    if (occupied.has(key) || (map && isPathBlockedTile(map, Number(actor.x), Number(actor.y)))) {
      const suggestions = getSafeTileSuggestions(map, { x: Number(actor.x), y: Number(actor.y) }, occupied);
      lines.push(`- ${actor.actor} ${actor.x},${actor.y}: ${suggestions.length ? suggestions.map((tile) => `${tile.x},${tile.y}`).join(" / ") : "no nearby safe tile found"}`);
    }
    occupied.add(key);
  }
  if (selectedMovePreview?.invalidTiles?.length) {
    const first = selectedMovePreview.invalidTiles[0];
    lines.push(`- Move path hits blocked tile ${first.x},${first.y}: ${describeTileBlock(map, first.x, first.y)}`);
  }
  return lines.join("\n");
}

export function buildScheduleDebugReport(schedule, result, checks, maps) {
  if (!schedule) return "";
  const locations = [...new Set((schedule.points ?? []).map((point) => point.location).filter(Boolean))];
  const locationMaps = locations.map((location) => {
    const mapId = findBestMapForLocation(location, maps);
    const map = mapId ? maps[mapId] : null;
    return `${location}: ${map ? `${map.id} (${getCollisionSource(map)}, ${getMapRenderSource(map)})` : "missing map/assets"}`;
  });
  return [
    `Map tested: ${locations.join(", ") || "-"}`,
    `NPC tested: ${schedule.npc}`,
    `Schedule tested: ${schedule.key}`,
    "Map sources:",
    ...(locationMaps.length ? locationMaps.map((line) => `- ${line}`) : ["- none"]),
    "Errors:",
    ...(checks.filter((check) => check.level === "error").map((check) => `- ${check.message}`) || []),
    ...(result?.ok === false ? [`- ${result.error}`] : []),
    checks.some((check) => check.level === "error") || result?.ok === false ? "" : "- none",
    "Warnings:",
    ...(checks.filter((check) => check.level === "warning").map((check) => `- ${check.message}`) || []),
    checks.some((check) => check.level === "warning") ? "" : "- none",
    "Suggested fixes:",
    ...(schedule.points ?? []).flatMap((point) => {
      const mapId = findBestMapForLocation(point.location, maps);
      const map = mapId ? maps[mapId] : null;
      if (!map || !isPathBlockedTile(map, Number(point.x), Number(point.y))) return [];
      const suggestions = getSafeTileSuggestions(map, { x: Number(point.x), y: Number(point.y) });
      return [`- ${point.time} ${point.location} ${point.x},${point.y}: ${suggestions.map((tile) => `${tile.x},${tile.y}`).join(" / ") || "no nearby safe tile found"}`];
    }),
  ].filter((line) => line !== "").join("\n");
}

export function validateScheduleWithContext(schedule, schedules, maps, liveNpcs = [], customRouteEdges = []) {
  const mapId = findBestMapForLocation(schedule?.points?.[0]?.location, maps);
  const baseMap = mapId ? maps[mapId] : null;
  const checks = validateSchedule(schedule, baseMap, liveNpcs);
  const add = (level, message) => checks.push({ level, message });
  if (!schedule?.points?.length) return checks;
  const worldGraph = buildWorldRouteGraph(maps, customRouteEdges);

  for (const point of schedule.points) {
    const currentMapId = findBestMapForLocation(point.location, maps);
    const currentMap = currentMapId ? maps[currentMapId] : null;
    const label = `${point.time || "time"} ${point.location || "location"}`;
    if (!currentMap) {
      add("error", `${label} has no loaded map.`);
      continue;
    }
    if (currentMap.liveCollisionStatus === "visual_only") {
      add("error", `${label} is using a live map screenshot without collision/passability data. Legal Stardew pathing cannot validate this map until collision data or TMX assets are loaded.`);
      continue;
    }
    if (!isInsideMap(currentMap, Number(point.x), Number(point.y))) {
      add("error", `${label} is outside ${currentMap.id} bounds.`);
      continue;
    }
    if (isPathBlockedTile(currentMap, Number(point.x), Number(point.y))) {
      const suggestions = getSafeTileSuggestions(currentMap, { x: Number(point.x), y: Number(point.y) });
      add("warning", `${label} is blocked by ${describeTileBlock(currentMap, Number(point.x), Number(point.y))}. Suggested safe tile: ${suggestions.map((tile) => `${tile.x},${tile.y}`).join(" / ") || "none nearby"}.`);
    }
    const warp = (currentMap.warps ?? []).find((item) => item.x === Number(point.x) && item.y === Number(point.y));
    if (warp) add("warning", `${label} stands on a warp/door tile to ${warp.targetMap}; move 1 tile away unless intentional.`);
  }

  const sorted = [...schedule.points].sort((a, b) => Number(a.time) - Number(b.time));
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const from = sorted[index];
    const to = sorted[index + 1];
    const fromMapId = findBestMapForLocation(from.location, maps);
    const toMapId = findBestMapForLocation(to.location, maps);
    const fromMap = fromMapId ? maps[fromMapId] : null;
    const toMap = toMapId ? maps[toMapId] : null;
    if (!fromMap || !toMap) continue;
    if (normalizeMapName(fromMap.id) === normalizeMapName(toMap.id)) {
      const path = findTilePath(fromMap, { x: Number(from.x), y: Number(from.y) }, { x: Number(to.x), y: Number(to.y) });
      if (!path.ok) add("error", `${schedule.npc} cannot path from ${from.location} ${from.x},${from.y} to ${to.x},${to.y}; status: ${path.status}.`);
    } else {
      const routeEdges = findWorldRouteEdges(worldGraph, fromMap.id, toMap.id);
      if (!routeEdges) {
        add("error", `${schedule.npc} has no resolved route from ${from.location} to ${to.location}. Add a custom transition edge if this uses a Moon Village door, bus, portal, or custom travel action.`);
      } else if (routeEdges.length > 1) {
        add("ok", `${schedule.npc} can route from ${from.location} to ${to.location} through ${routeEdges.map((edge) => edge.toLocation).join(" -> ")}.`);
      }
    }
  }

  if (normalizeMapName(schedule.npc).includes("kira")) {
    const annette = schedules.find((item) => normalizeMapName(item.npc).includes("annette") && item.key === schedule.key) ?? schedules.find((item) => normalizeMapName(item.npc).includes("annette"));
    if (annette) {
      for (const point of schedule.points) {
        const match = annette.points.find((candidate) => String(candidate.time) === String(point.time) && normalizeMapName(candidate.location) === normalizeMapName(point.location));
        if (!match) continue;
        const distance = Math.abs(Number(point.x) - Number(match.x)) + Math.abs(Number(point.y) - Number(match.y));
        if (distance > 2) add("warning", `Kira is ${distance} tiles away from Annette at ${point.time}. Expected: 1-2 tiles nearby.`);
      }
    }
  }

  return checks;
}

export function getMapViewport(activeMap, cssWidth, cssHeight, zoom, activeTab, followScheduleNpc, currentPlaybackStep, schedulePan, mapPan = { x: 0, y: 0 }) {
  const tileSize = activeMap.tileWidth * zoom;
  const mapPixelWidth = activeMap.width * tileSize;
  const mapPixelHeight = activeMap.height * tileSize;
  const followingStep = activeTab === "schedule" && followScheduleNpc && currentPlaybackStep && normalizeMapName(currentPlaybackStep.location) === normalizeMapName(activeMap.id)
    ? currentPlaybackStep
    : null;
  let offsetX = Math.max(16, (cssWidth - mapPixelWidth) / 2);
  let offsetY = Math.max(16, (cssHeight - mapPixelHeight) / 2);
  if (followingStep) {
    const minX = Math.min(16, cssWidth - mapPixelWidth - 16);
    const minY = Math.min(16, cssHeight - mapPixelHeight - 16);
    offsetX = Math.min(16, Math.max(minX, cssWidth / 2 - (followingStep.x + 0.5) * tileSize));
    offsetY = Math.min(16, Math.max(minY, cssHeight / 2 - (followingStep.y + 0.5) * tileSize));
  } else if (activeTab === "schedule") {
    offsetX += mapPan.x + schedulePan.x;
    offsetY += mapPan.y + schedulePan.y;
  } else {
    offsetX += mapPan.x;
    offsetY += mapPan.y;
  }
  return { tileSize, mapPixelWidth, mapPixelHeight, offsetX, offsetY };
}
