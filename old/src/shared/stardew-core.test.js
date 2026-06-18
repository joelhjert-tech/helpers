import { describe, expect, it } from "vitest";
import {
  buildContentPatch,
  compileCommand,
  compileEventKey,
  compileScript,
  expandShorthand,
  formatFrameList,
  inferFacing,
  isNumberPair,
  isPlacementHeader,
  isValidFacing,
  makeCommand,
  parseCommand,
  parseEventEntry,
  parseFrameList,
  parsePlacementHeader,
  quoteAwareSplit,
  quoteIfNeeded,
  splitWords,
  unquote,
} from "./stardew-core";

describe("string tokenizing", () => {
  it("quoteAwareSplit keeps quoted delimiters together", () => {
    expect(quoteAwareSplit('a "b c" d', " ")).toEqual(["a", '"b c"', "d"]);
  });

  it("splitWords trims and drops empties", () => {
    expect(splitWords("  speak   Annette  ")).toEqual(["speak", "Annette"]);
    expect(splitWords('say "hello world" now')).toEqual(["say", '"hello world"', "now"]);
  });

  it("unquote removes surrounding quotes and unescapes", () => {
    expect(unquote('"hello"')).toBe("hello");
    expect(unquote('"a \\"b\\" c"')).toBe('a "b" c');
    expect(unquote("plain")).toBe("plain");
  });

  it("quoteIfNeeded quotes whitespace/slash values but leaves tokens and tokens-with-braces", () => {
    expect(quoteIfNeeded("plain")).toBe("plain");
    expect(quoteIfNeeded("two words")).toBe('"two words"');
    expect(quoteIfNeeded("{{i18n:x}}")).toBe("{{i18n:x}}");
  });
});

describe("shorthand expansion", () => {
  it("expands backtick mod prefix and direction/emote aliases", () => {
    expect(expandShorthand("`Annette")).toBe("{{ModId}}_Annette");
    expect(expandShorthand("$up $right $down $left")).toBe("0 1 2 3");
    expect(expandShorthand("$happy")).toBe("32");
  });
});

describe("facing and placement helpers", () => {
  it("isValidFacing accepts 0-3 only", () => {
    expect(isValidFacing("0")).toBe(true);
    expect(isValidFacing("3")).toBe(true);
    expect(isValidFacing("4")).toBe(false);
    expect(isValidFacing("x")).toBe(false);
  });

  it("isNumberPair detects two leading numbers", () => {
    expect(isNumberPair("10 20")).toBe(true);
    expect(isNumberPair("10")).toBe(false);
    expect(isNumberPair("a b")).toBe(false);
  });

  it("isPlacementHeader validates groups of four", () => {
    expect(isPlacementHeader("farmer 10 20 2")).toBe(true);
    expect(isPlacementHeader("farmer 10 20 2 Annette 5 5 0")).toBe(true);
    expect(isPlacementHeader("farmer 10 20 9")).toBe(false);
    expect(isPlacementHeader("farmer 10 20")).toBe(false);
  });

  it("parsePlacementHeader marks farmer uid and parses coords", () => {
    const placements = parsePlacementHeader("farmer 10 20 2 Annette 5 6 1");
    expect(placements).toHaveLength(2);
    expect(placements[0]).toMatchObject({ uid: "farmer", actor: "farmer", x: 10, y: 20, facing: 2 });
    expect(placements[1]).toMatchObject({ actor: "Annette", x: 5, y: 6, facing: 1 });
  });
});

describe("command parse/compile", () => {
  it("makeCommand fills defaults from definition", () => {
    const command = makeCommand("pause");
    expect(command.verb).toBe("pause");
    expect(command.values.duration).toBe("500");
  });

  it("unknown verbs become raw commands", () => {
    expect(parseCommand("totallyMadeUp 1 2").verb).toBe("raw");
    expect(compileCommand({ verb: "raw", values: { raw: "$up custom" } })).toBe("0 custom");
  });

  it("farmer speak compiles to message, npc speak stays speak", () => {
    expect(compileCommand({ verb: "speak", values: { actor: "farmer", text: "hi" } })).toBe("message hi");
    expect(compileCommand({ verb: "speak", values: { actor: "Annette", text: "hi" } })).toBe("speak Annette hi");
  });

  it("question supports Event-Tool fork shorthand", () => {
    const compiled = compileCommand({ verb: "question", values: { fork: "1Other", payload: "Q#A1#A2" } });
    expect(compiled).toBe("question fork1 Q#A1#A2/fork Other");
  });

  it("parseCommand round-trips a pause through compileCommand", () => {
    const compiled = compileCommand(parseCommand("pause 750"));
    expect(compiled).toBe("pause 750");
  });
});

describe("event entry parse/compile", () => {
  const KEY = "{{ModId}}_Event_1/t 600 2400";
  const SCRIPT = "none/25 25/farmer 25 25 2 Annette 25 23 2/skippable/pause 500/end";

  it("parseEventEntry recovers id, preconditions, viewport, actors", () => {
    const cutscene = parseEventEntry(KEY, SCRIPT, "Town");
    expect(cutscene.id).toBe("{{ModId}}_Event_1");
    expect(cutscene.preconditions).toEqual(["t 600 2400"]);
    expect(cutscene.location).toBe("Town");
    expect(cutscene.viewportX).toBe(25);
    expect(cutscene.skippable).toBe(true);
    expect(cutscene.actors).toHaveLength(1);
    expect(cutscene.actors[0]).toMatchObject({ actor: "Annette", x: 25, y: 23 });
  });

  it("compileEventKey + compileScript reproduce a parsed event", () => {
    const cutscene = parseEventEntry(KEY, SCRIPT, "Town");
    expect(compileEventKey(cutscene)).toBe(KEY);
    expect(compileScript(cutscene)).toBe(SCRIPT);
  });

  it("parseEventEntry appends a trailing end when missing", () => {
    const cutscene = parseEventEntry("Id", "none/25 25/farmer 1 1 2/pause 100", "Town");
    expect(cutscene.commands.at(-1).verb).toBe("end");
  });

  it("buildContentPatch targets Data/Events/<location>", () => {
    const patch = JSON.parse(buildContentPatch(parseEventEntry(KEY, SCRIPT, "Town")));
    expect(patch.Changes[0].Target).toBe("Data/Events/Town");
    expect(patch.Changes[0].Entries[KEY]).toBe(SCRIPT);
  });
});

describe("animation frame helpers", () => {
  it("parseFrameList and formatFrameList round-trip", () => {
    expect(parseFrameList("0, 1, 2,3")).toEqual([0, 1, 2, 3]);
    expect(formatFrameList([0, 1, 2, 3])).toBe("0 1 2 3");
  });
});

describe("schedule facing inference", () => {
  it("infers facing from movement direction", () => {
    expect(inferFacing({ x: 0, y: 0 }, { x: 0, y: -1 })).toBe(0); // up
    expect(inferFacing({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(1); // right
    expect(inferFacing({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(2); // down
    expect(inferFacing({ x: 0, y: 0 }, { x: -1, y: 0 })).toBe(3); // left
  });
});
