import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { getToolAppByPath, LAUNCHER_ROUTE, normalizeToolPath, toolApps } from "./shared/ui-common/toolNavigation";
import { useAnimationStudio } from "./apps/animation-portrait-maker/useAnimationStudio";
import { useSchedulePlayback } from "./apps/schedule-maker/useSchedulePlayback";
import Launcher from "./apps/launcher/Launcher";
import AnimationStudioApp from "./apps/animation-portrait-maker/AnimationStudioApp";
import CutsceneMakerApp from "./apps/cutscene-maker/CutsceneMakerApp";
import ScheduleMakerApp from "./apps/schedule-maker/ScheduleMakerApp";
import { ActorEditor, AnimationPreview, CommandFields, ExportBox, PortraitSheetPreview, PortraitThumb, SpriteFrameCanvas } from "./shared/ui-common/components";
import {
  COMMAND_DEFINITIONS,
  CUSTOM_PORTRAIT_PARTS,
  DEFAULT_CUSTOM_ROUTE_EDGE,
  DEFAULT_OVERLAYS,
  DIRECTIONS,
  MAIN_SECTIONS,
  MOONVILLAGE_PORTRAIT_NPCS,
  PIXELLAB_MCP_CONFIG_SNIPPET,
  PORTRAIT_COMPARE_ITEMS,
  SCHEDULE_ANIMATIONS,
  SCHEDULE_KEYS,
  VANILLA_MAPS,
  applyLiveCollisionData,
  applyMapEditsToMaps,
  applyMapSourcesToMaps,
  blankCutscene,
  blankSchedule,
  blankSchedulePoint,
  buildApiUrl,
  buildContentPatch,
  buildCutsceneDebugReport,
  buildMapCatalog,
  buildMovePath,
  buildRawEventEntry,
  buildScheduleDebugReport,
  buildSchedulePatch,
  buildSchedulePlaybackRoute,
  buildWorldRouteGraph,
  compileCommand,
  compileEventKey,
  compileSchedule,
  compileScript,
  expandShorthand,
  findBestMapForLocation,
  findMapCatalogMatches,
  findTileset,
  formatFrameList,
  formatMapLoadFailure,
  getCollisionSource,
  getInitialToolApp,
  getInitialToolRoute,
  getMapRenderSource,
  getMapViewport,
  getTileDebug,
  isInsideMap,
  isLocationNotReady,
  isPathBlockedTile,
  isWorldNotReady,
  loadImageFromFile,
  loadImageFromUrl,
  makeCommand,
  normalizeMapName,
  parseContentPatcherEvents,
  parseContentPatcherMapEdits,
  parseContentPatcherMapSources,
  parseContentPatcherSchedules,
  parseEventEntry,
  parseFrameList,
  parseTbin,
  parseTmx,
  sectionForTab,
  tileKey,
  validateCutscene,
  validateScheduleWithContext,
} from "./shared/stardew-core";

function App() {
  const initialToolApp = useMemo(() => getInitialToolApp(), []);
  const [maps, setMaps] = useState({});
  const [images, setImages] = useState({});
  const [activeMapId, setActiveMapId] = useState("");
  const [locationMapLinks, setLocationMapLinks] = useState({});
  const [cutscenes, setCutscenes] = useState([blankCutscene()]);
  const [schedules, setSchedules] = useState([blankSchedule()]);
  const [activeCutsceneId, setActiveCutsceneId] = useState("");
  const [activeScheduleId, setActiveScheduleId] = useState("");
  const [activeToolRoute, setActiveToolRoute] = useState(getInitialToolRoute);
  const [activeTab, setActiveTab] = useState(initialToolApp?.defaultTab ?? "workspace");
  const [activeSection, setActiveSection] = useState(initialToolApp?.defaultSection ?? "event");
  const [selectedCommandId, setSelectedCommandId] = useState(null);
  const [selectedSchedulePointId, setSelectedSchedulePointId] = useState("");
  const [selectedTile, setSelectedTile] = useState(null);
  const [commandSearch, setCommandSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [mapSearch, setMapSearch] = useState("");
  const [mapSource, setMapSource] = useState("Current Moon Village mod");
  const [mapNameInput, setMapNameInput] = useState("Custom_Moonvillage");
  const [mapPathInput, setMapPathInput] = useState("");
  const [mapCatalogSources, setMapCatalogSources] = useState([]);
  const [mapLoadDebug, setMapLoadDebug] = useState("");
  const [lastMapLoadRequest, setLastMapLoadRequest] = useState({ name: "", forceRefresh: false });
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [apiBaseUrl, setApiBaseUrl] = useState("http://127.0.0.1:7882");
  const [apiToken, setApiToken] = useState("");
  const [apiStatus, setApiStatus] = useState("Not connected.");
  const [liveLocations, setLiveLocations] = useState([]);
  const [liveNpcs, setLiveNpcs] = useState([]);
  const [musicOptions, setMusicOptions] = useState([{ value: "none", label: "none" }, { value: "continue", label: "continue" }]);
  const [actorSearch, setActorSearch] = useState("");
  const [selectedActorKey, setSelectedActorKey] = useState("farmer");
  const [actorSprites, setActorSprites] = useState({});
  const [mapWarning, setMapWarning] = useState("");
  const [testDebug, setTestDebug] = useState(null);
  const [forceRepeatTest, setForceRepeatTest] = useState(true);
  const [exportType, setExportType] = useState("content-patcher");
  const {
    schedulePlayback, setSchedulePlayback,
    scheduleSpeed, setScheduleSpeed,
    customScheduleSpeed, setCustomScheduleSpeed,
    followScheduleNpc, setFollowScheduleNpc,
    schedulePan, setSchedulePan,
    scheduleSpeedValue, currentPlaybackStep,
    playSchedule, pauseSchedule, stopSchedule, restartSchedule, stepSchedule,
  } = useSchedulePlayback({ testSchedule });
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [isPanningMap, setIsPanningMap] = useState(false);
  const [hoveredTile, setHoveredTile] = useState(null);
  const [overlays, setOverlays] = useState(DEFAULT_OVERLAYS);
  const [compareScheduleHelperMode, setCompareScheduleHelperMode] = useState(true);
  const [manualLoadMode, setManualLoadMode] = useState(true);
  const [routeMode, setRouteMode] = useState("legal");
  const [debugReport, setDebugReport] = useState("");
  const [customRouteEdges, setCustomRouteEdges] = useState([]);
  const canvasRef = useRef(null);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const panMovedRef = useRef(false);

  const activeCutscene = useMemo(
    () => cutscenes.find((event) => event.uid === activeCutsceneId) ?? cutscenes[0],
    [activeCutsceneId, cutscenes],
  );
  const activeSchedule = useMemo(
    () => schedules.find((schedule) => schedule.uid === activeScheduleId) ?? schedules[0],
    [activeScheduleId, schedules],
  );
  const activeToolApp = useMemo(
    () => getToolAppByPath(activeToolRoute),
    [activeToolRoute],
  );
  const visibleSections = useMemo(
    () => activeToolApp ? MAIN_SECTIONS.filter((section) => activeToolApp.sections.includes(section.id)) : MAIN_SECTIONS,
    [activeToolApp],
  );
  const currentSection = useMemo(
    () => visibleSections.find((section) => section.id === activeSection) ?? visibleSections[0] ?? MAIN_SECTIONS[0],
    [activeSection, visibleSections],
  );
  const currentSectionTabs = currentSection.tabs;
  const selectedSchedulePoint = activeSchedule?.points.find((point) => point.uid === selectedSchedulePointId) ?? activeSchedule?.points[0] ?? null;

  const {
    animationSpriteSheet, animationPortraitSheet, animationEntries,
    animationImportStatus, pixelLabNotes, setPixelLabNotes,
    setActiveAnimationId, portraitWorkflow, customPortraitMaker, activeAnimation, animationFrameInfo,
    spriteSheetChecks, portraitSheetChecks, animationChecks, animationOutput,
    portraitExpressionKeys, portraitExportPath, portraitWorkflowChecks,
    customPortraitExpressionKeys, customPortraitOutputPath, customPortraitChecks,
    loadAnimationImage, importAnimationDescriptions, updateAnimationEntry, addAnimationEntry,
    removeAnimationEntry, appendFrameToActiveAnimation, removeFrameFromActiveAnimation, exportAnimationJson,
    updatePortraitWorkflow, updatePortraitNpc, loadPortraitWorkflowImage, addCustomExpressionSlot,
    setExpressionApproved, creatorUrlForPortraitWorkflow, sendPortraitToPixelLab, exportPortraitLog,
    updateCustomPortraitMaker, updateCustomPortraitNpc, loadCustomPortraitReferences, loadCustomPortraitImage,
    toggleCustomReference, updateCustomPortraitPart, sendCustomPortraitPrompt, approveCustomBasePortrait,
    approveCustomExpression, exportCustomPortraitLog, exportCustomPortraitSheet, exportCombinedPortraitSheet,
    buildPortraitExportLog, buildCustomPortraitExportLog,
  } = useAnimationStudio({ schedules, setImages, downloadTextFile });
  const scheduleLocation = currentPlaybackStep?.location || selectedSchedulePoint?.location || activeSchedule?.points[0]?.location || "";
  const timelineMapId = activeTab === "timeline" && activeCutscene
    ? findBestMapForLocation(activeCutscene.location, maps)
    : "";
  const scheduleMapId = activeTab === "schedule" && scheduleLocation
    ? findBestMapForLocation(scheduleLocation, maps)
    : "";
  const linkedMapId = activeCutscene?.location ? locationMapLinks[normalizeMapName(activeCutscene.location)] : "";
  const linkedScheduleMapId = scheduleLocation ? locationMapLinks[normalizeMapName(scheduleLocation)] : "";
  const effectiveActiveMapId = timelineMapId || scheduleMapId || linkedScheduleMapId || linkedMapId || activeMapId || "";
  const activeMap = effectiveActiveMapId ? maps[effectiveActiveMapId] : null;
  const selectedCommand = activeCutscene?.commands.find((command) => command.id === selectedCommandId) ?? null;
  const validationChecks = useMemo(
    () => activeCutscene ? validateCutscene(activeCutscene, cutscenes, activeMap, musicOptions, liveNpcs) : [],
    [activeCutscene, activeMap, cutscenes, liveNpcs, musicOptions],
  );
  const placedActors = useMemo(
    () => activeCutscene ? [activeCutscene.farmer, ...activeCutscene.actors] : [],
    [activeCutscene],
  );
  const spriteActors = useMemo(() => {
    const actors = [...placedActors];
    if (activeSchedule?.npc && activeSchedule.npc !== "NPC_Name") {
      actors.push({ uid: "schedule-npc", actor: activeSchedule.npc });
    }
    return actors;
  }, [activeSchedule, placedActors]);
  const scheduleNpcOptions = useMemo(() => {
    const entries = new Map();
    const add = (name, displayName = name, source = "") => {
      const cleanName = String(name || "").trim();
      if (!cleanName) return;
      entries.set(cleanName.toLowerCase(), { name: cleanName, displayName: String(displayName || cleanName), source });
    };
    for (const npc of liveNpcs) add(npc.name, npc.displayName, "Live API");
    for (const schedule of schedules) add(schedule.npc, schedule.npc, schedule.sourceFile || "Loaded schedule");
    for (const cutscene of cutscenes) {
      for (const actor of cutscene.actors ?? []) add(actor.actor, actor.actor, "Event actor");
    }
    add("NPC_Name", "NPC_Name", "Template");
    return [...entries.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [cutscenes, liveNpcs, schedules]);
  const scheduleChecks = useMemo(
    () => activeSchedule ? validateScheduleWithContext(activeSchedule, schedules, maps, scheduleNpcOptions, customRouteEdges) : [],
    [activeSchedule, customRouteEdges, maps, scheduleNpcOptions, schedules],
  );
  const schedulePlaybackDebug = useMemo(() => {
    const step = currentPlaybackStep;
    const debugMapId = step?.location ? findBestMapForLocation(step.location, maps) : (scheduleLocation ? findBestMapForLocation(scheduleLocation, maps) : "");
    const debugMap = debugMapId ? maps[debugMapId] : activeMap;
    const target = step ? `${step.targetX} ${step.targetY}` : "-";
    return {
      npc: activeSchedule?.npc ?? "-",
      key: activeSchedule?.key ?? "-",
      timeBlock: step?.command ?? "-",
      map: step?.location ?? "-",
      position: step ? `${step.x} ${step.y}` : "-",
      facing: step ? (DIRECTIONS[Number(step.facing)] ?? step.facing) : "-",
      target,
      speed: `${scheduleSpeedValue}x`,
      command: step?.command ?? "-",
      status: schedulePlayback.status || "idle",
      routeMode,
      collisionSource: getCollisionSource(debugMap),
      mapRenderSource: getMapRenderSource(debugMap),
    };
  }, [activeMap, activeSchedule, currentPlaybackStep, maps, routeMode, scheduleLocation, schedulePlayback.status, scheduleSpeedValue]);
  const selectedMovePreview = useMemo(() => {
    if (!activeMap || selectedCommand?.verb !== "move") return { path: [], invalidTiles: [], actor: null };
    const actorName = expandShorthand(selectedCommand.values.actor || "farmer").toLowerCase();
    const actor = placedActors.find((candidate) => candidate.actor.toLowerCase() === actorName || candidate.uid.toLowerCase() === actorName);
    const path = buildMovePath(actor, selectedCommand);
    const invalidTiles = path.filter((tile) => isPathBlockedTile(activeMap, tile.x, tile.y));
    return { path, invalidTiles, actor };
  }, [activeMap, placedActors, selectedCommand]);
  const pathWarning = selectedMovePreview.invalidTiles.length
    ? `${selectedMovePreview.invalidTiles.length} blocked tile${selectedMovePreview.invalidTiles.length === 1 ? "" : "s"} in selected move path`
    : "";
  const selectedTileDebug = useMemo(
    () => getTileDebug(activeMap, selectedTile),
    [activeMap, selectedTile],
  );
  const hoveredTileDebug = useMemo(
    () => getTileDebug(activeMap, hoveredTile),
    [activeMap, hoveredTile],
  );
  const commandInspector = useMemo(() => {
    if (!activeCutscene) return null;
    if (!selectedCommand) {
      return {
        command: "Setup",
        status: validationChecks.some((check) => check.level === "error") ? "needs fixes" : "ready",
        affects: `Farmer ${activeCutscene.farmer.x},${activeCutscene.farmer.y}; ${activeCutscene.actors.length} NPC start tile(s)`,
      };
    }
    if (selectedCommand.verb === "move") {
      return {
        command: compileCommand(selectedCommand),
        status: selectedMovePreview.invalidTiles.length ? "blocked path" : "path preview ready",
        affects: selectedMovePreview.actor ? `${selectedMovePreview.actor.actor}: ${selectedMovePreview.path.map((tile) => `${tile.x},${tile.y}`).join(" -> ") || "no movement"}` : "actor not found",
      };
    }
    if (selectedCommand.verb === "warp") {
      return {
        command: compileCommand(selectedCommand),
        status: activeMap && isPathBlockedTile(activeMap, Number(selectedCommand.values.x), Number(selectedCommand.values.y)) ? "target blocked" : "target highlighted",
        affects: `${selectedCommand.values.actor || "farmer"} -> ${selectedCommand.values.x},${selectedCommand.values.y}`,
      };
    }
    if (selectedCommand.verb === "viewport") {
      return { command: compileCommand(selectedCommand), status: "camera command", affects: selectedCommand.values.args || `${activeCutscene.viewportX},${activeCutscene.viewportY}` };
    }
    if (selectedCommand.verb === "faceDirection") {
      return { command: compileCommand(selectedCommand), status: "facing command", affects: `${selectedCommand.values.actor || "farmer"} faces ${DIRECTIONS[Number(selectedCommand.values.direction)] ?? selectedCommand.values.direction}` };
    }
    if (["speak", "question", "quickQuestion"].includes(selectedCommand.verb)) {
      return { command: compileCommand(selectedCommand), status: "dialogue command", affects: selectedCommand.values.actor || "speaker/active dialogue" };
    }
    return { command: compileCommand(selectedCommand), status: "command selected", affects: selectedCommand.label || selectedCommand.verb };
  }, [activeCutscene, activeMap, selectedCommand, selectedMovePreview, validationChecks]);
  const filteredLiveNpcs = useMemo(() => {
    const query = actorSearch.trim().toLowerCase();
    return liveNpcs
      .filter((npc) => !query || `${npc.displayName} ${npc.name}`.toLowerCase().includes(query))
      .slice(0, 160);
  }, [actorSearch, liveNpcs]);
  const mapCatalog = useMemo(
    () => {
      const discovered = buildMapCatalog(maps, mapCatalogSources);
      const vanilla = [...VANILLA_MAPS, ...liveLocations.map((location) => ({ name: location.Name ?? location.name ?? location, displayName: location.DisplayName ?? location.displayName ?? location.Name ?? location.name ?? location }))]
        .map((location) => ({
          name: location.name,
          target: `Maps/${location.name}`,
          fromFile: "StardewLocalAPI / vanilla content",
          sourceMod: "Vanilla",
          sourceKind: "Vanilla",
          aliases: [location.displayName],
        }));
      return [...new Map([...vanilla, ...discovered].map((item) => [normalizeMapName(item.name), item])).values()]
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    },
    [liveLocations, mapCatalogSources, maps],
  );
  const filteredMapCatalog = useMemo(() => {
    const query = `${mapSearch} ${mapNameInput}`.trim().toLowerCase();
    return mapCatalog
      .filter((item) => mapSource === "All" || item.sourceKind === mapSource || (mapSource === "Vanilla" && VANILLA_MAPS.some((map) => normalizeMapName(map.name) === normalizeMapName(item.name))))
      .filter((item) => !mapSearch.trim() || `${item.name} ${item.target} ${item.fromFile} ${item.sourceMod}`.toLowerCase().includes(mapSearch.toLowerCase()))
      .slice(0, query ? 120 : 80);
  }, [mapCatalog, mapNameInput, mapSearch, mapSource]);
  const scheduleLocationOptions = useMemo(() => {
    const values = new Set();
    for (const location of liveLocations) values.add(location.Name ?? location.name ?? location);
    for (const map of Object.values(maps)) {
      values.add(map.id);
      for (const name of map.locationNames ?? []) values.add(name);
    }
    for (const item of mapCatalog) values.add(item.name);
    return [...values].filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
  }, [liveLocations, mapCatalog, maps]);

  useEffect(() => {
    const handlePopState = () => {
      const route = getInitialToolRoute();
      const app = getToolAppByPath(route);
      if (app) {
        setActiveSection(app.defaultSection);
        setActiveTab(app.defaultTab);
      }
      setActiveToolRoute(route);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigateToRoute(route) {
    const normalizedRoute = normalizeToolPath(route);
    if (normalizeToolPath(window.location.pathname) !== normalizedRoute) {
      window.history.pushState({}, "", normalizedRoute);
    }
    setActiveToolRoute(normalizedRoute);
  }

  function openToolApp(app) {
    if (!app) return;
    setActiveSection(app.defaultSection);
    setActiveTab(app.defaultTab);
    navigateToRoute(app.route);
  }

  function backToLauncher() {
    navigateToRoute(LAUNCHER_ROUTE);
  }

  function activateMainSection(sectionId) {
    const requested = MAIN_SECTIONS.find((item) => item.id === sectionId) ?? MAIN_SECTIONS[0];
    const section = activeToolApp && !activeToolApp.sections.includes(requested.id)
      ? (MAIN_SECTIONS.find((item) => item.id === activeToolApp.defaultSection) ?? requested)
      : requested;
    setActiveSection(section.id);
    if (!section.tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(section.defaultTab);
    } else if (["schedule", "animation"].includes(section.id) && activeTab === "workspace") {
      setActiveTab(section.defaultTab);
    }
  }

  function activateSectionTab(tabId) {
    const requestedSection = sectionForTab(tabId, activeSection);
    if (activeToolApp && !activeToolApp.sections.includes(requestedSection)) {
      setActiveSection(activeToolApp.defaultSection);
      setActiveTab(activeToolApp.defaultTab);
      return;
    }
    setActiveTab(tabId);
    if (tabId !== "workspace") setActiveSection(sectionForTab(tabId, activeSection));
  }

  function updateCutscene(updater) {
    setCutscenes((current) => current.map((cutscene) => {
      if (cutscene.uid !== activeCutscene.uid) return cutscene;
      const next = typeof updater === "function" ? updater(cutscene) : { ...cutscene, ...updater };
      return next;
    }));
  }

  function applyFarmerPatch(cutscene, patch) {
    const farmer = { ...cutscene.farmer, ...patch };
    return {
      ...cutscene,
      farmer,
      viewportX: cutscene.customViewport ? cutscene.viewportX : farmer.x,
      viewportY: cutscene.customViewport ? cutscene.viewportY : farmer.y,
    };
  }

  async function handleFiles(fileList) {
    const files = [...fileList];
    const nextMaps = {};
    const nextImages = {};
    const importedCutscenes = [];
    const importedSchedules = [];
    const importedMapEdits = [];
    const importedMapSources = [];

    for (const file of files) {
      const lowerName = file.name.toLowerCase();
      const sourcePath = file.webkitRelativePath || file.name;
      if (lowerName.endsWith(".png")) {
        const image = await loadImageFromFile(file);
        if (image) {
          nextImages[lowerName] = image;
          nextImages[sourcePath.toLowerCase()] = image;
        }
      }
    }

    setImages((current) => ({ ...current, ...nextImages }));

    for (const file of files) {
      const lowerName = file.name.toLowerCase();
      const sourcePath = file.webkitRelativePath || file.name;
      if (lowerName.endsWith(".tmx")) {
        const parsed = parseTmx(await file.text(), sourcePath);
        if (parsed) nextMaps[parsed.id] = parsed;
      } else if (lowerName.endsWith(".tbin")) {
        const parsed = parseTbin(await file.arrayBuffer(), sourcePath);
        if (parsed) nextMaps[parsed.id] = parsed;
      } else if (lowerName.endsWith(".json")) {
        try {
          const json = JSON.parse(await file.text());
          json.__sourceFile = sourcePath;
          importedCutscenes.push(...parseContentPatcherEvents(json, sourcePath));
          importedSchedules.push(...parseContentPatcherSchedules(json, sourcePath));
          importedMapEdits.push(...parseContentPatcherMapEdits(json));
          importedMapSources.push(...parseContentPatcherMapSources(json));
        } catch {
          // Ignore non-event JSON files from map/content folders.
        }
      }
    }

    if (importedMapSources.length) {
      setMapCatalogSources((current) => {
        const merged = [...current, ...importedMapSources];
        return [...new Map(merged.map((source) => [`${source.type}|${source.mapId}|${source.fromFile}|${source.source}`, source])).values()];
      });
    }

    if (Object.keys(nextMaps).length) {
      const sourcedMaps = applyMapSourcesToMaps(nextMaps, importedMapSources);
      const editedMaps = applyMapEditsToMaps(sourcedMaps, importedMapEdits);
      setMaps((current) => applyMapEditsToMaps(applyMapSourcesToMaps({ ...current, ...editedMaps }, importedMapSources), importedMapEdits));
      setActiveMapId((current) => current || Object.keys(editedMaps)[0]);
    } else if (importedMapEdits.length) {
      setMaps((current) => applyMapEditsToMaps(applyMapSourcesToMaps(current, importedMapSources), importedMapEdits));
    } else if (importedMapSources.length) {
      setMaps((current) => applyMapSourcesToMaps(current, importedMapSources));
    }

    if (importedCutscenes.length) {
      setCutscenes((current) => [...current, ...importedCutscenes]);
      setActiveCutsceneId(importedCutscenes[0].uid);
      setActiveSection("event");
      setActiveTab("timeline");
    }

    if (importedSchedules.length) {
      setSchedules((current) => [...current, ...importedSchedules]);
      setActiveScheduleId(importedSchedules[0].uid);
      setSelectedSchedulePointId(importedSchedules[0].points[0]?.uid ?? "");
      setActiveSection("schedule");
      setActiveTab("schedule");
    }
  }

  async function scanDirectoryWithPicker() {
    if (!window.showDirectoryPicker) {
      setMapLoadDebug("This browser does not support direct folder scanning. Use Asset Upload > directory picker instead.");
      return;
    }
    try {
      const root = await window.showDirectoryPicker();
      const files = [];
      const visit = async (handle, prefix = root.name) => {
        for await (const [name, child] of handle.entries()) {
          const nextPath = `${prefix}/${name}`;
          if (child.kind === "directory") {
            await visit(child, nextPath);
          } else if (/\.(json|tmx|tbin|png)$/i.test(name)) {
            const file = await child.getFile();
            Object.defineProperty(file, "webkitRelativePath", { value: nextPath });
            files.push(file);
          }
        }
      };
      await visit(root);
      await handleFiles(files);
      setMapLoadDebug(`Scanned ${files.length} map/content asset file(s) from ${root.name}.`);
    } catch (error) {
      if (error?.name === "AbortError") return;
      setMapLoadDebug(`Folder scan failed: ${error.message}`);
    }
  }

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(cssWidth * scale));
    canvas.height = Math.max(1, Math.floor(cssHeight * scale));
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.imageSmoothingEnabled = false;
    context.fillStyle = "#050608";
    context.fillRect(0, 0, cssWidth, cssHeight);

    if (!activeMap) {
      context.fillStyle = "#6f7887";
      context.font = "600 18px system-ui";
      context.textAlign = "center";
      context.fillText("No map loaded", cssWidth / 2, cssHeight / 2);
      return;
    }

    const { tileSize, mapPixelWidth, mapPixelHeight, offsetX, offsetY } = getMapViewport(activeMap, cssWidth, cssHeight, zoom, activeTab, followScheduleNpc, currentPlaybackStep, schedulePan, mapPan);

    context.fillStyle = "#10151b";
    context.fillRect(offsetX - 8, offsetY - 8, mapPixelWidth + 16, mapPixelHeight + 16);

    if (activeMap.previewImage) {
      context.drawImage(
        activeMap.previewImage,
        offsetX,
        offsetY,
        activeMap.width * tileSize,
        activeMap.height * tileSize,
      );
    }

    for (const layer of activeMap.layers) {
      for (let index = 0; index < layer.data.length; index += 1) {
        const gid = layer.data[index];
        if (!gid) continue;
        const x = index % layer.width;
        const y = Math.floor(index / layer.width);
        const tileset = findTileset(activeMap.tilesets, gid);
        const image = tileset ? images[tileset.source] : null;
        if (tileset && image) {
          const local = gid - tileset.firstgid;
          const columns = Math.max(1, Math.floor((tileset.imageWidth || image.width) / tileset.tileWidth));
          const sx = (local % columns) * tileset.tileWidth;
          const sy = Math.floor(local / columns) * tileset.tileHeight;
          context.drawImage(image, sx, sy, tileset.tileWidth, tileset.tileHeight, offsetX + x * tileSize, offsetY + y * tileSize, tileSize, tileSize);
        } else {
          context.fillStyle = `hsl(${(gid * 47) % 360} 28% 32%)`;
          context.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize, tileSize);
        }
      }
    }

    if (overlays.walkable) {
      context.fillStyle = "rgba(62, 205, 129, .08)";
      for (let y = 0; y < activeMap.height; y += 1) {
        for (let x = 0; x < activeMap.width; x += 1) {
          if (!isPathBlockedTile(activeMap, x, y)) context.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize, tileSize);
        }
      }
    }

    if (overlays.blocked && activeMap.blockedTiles?.size) {
      context.fillStyle = "rgba(217, 83, 79, .32)";
      context.strokeStyle = "rgba(255, 189, 89, .45)";
      context.lineWidth = 1;
      for (const key of activeMap.blockedTiles) {
        const [x, y] = key.split(",").map(Number);
        context.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize, tileSize);
        if (tileSize >= 16) context.strokeRect(offsetX + x * tileSize + 1, offsetY + y * tileSize + 1, tileSize - 2, tileSize - 2);
      }
    }

    if ((overlays.warpTiles || overlays.doorTiles) && activeMap.warps?.length) {
      for (const warp of activeMap.warps) {
        const details = activeMap.tileDetails?.[tileKey(warp.x, warp.y)];
        const isDoor = details?.isDoor || warp.isDoor;
        if (isDoor ? !overlays.doorTiles : !overlays.warpTiles) continue;
        const x = offsetX + warp.x * tileSize;
        const y = offsetY + warp.y * tileSize;
        context.fillStyle = isDoor ? "rgba(160, 105, 255, .76)" : "rgba(47, 128, 237, .72)";
        context.strokeStyle = isDoor ? "#d8c2ff" : "#9bd0ff";
        context.lineWidth = 2;
        if (isDoor) {
          context.fillRect(x + 4, y + 3, tileSize - 8, tileSize - 6);
          context.strokeRect(x + 4, y + 3, tileSize - 8, tileSize - 6);
        } else {
          context.beginPath();
          context.moveTo(x + tileSize / 2, y + 3);
          context.lineTo(x + tileSize - 3, y + tileSize / 2);
          context.lineTo(x + tileSize / 2, y + tileSize - 3);
          context.lineTo(x + 3, y + tileSize / 2);
          context.closePath();
          context.fill();
          context.stroke();
        }
        if (tileSize >= 18) {
          context.fillStyle = "#ffffff";
          context.font = "800 10px system-ui";
          context.textAlign = "center";
          context.fillText(isDoor ? "D" : "W", x + tileSize / 2, y + tileSize / 2 + 4);
        }
        if (overlays.cpSource && tileSize >= 24 && warp.targetMap) {
          context.fillStyle = "#d9ecff";
          context.font = "700 10px system-ui";
          context.textAlign = "center";
          context.fillText(warp.targetMap, x + tileSize / 2, y - 4);
        }
      }
    }

    if (overlays.actions && activeMap.tileDetails) {
      for (const details of Object.values(activeMap.tileDetails)) {
        if (!details.action || details.isWarp || details.isDoor) continue;
        const x = offsetX + details.x * tileSize;
        const y = offsetY + details.y * tileSize;
        context.fillStyle = "rgba(255, 142, 72, .42)";
        context.strokeStyle = "#ffb178";
        context.lineWidth = 2;
        context.beginPath();
        context.arc(x + tileSize / 2, y + tileSize / 2, Math.max(5, tileSize * 0.24), 0, Math.PI * 2);
        context.fill();
        context.stroke();
        if (tileSize >= 18) {
          context.fillStyle = "#ffffff";
          context.font = "800 10px system-ui";
          context.textAlign = "center";
          context.fillText("A", x + tileSize / 2, y + tileSize / 2 + 4);
        }
      }
    }

    if (overlays.npcPaths && selectedMovePreview.path.length && selectedMovePreview.actor) {
      const startX = offsetX + selectedMovePreview.actor.x * tileSize + tileSize / 2;
      const startY = offsetY + selectedMovePreview.actor.y * tileSize + tileSize / 2;
      context.strokeStyle = "rgba(246, 196, 83, .95)";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(startX, startY);
      for (const step of selectedMovePreview.path) {
        context.lineTo(offsetX + step.x * tileSize + tileSize / 2, offsetY + step.y * tileSize + tileSize / 2);
      }
      context.stroke();

      for (const step of selectedMovePreview.path) {
        const blocked = isPathBlockedTile(activeMap, step.x, step.y);
        context.fillStyle = blocked ? "rgba(255, 66, 66, .68)" : "rgba(62, 205, 129, .4)";
        context.fillRect(offsetX + step.x * tileSize + 3, offsetY + step.y * tileSize + 3, tileSize - 6, tileSize - 6);
      }
    }

    if (selectedCommand?.verb === "warp") {
      const xTile = Number(selectedCommand.values.x);
      const yTile = Number(selectedCommand.values.y);
      if (Number.isFinite(xTile) && Number.isFinite(yTile) && isInsideMap(activeMap, xTile, yTile)) {
        const x = offsetX + xTile * tileSize;
        const y = offsetY + yTile * tileSize;
        context.strokeStyle = isPathBlockedTile(activeMap, xTile, yTile) ? "#ff5c5c" : "#9ee6b8";
        context.fillStyle = isPathBlockedTile(activeMap, xTile, yTile) ? "rgba(255, 92, 92, .22)" : "rgba(158, 230, 184, .18)";
        context.lineWidth = 4;
        context.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        context.strokeRect(x + 3, y + 3, tileSize - 6, tileSize - 6);
      }
    }

    if (selectedCommand?.verb === "faceDirection") {
      const actorName = expandShorthand(selectedCommand.values.actor || "farmer").toLowerCase();
      const actor = placedActors.find((candidate) => candidate.actor.toLowerCase() === actorName || candidate.uid.toLowerCase() === actorName);
      if (actor) {
        const cx = offsetX + actor.x * tileSize + tileSize / 2;
        const cy = offsetY + actor.y * tileSize + tileSize / 2;
        const direction = Number(selectedCommand.values.direction);
        const vector = direction === 0 ? [0, -1] : direction === 1 ? [1, 0] : direction === 3 ? [-1, 0] : [0, 1];
        context.strokeStyle = "#f6c453";
        context.fillStyle = "#f6c453";
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(cx, cy);
        context.lineTo(cx + vector[0] * tileSize * 0.7, cy + vector[1] * tileSize * 0.7);
        context.stroke();
        context.beginPath();
        context.arc(cx + vector[0] * tileSize * 0.7, cy + vector[1] * tileSize * 0.7, 5, 0, Math.PI * 2);
        context.fill();
      }
    }

    if (overlays.npcPaths && activeTab === "schedule" && schedulePlayback.route.length) {
      const currentIndex = schedulePlayback.index;
      const visibleRoute = schedulePlayback.route.filter((step) => normalizeMapName(step.location) === normalizeMapName(activeMap.id));
      const drawRouteLine = (steps, color, width) => {
        if (steps.length < 2) return;
        context.strokeStyle = color;
        context.lineWidth = width;
        context.beginPath();
        context.moveTo(offsetX + steps[0].x * tileSize + tileSize / 2, offsetY + steps[0].y * tileSize + tileSize / 2);
        for (const step of steps.slice(1)) {
          context.lineTo(offsetX + step.x * tileSize + tileSize / 2, offsetY + step.y * tileSize + tileSize / 2);
        }
        context.stroke();
      };
      drawRouteLine(visibleRoute.filter((step) => schedulePlayback.route.indexOf(step) <= currentIndex), "rgba(62, 205, 129, .9)", 4);
      drawRouteLine(visibleRoute.filter((step) => schedulePlayback.route.indexOf(step) >= currentIndex), "rgba(246, 196, 83, .95)", 3);

      for (const [index, step] of schedulePlayback.route.entries()) {
        if (normalizeMapName(step.location) !== normalizeMapName(activeMap.id)) continue;
        const completed = index < currentIndex;
        context.fillStyle = completed ? "rgba(62, 205, 129, .5)" : "rgba(246, 196, 83, .52)";
        context.fillRect(offsetX + step.x * tileSize + 5, offsetY + step.y * tileSize + 5, tileSize - 10, tileSize - 10);
      }

      const currentStep = currentPlaybackStep;
      if (currentStep && normalizeMapName(currentStep.location) === normalizeMapName(activeMap.id)) {
        context.strokeStyle = "#ffffff";
        context.fillStyle = "rgba(255, 255, 255, .12)";
        context.lineWidth = 3;
        context.strokeRect(offsetX + currentStep.targetX * tileSize + 3, offsetY + currentStep.targetY * tileSize + 3, tileSize - 6, tileSize - 6);
        context.fillRect(offsetX + currentStep.targetX * tileSize + 6, offsetY + currentStep.targetY * tileSize + 6, tileSize - 12, tileSize - 12);
      }
    }

    if (overlays.grid) {
      context.strokeStyle = overlays.coordinates ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.08)";
      context.lineWidth = 1;
      for (let x = 0; x <= activeMap.width; x += 1) {
        context.beginPath();
        context.moveTo(offsetX + x * tileSize, offsetY);
        context.lineTo(offsetX + x * tileSize, offsetY + activeMap.height * tileSize);
        context.stroke();
      }
      for (let y = 0; y <= activeMap.height; y += 1) {
        context.beginPath();
        context.moveTo(offsetX, offsetY + y * tileSize);
        context.lineTo(offsetX + activeMap.width * tileSize, offsetY + y * tileSize);
        context.stroke();
      }
    }

    if (overlays.coordinates && tileSize >= 22) {
      context.fillStyle = "rgba(232, 237, 243, .48)";
      context.font = "700 9px system-ui";
      context.textAlign = "left";
      for (let y = 0; y < activeMap.height; y += 1) {
        for (let x = 0; x < activeMap.width; x += 1) {
          if ((x + y) % 2 === 0) context.fillText(`${x},${y}`, offsetX + x * tileSize + 2, offsetY + y * tileSize + 10);
        }
      }
    }

    if (overlays.viewport && activeCutscene) {
      const viewX = Number(activeCutscene.viewportX ?? 0);
      const viewY = Number(activeCutscene.viewportY ?? 0);
      const viewWidth = Math.min(activeMap.width - viewX, 20);
      const viewHeight = Math.min(activeMap.height - viewY, 12);
      if (Number.isFinite(viewX) && Number.isFinite(viewY) && viewWidth > 0 && viewHeight > 0) {
        context.fillStyle = "rgba(246, 196, 83, .08)";
        context.strokeStyle = "#f6c453";
        context.lineWidth = 3;
        context.fillRect(offsetX + viewX * tileSize, offsetY + viewY * tileSize, viewWidth * tileSize, viewHeight * tileSize);
        context.strokeRect(offsetX + viewX * tileSize + 2, offsetY + viewY * tileSize + 2, viewWidth * tileSize - 4, viewHeight * tileSize - 4);
        context.fillStyle = "#f6c453";
        context.font = "800 11px system-ui";
        context.textAlign = "left";
        context.fillText("Viewport", offsetX + viewX * tileSize + 6, offsetY + viewY * tileSize + 16);
      }
    }

    const drawMarker = (actor, color) => {
      const x = offsetX + actor.x * tileSize;
      const y = offsetY + actor.y * tileSize;
      const isSelected = actor.uid === selectedActorKey;
      const sprite = actorSprites[actor.actor];

      context.strokeStyle = isSelected ? "#f6c453" : "#ffffff";
      context.lineWidth = isSelected ? 4 : 2;

      if (sprite) {
        const sourceWidth = 16;
        const sourceHeight = 32;
        const row = actor.facing === 0 ? 2 : actor.facing === 1 ? 1 : actor.facing === 3 ? 3 : 0;
        const sx = 0;
        const sy = Math.min(sprite.height - sourceHeight, Math.max(0, row * sourceHeight));
        const drawWidth = Math.max(18, tileSize * 0.72);
        const drawHeight = drawWidth * 2;
        const dx = x + (tileSize - drawWidth) / 2;
        const dy = y + tileSize - drawHeight;
        context.fillStyle = "rgba(0,0,0,.45)";
        context.beginPath();
        context.ellipse(x + tileSize / 2, y + tileSize * 0.86, drawWidth * 0.45, Math.max(4, tileSize * 0.12), 0, 0, Math.PI * 2);
        context.fill();
        context.drawImage(sprite, sx, sy, sourceWidth, sourceHeight, dx, dy, drawWidth, drawHeight);
        context.strokeRect(dx - 3, dy - 3, drawWidth + 6, drawHeight + 6);
      } else {
        context.fillStyle = color;
        context.beginPath();
        context.arc(x + tileSize / 2, y + tileSize / 2, Math.max(8, tileSize * 0.34), 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.fillStyle = "#ffffff";
        context.font = "700 11px system-ui";
        context.textAlign = "center";
        context.fillText(actor.actor === "farmer" ? "F" : actor.actor.slice(0, 2).toUpperCase(), x + tileSize / 2, y + tileSize / 2 + 4);
      }

      context.fillStyle = isSelected ? "#f6c453" : "#edf2f7";
      context.font = "700 11px system-ui";
      context.textAlign = "center";
      context.fillText(actor.actor, x + tileSize / 2, y - 6);
    };

    if (activeTab !== "schedule" && activeCutscene?.farmer) drawMarker(activeCutscene.farmer, "#2f80ed");
    if (activeTab !== "schedule") for (const actor of activeCutscene?.actors ?? []) drawMarker(actor, "#d96b43");

    if (overlays.scheduleStops && activeTab === "schedule" && activeSchedule?.points?.length) {
      for (const point of activeSchedule.points) {
        if (normalizeMapName(point.location) !== normalizeMapName(activeMap.id)) continue;
        const x = offsetX + point.x * tileSize;
        const y = offsetY + point.y * tileSize;
        const isSelected = point.uid === selectedSchedulePoint?.uid;
        context.fillStyle = isSelected ? "rgba(246, 196, 83, .92)" : "rgba(62, 205, 129, .82)";
        context.strokeStyle = isSelected ? "#ffffff" : "#b6f4cb";
        context.lineWidth = isSelected ? 3 : 2;
        context.beginPath();
        context.roundRect(x + 4, y + 4, tileSize - 8, tileSize - 8, 5);
        context.fill();
        context.stroke();
        context.fillStyle = "#0b1016";
        context.font = "800 10px system-ui";
        context.textAlign = "center";
        context.fillText(String(point.time || "?"), x + tileSize / 2, y + tileSize / 2 + 4);
      }
    }

    if (activeTab === "schedule" && currentPlaybackStep && normalizeMapName(currentPlaybackStep.location) === normalizeMapName(activeMap.id)) {
      drawMarker({
        uid: "schedule-playback",
        actor: activeSchedule?.npc || "NPC",
        x: currentPlaybackStep.x,
        y: currentPlaybackStep.y,
        facing: currentPlaybackStep.facing,
      }, "#2f80ed");
    }

    if (hoveredTile && (!selectedTile || hoveredTile.x !== selectedTile.x || hoveredTile.y !== selectedTile.y)) {
      context.strokeStyle = "rgba(255,255,255,.42)";
      context.lineWidth = 2;
      context.strokeRect(offsetX + hoveredTile.x * tileSize + 3, offsetY + hoveredTile.y * tileSize + 3, tileSize - 6, tileSize - 6);
    }

    if (selectedTile) {
      context.strokeStyle = "#f6c453";
      context.lineWidth = 3;
      context.strokeRect(offsetX + selectedTile.x * tileSize + 2, offsetY + selectedTile.y * tileSize + 2, tileSize - 4, tileSize - 4);
    }
  }, [activeCutscene, activeMap, activeSchedule, activeTab, actorSprites, currentPlaybackStep, followScheduleNpc, hoveredTile, images, mapPan, overlays, placedActors, schedulePan, schedulePlayback.index, schedulePlayback.route, selectedActorKey, selectedCommand, selectedMovePreview, selectedSchedulePoint, selectedTile, zoom]);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

  useEffect(() => {
    if (!apiBaseUrl.trim() || !spriteActors.length) return;
    const missingActors = spriteActors
      .filter((actor) => actor.actor && actor.actor !== "farmer")
      .filter((actor) => actorSprites[actor.actor] === undefined);

    for (const actor of missingActors) {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => setActorSprites((current) => ({ ...current, [actor.actor]: image }));
      image.onerror = () => setActorSprites((current) => ({ ...current, [actor.actor]: null }));
      image.src = buildApiUrl(apiBaseUrl, apiToken, "/api/v1/tempactors/image", { assetName: `Characters/${actor.actor}` });
    }
  }, [apiBaseUrl, apiToken, actorSprites, spriteActors]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      const step = event.shiftKey ? 160 : 64;
      const key = event.key.toLowerCase();
      if (!["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) return;
      event.preventDefault();
      setMapPan((pan) => ({
        x: pan.x + (key === "arrowleft" || key === "a" ? step : key === "arrowright" || key === "d" ? -step : 0),
        y: pan.y + (key === "arrowup" || key === "w" ? step : key === "arrowdown" || key === "s" ? -step : 0),
      }));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function getTileFromCanvasEvent(event) {
    if (!activeMap) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const { tileSize, offsetX, offsetY } = getMapViewport(activeMap, rect.width, rect.height, zoom, activeTab, followScheduleNpc, currentPlaybackStep, schedulePan, mapPan);
    const x = Math.floor((event.clientX - rect.left - offsetX) / tileSize);
    const y = Math.floor((event.clientY - rect.top - offsetY) / tileSize);
    if (x < 0 || y < 0 || x >= activeMap.width || y >= activeMap.height) return null;
    return { mapId: activeMap.id, x, y };
  }

  function handleCanvasClick(event) {
    if (panMovedRef.current) return;
    const tile = getTileFromCanvasEvent(event);
    if (!tile) return;
    const { x, y } = tile;
    setSelectedTile({ mapId: activeMap.id, x, y });

    const clickedActor = placedActors.find((actor) => Number(actor.x) === x && Number(actor.y) === y);
    if (activeTab === "actors" && clickedActor) {
      setSelectedActorKey(clickedActor.uid);
      return;
    }

    if (activeTab === "actors" && selectedActorKey) {
      if (isPathBlockedTile(activeMap, x, y)) {
        setMapWarning(`Blocked tile: cannot place ${selectedActorKey === "farmer" ? "farmer" : "actor"} at (${x}, ${y}).`);
        return;
      }
      setMapWarning("");
      if (selectedActorKey === "farmer") {
        updateCutscene((cutscene) => applyFarmerPatch(cutscene, { x, y }));
      } else {
        updateCutscene((cutscene) => ({
          ...cutscene,
          actors: cutscene.actors.map((actor) => actor.uid === selectedActorKey ? { ...actor, x, y } : actor),
        }));
      }
      return;
    }

    if (activeTab === "schedule" && selectedSchedulePoint) {
      if (isPathBlockedTile(activeMap, x, y)) {
        setMapWarning(`Blocked tile: schedule point cannot use (${x}, ${y}).`);
        return;
      }
      updateSchedulePoint(selectedSchedulePoint.uid, { location: activeMap.id, x, y });
      setLocationMapLinks((current) => ({ ...current, [normalizeMapName(activeMap.id)]: activeMap.id }));
      setMapWarning("");
      return;
    }

    if (selectedCommand) {
      updateCommand(selectedCommand.id, (command) => {
        const values = { ...command.values };
        if ("x" in values) values.x = String(x);
        if ("y" in values) values.y = String(y);
        if ("targetX" in values) values.targetX = String(x);
        if ("targetY" in values) values.targetY = String(y);
        return { ...command, values };
      });
    }
    setMapWarning("");
  }

  function handleCanvasPointerDown(event) {
    if (event.button !== 0) return;
    panMovedRef.current = false;
    panStartRef.current = { x: event.clientX, y: event.clientY, panX: mapPan.x, panY: mapPan.y };
    setIsPanningMap(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleCanvasPointerMove(event) {
    const tile = getTileFromCanvasEvent(event);
    setHoveredTile(tile);
    if (!isPanningMap) return;
    const dx = event.clientX - panStartRef.current.x;
    const dy = event.clientY - panStartRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) panMovedRef.current = true;
    setMapPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
  }

  function handleCanvasPointerUp(event) {
    setIsPanningMap(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    window.setTimeout(() => {
      panMovedRef.current = false;
    }, 0);
  }

  function handleCanvasWheel(event) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setZoom((value) => Math.max(0.35, Math.min(3, Number((value + delta).toFixed(2)))));
  }

  function centerMapOnTile(tile, nextZoom = zoom) {
    if (!activeMap || !tile || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const tileSize = activeMap.tileWidth * nextZoom;
    const baseX = Math.max(16, (rect.width - activeMap.width * tileSize) / 2);
    const baseY = Math.max(16, (rect.height - activeMap.height * tileSize) / 2);
    setMapPan({
      x: rect.width / 2 - (tile.x + 0.5) * tileSize - baseX,
      y: rect.height / 2 - (tile.y + 0.5) * tileSize - baseY,
    });
  }

  function fitFullMap() {
    if (!activeMap || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const fitZoom = Math.max(0.25, Math.min(3, Math.min((rect.width - 32) / (activeMap.width * activeMap.tileWidth), (rect.height - 32) / (activeMap.height * activeMap.tileHeight))));
    setZoom(Number(fitZoom.toFixed(2)));
    setMapPan({ x: 0, y: 0 });
  }

  function centerOnSelectedNpc() {
    const actor = placedActors.find((candidate) => candidate.uid === selectedActorKey) ?? activeCutscene?.farmer;
    if (actor) centerMapOnTile({ x: Number(actor.x), y: Number(actor.y) });
  }

  function centerOnScheduleStop() {
    if (selectedSchedulePoint) centerMapOnTile({ x: Number(selectedSchedulePoint.x), y: Number(selectedSchedulePoint.y) });
  }

  function centerOnViewport() {
    if (activeCutscene) centerMapOnTile({ x: Number(activeCutscene.viewportX) + 10, y: Number(activeCutscene.viewportY) + 6 });
  }

  function updateCommand(commandId, updater) {
    updateCutscene((cutscene) => ({
      ...cutscene,
      commands: cutscene.commands.map((command) => command.id === commandId ? updater(command) : command),
    }));
  }

  function addCommand(verb) {
    const command = makeCommand(verb);
    updateCutscene((cutscene) => {
      const endIndex = cutscene.commands.findIndex((item) => item.verb === "end");
      const insertIndex = endIndex >= 0 ? endIndex : cutscene.commands.length;
      const commands = [...cutscene.commands];
      commands.splice(insertIndex, 0, command);
      return { ...cutscene, commands };
    });
    setSelectedCommandId(command.id);
  }

  function removeCommand(commandId) {
    updateCutscene((cutscene) => ({ ...cutscene, commands: cutscene.commands.filter((command) => command.id !== commandId) }));
    if (selectedCommandId === commandId) setSelectedCommandId(null);
  }

  function moveCommand(commandId, delta) {
    updateCutscene((cutscene) => {
      const index = cutscene.commands.findIndex((command) => command.id === commandId);
      const nextIndex = index + delta;
      if (index < 0 || nextIndex < 0 || nextIndex >= cutscene.commands.length) return cutscene;
      const commands = [...cutscene.commands];
      const [command] = commands.splice(index, 1);
      commands.splice(nextIndex, 0, command);
      return { ...cutscene, commands };
    });
  }

  function addActor(npc = null) {
    const name = npc?.name ?? "NPC_Name";
    const uid = crypto.randomUUID();
    updateCutscene((cutscene) => ({
      ...cutscene,
      actors: [...cutscene.actors, { uid, actor: name, x: cutscene.viewportX, y: cutscene.viewportY, facing: 2 }],
    }));
    setSelectedActorKey(uid);
    setActiveSection("event");
    setActiveTab("actors");
  }

  function updateActor(index, patch) {
    updateCutscene((cutscene) => ({
      ...cutscene,
      actors: cutscene.actors.map((actor, actorIndex) => actorIndex === index ? { ...actor, ...patch } : actor),
    }));
  }

  function removeActor(actorUid) {
    updateCutscene((cutscene) => ({
      ...cutscene,
      actors: cutscene.actors.filter((actor) => actor.uid !== actorUid),
    }));
    if (selectedActorKey === actorUid) setSelectedActorKey("farmer");
  }

  function updateActorByUid(actorUid, patch) {
    if (actorUid === "farmer") {
      updateCutscene((cutscene) => applyFarmerPatch(cutscene, patch));
      return;
    }
    updateCutscene((cutscene) => ({
      ...cutscene,
      actors: cutscene.actors.map((actor) => actor.uid === actorUid ? { ...actor, ...patch } : actor),
    }));
  }

  function updateSchedule(patch) {
    setSchedules((current) => current.map((schedule) => (
      schedule.uid === activeSchedule.uid ? { ...schedule, ...patch } : schedule
    )));
  }

  function updateSchedulePoint(pointUid, patch) {
    setSchedules((current) => current.map((schedule) => (
      schedule.uid === activeSchedule.uid
        ? { ...schedule, points: schedule.points.map((point) => point.uid === pointUid ? { ...point, ...patch } : point) }
        : schedule
    )));
  }

  function addSchedulePoint() {
    const base = selectedSchedulePoint ?? activeSchedule.points.at(-1) ?? blankSchedulePoint();
    const next = blankSchedulePoint(base.location, String((Number(base.time) || 900) + 100));
    next.x = base.x;
    next.y = base.y;
    next.facing = base.facing;
    setSchedules((current) => current.map((schedule) => (
      schedule.uid === activeSchedule.uid
        ? { ...schedule, points: [...schedule.points, next].sort((a, b) => Number(a.time) - Number(b.time)) }
        : schedule
    )));
    setSelectedSchedulePointId(next.uid);
  }

  function removeSchedulePoint(pointUid) {
    setSchedules((current) => current.map((schedule) => {
      if (schedule.uid !== activeSchedule.uid) return schedule;
      const points = schedule.points.filter((point) => point.uid !== pointUid);
      return { ...schedule, points };
    }));
    if (selectedSchedulePointId === pointUid) setSelectedSchedulePointId("");
  }

  function addSchedule(npc = null) {
    const next = blankSchedule(npc?.name ?? activeSchedule?.npc ?? "NPC_Name");
    setSchedules((current) => [...current, next]);
    setActiveScheduleId(next.uid);
    setSelectedSchedulePointId(next.points[0]?.uid ?? "");
    setActiveSection("schedule");
    setActiveTab("schedule");
  }

  function exportScheduleJson() {
    if (!activeSchedule) return;
    const blocking = scheduleChecks.filter((check) => check.level === "error");
    if (blocking.length) {
      setApiStatus(`Schedule export blocked: ${blocking[0].message}`);
      return;
    }
    const value = buildSchedulePatch(activeSchedule);
    try {
      JSON.parse(value);
    } catch (error) {
      setApiStatus(`Schedule export blocked: invalid JSON (${error.message}).`);
      return;
    }
    const safeName = `${activeSchedule.npc || "NPC"}_${activeSchedule.key || "schedule"}`.replace(/[^a-z0-9_.-]+/gi, "_");
    downloadTextFile(`${safeName}.schedule.content.json`, value);
    setApiStatus("Schedule JSON exported.");
  }

  function addCustomRouteEdge() {
    const base = selectedSchedulePoint ?? activeSchedule?.points?.[0] ?? {};
    const next = {
      ...DEFAULT_CUSTOM_ROUTE_EDGE,
      id: crypto.randomUUID(),
      fromLocation: base.location || DEFAULT_CUSTOM_ROUTE_EDGE.fromLocation,
      fromX: Number(base.x) || 0,
      fromY: Number(base.y) || 0,
    };
    setCustomRouteEdges((current) => [...current, next]);
  }

  function updateCustomRouteEdge(id, patch) {
    setCustomRouteEdges((current) => current.map((edge) => (
      edge.id === id ? { ...edge, ...patch } : edge
    )));
  }

  function removeCustomRouteEdge(id) {
    setCustomRouteEdges((current) => current.filter((edge) => edge.id !== id));
  }

  function exportCustomRouteEdges() {
    downloadTextFile("MoonVillage.ScheduleRouteEdges.json", JSON.stringify({
      source: "StardewCutsceneHelper schedule route fixes",
      inspiredBy: "World Navigator transition edge graph model",
      edges: customRouteEdges,
    }, null, 2));
    setApiStatus("Custom route edges exported.");
  }


  async function ensureScheduleMapsLoaded(schedule) {
    const neededLocations = [...new Set((schedule.points ?? []).map((point) => point.location).filter(Boolean))];
    const workingMaps = { ...maps };
    const missing = neededLocations.filter((location) => !findBestMapForLocation(location, workingMaps));
    if (missing.length) {
      setMapLoadDebug([
        "Schedule map loading is manual asset mode.",
        "",
        `Missing map(s): ${missing.join(", ")}`,
        "",
        "Load a Moon Village git folder, Reference mods folder, TMX/TBIN map, PNG tilesheets, or Content Patcher folder, then retry the schedule test.",
      ].join("\n"));
    }
    return workingMaps;
  }

  async function testSchedule() {
    if (!activeSchedule) return;
    setApiStatus("Testing schedule preview from loaded assets...");
    const workingMaps = await ensureScheduleMapsLoaded(activeSchedule);
    const result = buildSchedulePlaybackRoute(activeSchedule, workingMaps, customRouteEdges);
    setDebugReport(buildScheduleDebugReport(activeSchedule, result, scheduleChecks, workingMaps));
    if (!result.ok) {
      setSchedulePlayback({ route: result.route, index: 0, playing: false, status: result.status, error: result.error });
      setApiStatus(result.error);
      setMapWarning(result.error);
      return;
    }
    setSchedulePlayback({ route: result.route, index: 0, playing: true, status: "valid", error: "" });
    setSelectedSchedulePointId(activeSchedule.points[0]?.uid ?? "");
    setMapWarning("");
    setApiStatus(`Schedule preview started with ${result.route.length} route steps.`);
  }

  function getNpcDisplayName(name) {
    return liveNpcs.find((npc) => npc.name === name)?.displayName ?? name;
  }

  function copyText(value) {
    navigator.clipboard?.writeText(value);
  }

  function downloadTextFile(fileName, value) {
    const blob = new Blob([value], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportFinishedJson() {
    if (!activeCutscene) return;
    const blocking = validationChecks.filter((check) => check.level === "error");
    if (blocking.length) {
      setApiStatus(`Export blocked: ${blocking[0].message}`);
      return;
    }
    const value = exportType === "raw-entry" ? buildRawEventEntry(activeCutscene) : buildContentPatch(activeCutscene);
    try {
      JSON.parse(value);
    } catch (error) {
      setApiStatus(`Export blocked: invalid JSON (${error.message}).`);
      return;
    }
    const safeName = `${activeCutscene.id || "event"}`.replace(/[^a-z0-9_.-]+/gi, "_");
    downloadTextFile(`${safeName}.${exportType === "raw-entry" ? "entry" : "content"}.json`, value);
    setApiStatus("Finished JSON exported.");
  }

  function saveCurrentAppDraft() {
    if (!activeToolApp) return;
    const savedAt = new Date().toISOString();
    if (activeToolApp.id === "cutscene-maker") {
      downloadTextFile(`${activeCutscene?.id || "cutscene"}_draft.json`, JSON.stringify({
        app: activeToolApp.id,
        savedAt,
        cutscene: activeCutscene,
        compiledEventKey: activeCutscene ? compileEventKey(activeCutscene) : "",
        compiledScript: activeCutscene ? compileScript(activeCutscene) : "",
      }, null, 2));
      setApiStatus("Cutscene draft downloaded.");
      return;
    }
    if (activeToolApp.id === "schedule-maker") {
      downloadTextFile(`${activeSchedule?.npc || "schedule"}_${activeSchedule?.key || "draft"}_draft.json`, JSON.stringify({
        app: activeToolApp.id,
        savedAt,
        schedule: activeSchedule,
        compiledSchedule: activeSchedule ? compileSchedule(activeSchedule) : "",
      }, null, 2));
      setApiStatus("Schedule draft downloaded.");
      return;
    }
    downloadTextFile(`${customPortraitMaker.npcName || portraitWorkflow.npcName || "portrait"}_animation_portrait_draft.json`, JSON.stringify({
      app: activeToolApp.id,
      savedAt,
      customPortrait: buildCustomPortraitExportLog(),
      portraitWorkflow: buildPortraitExportLog(),
      animations: animationEntries,
    }, null, 2));
    setApiStatus("Animation & portrait draft downloaded.");
  }

  function loadCurrentAppAssets() {
    if (!activeToolApp) return;
    setActiveSection(activeToolApp.defaultSection);
    setActiveTab(activeToolApp.loadTab ?? activeToolApp.defaultTab);
    setMapLoadDebug(activeToolApp.id === "schedule-maker"
      ? "Schedule Maker uses manual asset loading. Upload or scan TMX/TBIN maps, tilesheets, schedules, or Content Patcher folders here."
      : activeToolApp.id === "cutscene-maker"
        ? "Cutscene Maker can load maps from Live API or manual assets. Use Live API for event testing."
        : "Animation & Portrait Maker loads PNG portraits, reference images, sprite sheets, and animation JSON in the Builder.");
  }

  function exportCurrentAppData() {
    if (!activeToolApp) return;
    if (activeToolApp.id === "cutscene-maker") {
      setActiveTab("export");
      exportFinishedJson();
      return;
    }
    if (activeToolApp.id === "schedule-maker") {
      if (!activeSchedule) return;
      const blocking = scheduleChecks.find((check) => check.level === "error");
      if (blocking) {
        setApiStatus(`Schedule export blocked: ${blocking.message}`);
        return;
      }
      downloadTextFile(`${activeSchedule.npc || "NPC"}_${activeSchedule.key || "schedule"}_schedule.json`, buildSchedulePatch(activeSchedule));
      setApiStatus("Schedule Content Patcher export downloaded.");
      return;
    }
    exportCustomPortraitSheet();
  }

  function validateCurrentAppData() {
    if (!activeToolApp) return;
    if (activeToolApp.id === "cutscene-maker") {
      setActiveTab("export");
      setDebugReport(buildCutsceneDebugReport(activeCutscene, activeMap, selectedMovePreview, validationChecks));
      setApiStatus(validationChecks.some((check) => check.level === "error") ? "Cutscene validation found errors." : "Cutscene validation passed.");
      return;
    }
    if (activeToolApp.id === "schedule-maker") {
      setActiveTab("schedule");
      setDebugReport(buildScheduleDebugReport(activeSchedule, schedulePlayback, scheduleChecks, maps));
      setApiStatus(scheduleChecks.some((check) => check.level === "error") ? "Schedule validation found errors." : "Schedule validation passed.");
      return;
    }
    setActiveTab("animation");
    setApiStatus([...customPortraitChecks, ...portraitWorkflowChecks, ...spriteSheetChecks, ...portraitSheetChecks, ...animationChecks].some((check) => check.level === "error")
      ? "Animation & portrait validation found errors."
      : "Animation & portrait validation passed.");
  }

  const apiRequest = useCallback(async (path, options = {}) => {
    const base = apiBaseUrl.trim().replace(/\/+$/, "");
    if (!base) throw new Error("Missing StardewLocalAPI URL.");
    const url = new URL(path, base);
    if (apiToken.trim()) url.searchParams.set("token", apiToken.trim());
    const response = await fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Devtools-Token": apiToken.trim(),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const text = await response.text();
    const json = text ? JSON.parse(text) : {};
    if (!response.ok || json.ok === false) {
      throw new Error(json.error || json.details || `HTTP ${response.status}`);
    }
    return json;
  }, [apiBaseUrl, apiToken]);

  const buildApiAssetUrl = useCallback((path, params = {}) => {
    return buildApiUrl(apiBaseUrl, apiToken, path, params);
  }, [apiBaseUrl, apiToken]);

  const resolveScreenshotUrl = useCallback((result, location) => {
    const file = String(result.file || "").trim();
    const relUrl = String(result.url || "").trim();
    if (relUrl.startsWith("http://") || relUrl.startsWith("https://")) return relUrl;
    if (relUrl.startsWith("/")) return buildApiAssetUrl(relUrl);
    if (file) return buildApiAssetUrl("/api/v1/screenshots/file", { name: file });
    if (relUrl) return buildApiAssetUrl("/api/v1/screenshots/file", { name: relUrl });
    return buildApiAssetUrl("/api/v1/screenshots/file", { name: `PICK_${location}` });
  }, [buildApiAssetUrl]);

  const createMapFromScreenshotResult = useCallback(async (result, location) => {
    const cleanLocation = String(result.location || result.Location || location || "CurrentLocation").trim();
    const imageUrl = resolveScreenshotUrl(result, cleanLocation);
    const image = await loadImageFromUrl(imageUrl);
    if (!image) throw new Error(`Could not load captured map image for ${cleanLocation}.`);
    const mapData = {
      id: cleanLocation,
      sourceFile: "StardewLocalAPI",
      width: Math.max(1, Math.floor(image.width / 64)),
      height: Math.max(1, Math.floor(image.height / 64)),
      tileWidth: 64,
      tileHeight: 64,
      tilesets: [],
      layers: [],
      mapProperties: {},
      tileProperties: {},
      blockedTiles: new Set(),
      blockingLayerNames: [],
      warps: [],
      previewImage: image,
      previewUrl: imageUrl,
      contentPatcherSources: ["StardewLocalAPI live capture"],
      locationNames: [cleanLocation],
      liveCollisionStatus: "visual_only",
    };
    return applyLiveCollisionData(mapData, result);
  }, [resolveScreenshotUrl]);

  const fetchLiveCollisionForLocation = useCallback(async (location) => {
    const attempts = [
      ["/api/v1/world/location/collision", { location }],
      ["/api/v1/maps/collision", { location }],
      ["/api/v1/pathing/collision", { location }],
      ["/api/v1/world/passability", { location }],
    ];
    const errors = [];
    for (const [path, params] of attempts) {
      try {
        const query = new URLSearchParams(params).toString();
        return await apiRequest(`${path}?${query}`);
      } catch (error) {
        errors.push(`${path}: ${error.message}`);
      }
    }
    throw new Error(errors.join("; "));
  }, [apiRequest]);

  const captureLiveMapForLocation = useCallback(async (location, forceRefresh = false) => {
    const cleanLocation = String(location || "").trim();
    if (!cleanLocation) return null;
    const existingMapId = findBestMapForLocation(cleanLocation, maps);
    if (existingMapId && !maps[existingMapId]?.previewImage) return maps[existingMapId];
    if (existingMapId && maps[existingMapId]?.previewImage && !forceRefresh) return maps[existingMapId];

    setMapWarning(`Capturing ${cleanLocation} from StardewLocalAPI...`);
    const safeName = `PICK_${cleanLocation.replace(/[^a-z0-9_-]+/gi, "_")}`;
    const result = await apiRequest("/api/v1/screenshots/map", {
      method: "POST",
      body: {
        location: cleanLocation,
        scale: 1.0,
        name: safeName,
        open: false,
        includeCollision: true,
        includePassability: true,
        includeObjects: true,
        includeFurniture: true,
        includeWarps: true,
        includeNpcs: true,
        includePlayer: true,
      },
    });
    const map = await createMapFromScreenshotResult(result, cleanLocation);
    if (map.liveCollisionStatus === "visual_only") {
      const collision = await fetchLiveCollisionForLocation(cleanLocation).catch(() => null);
      if (collision) applyLiveCollisionData(map, collision);
    }
    setMaps((current) => ({ ...current, [map.id]: map }));
    setActiveMapId(map.id);
    setLocationMapLinks((current) => ({ ...current, [normalizeMapName(cleanLocation)]: map.id }));
    setMapWarning("");
    return map;
  }, [apiRequest, createMapFromScreenshotResult, fetchLiveCollisionForLocation, maps]);

  async function loadMapByName(name = mapNameInput, forceRefresh = false) {
    const cleanName = String(name || "").trim();
    const cleanPath = cleanName && cleanName !== mapNameInput ? "" : String(mapPathInput || "").trim();
    if (!cleanName && !cleanPath) {
      setMapLoadDebug("Choose a map name or map file path first.");
      return;
    }

    const query = cleanPath || cleanName;
    const matches = findMapCatalogMatches(query, mapCatalog, maps);
    const exactMapId = findBestMapForLocation(cleanName, maps) || (cleanPath ? Object.values(maps).find((map) => normalizeMapName(map.sourceFile) === normalizeMapName(cleanPath))?.id : "");
    const chosen = matches[0];
    const chosenMapId = exactMapId || chosen?.mapId || findBestMapForLocation(chosen?.name, maps) || findBestMapForLocation(chosen?.fromFile, maps);
    const requestedLocation = cleanName || chosen?.name || cleanPath.replace(/^.*[\\/]/, "").replace(/\.(tmx|tbin|xnb)$/i, "");
    let apiFailure = "";
    setLastMapLoadRequest({ name: requestedLocation, forceRefresh });

    if (chosenMapId && maps[chosenMapId] && !forceRefresh) {
      setActiveMapId(chosenMapId);
      setLocationMapLinks((current) => ({ ...current, [normalizeMapName(cleanName || maps[chosenMapId].id)]: chosenMapId }));
      setMapWarning("");
      setMapLoadDebug(`Loaded ${maps[chosenMapId].id} from scanned files.\nFile: ${maps[chosenMapId].sourceFile || "-"}\nSource: ${maps[chosenMapId].contentPatcherSources?.join("; ") || chosen?.patch || "-"}`);
      return;
    }

    if (requestedLocation && apiBaseUrl.trim() && activeSection === "event") {
      try {
        const captured = await captureLiveMapForLocation(requestedLocation, forceRefresh);
        setMapLoadDebug(`Loaded ${captured.id} from StardewLocalAPI.\nNote: live screenshot maps show the rendered map. TMX tile properties are available when the matching TMX/XNB is imported or exposed by API overlay data.`);
        return;
      } catch (error) {
        apiFailure = error.message;
      }
    }

    if (activeSection !== "event") {
      setMapLoadDebug([
        `Could not load ${requestedLocation || cleanPath}.`,
        "",
        "Schedule and Animation asset tabs use manual map loading only.",
        "",
        "Checked:",
        `- Scanned map files: ${chosenMapId ? "found but not loaded" : "no match"}`,
        `- Requested map/path: ${query || "-"}`,
        "",
        "Suggested fix:",
        "- Scan the Moon Village git folder or Reference mods folder.",
        "- Or upload the TMX/TBIN map and PNG tilesheets manually.",
        "- Check Content Patcher Target and FromFile paths.",
      ].join("\n"));
      setMapWarning(`Could not load ${requestedLocation || cleanPath} from scanned assets. Select the map files manually.`);
      return;
    }

    const message = formatMapLoadFailure({
      requestedLocation,
      cleanPath,
      chosen,
      chosenMapId,
      maps,
      matches,
      apiBaseUrl,
      apiFailure,
    });
    setMapLoadDebug(message);
    setMapWarning(isWorldNotReady(apiFailure)
      ? `${requestedLocation} was found, but StardewLocalAPI says the game world is not ready yet.`
      : isLocationNotReady(apiFailure)
        ? `${requestedLocation} was found, but StardewLocalAPI says the location is not ready yet.`
      : `Could not load ${cleanName || cleanPath}. See Map Loader debug output.`);
  }

  async function retryLiveApiCapture() {
    const target = lastMapLoadRequest.name || mapNameInput;
    if (!target) {
      setMapLoadDebug("No previous map load request to retry.");
      return;
    }
    await loadMapByName(target, true);
  }

  async function useCurrentInGameMap() {
    try {
      setMapWarning("Capturing current in-game map from StardewLocalAPI...");
      const result = await apiRequest("/api/v1/screenshots/map", {
        method: "POST",
        body: {
          current: true,
          useCurrentLocation: true,
          scale: 1.0,
          name: "PICK_CurrentLocation",
          open: false,
          includeCollision: true,
          includePassability: true,
          includeObjects: true,
          includeFurniture: true,
          includeWarps: true,
          includeNpcs: true,
          includePlayer: true,
        },
      });
      const map = await createMapFromScreenshotResult(result, result.location || result.Location || lastMapLoadRequest.name || mapNameInput);
      if (map.liveCollisionStatus === "visual_only") {
        const collision = await fetchLiveCollisionForLocation(map.id).catch(() => null);
        if (collision) applyLiveCollisionData(map, collision);
      }
      setMaps((current) => ({ ...current, [map.id]: map }));
      setActiveMapId(map.id);
      setLocationMapLinks((current) => ({ ...current, [normalizeMapName(map.id)]: map.id }));
      setMapWarning("");
      setMapLoadDebug(`Loaded ${map.id} from current in-game map.\nSource: StardewLocalAPI currentLocation.Map\nIf you are inside ${lastMapLoadRequest.name || mapNameInput}, this is the requested map.`);
    } catch (error) {
      try {
        const meta = await apiRequest("/api/v1/meta");
        const location = meta.location || meta.currentLocation || meta.Location || lastMapLoadRequest.name || mapNameInput;
        const map = await captureLiveMapForLocation(location, true);
        setMapLoadDebug(`Loaded ${map.id} from current in-game location reported by /api/v1/meta.`);
      } catch (fallbackError) {
        setMapWarning(`Use Current In-Game Map failed: ${fallbackError.message || error.message}`);
        setMapLoadDebug(`Use Current In-Game Map failed.\nTried /api/v1/screenshots/map with current=true, then /api/v1/meta fallback.\nError: ${fallbackError.message || error.message}`);
      }
    }
  }

  async function loadCollisionFromLiveApi() {
    const target = activeMap?.id || lastMapLoadRequest.name || scheduleLocation || mapNameInput;
    if (!target) {
      setMapLoadDebug("Choose or load a map before requesting live collision data.");
      return;
    }
    const mapId = activeMap?.id || findBestMapForLocation(target, maps);
    const map = mapId ? maps[mapId] : null;
    if (!map) {
      setMapLoadDebug(`No rendered map is loaded for ${target}. Load the map first, then request collision data.`);
      return;
    }
    try {
      setMapWarning(`Loading collision grid for ${target} from StardewLocalAPI...`);
      const collision = await fetchLiveCollisionForLocation(target);
      const updated = {
        ...map,
        blockedTiles: new Set(map.blockedTiles ?? []),
        warps: [...(map.warps ?? [])],
        tileDetails: { ...(map.tileDetails ?? {}) },
      };
      applyLiveCollisionData(updated, collision);
      setMaps((current) => ({ ...current, [updated.id]: updated }));
      setActiveMapId(updated.id);
      if (updated.liveCollisionStatus === "loaded") {
        setMapWarning("");
        setMapLoadDebug(`Loaded collision grid for ${updated.id} from StardewLocalAPI.\nCollision source: ${getCollisionSource(updated)}\nBlocked tiles: ${updated.blockedTiles?.size ?? 0}`);
      } else {
        setMapWarning(`${updated.id} is still missing collision/passability data.`);
        setMapLoadDebug(`Path test incomplete.\nStatus: collision_data_missing\nLive map capture: success\nLive collision grid: missing\n\nStardewLocalAPI answered, but did not include blocked or walkable tiles for ${updated.id}. Load TMX/assets or use Manual Asset Upload.`);
      }
    } catch (error) {
      setMapWarning(`Live collision load failed: ${error.message}`);
      setMapLoadDebug(`Path test incomplete.\nStatus: collision_data_missing\nLive map capture: ${map.previewImage ? "success" : "unknown"}\nLive collision grid: missing\n\nTried StardewLocalAPI collision/passability endpoints for ${target}.\nError: ${error.message}\n\nUse TMX/assets for this map or Manual Asset Upload.`);
    }
  }

  function loadTmxAssetsForCurrentMap() {
    const target = activeMap?.id || lastMapLoadRequest.name || scheduleLocation || mapNameInput;
    const matches = findMapCatalogMatches(target, mapCatalog, maps)
      .filter((item) => {
        const mapId = item.mapId || findBestMapForLocation(item.name, maps) || findBestMapForLocation(item.fromFile, maps);
        const map = mapId ? maps[mapId] : null;
        return map && map.sourceFile !== "StardewLocalAPI" && map.liveCollisionStatus !== "visual_only";
      });
    if (matches.length) {
      const mapId = matches[0].mapId || findBestMapForLocation(matches[0].name, maps) || findBestMapForLocation(matches[0].fromFile, maps);
      if (mapId) {
        setActiveMapId(mapId);
        setMapWarning("");
        setMapLoadDebug(`Loaded parsed asset map for ${maps[mapId].id}.\nCollision source: ${getCollisionSource(maps[mapId])}\nFile: ${maps[mapId].sourceFile || "-"}`);
        return;
      }
    }
    setManualLoadMode(true);
    setActiveTab("workspace");
    setMapWarning(`No parsed TMX/TBIN assets are loaded for ${target || "this map"}.`);
    setMapLoadDebug(`Could not find parsed TMX/TBIN assets for ${target || "this map"} in the current workspace cache.\n\nUse Asset Upload or Scan Folder on the Moon Village -git project or Reference mods folder, then retry the path test.`);
  }

  function openManualAssetUpload() {
    setManualLoadMode(true);
    setActiveTab("workspace");
    setMapLoadDebug("Manual Asset Upload is enabled. Upload or scan the Moon Village -git project, Reference mods folder, TMX/TBIN map, PNG tilesheets, or Content Patcher folder, then load the map again.");
  }

  function openMapSetupHelp() {
    const requested = lastMapLoadRequest.name || mapNameInput || "the map";
    setMapLoadDebug([
      "StardewLocalAPI Map Setup Help",
      "",
      "1. Launch Stardew Valley through SMAPI with StardewLocalAPI installed.",
      "2. In this helper, set the Live API URL and token from the SMAPI console.",
      "3. Click Connect in the Live API card.",
      `4. For vanilla maps like ${requested}, enter that location in-game if the API says location_not_ready.`,
      "5. Click Retry Live API Capture or Use Current In-Game Map.",
      "6. For modded TMX maps, use Asset Upload or Scan Folder on MainMoonvillage-git so tile properties and overlays can be parsed from files.",
    ].join("\n"));
  }

  function selectCutscene(cutscene) {
    setActiveCutsceneId(cutscene.uid);
    setSelectedTile(null);
    setActiveMapId("");
    const linked = locationMapLinks[normalizeMapName(cutscene.location)];
    const mapId = linked && maps[linked] ? linked : findBestMapForLocation(cutscene.location, maps);
    if (mapId) {
      setActiveMapId(mapId);
      setLocationMapLinks((current) => ({ ...current, [normalizeMapName(cutscene.location)]: mapId }));
      setMapWarning("");
      return;
    }
    if (apiBaseUrl.trim()) {
      captureLiveMapForLocation(cutscene.location).catch((error) => {
        setMapWarning(`Map capture failed: ${error.message}`);
        setMapLoadDebug(`Could not auto-load ${cutscene.location} for event ${cutscene.id}.\nTried StardewLocalAPI: ${apiBaseUrl}\nError: ${error.message}\n\nUse Map Loader > Load Event Map after connecting Live API, or scan the Moon Village git folder so the TMX map can be loaded from files.`);
      });
    } else {
      setMapWarning(`Could not load map for location: ${cutscene.location}. Please select the map manually.`);
      setMapLoadDebug(`Could not auto-load ${cutscene.location} for event ${cutscene.id}.\nLive API URL is empty.\n\nUse Map Loader > Scan Folder on MainMoonvillage-git, or connect Live API and click Load Event Map.`);
    }
  }

  function selectMapForCurrentLocation(mapId) {
    setActiveMapId(mapId);
    if (activeCutscene?.location) {
      setLocationMapLinks((current) => ({ ...current, [normalizeMapName(activeCutscene.location)]: mapId }));
      setMapWarning("");
    }
  }

  function updateEventLocation(location) {
    updateCutscene({ ...activeCutscene, location });
    setActiveMapId("");
    const linked = locationMapLinks[normalizeMapName(location)];
    const mapId = linked && maps[linked] ? linked : findBestMapForLocation(location, maps);
    if (mapId) {
      setActiveMapId(mapId);
      setMapWarning("");
    } else if (location.trim()) {
      if (apiBaseUrl.trim()) {
        captureLiveMapForLocation(location).catch((error) => {
          setMapWarning(`Map capture failed: ${error.message}`);
          setMapLoadDebug(`Could not auto-load ${location}.\nTried StardewLocalAPI: ${apiBaseUrl}\nError: ${error.message}\n\nScan the mod folder or check the Live API URL/token.`);
        });
      } else {
        setMapWarning(`Could not load map for location: ${location}. Please select the map manually.`);
        setMapLoadDebug(`Could not auto-load ${location}.\nLive API URL is empty.\n\nScan the mod folder or connect Live API.`);
      }
    }
  }

  function buildMusicDropdownOptions(musicResult = {}, cueResult = {}, sourceCutscenes = []) {
    const usage = new Map();
    for (const cutscene of sourceCutscenes) {
      const id = String(cutscene.music || "").trim();
      if (!id || id === "none" || id === "continue") continue;
      usage.set(id, (usage.get(id) ?? 0) + 1);
    }

    const byId = new Map();
    const addOption = (id, description = "", extra = {}) => {
      const value = String(id || "").trim();
      if (!value) return;
      const labelDescription = String(description || "").trim();
      const apiEventCount = Number(extra.usedInEventsCount ?? 0);
      const eventCount = usage.get(value) ?? (Number.isFinite(apiEventCount) ? apiEventCount : 0);
      const existing = byId.get(value);
      byId.set(value, {
        value,
        label: labelDescription ? `${value} — ${labelDescription}` : value,
        eventCount: Math.max(existing?.eventCount ?? 0, eventCount),
      });
    };

    for (const item of musicResult.music ?? []) {
      addOption(item.playId || item.id, item.displayName, item);
      for (const alt of item.alternativeTrackIds ?? []) addOption(alt, item.displayName, item);
    }
    for (const item of cueResult.cues ?? cueResult.items ?? cueResult.music ?? []) {
      addOption(item.id || item.Id || item.name || item.Name, item.displayName || item.DisplayName || item.categoryName || item.CategoryName || item.kind || item.Kind, item);
    }
    for (const [id, count] of usage) {
      addOption(id, "", { usedInEventsCount: count });
    }

    const options = [...byId.values()]
      .sort((a, b) => (b.eventCount - a.eventCount) || a.value.localeCompare(b.value));
    return [
      { value: "none", label: "none" },
      { value: "continue", label: "continue" },
      ...options.filter((option) => option.value !== "none" && option.value !== "continue"),
    ];
  }

  async function refreshMusicOptions(sourceCutscenes = cutscenes) {
    const [music, cues] = await Promise.all([
      apiRequest("/api/v1/music/all").catch(() => ({ music: [] })),
      apiRequest("/api/v1/audio/cues/music").catch(() => ({ cues: [] })),
    ]);
    setMusicOptions(buildMusicDropdownOptions(music, cues, sourceCutscenes));
  }

  function npcToOption(npc) {
    const name = npc.Name ?? npc.name ?? "";
    const displayName = npc.DisplayName ?? npc.displayName ?? name;
    return {
      name,
      displayName,
      hasDialogue: Boolean(npc.HasDialogue ?? npc.hasDialogue),
      canSocialize: Boolean(npc.CanSocialize ?? npc.canSocialize),
      assetName: `Characters/${name}`,
    };
  }

  async function connectLiveApi() {
    try {
      setApiStatus("Connecting...");
      const meta = await apiRequest("/api/v1/meta");
      const [locations, npcs] = await Promise.all([
        apiRequest("/api/v1/world/locations").catch(() => ({ locations: [] })),
        apiRequest("/api/v1/world/npcs").catch(() => ({ npcs: [] })),
      ]);
      setLiveLocations(locations.locations ?? []);
      setLiveNpcs((npcs.npcs ?? []).map(npcToOption).filter((npc) => npc.name));
      await refreshMusicOptions();
      setApiStatus(`Connected: ${meta.player ?? "no save"} at ${meta.location ?? "title"} (${meta.gameVersion ?? "unknown version"})`);
    } catch (error) {
      setApiStatus(`Connection failed: ${error.message}`);
    }
  }

  async function loadLiveEvents() {
    try {
      setApiStatus("Loading live events...");
      const result = await apiRequest("/api/v1/events/all");
      const eventsByLocation = result.eventsByLocation ?? {};
      const imported = [];

      for (const [location, entries] of Object.entries(eventsByLocation)) {
        if (!entries || typeof entries !== "object") continue;
        for (const [eventKey, script] of Object.entries(entries)) {
          if (typeof script !== "string") continue;
          imported.push(parseEventEntry(eventKey, script, location, "StardewLocalAPI", `Data/Events/${location}`));
        }
      }

      if (imported.length === 0) {
        setApiStatus("Connected, but no live events were returned. Load a save and try again.");
        return;
      }

      setCutscenes((current) => {
        const nonLive = current.filter((cutscene) => cutscene.sourceFile !== "StardewLocalAPI");
        return [...nonLive, ...imported];
      });
      setActiveCutsceneId(imported[0].uid);
      setEventSearch("");
      await refreshMusicOptions(imported);
      captureLiveMapForLocation(imported[0].location).catch((error) => {
        setMapWarning(`Map capture failed: ${error.message}`);
      });
      setApiStatus(`Loaded ${imported.length} live events from ${Object.keys(eventsByLocation).length} locations.`);
    } catch (error) {
      setApiStatus(`Load events failed: ${error.message}`);
    }
  }

  async function testCurrentEvent() {
    if (!activeCutscene) return;
    const debug = {
      eventId: activeCutscene.id,
      targetLocation: activeCutscene.location,
      musicId: activeCutscene.music,
      viewport: `${activeCutscene.viewportX} ${activeCutscene.viewportY}`,
      farmer: `${activeCutscene.farmer.x} ${activeCutscene.farmer.y} ${activeCutscene.farmer.facing}`,
      npcs: activeCutscene.actors.map((actor) => `${actor.actor} ${actor.x} ${actor.y} ${actor.facing}`),
      eventExistsInAsset: false,
      eventDataInjected: false,
      wasSeenBeforeReset: false,
      isSeenAfterReset: false,
      warpFinished: false,
      preconditionsBypassed: false,
      enteredEventMode: false,
      endedImmediately: false,
      result: "pending",
    };
    setTestDebug(debug);
    setDebugReport(buildCutsceneDebugReport(activeCutscene, activeMap, selectedMovePreview, validationChecks));

    const blocking = validationChecks.filter((check) => check.level === "error");
    if (blocking.length) {
      setApiStatus(`Test blocked: ${blocking[0].message}`);
      setTestDebug({ ...debug, result: `blocked: ${blocking[0].message}` });
      return;
    }

    try {
      setApiStatus("Testing event in game...");
      const list = await apiRequest(`/api/v1/events/list?location=${encodeURIComponent(activeCutscene.location)}`).catch(() => ({ eventIds: [] }));
      const eventExistsInAsset = (list.eventIds ?? []).some((key) => key.split("/")[0] === activeCutscene.id || key === compileEventKey(activeCutscene));
      const result = await apiRequest("/api/v1/events/run", {
        method: "POST",
        body: {
          eventId: activeCutscene.id,
          location: activeCutscene.location,
          eventData: compileScript(activeCutscene),
          warpToEventLocation: true,
          resetSeen: forceRepeatTest,
          forceRepeatTest,
        },
      });
      const nextDebug = {
        ...debug,
        eventExistsInAsset: Boolean(result.eventFoundInAsset ?? eventExistsInAsset),
        eventDataInjected: Boolean(result.eventDataInjected),
        wasSeenBeforeReset: Boolean(result.eventWasSeen),
        isSeenAfterReset: Boolean(result.eventIsSeenAfterReset),
        warpFinished: Boolean(result.warpFinished),
        preconditionsBypassed: Boolean(result.preconditionsBypassed),
        enteredEventMode: Boolean(result.enteredEventMode),
        endedImmediately: Boolean(result.endedImmediately),
        result: result.enteredEventMode ? "started" : "failed",
      };
      setTestDebug(nextDebug);
      if (!result.enteredEventMode) {
        setApiStatus("Event test failed: player was moved to the location, but the event did not enter active event mode. Check event ID, location, preconditions, and script format.");
        return;
      }
      setApiStatus("Event test started: Stardew entered active event mode.");
    } catch (error) {
      setTestDebug({ ...debug, result: `failed: ${error.message}` });
      setApiStatus(`Test failed: ${error.message}`);
    }
  }

  async function endCurrentEvent() {
    try {
      setApiStatus("Ending current event...");
      await apiRequest("/api/v1/events/end", { method: "POST" });
      setApiStatus("End event request sent.");
    } catch (error) {
      setApiStatus(`End failed: ${error.message}`);
    }
  }

  const filteredCommands = COMMAND_DEFINITIONS.filter((definition) => definition.label.toLowerCase().includes(commandSearch.toLowerCase()) || definition.verb.toLowerCase().includes(commandSearch.toLowerCase()));
  const filteredCutscenes = cutscenes.filter((cutscene) => `${cutscene.name} ${cutscene.id} ${cutscene.location}`.toLowerCase().includes(eventSearch.toLowerCase()));
  const cutscenesForLoadedMap = activeMap
    ? filteredCutscenes.filter((cutscene) => normalizeMapName(cutscene.location) === normalizeMapName(activeMap.id) || normalizeMapName(activeMap.locationNames?.join(" "))?.includes(normalizeMapName(cutscene.location)))
    : filteredCutscenes;
  const eventMapMismatch = activeSection === "event" && activeCutscene && activeMap && normalizeMapName(activeCutscene.location) !== normalizeMapName(activeMap.id) && !(activeMap.locationNames ?? []).some((name) => normalizeMapName(name) === normalizeMapName(activeCutscene.location))
    ? `Event ${activeCutscene.id} belongs to ${activeCutscene.location}, but the loaded map is ${activeMap.id}.`
    : "";
  const filteredMaps = Object.values(maps).filter((map) => map.id.toLowerCase().includes(mapSearch.toLowerCase()));
  const isAnimationPortraitApp = activeToolApp?.id === "animation-portrait-maker";
  const appStatusLine = activeToolApp
    ? activeToolApp.id === "schedule-maker"
      ? `${activeSchedule?.npc || "NPC"} -> Characters/schedules/${activeSchedule?.npc || "NPC"}`
      : activeToolApp.id === "animation-portrait-maker"
        ? `${customPortraitMaker.npcName || portraitWorkflow.npcName || "NPC"} -> Portrait and animation workspace`
        : `${activeCutscene?.id || "Event"} -> Data/Events/${activeCutscene?.location || "Location"}`
    : "Moon Village Tools";

  if (!activeToolApp) {
    return (
      <Launcher
        onOpen={openToolApp}
        pixelLabStatus={customPortraitMaker?.pixelLabStatus ? "PixelLab: ready" : "PixelLab: not connected"}
      />
    );
  }

  if (activeToolApp.id === "animation-portrait-maker") {
    return <AnimationStudioApp onBack={backToLauncher} />;
  }

  if (activeToolApp.id === "cutscene-maker") {
    return (
      <CutsceneMakerApp
        canvasRef={canvasRef}
        cut={{
          activeCutscene, selectedActorKey, setSelectedActorKey, getNpcDisplayName,
          actorSearch, setActorSearch, filteredLiveNpcs, addActor, updateActorByUid, removeActor,
          updateCutscene, updateEventLocation, musicOptions, liveLocations,
          commandSearch, setCommandSearch, filteredCommands, addCommand,
          selectedCommand, selectedCommandId, setSelectedCommandId, updateCommand, moveCommand, removeCommand,
          overlays, setOverlays, zoom, setZoom, fitFullMap, centerMapOnTile, centerOnSelectedNpc, centerOnViewport,
          selectedTile, hoveredTile, activeMap, mapWarning, mapNameInput, setMapNameInput, loadMapByName,
          apiBaseUrl, setApiBaseUrl, apiToken, setApiToken, apiStatus, connectLiveApi, testCurrentEvent, endCurrentEvent,
          forceRepeatTest, setForceRepeatTest, exportFinishedJson, saveDraft: saveCurrentAppDraft, validationChecks,
          onBack: backToLauncher,
          canvasHandlers: {
            onClick: handleCanvasClick,
            onPointerDown: handleCanvasPointerDown,
            onPointerMove: handleCanvasPointerMove,
            onPointerUp: handleCanvasPointerUp,
            onPointerLeave: () => setHoveredTile(null),
            onWheel: handleCanvasWheel,
          },
        }}
      />
    );
  }

  if (activeToolApp.id === "schedule-maker") {
    return (
      <ScheduleMakerApp
        canvasRef={canvasRef}
        sched={{
          activeSchedule, scheduleNpcOptions, scheduleLocationOptions,
          updateSchedule, updateSchedulePoint, addSchedulePoint, removeSchedulePoint, addSchedule, exportScheduleJson,
          selectedSchedulePoint, selectedSchedulePointId, setSelectedSchedulePointId,
          scheduleChecks, schedulePlaybackDebug, customRouteEdges, addCustomRouteEdge,
          testSchedule, playSchedule, pauseSchedule, stopSchedule, restartSchedule, stepSchedule,
          schedulePlayback, setSchedulePlayback, currentPlaybackStep,
          scheduleSpeed, setScheduleSpeed, followScheduleNpc, setFollowScheduleNpc,
          routeMode, setRouteMode, activeMap, mapWarning, mapNameInput, setMapNameInput, loadMapByName,
          zoom, setZoom, fitFullMap, centerOnScheduleStop,
          onBack: backToLauncher,
          canvasHandlers: {
            onClick: handleCanvasClick,
            onPointerDown: handleCanvasPointerDown,
            onPointerMove: handleCanvasPointerMove,
            onPointerUp: handleCanvasPointerUp,
            onPointerLeave: () => setHoveredTile(null),
            onWheel: handleCanvasWheel,
          },
        }}
      />
    );
  }

  return (
    <div
      className={`app ${isDragging ? "is-dragging" : ""} tool-${activeToolApp.id}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <main className={isAnimationPortraitApp ? "stage media-stage" : "stage"}>
        <div className="map-header">
          <div>
            <h1>{activeToolApp.title}</h1>
            <span>{isAnimationPortraitApp ? "Portrait, expression, and animation preview" : activeMap ? activeMap.id : "No Map Loaded"}</span>
          </div>
          {!isAnimationPortraitApp && (
            <div className="map-tools">
              <button type="button" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}>-</button>
              <span>{zoom.toFixed(2)}x</span>
              <button type="button" onClick={() => setZoom((value) => Math.min(2, value + 0.25))}>+</button>
              <button type="button" onClick={fitFullMap}>Fit</button>
              <button type="button" onClick={() => selectedTile && centerMapOnTile(selectedTile)}>Tile</button>
              {activeToolApp.id === "cutscene-maker" && <button type="button" onClick={() => activeCutscene?.farmer && centerMapOnTile(activeCutscene.farmer)}>Player</button>}
              {activeToolApp.id === "cutscene-maker" && <button type="button" onClick={centerOnSelectedNpc}>NPC</button>}
              {activeToolApp.id === "schedule-maker" && <button type="button" onClick={centerOnScheduleStop}>Stop</button>}
              {activeToolApp.id === "cutscene-maker" && <button type="button" onClick={centerOnViewport}>Viewport</button>}
            </div>
          )}
        </div>
        {isAnimationPortraitApp ? (
          <div className="media-preview-grid">
            <div className="media-preview-panel">
              <strong>Base Portrait</strong>
              <PortraitThumb title={customPortraitMaker.npcName || "Base"} entry={customPortraitMaker.basePortrait.image ? customPortraitMaker.basePortrait : portraitWorkflow.baseImage} />
            </div>
            <div className="media-preview-panel">
              <strong>Selected Expression</strong>
              <PortraitThumb title={customPortraitMaker.selectedExpression} entry={customPortraitMaker.expressions[customPortraitMaker.selectedExpression] ?? portraitWorkflow.expressions[portraitWorkflow.selectedExpression]} />
            </div>
            <div className="media-preview-panel wide">
              <strong>Animation Preview</strong>
              <AnimationPreview image={animationSpriteSheet.image} frames={activeAnimation.frames} speed={activeAnimation.speed} />
            </div>
            <div className="media-preview-panel wide">
              <strong>Portrait Sheet</strong>
              <PortraitSheetPreview image={animationPortraitSheet.image} />
            </div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className={`map-canvas ${isPanningMap ? "panning" : ""}`}
            onClick={handleCanvasClick}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerUp}
            onPointerLeave={() => setHoveredTile(null)}
            onWheel={handleCanvasWheel}
          />
        )}
        <div className="status-strip">
          <span>{hoveredTile ? `Hover: ${hoveredTile.mapId} (${hoveredTile.x}, ${hoveredTile.y})` : selectedTile ? `${selectedTile.mapId} (${selectedTile.x}, ${selectedTile.y})` : "Tile: -"}</span>
          <span>{appStatusLine}</span>
          <span>{activeMap ? `${activeMap.warps?.length ?? 0} warps / ${activeMap.blockedTiles?.size ?? 0} blocked tiles` : "No overlay data"}</span>
          {(mapWarning || pathWarning || eventMapMismatch) && <span className="warning-text">{mapWarning || pathWarning || eventMapMismatch}</span>}
        </div>
      </main>

      <aside className="sidebar">
        <nav className="tool-nav" aria-label="Tool navigation">
          <button type="button" onClick={backToLauncher}>Back to launcher</button>
          {toolApps.map((app) => (
            <button key={app.id} type="button" className={activeToolApp.id === app.id ? "active" : ""} onClick={() => openToolApp(app)}>
              {app.shortTitle}
            </button>
          ))}
        </nav>
        {visibleSections.length > 1 && (
          <nav className="main-tabs">
            {visibleSections.map((section) => (
              <button key={section.id} type="button" className={activeSection === section.id ? "active" : ""} onClick={() => activateMainSection(section.id)}>
                {section.label}
              </button>
            ))}
          </nav>
        )}
        <div className="app-action-bar">
          <button type="button" onClick={saveCurrentAppDraft}>Save</button>
          <button type="button" onClick={loadCurrentAppAssets}>Load</button>
          <button type="button" onClick={exportCurrentAppData}>Export</button>
          <button type="button" onClick={validateCurrentAppData}>Validate</button>
        </div>
        <nav className="tabs sub-tabs">
          {currentSectionTabs.map((tab) => (
            <button key={`${activeSection}-${tab.id}`} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => activateSectionTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="panel">
          {!isAnimationPortraitApp && (
          <div className="stack debug-stack">
              <div className="card">
                <div className="card-title">
                  <strong>Map Debug</strong>
                  <button type="button" onClick={() => setOverlays(DEFAULT_OVERLAYS)}>Reset</button>
                </div>
                <label className="check"><input type="checkbox" checked={compareScheduleHelperMode} onChange={(event) => setCompareScheduleHelperMode(event.target.checked)} /> Compare With StardewScheduleHelper Behavior</label>
                <div className="overlay-grid">
                {[
                  ["grid", "Show grid"],
                  ["walkable", "Show walkable tiles"],
                  ["blocked", "Show blocked tiles"],
                  ["npcPaths", "Show NPC paths"],
                  ["playerPath", "Show player path"],
                  ["warpTiles", "Show warp tiles"],
                  ["doorTiles", "Show door tiles"],
                  ["actions", "Show actions"],
                  ["viewport", "Show event camera/viewport"],
                  ["scheduleStops", "Show schedule stops"],
                  ["coordinates", "Show tile coordinates"],
                  ["cpSource", "Show Content Patcher source"],
                ].map(([key, label]) => (
                  <label key={key} className="check">
                    <input type="checkbox" checked={Boolean(overlays[key])} onChange={(event) => setOverlays((current) => ({ ...current, [key]: event.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>
              <div className="debug-panel">
                <div><strong>Current loaded map</strong><span>{activeMap?.id ?? "-"}</span></div>
                <div><strong>Map file path</strong><span>{activeMap?.sourceFile ?? "-"}</span></div>
                <div><strong>Location name</strong><span>{activeSection === "schedule" ? (scheduleLocation || "-") : (activeCutscene?.location ?? "-")}</span></div>
                <div><strong>Content Patcher source</strong><span>{activeMap?.contentPatcherSources?.join("; ") || "-"}</span></div>
                <div><strong>Blocking layers</strong><span>{activeMap?.blockingLayerNames?.join(", ") || "-"}</span></div>
                <div><strong>Collision source</strong><span>{getCollisionSource(activeMap)}</span></div>
                <div><strong>Collision status</strong><span>{activeMap?.liveCollisionStatus ?? (activeMap ? "parsed map grid" : "-")}</span></div>
                <div><strong>Map render source</strong><span>{getMapRenderSource(activeMap)}</span></div>
                <div><strong>Pathing mode</strong><span>{compareScheduleHelperMode ? "StardewScheduleHelper-style strict grid" : "Standard overlay grid"}</span></div>
              </div>
            </div>

            <div className="card">
              <strong>Tile / Command Inspector</strong>
              <div className="debug-panel">
                <div><strong>Hover Tile</strong><span>{hoveredTileDebug ? `${hoveredTileDebug.x}, ${hoveredTileDebug.y}` : "-"}</span></div>
                <div><strong>Hover Walkable</strong><span>{hoveredTileDebug?.walkable ?? "-"}</span></div>
                <div><strong>Hover Reasons</strong><span>{hoveredTileDebug?.reasons ?? "-"}</span></div>
                <div><strong>X</strong><span>{selectedTileDebug?.x ?? "-"}</span></div>
                <div><strong>Y</strong><span>{selectedTileDebug?.y ?? "-"}</span></div>
                <div><strong>Layer</strong><span>{selectedTileDebug?.layer ?? "-"}</span></div>
                <div><strong>Properties</strong><span>{selectedTileDebug?.properties ?? "-"}</span></div>
                <div><strong>Blocked</strong><span>{selectedTileDebug?.blocked ?? "-"}</span></div>
                <div><strong>Walkable</strong><span>{selectedTileDebug?.walkable ?? "-"}</span></div>
                <div><strong>Reasons</strong><span>{selectedTileDebug?.reasons ?? "-"}</span></div>
                <div><strong>Warp</strong><span>{selectedTileDebug?.warp ?? "-"}</span></div>
                <div><strong>Door</strong><span>{selectedTileDebug?.door ?? "-"}</span></div>
                <div><strong>Action</strong><span>{selectedTileDebug?.action ?? "-"}</span></div>
                <div><strong>Source</strong><span>{selectedTileDebug?.source ?? "-"}</span></div>
                <div><strong>Command</strong><span>{commandInspector?.command ?? "-"}</span></div>
                <div><strong>Command status</strong><span>{commandInspector?.status ?? "-"}</span></div>
                <div><strong>Affects</strong><span>{commandInspector?.affects ?? "-"}</span></div>
              </div>
              <div className="mini-actions">
                {activeToolApp.id === "cutscene-maker" && <button type="button" onClick={() => setDebugReport(buildCutsceneDebugReport(activeCutscene, activeMap, selectedMovePreview, validationChecks))}>Event Report</button>}
                {activeToolApp.id === "schedule-maker" && <button type="button" onClick={() => setDebugReport(buildScheduleDebugReport(activeSchedule, schedulePlayback, scheduleChecks, maps))}>Schedule Report</button>}
              </div>
              {debugReport && <textarea className="report-box" readOnly value={debugReport} rows={8} />}
            </div>
          </div>
          )}

          {activeTab === "workspace" && (
            <div className="stack">
              <div className="drop-zone">
                <strong>Asset Upload</strong>
                <label className="check"><input type="checkbox" checked={manualLoadMode} onChange={(event) => setManualLoadMode(event.target.checked)} /> Manual Load Mode</label>
                <input type="file" multiple onChange={(event) => handleFiles(event.target.files)} />
                <input type="file" multiple webkitdirectory="" directory="" onChange={(event) => handleFiles(event.target.files)} />
                <button type="button" onClick={scanDirectoryWithPicker}>Scan Folder</button>
                {manualLoadMode && <div className="api-status">Manual Load Mode: load TMX/TBIN map files, PNG tilesheets, Content Patcher folders, Reference mod folders, or the Moon Village git folder.</div>}
              </div>

              <div className="card">
                <div className="card-title">
                  <strong>Map Loader</strong>
                  <div className="mini-actions">
                    <button type="button" onClick={() => loadMapByName()}>Load Map</button>
                    <button type="button" onClick={() => loadMapByName(mapNameInput, true)}>Reload</button>
                    {activeSection === "event" && <button type="button" onClick={retryLiveApiCapture}>Retry Live API Capture</button>}
                    {activeSection === "event" && <button type="button" onClick={useCurrentInGameMap}>Use Current In-Game Map</button>}
                    {activeSection === "event" && <button type="button" onClick={loadCollisionFromLiveApi}>Load Collision From Live API</button>}
                    <button type="button" onClick={loadTmxAssetsForCurrentMap}>Load TMX/TBIN Assets</button>
                    <button type="button" onClick={activeSection === "event" ? openMapSetupHelp : openManualAssetUpload}>Open Setup Help</button>
                    {activeSection === "event" && activeCutscene?.location && <button type="button" onClick={() => {
                      setMapNameInput(activeCutscene.location);
                      loadMapByName(activeCutscene.location);
                    }}>Load Event Map</button>}
                  </div>
                </div>
                <div className="grid two">
                  <label>Map Source
                    <select value={mapSource} onChange={(event) => setMapSource(event.target.value)}>
                      <option value="All">All</option>
                      <option value="Vanilla">Vanilla</option>
                      <option value="Current Moon Village mod">Current Moon Village mod</option>
                      <option value="Reference mods">Reference mods</option>
                      <option value="Custom path">Custom path</option>
                    </select>
                  </label>
                  <label>Map Name
                    <input list="map-catalog-names" value={mapNameInput} onChange={(event) => setMapNameInput(event.target.value)} placeholder="Custom_Moonvillage or AdventureGuild" />
                  </label>
                  <label className="wide">Map File Path
                    <input value={mapPathInput} onChange={(event) => setMapPathInput(event.target.value)} placeholder="assets/Maps/CustomMoonvillage.tmx" />
                  </label>
                </div>
                <datalist id="map-catalog-names">
                  {mapCatalog.map((item) => <option key={`${item.name}-${item.fromFile}`} value={item.name} />)}
                </datalist>
                <div className="map-catalog-list">
                  {filteredMapCatalog.length === 0 && <div className="empty">No maps discovered yet. Upload the Moon Village git folder or Reference mods folder to scan Content Patcher maps.</div>}
                  {filteredMapCatalog.map((item) => (
                    <button key={`${item.name}-${item.fromFile}`} type="button" className="row" onClick={() => {
                      setMapNameInput(item.name || "");
                      setMapPathInput(item.fromFile || "");
                      const mapId = item.mapId || findBestMapForLocation(item.name, maps) || findBestMapForLocation(item.fromFile, maps);
                      if (mapId) {
                        setActiveMapId(mapId);
                        setMapLoadDebug(`Loaded ${maps[mapId].id} from catalog.\nTarget: ${item.target || "-"}\nFromFile: ${item.fromFile || maps[mapId].sourceFile || "-"}\nPatch: ${item.patches?.join("; ") || item.patch || "-"}`);
                      }
                    }}>
                      <span>{item.name}</span>
                      <small>{item.sourceMod || item.sourceKind || "-"} | {item.fromFile || item.target || "-"}</small>
                    </button>
                  ))}
                </div>
                {mapLoadDebug && <textarea className="report-box" readOnly value={mapLoadDebug} rows={7} />}
              </div>

              {activeSection === "event" && (
                <div className="card">
                  <div className="card-title">
                    <strong>Events</strong>
                    <button type="button" onClick={() => {
                      const next = blankCutscene();
                      setCutscenes((current) => [...current, next]);
                      setActiveCutsceneId(next.uid);
                    }}>New</button>
                  </div>
                  <input value={eventSearch} onChange={(event) => setEventSearch(event.target.value)} placeholder="Search events..." />
                  <div className="list">
                    {activeMap && cutscenesForLoadedMap.length !== filteredCutscenes.length && (
                      <div className="api-status">{cutscenesForLoadedMap.length} event(s) match loaded map {activeMap.id}. Clear the loaded map or search to see all events.</div>
                    )}
                    {(activeMap && cutscenesForLoadedMap.length ? cutscenesForLoadedMap : filteredCutscenes).map((cutscene) => (
                      <button key={cutscene.uid} type="button" className={cutscene.uid === activeCutscene.uid ? "row active" : "row"} onClick={() => selectCutscene(cutscene)}>
                        <span>{cutscene.name || cutscene.id}</span>
                        <small>{cutscene.location}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="card">
                <strong>Loaded Maps</strong>
                <input value={mapSearch} onChange={(event) => setMapSearch(event.target.value)} placeholder="Search maps..." />
                <div className="list compact">
                  {filteredMaps.length === 0 && <div className="empty">No maps loaded.</div>}
                  {filteredMaps.map((map) => (
                    <button key={map.id} type="button" className={map.id === effectiveActiveMapId ? "row active" : "row"} onClick={() => selectMapForCurrentLocation(map.id)}>
                      <span>{map.id}</span>
                      <small>{map.width} x {map.height}</small>
                    </button>
                  ))}
                </div>
              </div>

              {activeSection === "event" && (
                <div className="card">
                  <div className="card-title">
                    <strong>Live API</strong>
                    <div className="mini-actions">
                      <button type="button" onClick={connectLiveApi}>Connect</button>
                      <button type="button" onClick={loadLiveEvents}>Load Events</button>
                    </div>
                  </div>
                  <label>URL<input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} /></label>
                  <label>Token<input value={apiToken} onChange={(event) => setApiToken(event.target.value)} placeholder="From SMAPI console, if configured" /></label>
                  <div className="api-status">{apiStatus}</div>
                  <div className="api-counts">
                    <span>{liveLocations.length} locations</span>
                    <span>{liveNpcs.length} NPCs</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "actors" && activeCutscene && (
            <div className="stack">
              <div className="card">
                <div className="card-title">
                  <strong>Character Picker</strong>
                  <button type="button" onClick={connectLiveApi}>Refresh</button>
                </div>
                <input value={actorSearch} onChange={(event) => setActorSearch(event.target.value)} placeholder="Search characters..." />
                <div className="character-picker">
                  {filteredLiveNpcs.length === 0 && (
                    <div className="empty">Connect to Live API to load vanilla and modded characters.</div>
                  )}
                  {filteredLiveNpcs.map((npc) => (
                    <button key={npc.name} type="button" className="character-choice" onClick={() => addActor(npc)}>
                      <span>{npc.displayName}</span>
                      <small>{npc.name}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <strong>Placed Actors</strong>
                <div className="placed-actors">
                  <ActorEditor
                    actor={activeCutscene.farmer}
                    displayName="Farmer"
                    selected={selectedActorKey === "farmer"}
                    onSelect={() => setSelectedActorKey("farmer")}
                    onChange={(patch) => updateActorByUid("farmer", patch)}
                  />
                  {activeCutscene.actors.map((actor) => (
                    <ActorEditor
                      key={actor.uid}
                      actor={actor}
                      displayName={getNpcDisplayName(actor.actor)}
                      selected={selectedActorKey === actor.uid}
                      onSelect={() => setSelectedActorKey(actor.uid)}
                      onChange={(patch) => updateActorByUid(actor.uid, patch)}
                      onRemove={() => removeActor(actor.uid)}
                    />
                  ))}
                </div>
              </div>

              <div className="card">
                <strong>Placement</strong>
                <div className="api-status">
                  Select an actor, then click a tile on the map to place or move that marker. Clicking an existing marker selects it.
                </div>
              </div>
            </div>
          )}

          {activeTab === "timeline" && activeCutscene && (
            <div className="stack">
              <div className="card">
                <div className="grid two">
                  <label>Event Name<input value={activeCutscene.name} onChange={(event) => updateCutscene({ ...activeCutscene, name: event.target.value })} /></label>
                  <label>Event ID<input value={activeCutscene.id} onChange={(event) => updateCutscene({ ...activeCutscene, id: event.target.value })} /></label>
                  <label>Location<input list="live-locations" value={activeCutscene.location} onChange={(event) => updateEventLocation(event.target.value)} /></label>
                  <label>Music
                    <select value={activeCutscene.music} onChange={(event) => updateCutscene({ ...activeCutscene, music: event.target.value })}>
                      {!musicOptions.some((option) => option.value === activeCutscene.music) && activeCutscene.music && (
                        <option value={activeCutscene.music}>{activeCutscene.music}</option>
                      )}
                      {musicOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label>Viewport X<input type="number" value={activeCutscene.viewportX} disabled={!activeCutscene.customViewport} onChange={(event) => updateCutscene({ ...activeCutscene, viewportX: Number(event.target.value), customViewport: true })} /></label>
                  <label>Viewport Y<input type="number" value={activeCutscene.viewportY} disabled={!activeCutscene.customViewport} onChange={(event) => updateCutscene({ ...activeCutscene, viewportY: Number(event.target.value), customViewport: true })} /></label>
                  <label>Farmer X<input type="number" value={activeCutscene.farmer.x} onChange={(event) => updateCutscene((cutscene) => applyFarmerPatch(cutscene, { x: Number(event.target.value) }))} /></label>
                  <label>Farmer Y<input type="number" value={activeCutscene.farmer.y} onChange={(event) => updateCutscene((cutscene) => applyFarmerPatch(cutscene, { y: Number(event.target.value) }))} /></label>
                </div>
                <label className="check"><input type="checkbox" checked={activeCutscene.customViewport} onChange={(event) => updateCutscene((cutscene) => {
                  const customViewport = event.target.checked;
                  return {
                    ...cutscene,
                    customViewport,
                    viewportX: customViewport ? cutscene.viewportX : cutscene.farmer.x,
                    viewportY: customViewport ? cutscene.viewportY : cutscene.farmer.y,
                  };
                })} /> Custom viewport</label>
                <label className="check"><input type="checkbox" checked={activeCutscene.skippable} onChange={(event) => updateCutscene({ ...activeCutscene, skippable: event.target.checked })} /> Skippable</label>
                <label>Premise<textarea value={activeCutscene.premise} onChange={(event) => updateCutscene({ ...activeCutscene, premise: event.target.value })} /></label>
                <label>Preconditions<textarea value={activeCutscene.preconditions.join("\n")} onChange={(event) => updateCutscene({ ...activeCutscene, preconditions: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })} /></label>
                <label>Testing Notes<textarea value={activeCutscene.testingNotes} onChange={(event) => updateCutscene({ ...activeCutscene, testingNotes: event.target.value })} /></label>
              </div>

              <div className="card">
                <div className="card-title">
                  <strong>Actors</strong>
                  <button type="button" onClick={addActor}>Add</button>
                </div>
                <datalist id="live-locations">
                  {liveLocations.map((location) => <option key={location} value={location} />)}
                </datalist>
                <datalist id="live-npcs">
                  {liveNpcs.map((npc) => <option key={npc.name} value={npc.name}>{npc.displayName}</option>)}
                </datalist>
                <div className="actor-row">
                  <input value="farmer" disabled />
                  <input type="number" value={activeCutscene.farmer.x} onChange={(event) => updateCutscene((cutscene) => applyFarmerPatch(cutscene, { x: Number(event.target.value) }))} />
                  <input type="number" value={activeCutscene.farmer.y} onChange={(event) => updateCutscene((cutscene) => applyFarmerPatch(cutscene, { y: Number(event.target.value) }))} />
                  <select value={activeCutscene.farmer.facing} onChange={(event) => updateCutscene((cutscene) => applyFarmerPatch(cutscene, { facing: Number(event.target.value) }))}>
                    {DIRECTIONS.map((direction, index) => <option key={direction} value={index}>{direction}</option>)}
                  </select>
                </div>
                {activeCutscene.actors.map((actor, index) => (
                  <div className="actor-row" key={`${actor.actor}-${index}`}>
                    <input list="live-npcs" value={actor.actor} onChange={(event) => updateActor(index, { actor: event.target.value })} />
                    <input type="number" value={actor.x} onChange={(event) => updateActor(index, { x: Number(event.target.value) })} />
                    <input type="number" value={actor.y} onChange={(event) => updateActor(index, { y: Number(event.target.value) })} />
                    <select value={actor.facing} onChange={(event) => updateActor(index, { facing: Number(event.target.value) })}>
                      {DIRECTIONS.map((direction, directionIndex) => <option key={direction} value={directionIndex}>{direction}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="card">
                <strong>Add Command</strong>
                <input value={commandSearch} onChange={(event) => setCommandSearch(event.target.value)} placeholder="Search commands..." />
                <div className="command-grid">
                  {filteredCommands.map((definition) => (
                    <button key={definition.verb} type="button" onClick={() => addCommand(definition.verb)}>{definition.label}</button>
                  ))}
                </div>
              </div>

              {selectedCommand && (
                <div className="card accent-card">
                  <div className="card-title">
                    <strong>{selectedCommand.label}</strong>
                    <div className="mini-actions">
                      <button type="button" onClick={() => moveCommand(selectedCommand.id, -1)}>Up</button>
                      <button type="button" onClick={() => moveCommand(selectedCommand.id, 1)}>Down</button>
                      <button type="button" onClick={() => removeCommand(selectedCommand.id)}>Delete</button>
                    </div>
                  </div>
                  {selectedCommand.verb === "raw" ? (
                    <label>Raw<textarea value={selectedCommand.values.raw} onChange={(event) => updateCommand(selectedCommand.id, (command) => ({ ...command, values: { raw: event.target.value } }))} /></label>
                  ) : (
                    <CommandFields command={selectedCommand} actors={[activeCutscene.farmer, ...activeCutscene.actors]} onChange={(values) => updateCommand(selectedCommand.id, (command) => ({ ...command, values }))} />
                  )}
                  <code className="compiled-line">{compileCommand(selectedCommand)}</code>
                </div>
              )}
            </div>
          )}

          {activeTab === "schedule" && activeSchedule && (
            <div className="stack">
              <div className="card">
                <div className="card-title">
                  <strong>Schedule</strong>
                  <div className="mini-actions">
                    <button type="button" onClick={() => addSchedule()}>New</button>
                    <button type="button" onClick={exportScheduleJson}>Export JSON</button>
                  </div>
                </div>
                <div className="grid two">
                  <label>NPC ID
                    <input list="schedule-npcs" value={activeSchedule.npc} onChange={(event) => updateSchedule({ npc: event.target.value })} placeholder="Moonvillage_Annette" />
                  </label>
                  <label>Entry Key
                    <input list="schedule-keys" value={activeSchedule.key} onChange={(event) => updateSchedule({ key: event.target.value })} />
                  </label>
                </div>
                <datalist id="schedule-npcs">
                  {scheduleNpcOptions.map((npc) => <option key={npc.name} value={npc.name}>{npc.displayName}{npc.source ? ` - ${npc.source}` : ""}</option>)}
                </datalist>
                <datalist id="schedule-keys">
                  {SCHEDULE_KEYS.map((key) => <option key={key} value={key} />)}
                </datalist>
                <div className="api-status">Schedule testing uses manually loaded map assets. Scan or upload the map, tilesheets, and Content Patcher files before running path playback.</div>
              </div>

              <div className="card">
                <div className="card-title">
                  <strong>Schedule Test</strong>
                  <button type="button" onClick={testSchedule}>Test Schedule</button>
                </div>
                <div className="playback-controls">
                  <button type="button" onClick={playSchedule}>Play</button>
                  <button type="button" onClick={pauseSchedule}>Pause</button>
                  <button type="button" onClick={stopSchedule}>Stop</button>
                  <button type="button" onClick={restartSchedule}>Restart</button>
                  <button type="button" onClick={() => stepSchedule(-1)}>Step Back</button>
                  <button type="button" onClick={() => stepSchedule(1)}>Step Forward</button>
                </div>
                {(activeMap?.liveCollisionStatus === "visual_only" || schedulePlayback.status === "collision_data_missing") && (
                  <div className="mini-actions">
                    <button type="button" onClick={loadTmxAssetsForCurrentMap}>Load TMX/TBIN Assets For This Map</button>
                    <button type="button" onClick={openManualAssetUpload}>Use Manual Asset Upload</button>
                    <button type="button" onClick={scanDirectoryWithPicker}>Scan Folder</button>
                    <button type="button" onClick={testSchedule}>Retry Path Test</button>
                  </div>
                )}
                <div className="grid two">
                  <label>Route Mode
                    <select value={routeMode} onChange={(event) => setRouteMode(event.target.value)}>
                      <option value="legal">Stardew legal path</option>
                      <option value="scripted">Scripted event movement</option>
                      <option value="closest">Closest visual route debug only</option>
                    </select>
                  </label>
                  <label>Speed
                    <select value={scheduleSpeed} onChange={(event) => setScheduleSpeed(event.target.value)}>
                      {["0.25", "0.5", "1", "2", "4", "8"].map((speed) => <option key={speed} value={speed}>{speed}x</option>)}
                    </select>
                  </label>
                  <label>Custom Speed<input type="number" min="0.05" step="0.05" value={customScheduleSpeed} onChange={(event) => setCustomScheduleSpeed(event.target.value)} placeholder="optional" /></label>
                </div>
                <label className="check"><input type="checkbox" checked={followScheduleNpc} onChange={(event) => setFollowScheduleNpc(event.target.checked)} /> Follow NPC during test</label>
                {!followScheduleNpc && (
                  <div className="pan-controls">
                    <button type="button" onClick={() => setSchedulePan((pan) => ({ ...pan, y: pan.y + 96 }))}>Up</button>
                    <button type="button" onClick={() => setSchedulePan((pan) => ({ ...pan, x: pan.x + 96 }))}>Left</button>
                    <button type="button" onClick={() => setSchedulePan({ x: 0, y: 0 })}>Center</button>
                    <button type="button" onClick={() => setSchedulePan((pan) => ({ ...pan, x: pan.x - 96 }))}>Right</button>
                    <button type="button" onClick={() => setSchedulePan((pan) => ({ ...pan, y: pan.y - 96 }))}>Down</button>
                  </div>
                )}
                <div className="api-status">
                  {routeMode === "closest" ? "Closest visual route is debug-only and is not used for schedule validation. " : ""}
                  {schedulePlayback.error || `${schedulePlayback.status} - step ${schedulePlayback.route.length ? schedulePlayback.index + 1 : 0}/${schedulePlayback.route.length}`}
                </div>
                <div className="debug-panel">
                  <div><strong>NPC</strong><span>{schedulePlaybackDebug.npc}</span></div>
                  <div><strong>Schedule Key</strong><span>{schedulePlaybackDebug.key}</span></div>
                  <div><strong>Time Block</strong><span>{schedulePlaybackDebug.timeBlock}</span></div>
                  <div><strong>Current Map</strong><span>{schedulePlaybackDebug.map}</span></div>
                  <div><strong>Current X/Y</strong><span>{schedulePlaybackDebug.position}</span></div>
                  <div><strong>Facing</strong><span>{schedulePlaybackDebug.facing}</span></div>
                  <div><strong>Target X/Y</strong><span>{schedulePlaybackDebug.target}</span></div>
                  <div><strong>Speed</strong><span>{schedulePlaybackDebug.speed}</span></div>
                  <div><strong>Route Mode</strong><span>{schedulePlaybackDebug.routeMode}</span></div>
                  <div><strong>Collision Source</strong><span>{schedulePlaybackDebug.collisionSource}</span></div>
                  <div><strong>Map Render Source</strong><span>{schedulePlaybackDebug.mapRenderSource}</span></div>
                  <div><strong>Command</strong><span>{schedulePlaybackDebug.command}</span></div>
                  <div><strong>Path Status</strong><span>{schedulePlaybackDebug.status}</span></div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">
                  <strong>World Route Graph</strong>
                  <div className="mini-actions">
                    <button type="button" onClick={addCustomRouteEdge}>Add Edge</button>
                    <button type="button" onClick={exportCustomRouteEdges}>Export Edges</button>
                  </div>
                </div>
                <div className="api-status">Inspired by World Navigator: schedule testing now builds a transition graph from loaded warps, fallback vanilla edges, and your custom Moon Village edges.</div>
                <div className="debug-panel">
                  <div><strong>Loaded edges</strong><span>{buildWorldRouteGraph(maps, customRouteEdges).edges.length}</span></div>
                  <div><strong>Custom edges</strong><span>{customRouteEdges.length}</span></div>
                  <div><strong>Current route</strong><span>{activeSchedule?.points?.length ? activeSchedule.points.map((point) => point.location).join(" -> ") : "-"}</span></div>
                </div>
                <div className="route-edge-list">
                  {customRouteEdges.map((edge) => (
                    <div key={edge.id} className="route-edge-card">
                      <label className="check"><input type="checkbox" checked={edge.enabled !== false} onChange={(event) => updateCustomRouteEdge(edge.id, { enabled: event.target.checked })} /> enabled</label>
                      <div className="grid two">
                        <label>From Location<input list="schedule-locations" value={edge.fromLocation} onChange={(event) => updateCustomRouteEdge(edge.id, { fromLocation: event.target.value })} /></label>
                        <label>To Location<input list="schedule-locations" value={edge.toLocation} onChange={(event) => updateCustomRouteEdge(edge.id, { toLocation: event.target.value })} /></label>
                        <label>From X<input type="number" value={edge.fromX} onChange={(event) => updateCustomRouteEdge(edge.id, { fromX: Number(event.target.value) })} /></label>
                        <label>From Y<input type="number" value={edge.fromY} onChange={(event) => updateCustomRouteEdge(edge.id, { fromY: Number(event.target.value) })} /></label>
                        <label>To X<input type="number" value={edge.toX} onChange={(event) => updateCustomRouteEdge(edge.id, { toX: Number(event.target.value) })} /></label>
                        <label>To Y<input type="number" value={edge.toY} onChange={(event) => updateCustomRouteEdge(edge.id, { toY: Number(event.target.value) })} /></label>
                        <label>Travel Type<input value={edge.travelType} onChange={(event) => updateCustomRouteEdge(edge.id, { travelType: event.target.value })} placeholder="door, bus, portal..." /></label>
                        <label>Open / Close<input value={`${edge.openTime ?? "600"}-${edge.closeTime ?? "2600"}`} onChange={(event) => {
                          const [openTime, closeTime] = event.target.value.split("-");
                          updateCustomRouteEdge(edge.id, { openTime: openTime ?? "", closeTime: closeTime ?? "" });
                        }} /></label>
                      </div>
                      <div className="mini-actions">
                        <button type="button" onClick={() => removeCustomRouteEdge(edge.id)}>Remove</button>
                      </div>
                    </div>
                  ))}
                  {!customRouteEdges.length && <div className="empty compact-empty">No custom route edges yet. Add one when a Moon Village door or custom travel action is missing from the loaded map data.</div>}
                </div>
              </div>

              <div className="card">
                <div className="card-title">
                  <strong>Stops</strong>
                  <button type="button" onClick={addSchedulePoint}>Add Stop</button>
                </div>
                <div className="schedule-points">
                  {activeSchedule.points.map((point) => (
                    <div key={point.uid} className={selectedSchedulePoint?.uid === point.uid ? "schedule-point selected" : "schedule-point"}>
                      <button type="button" className="schedule-select" onClick={() => {
                        setSelectedSchedulePointId(point.uid);
                        setMapNameInput(point.location || "");
                        const mapId = findBestMapForLocation(point.location, maps);
                        if (mapId) {
                          setActiveMapId(mapId);
                          setMapWarning("");
                        } else if (point.location) {
                          setMapWarning(`${activeSchedule.npc} schedule uses ${point.location}, but that map could not be loaded. Check content.json map target and file path.`);
                        }
                      }}>
                        <span>{`${point.time || "time"} -> ${point.location || "location"}`}</span>
                        <small>{point.x}, {point.y}, {DIRECTIONS[Number(point.facing)] ?? point.facing}</small>
                      </button>
                      <div className="schedule-grid">
                        <label>Time<input value={point.time} onChange={(event) => updateSchedulePoint(point.uid, { time: event.target.value })} /></label>
                        <label>Location<input list="schedule-locations" value={point.location} onChange={(event) => updateSchedulePoint(point.uid, { location: event.target.value })} /></label>
                        <label>X<input type="number" value={point.x} onChange={(event) => updateSchedulePoint(point.uid, { x: Number(event.target.value) })} /></label>
                        <label>Y<input type="number" value={point.y} onChange={(event) => updateSchedulePoint(point.uid, { y: Number(event.target.value) })} /></label>
                        <label>Facing
                          <select value={point.facing} onChange={(event) => updateSchedulePoint(point.uid, { facing: Number(event.target.value) })}>
                            {DIRECTIONS.map((direction, index) => <option key={direction} value={index}>{direction}</option>)}
                          </select>
                        </label>
                        <label>Animation
                          <input list="schedule-animations" value={point.animation} onChange={(event) => updateSchedulePoint(point.uid, { animation: event.target.value })} />
                        </label>
                        <label className="wide">Dialogue / extra token<input value={point.dialogue} onChange={(event) => updateSchedulePoint(point.uid, { dialogue: event.target.value })} placeholder="optional dialogue key or text" /></label>
                      </div>
                      <div className="mini-actions">
                        <button type="button" onClick={() => {
                          setSelectedSchedulePointId(point.uid);
                          setMapNameInput(point.location || "");
                          loadMapByName(point.location);
                        }}>Show Map</button>
                        <button type="button" onClick={() => removeSchedulePoint(point.uid)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
                <datalist id="schedule-animations">
                  {SCHEDULE_ANIMATIONS.map((animation) => <option key={animation || "none"} value={animation} />)}
                </datalist>
                <datalist id="schedule-locations">
                  {scheduleLocationOptions.map((location) => <option key={location} value={location} />)}
                </datalist>
              </div>

              <div className="card">
                <strong>Checks</strong>
                <div className="checks">
                  {scheduleChecks.map((check, index) => (
                    <div key={`${check.level}-${index}`} className={`check-line ${check.level}`}>
                      <span>{check.level}</span>
                      <p>{check.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              <ExportBox title="Schedule Entry" value={`${JSON.stringify(activeSchedule.key)}: ${JSON.stringify(compileSchedule(activeSchedule))}`} onCopy={copyText} rows={4} />
              <ExportBox title="Content Patcher Schedule EditData" value={buildSchedulePatch(activeSchedule)} onCopy={copyText} rows={12} />
            </div>
          )}

          {activeTab === "animation" && (
            <div className="stack">
              <div className="card portrait-workflow">
                <div className="card-title">
                  <strong>Custom Portrait Maker</strong>
                  <div className="mini-actions">
                    <button type="button" onClick={() => sendCustomPortraitPrompt("base")}>Generate from References</button>
                    <button type="button" onClick={exportCustomPortraitSheet}>Export & Validate</button>
                  </div>
                </div>
                <div className="workflow-steps">
                  {["Step 1: Load References", "Step 2: Generate Base Portrait", "Step 3: Generate Portrait Parts", "Step 4: Build Expressions", "Step 5: Combine in Godly Hand", "Step 6: Export & Validate"].map((step) => (
                    <span key={step}>{step}</span>
                  ))}
                </div>
                <div className="portrait-maker-layout">
                  <div className="portrait-maker-column">
                    <strong>Controls</strong>
                    <label>NPC name<input list="portrait-npcs" value={customPortraitMaker.npcName} onChange={(event) => updateCustomPortraitNpc(event.target.value)} /></label>
                    <label>Reference folder<input value={customPortraitMaker.referenceFolder} onChange={(event) => updateCustomPortraitMaker({ referenceFolder: event.target.value })} /></label>
                    <label>Character description<textarea rows={5} value={customPortraitMaker.description} onChange={(event) => updateCustomPortraitMaker({ description: event.target.value })} /></label>
                    <div className="mini-actions left-actions">
                      <label className="file-button">Load References<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => loadCustomPortraitReferences(event.target.files)} /></label>
                      <label className="file-button">Import Base<input type="file" accept="image/png" onChange={(event) => loadCustomPortraitImage(event.target.files?.[0], "base")} /></label>
                    </div>
                    <div className="mini-actions left-actions">
                      <button type="button" onClick={() => sendCustomPortraitPrompt("base")}>Send to PixelLab</button>
                      <button type="button" onClick={approveCustomBasePortrait}>Approve Result</button>
                    </div>
                    <div className="api-status">{customPortraitMaker.pixelLabStatus}</div>
                  </div>

                  <div className="portrait-maker-column">
                    <strong>Live Preview</strong>
                    <PortraitThumb title="Base Portrait" entry={customPortraitMaker.basePortrait} />
                    <label>Selected part
                      <select value={customPortraitMaker.selectedPart} onChange={(event) => updateCustomPortraitMaker({ selectedPart: event.target.value })}>
                        {CUSTOM_PORTRAIT_PARTS.map((part) => <option key={part} value={part}>{part}</option>)}
                      </select>
                    </label>
                    <div className="mini-actions left-actions">
                      <button type="button" onClick={() => sendCustomPortraitPrompt("part", customPortraitMaker.selectedPart)}>Regenerate Selected Part</button>
                      <label className="file-button">Import Part<input type="file" accept="image/png" onChange={(event) => loadCustomPortraitImage(event.target.files?.[0], "part", customPortraitMaker.selectedPart)} /></label>
                    </div>
                    <div className="part-stack">
                      {customPortraitMaker.parts.map((part) => (
                        <div key={part.name} className="part-row">
                          <button type="button" onClick={() => updateCustomPortraitMaker({ selectedPart: part.name })}>{part.name}</button>
                          <label className="check"><input type="checkbox" checked={!part.hidden} onChange={(event) => updateCustomPortraitPart(part.name, { hidden: !event.target.checked })} /> visible</label>
                          <label className="check"><input type="checkbox" checked={part.locked} onChange={(event) => updateCustomPortraitPart(part.name, { locked: event.target.checked })} /> locked</label>
                          <span>{part.fileName || "-"}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="portrait-maker-column">
                    <strong>References & Validation</strong>
                    <div className="reference-picker">
                      {customPortraitMaker.references.slice(0, 24).map((reference) => (
                        <label key={reference.name} className="reference-choice">
                          <input type="checkbox" checked={customPortraitMaker.selectedReferenceNames.includes(reference.name)} onChange={() => toggleCustomReference(reference.name)} />
                          <PortraitThumb title={reference.name.split(/[\\/]/).pop()} entry={reference} compact />
                        </label>
                      ))}
                      {!customPortraitMaker.references.length && <div className="empty compact-empty">Load PNG references from C:\Users\Joel_\Pictures\Portraits.</div>}
                    </div>
                    <label>Output folder<input value={customPortraitMaker.outputFolder} onChange={(event) => updateCustomPortraitMaker({ outputFolder: event.target.value })} /></label>
                    <label>Working folder<input value={customPortraitMaker.workingFolder} onChange={(event) => updateCustomPortraitMaker({ workingFolder: event.target.value })} /></label>
                    <div className="debug-panel">
                      <div><strong>Base path</strong><span>{`${customPortraitMaker.workingFolder}/01_base/`}</span></div>
                      <div><strong>Expressions path</strong><span>{`${customPortraitMaker.workingFolder}/02_expressions/`}</span></div>
                      <div><strong>Final sheet</strong><span>{customPortraitOutputPath}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">
                  <strong>Custom Expressions</strong>
                  <div className="mini-actions">
                    <button type="button" onClick={() => sendCustomPortraitPrompt("expression", customPortraitMaker.selectedExpression)}>Generate Expression</button>
                    <label className="file-button">Import PixelLab Result<input type="file" accept="image/png" onChange={(event) => loadCustomPortraitImage(event.target.files?.[0], "expression", customPortraitMaker.selectedExpression)} /></label>
                    <button type="button" onClick={() => approveCustomExpression(customPortraitMaker.selectedExpression)}>Approve Result</button>
                  </div>
                </div>
                <div className="grid two">
                  <label>Expression slot
                    <select value={customPortraitMaker.selectedExpression} onChange={(event) => updateCustomPortraitMaker({ selectedExpression: event.target.value })}>
                      {customPortraitExpressionKeys.map((key) => <option key={key} value={key}>{key}</option>)}
                    </select>
                  </label>
                  <label className="check"><input type="checkbox" checked={customPortraitMaker.allowLargeExpressionChanges} onChange={(event) => updateCustomPortraitMaker({ allowLargeExpressionChanges: event.target.checked })} /> Allow larger expression changes</label>
                </div>
                <div className="expression-grid">
                  {customPortraitExpressionKeys.map((key) => {
                    const expression = customPortraitMaker.expressions[key];
                    return (
                      <button key={key} type="button" className={key === customPortraitMaker.selectedExpression ? "expression-card active" : "expression-card"} onClick={() => updateCustomPortraitMaker({ selectedExpression: key })}>
                        <PortraitThumb title={key} entry={expression} compact />
                        <span>{expression?.approved ? "approved" : "not approved"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card">
                <div className="card-title">
                  <strong>Custom Export & Godly Hand</strong>
                  <div className="mini-actions">
                    <button type="button" onClick={exportCustomPortraitSheet}>Combine in Godly Hand</button>
                    <button type="button" onClick={exportCustomPortraitLog}>Export Log</button>
                  </div>
                </div>
                <div className="checks">
                  {customPortraitChecks.map((check, index) => (
                    <div key={`${check.level}-${index}`} className={`check-line ${check.level}`}>
                      <span>{check.level}</span>
                      <p>{check.message}</p>
                    </div>
                  ))}
                </div>
                <ExportBox title="PixelLab MCP Config Reference" value={PIXELLAB_MCP_CONFIG_SNIPPET.replace(/YOUR_API_TOKEN/g, "configured-in-codex")} onCopy={copyText} rows={10} />
              </div>

              <div className="card portrait-workflow">
                <div className="card-title">
                  <strong>Portrait Workflow</strong>
                  <div className="mini-actions">
                    <button type="button" onClick={() => window.open(creatorUrlForPortraitWorkflow(), "_blank", "noopener,noreferrer")}>Open Maker</button>
                    <button type="button" onClick={exportCombinedPortraitSheet}>Export & Check</button>
                  </div>
                </div>
                <div className="workflow-steps">
                  {["1. Check References", "2. Create Base Portrait", "3. Make Expressions", "4. Combine in Godly Hand", "5. Export & Check"].map((step) => (
                    <span key={step}>{step}</span>
                  ))}
                </div>
                <div className="grid two">
                  <label>Base maker
                    <select value={portraitWorkflow.baseMaker} onChange={(event) => updatePortraitWorkflow({ baseMaker: event.target.value })}>
                      <option value="jazzybee">Jazzybee</option>
                      <option value="picrew">Picrew Farmer Portrait</option>
                    </select>
                  </label>
                  <label>Creator type
                    <select value={portraitWorkflow.creatorType} onChange={(event) => updatePortraitWorkflow({ creatorType: event.target.value })} disabled={portraitWorkflow.baseMaker !== "jazzybee"}>
                      <option value="normal">normal / fem</option>
                      <option value="masc">masc</option>
                    </select>
                  </label>
                  <label>NPC name
                    <input list="portrait-npcs" value={portraitWorkflow.npcName} onChange={(event) => updatePortraitNpc(event.target.value)} />
                  </label>
                  <label>Expression set
                    <input value={portraitWorkflow.expressionSet} onChange={(event) => updatePortraitWorkflow({ expressionSet: event.target.value })} />
                  </label>
                  <label>Reference portrait folder
                    <input value={portraitWorkflow.referenceFolder} onChange={(event) => updatePortraitWorkflow({ referenceFolder: event.target.value })} />
                  </label>
                  <label>Output portrait folder
                    <input value={portraitWorkflow.outputFolder} onChange={(event) => updatePortraitWorkflow({ outputFolder: event.target.value })} />
                  </label>
                </div>
                <datalist id="portrait-npcs">
                  {MOONVILLAGE_PORTRAIT_NPCS.map((npc) => <option key={npc} value={npc} />)}
                </datalist>
                <div className="debug-panel">
                  <div><strong>Creator URL</strong><span>{creatorUrlForPortraitWorkflow()}</span></div>
                  <div><strong>Final sheet</strong><span>{portraitExportPath}</span></div>
                  <div><strong>CP target</strong><span>{`Portraits/Moonvillage_${portraitWorkflow.npcName || "NPCName"}`}</span></div>
                  <div><strong>Status</strong><span>{portraitWorkflow.status || "-"}</span></div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">
                  <strong>1. Check References</strong>
                  <label className="file-button">Load Reference PNG<input type="file" accept="image/png" onChange={(event) => loadPortraitWorkflowImage(event.target.files?.[0], "reference")} /></label>
                </div>
                <div className="portrait-compare">
                  <PortraitThumb title="Reference" entry={portraitWorkflow.referenceImage} />
                  <PortraitThumb title="Maker Preview" entry={portraitWorkflow.baseImage} />
                  <div className="compare-checklist">
                    {PORTRAIT_COMPARE_ITEMS.map((item) => (
                      <label key={item} className="check"><input type="checkbox" /> {item}</label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">
                  <strong>2. Create Base Portrait</strong>
                  <div className="mini-actions">
                    <button type="button" onClick={() => window.open(creatorUrlForPortraitWorkflow(), "_blank", "noopener,noreferrer")}>Open Selected Maker</button>
                    <label className="file-button">Import Base PNG<input type="file" accept="image/png" onChange={(event) => loadPortraitWorkflowImage(event.target.files?.[0], "base")} /></label>
                  </div>
                </div>
                <div className="api-status">Create the first portrait in the selected maker, export/save a transparent 64x64 PNG, then import it here. Picrew/Jazzybee assets are linked, not copied into this repo.</div>
              </div>

              <div className="card">
                <div className="card-title">
                  <strong>3. Make Expressions</strong>
                  <div className="mini-actions">
                    <button type="button" onClick={sendPortraitToPixelLab}>Send to PixelLab</button>
                    <label className="file-button">Import PixelLab PNG<input type="file" accept="image/png" onChange={(event) => loadPortraitWorkflowImage(event.target.files?.[0], "expression", portraitWorkflow.selectedExpression)} /></label>
                  </div>
                </div>
                <div className="grid two">
                  <label>Selected expression
                    <select value={portraitWorkflow.selectedExpression} onChange={(event) => updatePortraitWorkflow({ selectedExpression: event.target.value })}>
                      {portraitExpressionKeys.map((key) => <option key={key} value={key}>{key}</option>)}
                    </select>
                  </label>
                  <label>Custom slot
                    <span className="inline-input">
                      <input value={portraitWorkflow.customExpressionName} onChange={(event) => updatePortraitWorkflow({ customExpressionName: event.target.value })} placeholder="custom name" />
                      <button type="button" onClick={addCustomExpressionSlot}>Add</button>
                    </span>
                  </label>
                </div>
                <div className="expression-grid">
                  {portraitExpressionKeys.map((key) => {
                    const expression = portraitWorkflow.expressions[key];
                    return (
                      <button key={key} type="button" className={key === portraitWorkflow.selectedExpression ? "expression-card active" : "expression-card"} onClick={() => updatePortraitWorkflow({ selectedExpression: key })}>
                        <PortraitThumb title={key} entry={expression} compact />
                        <label className="check" onClick={(event) => event.stopPropagation()}>
                          <input type="checkbox" checked={Boolean(expression?.approved)} onChange={(event) => setExpressionApproved(key, event.target.checked)} /> approved
                        </label>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card">
                <div className="card-title">
                  <strong>4. Combine in Godly Hand</strong>
                  <div className="mini-actions">
                    <button type="button" onClick={exportCombinedPortraitSheet}>Build Portrait Sheet</button>
                    <button type="button" onClick={exportPortraitLog}>Export Log</button>
                  </div>
                </div>
                <div className="api-status">Approved expressions are combined into a 2-column Stardew portrait sheet and then shown in the Godly-style portrait preview below.</div>
              </div>

              <div className="card">
                <strong>5. Export & Check</strong>
                <div className="checks">
                  {portraitWorkflowChecks.map((check, index) => (
                    <div key={`${check.level}-${index}`} className={`check-line ${check.level}`}>
                      <span>{check.level}</span>
                      <p>{check.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-title">
                  <strong>Animation Builder</strong>
                  <div className="mini-actions">
                    <button type="button" onClick={addAnimationEntry}>New Animation</button>
                    <button type="button" onClick={exportAnimationJson}>Export Animations.json</button>
                  </div>
                </div>
                <div className="mini-actions left-actions">
                  <label className="file-button">Load Sprite PNG<input type="file" accept="image/png" onChange={(event) => loadAnimationImage(event.target.files?.[0], "sprite")} /></label>
                  <label className="file-button">Load Portrait PNG<input type="file" accept="image/png" onChange={(event) => loadAnimationImage(event.target.files?.[0], "portrait")} /></label>
                  <label className="file-button">Import Animations.json<input type="file" accept=".json,application/json" onChange={(event) => importAnimationDescriptions(event.target.files?.[0])} /></label>
                </div>
                {animationImportStatus && <div className="api-status">{animationImportStatus}</div>}
                <div className="debug-panel">
                  <div><strong>Sprite Sheet</strong><span>{animationSpriteSheet.name || "-"}</span></div>
                  <div><strong>Sprite Size</strong><span>{animationSpriteSheet.image ? `${animationSpriteSheet.image.width} x ${animationSpriteSheet.image.height}` : "-"}</span></div>
                  <div><strong>Frames</strong><span>{animationFrameInfo.totalFrames || "-"}</span></div>
                  <div><strong>Portrait Sheet</strong><span>{animationPortraitSheet.name || "-"}</span></div>
                  <div><strong>Portrait Size</strong><span>{animationPortraitSheet.image ? `${animationPortraitSheet.image.width} x ${animationPortraitSheet.image.height}` : "-"}</span></div>
                </div>
              </div>

              <div className="card">
                <strong>PixelLab Handoff</strong>
                <textarea value={pixelLabNotes} onChange={(event) => setPixelLabNotes(event.target.value)} rows={4} />
                <div className="api-status">PixelLab output should be transparent PNG. Use 16x32 per sprite frame, 64px-wide sprite sheets, and 64x64 portrait expressions before importing here.</div>
              </div>

              <div className="card">
                <div className="card-title">
                  <strong>Sprite Frames</strong>
                  <span>{animationFrameInfo.totalFrames ? `${animationFrameInfo.totalFrames} frames` : "No valid sheet"}</span>
                </div>
                {animationSpriteSheet.image && animationFrameInfo.totalFrames ? (
                  <div className="sprite-frame-grid">
                    {Array.from({ length: animationFrameInfo.totalFrames }, (_, frame) => (
                      <SpriteFrameCanvas
                        key={frame}
                        image={animationSpriteSheet.image}
                        frame={frame}
                        used={parseFrameList(activeAnimation.frames).includes(frame)}
                        onClick={() => appendFrameToActiveAnimation(frame)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty compact-empty">Load a 64px wide Stardew NPC sprite sheet to pick frames.</div>
                )}
              </div>

              <div className="card">
                <div className="card-title">
                  <strong>Animations</strong>
                  <button type="button" onClick={addAnimationEntry}>Add</button>
                </div>
                <div className="animation-layout">
                  <div className="animation-list">
                    {animationEntries.map((animation) => (
                      <button key={animation.id} type="button" className={animation.id === activeAnimation.id ? "row active" : "row"} onClick={() => setActiveAnimationId(animation.id)}>
                        <span>{animation.name || "Unnamed"}</span>
                        <small>{formatFrameList(animation.frames) || "no frames"}</small>
                      </button>
                    ))}
                  </div>
                  <div className="animation-editor">
                    <AnimationPreview image={animationSpriteSheet.image} frames={activeAnimation.frames} speed={activeAnimation.speed} />
                    <div className="grid two">
                      <label>Name<input value={activeAnimation.name} onChange={(event) => updateAnimationEntry(activeAnimation.id, { name: event.target.value })} /></label>
                      <label>Speed<input type="number" min="1" value={activeAnimation.speed} onChange={(event) => updateAnimationEntry(activeAnimation.id, { speed: Number(event.target.value) })} /></label>
                      <label>Loop Delay<input type="number" min="0" value={activeAnimation.loop} onChange={(event) => updateAnimationEntry(activeAnimation.id, { loop: Number(event.target.value) })} /></label>
                      <label>Frames<input value={formatFrameList(activeAnimation.frames)} onChange={(event) => updateAnimationEntry(activeAnimation.id, { frames: parseFrameList(event.target.value) })} /></label>
                    </div>
                    <div className="frame-sequence">
                      {parseFrameList(activeAnimation.frames).map((frame, index) => (
                        <button key={`${frame}-${index}`} type="button" onClick={() => removeFrameFromActiveAnimation(index)}>{frame}</button>
                      ))}
                      {!parseFrameList(activeAnimation.frames).length && <span>No frames selected</span>}
                    </div>
                    <code className="compiled-line">{activeAnimation.name || "AnimationName"}: {`${Number(activeAnimation.speed) || 1000}/${formatFrameList(activeAnimation.frames)}/${Number(activeAnimation.loop) || 20000}`}</code>
                    <button type="button" onClick={() => removeAnimationEntry(activeAnimation.id)}>Remove Animation</button>
                  </div>
                </div>
              </div>

              <div className="card">
                <strong>Portrait Sheet</strong>
                <PortraitSheetPreview image={animationPortraitSheet.image} />
              </div>

              <div className="card">
                <strong>Checks</strong>
                <div className="checks">
                  {[...spriteSheetChecks, ...portraitSheetChecks, ...animationChecks].map((check, index) => (
                    <div key={`${check.level}-${index}`} className={`check-line ${check.level}`}>
                      <span>{check.level}</span>
                      <p>{check.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              <ExportBox title="Content Patcher AnimationDescriptions" value={animationOutput} onCopy={copyText} rows={14} />

              <div className="card">
                <strong>Spritesheet Reference</strong>
                <div className="grid two">
                  {[
                    ["0-3", "Walking Front"],
                    ["4-7", "Walking Right"],
                    ["8-11", "Walking Back"],
                    ["12-15", "Walking Left"],
                    ["16-27", "Custom animation rows"],
                    ["28", "Adult kiss frame caution"],
                    ["32-35", "Marriage interaction / custom"],
                    ["36+", "Wedding, flower dance, and custom rows"],
                  ].map(([frames, label]) => (
                    <div key={frames} className="reference-row">
                      <strong>{frames}</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "export" && activeCutscene && (
            <div className="stack">
              <div className="card">
                <strong>Preflight Checks</strong>
                <div className="checks">
                  {validationChecks.map((check, index) => (
                    <div key={`${check.level}-${index}`} className={`check-line ${check.level}`}>
                      <span>{check.level}</span>
                      <p>{check.message}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-title">
                  <strong>Live Test</strong>
                  <div className="mini-actions">
                    <button type="button" onClick={connectLiveApi}>Connect</button>
                    <button type="button" onClick={testCurrentEvent}>Test Event</button>
                    <button type="button" onClick={endCurrentEvent}>End</button>
                  </div>
                </div>
                <div className="grid two">
                  <label>Live API URL<input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} /></label>
                  <label>Token<input value={apiToken} onChange={(event) => setApiToken(event.target.value)} placeholder="From SMAPI console, if configured" /></label>
                </div>
                <label className="check"><input type="checkbox" checked={forceRepeatTest} onChange={(event) => setForceRepeatTest(event.target.checked)} /> Force repeat test</label>
                <div className="api-status">{apiStatus}</div>
                {testDebug && (
                  <div className="debug-panel">
                    <div><strong>Event ID</strong><span>{testDebug.eventId}</span></div>
                    <div><strong>Target Location</strong><span>{testDebug.targetLocation}</span></div>
                    <div><strong>Music ID</strong><span>{testDebug.musicId}</span></div>
                    <div><strong>Viewport</strong><span>{testDebug.viewport}</span></div>
                    <div><strong>Farmer</strong><span>{testDebug.farmer}</span></div>
                    <div><strong>NPCs</strong><span>{testDebug.npcs.length ? testDebug.npcs.join(", ") : "none"}</span></div>
                    <div><strong>Exists In Asset</strong><span>{String(testDebug.eventExistsInAsset)}</span></div>
                    <div><strong>Injected Fresh</strong><span>{String(testDebug.eventDataInjected)}</span></div>
                    <div><strong>Was Seen</strong><span>{String(testDebug.wasSeenBeforeReset)}</span></div>
                    <div><strong>Seen After Reset</strong><span>{String(testDebug.isSeenAfterReset)}</span></div>
                    <div><strong>Warp Finished</strong><span>{String(testDebug.warpFinished)}</span></div>
                    <div><strong>Preconditions Bypassed</strong><span>{String(testDebug.preconditionsBypassed)}</span></div>
                    <div><strong>Entered Event Mode</strong><span>{String(testDebug.enteredEventMode)}</span></div>
                    <div><strong>Ended Immediately</strong><span>{String(testDebug.endedImmediately)}</span></div>
                    <div><strong>Result</strong><span>{testDebug.result}</span></div>
                  </div>
                )}
              </div>
              <div className="card">
                <div className="card-title">
                  <strong>Finished JSON</strong>
                  <button type="button" onClick={exportFinishedJson}>Export Finished JSON</button>
                </div>
                <label>Export Type
                  <select value={exportType} onChange={(event) => setExportType(event.target.value)}>
                    <option value="content-patcher">Content Patcher file</option>
                    <option value="raw-entry">Raw event entry only</option>
                  </select>
                </label>
              </div>
              <ExportBox title="Event Key" value={compileEventKey(activeCutscene)} onCopy={copyText} />
              <ExportBox title="Event Script" value={compileScript(activeCutscene)} onCopy={copyText} rows={8} />
              <ExportBox title="Content Patcher EditData" value={buildContentPatch(activeCutscene)} onCopy={copyText} rows={14} />
              <ExportBox title="Raw Event Entry" value={buildRawEventEntry(activeCutscene)} onCopy={copyText} rows={6} />
            </div>
          )}
        </section>
      </aside>

      {activeTab === "timeline" && activeCutscene && (
        <section className="timeline-dock">
          <div className="timeline-dock-header">
            <strong>{activeCutscene.name || activeCutscene.id}</strong>
            <span>{activeCutscene.commands.length} commands</span>
          </div>
          <div className="timeline-strip">
            <button type="button" className={selectedCommandId === null ? "block setup active" : "block setup"} onClick={() => setSelectedCommandId(null)}>
              <span>Setup</span>
              <small>{activeCutscene.location}</small>
            </button>
            {activeCutscene.commands.map((command, index) => (
              <button key={command.id} type="button" className={selectedCommandId === command.id ? "block active" : "block"} onClick={() => setSelectedCommandId(command.id)}>
                <span>{command.label || command.verb}</span>
                <small>{index + 1}. {compileCommand(command)}</small>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
export default App;
