import { useMemo, useState } from "react";
import {
  CUSTOM_PORTRAIT_EXPRESSIONS,
  CUSTOM_PORTRAIT_PARTS,
  DEFAULT_ANIMATION_ENTRY,
  JAZZYBEE_URLS,
  PICREW_PORTRAIT_URL,
  PORTRAIT_CELL_SIZE,
  PORTRAIT_EXPRESSIONS,
  buildAnimationDescriptions,
  canvasForImage,
  defaultPortraitFile,
  defaultPortraitFolder,
  frameInfoForImage,
  loadImageFromFile,
  parseAnimationDescriptions,
  parseFrameList,
  stripJsonComments,
  validateAnimationEntries,
  validatePortraitExpression,
  validatePortraitSheet,
  validateSpriteSheet,
} from "../../shared/stardew-core";

// Owns all portrait + animation domain state, derived checks, and handlers.
// Shared concerns are injected: `schedules` (for animation-name comparison),
// `setImages` (shared image cache), and `downloadTextFile` (browser download).
export function useAnimationStudio({ schedules, setImages, downloadTextFile }) {
  const [animationSpriteSheet, setAnimationSpriteSheet] = useState({ name: "", image: null });
  const [animationPortraitSheet, setAnimationPortraitSheet] = useState({ name: "", image: null });
  const [animationEntries, setAnimationEntries] = useState([DEFAULT_ANIMATION_ENTRY]);
  const [activeAnimationId, setActiveAnimationId] = useState(DEFAULT_ANIMATION_ENTRY.id);
  const [animationImportStatus, setAnimationImportStatus] = useState("");
  const [pixelLabNotes, setPixelLabNotes] = useState("Use PixelLab to generate or repair individual 16x32 sprite frames and 64x64 portrait expressions, then import the PNGs here for Stardew validation.");
  const [portraitWorkflow, setPortraitWorkflow] = useState({
    baseMaker: "jazzybee",
    creatorType: "normal",
    npcName: "Annette",
    referenceFolder: defaultPortraitFolder("Annette"),
    outputFolder: defaultPortraitFolder("Annette"),
    expressionSet: "standard",
    selectedExpression: "neutral",
    customExpressionName: "",
    referenceImage: { name: "", image: null },
    baseImage: { name: "", image: null },
    expressions: {},
    status: "",
  });
  const [customPortraitMaker, setCustomPortraitMaker] = useState({
    npcName: "Annette",
    referenceFolder: "C:\\Users\\Joel_\\Pictures\\Portraits",
    outputFolder: defaultPortraitFolder("Annette"),
    workingFolder: "assets/Portraits_Working/Annette",
    description: "Warm Stardew Valley-style Moon Village NPC portrait, rustic fantasy village clothing, soft outline, transparent background.",
    selectedReferenceNames: [],
    references: [],
    basePortrait: { name: "", image: null, approved: false },
    parts: CUSTOM_PORTRAIT_PARTS.map((name, index) => ({ id: `part-${index}`, name, hidden: false, locked: false, image: null, fileName: "" })),
    selectedPart: CUSTOM_PORTRAIT_PARTS[0],
    expressions: {},
    selectedExpression: "neutral",
    allowLargeExpressionChanges: false,
    pixelLabStatus: "PixelLab MCP is connected in Codex. Use 64x64 object generation for portrait assets, then import the PNG result here.",
    pixelLabToolsUsed: [],
  });

  const activeAnimation = animationEntries.find((animation) => animation.id === activeAnimationId) ?? animationEntries[0] ?? DEFAULT_ANIMATION_ENTRY;
  const animationFrameInfo = frameInfoForImage(animationSpriteSheet.image);
  const scheduleAnimationNames = useMemo(
    () => [...new Set(schedules.flatMap((schedule) => schedule.points ?? []).map((point) => String(point.animation || "").trim()).filter(Boolean))],
    [schedules],
  );
  const spriteSheetChecks = useMemo(
    () => validateSpriteSheet(animationSpriteSheet.image),
    [animationSpriteSheet.image],
  );
  const portraitSheetChecks = useMemo(
    () => validatePortraitSheet(animationPortraitSheet.image),
    [animationPortraitSheet.image],
  );
  const animationChecks = useMemo(
    () => validateAnimationEntries(animationEntries, animationFrameInfo.totalFrames, scheduleAnimationNames),
    [animationEntries, animationFrameInfo.totalFrames, scheduleAnimationNames],
  );
  const animationOutput = useMemo(
    () => buildAnimationDescriptions(animationEntries),
    [animationEntries],
  );
  const portraitExpressionKeys = useMemo(() => {
    const keys = new Set(PORTRAIT_EXPRESSIONS);
    for (const key of Object.keys(portraitWorkflow.expressions ?? {})) keys.add(key);
    return [...keys];
  }, [portraitWorkflow.expressions]);
  const portraitExportPath = useMemo(
    () => portraitWorkflow.outputFolder.trim()
      ? `${portraitWorkflow.outputFolder.replace(/[\\/]+$/g, "")}/${portraitWorkflow.npcName || "NPCName"}_Portraits.png`
      : defaultPortraitFile(portraitWorkflow.npcName),
    [portraitWorkflow.npcName, portraitWorkflow.outputFolder],
  );
  const portraitWorkflowChecks = useMemo(() => {
    const checks = [];
    const add = (level, message) => checks.push({ level, message });
    add("tip", "Jazzybee creator assets are not bundled here unless an approval/license file is present. Use the creator link, then import the 64x64 transparent PNG output as the base.");
    if (!portraitWorkflow.npcName.trim()) add("error", "NPC name is required before export.");
    if (!portraitWorkflow.baseImage.image) add("error", "Create or import the Jazzybee base portrait first.");
    checks.push(...validatePortraitExpression(portraitWorkflow.referenceImage.image, "Reference portrait"));
    checks.push(...validatePortraitExpression(portraitWorkflow.baseImage.image, "Jazzybee base"));
    const loadedExpressions = Object.entries(portraitWorkflow.expressions ?? {}).filter(([, value]) => value?.image);
    if (!loadedExpressions.length) add("warning", "No expression images are loaded yet.");
    for (const [key, value] of loadedExpressions) {
      checks.push(...validatePortraitExpression(value.image, key, portraitWorkflow.baseImage.image));
    }
    const missing = PORTRAIT_EXPRESSIONS.filter((key) => !portraitWorkflow.expressions?.[key]?.image);
    if (missing.length) add("warning", `Missing standard expression slot(s): ${missing.join(", ")}.`);
    if (!portraitWorkflow.outputFolder.trim()) add("error", "Output portrait folder is required.");
    if (portraitWorkflow.outputFolder.trim() && !/assets[/\\]Characters[/\\][^/\\]+[/\\]Portraits/i.test(portraitWorkflow.outputFolder)) {
      add("warning", "Output folder does not match the current Moon Village portrait convention.");
    }
    if (!checks.some((check) => check.level === "error")) add("ok", `Ready to export ${portraitExportPath}.`);
    return checks;
  }, [portraitExportPath, portraitWorkflow]);
  const customPortraitExpressionKeys = useMemo(() => {
    const keys = new Set(CUSTOM_PORTRAIT_EXPRESSIONS);
    for (const key of Object.keys(customPortraitMaker.expressions ?? {})) keys.add(key);
    return [...keys];
  }, [customPortraitMaker.expressions]);
  const customPortraitOutputPath = useMemo(
    () => `${customPortraitMaker.outputFolder.replace(/[\\/]+$/g, "")}/${customPortraitMaker.npcName || "NPCName"}_Portraits.png`,
    [customPortraitMaker.npcName, customPortraitMaker.outputFolder],
  );
  const customPortraitChecks = useMemo(() => {
    const checks = [];
    const add = (level, message) => checks.push({ level, message });
    if (!customPortraitMaker.npcName.trim()) add("error", "NPC name is required.");
    add("tip", "PixelLab MCP has no dedicated front-facing portrait tool yet; use 64x64 transparent object generation for base portraits/parts, then import and validate the PNG.");
    if (!customPortraitMaker.references.length) add("warning", "Load reference images from C:\\Users\\Joel_\\Pictures\\Portraits or a scanned portrait folder.");
    if (!customPortraitMaker.description.trim()) add("warning", "Character description is empty.");
    if (!customPortraitMaker.basePortrait.image) add("error", "Generate or import a base portrait before expressions.");
    if (customPortraitMaker.basePortrait.image && !customPortraitMaker.basePortrait.approved) add("warning", "Base portrait must be approved before expression generation.");
    checks.push(...validatePortraitExpression(customPortraitMaker.basePortrait.image, "Custom base portrait"));
    for (const key of customPortraitExpressionKeys) {
      const expression = customPortraitMaker.expressions[key];
      if (expression?.image) checks.push(...validatePortraitExpression(expression.image, key, customPortraitMaker.basePortrait.image));
    }
    const missing = CUSTOM_PORTRAIT_EXPRESSIONS.filter((key) => !customPortraitMaker.expressions?.[key]?.image);
    if (missing.length) add("warning", `Missing expression slot(s): ${missing.join(", ")}.`);
    const emptyParts = customPortraitMaker.parts.filter((part) => !part.image && !part.hidden);
    if (emptyParts.length) add("tip", `${emptyParts.length} portrait part layer(s) are empty. This is okay if you are generating whole portraits first.`);
    if (!checks.some((check) => check.level === "error")) add("ok", `Ready to export ${customPortraitOutputPath}.`);
    return checks;
  }, [customPortraitExpressionKeys, customPortraitMaker, customPortraitOutputPath]);

  async function loadAnimationImage(file, kind) {
    if (!file) return;
    const image = await loadImageFromFile(file);
    if (!image) {
      setAnimationImportStatus(`Could not load image: ${file.name}`);
      return;
    }
    const key = file.name.toLowerCase();
    setImages((current) => ({ ...current, [key]: image }));
    if (kind === "portrait") {
      setAnimationPortraitSheet({ name: file.name, image });
      setAnimationImportStatus(`Loaded portrait sheet ${file.name}.`);
    } else {
      setAnimationSpriteSheet({ name: file.name, image });
      setAnimationImportStatus(`Loaded sprite sheet ${file.name}.`);
    }
  }

  async function importAnimationDescriptions(file) {
    if (!file) return;
    try {
      const json = JSON.parse(stripJsonComments(await file.text()));
      const imported = parseAnimationDescriptions(json);
      if (!imported.length) {
        setAnimationImportStatus("No Data/AnimationDescriptions entries found in that JSON.");
        return;
      }
      setAnimationEntries(imported);
      setActiveAnimationId(imported[0].id);
      setAnimationImportStatus(`Imported ${imported.length} animation(s) from ${file.name}.`);
    } catch (error) {
      setAnimationImportStatus(`Could not import Animations.json: ${error.message}`);
    }
  }

  function updateAnimationEntry(id, patch) {
    setAnimationEntries((current) => current.map((animation) => (
      animation.id === id ? { ...animation, ...patch } : animation
    )));
  }

  function addAnimationEntry() {
    const next = {
      ...DEFAULT_ANIMATION_ENTRY,
      id: crypto.randomUUID(),
      name: `Animation_${animationEntries.length + 1}`,
      frames: [],
    };
    setAnimationEntries((current) => [...current, next]);
    setActiveAnimationId(next.id);
  }

  function removeAnimationEntry(id) {
    setAnimationEntries((current) => {
      const next = current.filter((animation) => animation.id !== id);
      if (!next.length) {
        const fallback = { ...DEFAULT_ANIMATION_ENTRY, id: crypto.randomUUID() };
        setActiveAnimationId(fallback.id);
        return [fallback];
      }
      if (id === activeAnimationId) setActiveAnimationId(next[0].id);
      return next;
    });
  }

  function appendFrameToActiveAnimation(frame) {
    updateAnimationEntry(activeAnimation.id, { frames: [...parseFrameList(activeAnimation.frames), frame] });
  }

  function removeFrameFromActiveAnimation(index) {
    const frames = parseFrameList(activeAnimation.frames);
    frames.splice(index, 1);
    updateAnimationEntry(activeAnimation.id, { frames });
  }

  function exportAnimationJson() {
    const blocking = animationChecks.find((check) => check.level === "error");
    if (blocking) {
      setAnimationImportStatus(`Animation export blocked: ${blocking.message}`);
      return;
    }
    downloadTextFile("Animations.json", animationOutput);
    setAnimationImportStatus("Animations.json exported.");
  }

  function updatePortraitWorkflow(patch) {
    setPortraitWorkflow((current) => ({ ...current, ...patch }));
  }

  function updatePortraitNpc(npcName) {
    const cleanName = String(npcName || "").replace(/^Moonvillage_/i, "").trim();
    setPortraitWorkflow((current) => ({
      ...current,
      npcName: cleanName,
      referenceFolder: defaultPortraitFolder(cleanName),
      outputFolder: defaultPortraitFolder(cleanName),
    }));
  }

  async function loadPortraitWorkflowImage(file, kind, expressionKey = "") {
    if (!file) return;
    const image = await loadImageFromFile(file);
    if (!image) {
      updatePortraitWorkflow({ status: `Could not load ${file.name}.` });
      return;
    }
    const imageEntry = { name: file.name, image };
    setImages((current) => ({ ...current, [file.name.toLowerCase()]: image }));
    setPortraitWorkflow((current) => {
      if (kind === "reference") return { ...current, referenceImage: imageEntry, status: `Loaded reference ${file.name}.` };
      if (kind === "base") return { ...current, baseImage: imageEntry, status: `Loaded base portrait ${file.name}.` };
      return {
        ...current,
        selectedExpression: expressionKey || current.selectedExpression,
        expressions: {
          ...current.expressions,
          [expressionKey || current.selectedExpression]: { ...imageEntry, approved: false },
        },
        status: `Loaded expression ${expressionKey || current.selectedExpression} from ${file.name}.`,
      };
    });
  }

  function addCustomExpressionSlot() {
    const key = portraitWorkflow.customExpressionName.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
    if (!key) return;
    setPortraitWorkflow((current) => ({
      ...current,
      selectedExpression: key,
      customExpressionName: "",
      expressions: {
        ...current.expressions,
        [key]: current.expressions[key] ?? { name: "", image: null, approved: false },
      },
      status: `Added custom expression slot ${key}.`,
    }));
  }

  function setExpressionApproved(key, approved) {
    setPortraitWorkflow((current) => ({
      ...current,
      expressions: {
        ...current.expressions,
        [key]: { ...(current.expressions[key] ?? {}), approved },
      },
    }));
  }

  function creatorUrlForPortraitWorkflow() {
    if (portraitWorkflow.baseMaker === "picrew") return PICREW_PORTRAIT_URL;
    return JAZZYBEE_URLS[portraitWorkflow.creatorType] ?? JAZZYBEE_URLS.normal;
  }

  function buildPortraitExportLog(extraWarnings = []) {
    const expressionFiles = {};
    for (const key of portraitExpressionKeys) {
      const expression = portraitWorkflow.expressions[key];
      if (expression?.image) expressionFiles[key] = expression.name || `${key}.png`;
    }
    const warnings = portraitWorkflowChecks
      .filter((check) => check.level !== "ok")
      .map((check) => check.message);
    return {
      npcName: portraitWorkflow.npcName,
      baseMaker: portraitWorkflow.baseMaker,
      creatorType: portraitWorkflow.creatorType,
      referencePortraitsUsed: portraitWorkflow.referenceImage.name ? [portraitWorkflow.referenceImage.name] : [],
      referencePortraitFolder: portraitWorkflow.referenceFolder,
      basePortraitPath: portraitWorkflow.baseImage.name || "",
      expressionFiles,
      finalPortraitSheet: `${portraitWorkflow.npcName || "NPCName"}_Portraits.png`,
      outputFolder: portraitWorkflow.outputFolder,
      contentPatcherTarget: `Portraits/Moonvillage_${portraitWorkflow.npcName || "NPCName"}`,
      backupBeforeOverwrite: `${portraitWorkflow.npcName || "NPCName"}.backup.${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}.png`,
      validationStatus: portraitWorkflowChecks.some((check) => check.level === "error") ? "blocked" : "ready",
      warnings: [...warnings, ...extraWarnings],
      dateGenerated: new Date().toISOString(),
    };
  }

  function downloadCanvasPng(canvas, fileName) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function sendPortraitToPixelLab() {
    const key = portraitWorkflow.selectedExpression;
    const source = portraitWorkflow.expressions[key]?.image ? portraitWorkflow.expressions[key] : portraitWorkflow.baseImage;
    if (!source?.image) {
      updatePortraitWorkflow({ status: "PixelLab handoff needs a base portrait or expression image first." });
      return;
    }
    const drawable = canvasForImage(source.image);
    if (!drawable) return;
    downloadCanvasPng(drawable.canvas, `${portraitWorkflow.npcName || "NPC"}_${key || "base"}_pixellab_source.png`);
    updatePortraitWorkflow({ status: `Downloaded ${key || "base"} source PNG for PixelLab.` });
  }

  function exportPortraitLog() {
    downloadTextFile(`${portraitWorkflow.npcName || "NPC"}_portrait_export_log.json`, JSON.stringify(buildPortraitExportLog(), null, 2));
    updatePortraitWorkflow({ status: "Portrait export log downloaded." });
  }

  function updateCustomPortraitMaker(patch) {
    setCustomPortraitMaker((current) => ({ ...current, ...patch }));
  }

  function updateCustomPortraitNpc(npcName) {
    const cleanName = String(npcName || "").replace(/^Moonvillage_/i, "").trim();
    setCustomPortraitMaker((current) => ({
      ...current,
      npcName: cleanName,
      outputFolder: defaultPortraitFolder(cleanName),
      workingFolder: `assets/Portraits_Working/${cleanName || "NPCName"}`,
    }));
  }

  async function loadCustomPortraitReferences(fileList) {
    const files = [...(fileList ?? [])].filter((file) => file.type.startsWith("image/"));
    const loaded = [];
    for (const file of files) {
      const image = await loadImageFromFile(file);
      if (image) loaded.push({ name: file.webkitRelativePath || file.name, image });
    }
    setCustomPortraitMaker((current) => ({
      ...current,
      references: [...current.references, ...loaded],
      selectedReferenceNames: [...new Set([...current.selectedReferenceNames, ...loaded.map((item) => item.name)])],
      pixelLabStatus: loaded.length ? `Loaded ${loaded.length} reference image(s).` : "No reference images loaded.",
    }));
  }

  async function loadCustomPortraitImage(file, kind, key = "") {
    if (!file) return;
    const image = await loadImageFromFile(file);
    if (!image) {
      updateCustomPortraitMaker({ pixelLabStatus: `Could not load ${file.name}.` });
      return;
    }
    const imageEntry = { name: file.name, image, approved: false };
    if (kind === "base") {
      setCustomPortraitMaker((current) => ({ ...current, basePortrait: imageEntry, pixelLabStatus: `Imported base portrait ${file.name}.` }));
      return;
    }
    if (kind === "part") {
      setCustomPortraitMaker((current) => ({
        ...current,
        parts: current.parts.map((part) => part.name === key ? { ...part, image, fileName: file.name } : part),
        pixelLabStatus: `Imported ${key} part from ${file.name}.`,
      }));
      return;
    }
    setCustomPortraitMaker((current) => ({
      ...current,
      selectedExpression: key || current.selectedExpression,
      expressions: {
        ...current.expressions,
        [key || current.selectedExpression]: imageEntry,
      },
      pixelLabStatus: `Imported ${key || current.selectedExpression} expression from ${file.name}.`,
    }));
  }

  function toggleCustomReference(name) {
    setCustomPortraitMaker((current) => {
      const selected = new Set(current.selectedReferenceNames);
      if (selected.has(name)) selected.delete(name);
      else selected.add(name);
      return { ...current, selectedReferenceNames: [...selected] };
    });
  }

  function updateCustomPortraitPart(name, patch) {
    setCustomPortraitMaker((current) => ({
      ...current,
      parts: current.parts.map((part) => part.name === name ? { ...part, ...patch } : part),
    }));
  }

  function buildCustomPixelLabPrompt(action, slot = "") {
    const selectedReferences = customPortraitMaker.references
      .filter((reference) => customPortraitMaker.selectedReferenceNames.includes(reference.name))
      .map((reference) => reference.name);
    const baseRules = [
      "Stardew Valley inspired custom pixel-art portrait asset.",
      "Original generated asset, transparent background, sharp pixels, no blur, no anti-aliasing.",
      "Warm rustic palette, soft readable outlines, simple shading, limited detail.",
      "Canvas must be 64 x 64 pixels unless exporting a final portrait sheet.",
      "Keep face/body aligned consistently between expressions.",
    ];
    if (action === "base") {
      return [
        `Generate base portrait for NPC: ${customPortraitMaker.npcName || "NPCName"}.`,
        `Character description: ${customPortraitMaker.description}`,
        `Style references selected: ${selectedReferences.join(", ") || "none"}.`,
        "Use PixelLab consistent-style workflow with the selected references.",
        ...baseRules,
      ].join("\n");
    }
    if (action === "part") {
      return [
        `Generate modular portrait part: ${slot || customPortraitMaker.selectedPart}.`,
        `NPC: ${customPortraitMaker.npcName || "NPCName"}.`,
        `Character description: ${customPortraitMaker.description}`,
        "Part should line up with the 64 x 64 portrait base and be transparent outside the part pixels.",
        ...baseRules,
      ].join("\n");
    }
    return [
      `Generate expression variant: ${slot || customPortraitMaker.selectedExpression}.`,
      `NPC: ${customPortraitMaker.npcName || "NPCName"}.`,
      "Start from the approved base portrait. Keep clothing, hair, canvas size, palette, and head/body alignment unchanged.",
      customPortraitMaker.allowLargeExpressionChanges ? "Larger pose changes are allowed." : "Only change face/expression details.",
      "Use PixelLab Animate with Text / expression editing workflow from the base portrait.",
      ...baseRules,
    ].join("\n");
  }

  function sendCustomPortraitPrompt(action, slot = "") {
    const prompt = buildCustomPixelLabPrompt(action, slot);
    const safeSlot = (slot || action).replace(/[^a-z0-9_-]+/gi, "_");
    downloadTextFile(`${customPortraitMaker.npcName || "NPC"}_${safeSlot}_pixellab_prompt.txt`, prompt);
    setCustomPortraitMaker((current) => ({
      ...current,
      pixelLabStatus: `Downloaded PixelLab prompt for ${slot || action}. Codex MCP can generate this when requested.`,
      pixelLabToolsUsed: [...new Set([...current.pixelLabToolsUsed, action === "expression" ? "animate-with-text" : "consistent-style"])],
    }));
  }

  function approveCustomBasePortrait() {
    setCustomPortraitMaker((current) => ({
      ...current,
      basePortrait: { ...current.basePortrait, approved: Boolean(current.basePortrait.image) },
      pixelLabStatus: current.basePortrait.image ? "Base portrait approved and locked for expression generation." : "Import or generate a base portrait before approval.",
    }));
  }

  function approveCustomExpression(key) {
    setCustomPortraitMaker((current) => ({
      ...current,
      expressions: {
        ...current.expressions,
        [key]: { ...(current.expressions[key] ?? {}), approved: Boolean(current.expressions[key]?.image) },
      },
      pixelLabStatus: current.expressions[key]?.image ? `${key} expression approved.` : `Import ${key} expression before approval.`,
    }));
  }

  function buildCustomPortraitExportLog(extraWarnings = []) {
    const expressionFiles = {};
    for (const key of customPortraitExpressionKeys) {
      const expression = customPortraitMaker.expressions[key];
      if (expression?.image) expressionFiles[key] = expression.name || `${key}.png`;
    }
    return {
      npcName: customPortraitMaker.npcName,
      referenceImages: customPortraitMaker.selectedReferenceNames,
      basePortrait: customPortraitMaker.basePortrait.name || `${customPortraitMaker.workingFolder}/01_base/${customPortraitMaker.npcName}_base.png`,
      generatedParts: customPortraitMaker.parts.filter((part) => part.image).map((part) => ({ name: part.name, file: part.fileName })),
      expressions: expressionFiles,
      finalPortraitSheet: `${customPortraitMaker.npcName || "NPCName"}_Portraits.png`,
      outputFolder: customPortraitMaker.outputFolder,
      workingFolder: customPortraitMaker.workingFolder,
      pixelLabToolsUsed: customPortraitMaker.pixelLabToolsUsed,
      validationStatus: customPortraitChecks.some((check) => check.level === "error") ? "blocked" : "ready",
      warnings: [...customPortraitChecks.filter((check) => check.level !== "ok").map((check) => check.message), ...extraWarnings],
      dateGenerated: new Date().toISOString(),
    };
  }

  function exportCustomPortraitLog() {
    downloadTextFile(`${customPortraitMaker.npcName || "NPC"}_custom_portrait_export_log.json`, JSON.stringify(buildCustomPortraitExportLog(), null, 2));
    updateCustomPortraitMaker({ pixelLabStatus: "Custom portrait export log downloaded." });
  }

  function exportCustomPortraitSheet() {
    const blocking = customPortraitChecks.find((check) => check.level === "error");
    if (blocking) {
      updateCustomPortraitMaker({ pixelLabStatus: `Custom portrait export blocked: ${blocking.message}` });
      return;
    }
    const ordered = customPortraitExpressionKeys
      .map((key) => ({ key, ...(customPortraitMaker.expressions[key] ?? {}) }))
      .filter((entry) => entry.image);
    if (!ordered.some((entry) => entry.key === "neutral") && customPortraitMaker.basePortrait.image) {
      ordered.unshift({ key: "neutral", ...customPortraitMaker.basePortrait });
    }
    const columns = 2;
    const rows = Math.max(1, Math.ceil(ordered.length / columns));
    const canvas = document.createElement("canvas");
    canvas.width = columns * PORTRAIT_CELL_SIZE;
    canvas.height = rows * PORTRAIT_CELL_SIZE;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    ordered.forEach((entry, index) => {
      context.drawImage(entry.image, (index % columns) * PORTRAIT_CELL_SIZE, Math.floor(index / columns) * PORTRAIT_CELL_SIZE, PORTRAIT_CELL_SIZE, PORTRAIT_CELL_SIZE);
    });
    const fileName = `${customPortraitMaker.npcName || "NPCName"}_Portraits.png`;
    downloadCanvasPng(canvas, fileName);
    downloadTextFile(`${customPortraitMaker.npcName || "NPCName"}_custom_portrait_export_log.json`, JSON.stringify(buildCustomPortraitExportLog([
      "Browser export downloads the sheet and log. Save the PNG into the shown output folder and create a backup before replacing an existing sheet.",
    ]), null, 2));
    const sheet = new Image();
    sheet.onload = () => setAnimationPortraitSheet({ name: fileName, image: sheet });
    sheet.src = canvas.toDataURL("image/png");
    updateCustomPortraitMaker({ pixelLabStatus: `Exported ${fileName}. Save it to ${customPortraitOutputPath}.` });
  }

  function exportCombinedPortraitSheet() {
    const blocking = portraitWorkflowChecks.find((check) => check.level === "error");
    if (blocking) {
      updatePortraitWorkflow({ status: `Portrait export blocked: ${blocking.message}` });
      return;
    }
    const ordered = portraitExpressionKeys
      .map((key) => ({ key, ...(portraitWorkflow.expressions[key] ?? {}) }))
      .filter((entry) => entry.image);
    if (!ordered.length && portraitWorkflow.baseImage.image) ordered.push({ key: "neutral", ...portraitWorkflow.baseImage });
    const columns = 2;
    const rows = Math.max(1, Math.ceil(ordered.length / columns));
    const canvas = document.createElement("canvas");
    canvas.width = columns * PORTRAIT_CELL_SIZE;
    canvas.height = rows * PORTRAIT_CELL_SIZE;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    ordered.forEach((entry, index) => {
      const x = (index % columns) * PORTRAIT_CELL_SIZE;
      const y = Math.floor(index / columns) * PORTRAIT_CELL_SIZE;
      context.drawImage(entry.image, x, y, PORTRAIT_CELL_SIZE, PORTRAIT_CELL_SIZE);
    });
    const fileName = `${portraitWorkflow.npcName || "NPCName"}_Portraits.png`;
    downloadCanvasPng(canvas, fileName);
    downloadTextFile(`${portraitWorkflow.npcName || "NPCName"}_portrait_export_log.json`, JSON.stringify(buildPortraitExportLog([
      "Browser export downloads the sheet and log. Save the PNG into the shown output folder; create the backup file before replacing an existing sheet.",
    ]), null, 2));
    setAnimationPortraitSheet({ name: fileName, image: Object.assign(new Image(), { src: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height }) });
    updatePortraitWorkflow({ status: `Exported ${fileName}. Save it to ${portraitExportPath}.` });
  }

  return {
    animationSpriteSheet,
    animationPortraitSheet,
    animationEntries,
    activeAnimationId,
    setActiveAnimationId,
    animationImportStatus,
    pixelLabNotes,
    setPixelLabNotes,
    portraitWorkflow,
    customPortraitMaker,
    activeAnimation,
    animationFrameInfo,
    spriteSheetChecks,
    portraitSheetChecks,
    animationChecks,
    animationOutput,
    portraitExpressionKeys,
    portraitExportPath,
    portraitWorkflowChecks,
    customPortraitExpressionKeys,
    customPortraitOutputPath,
    customPortraitChecks,
    loadAnimationImage,
    importAnimationDescriptions,
    updateAnimationEntry,
    addAnimationEntry,
    removeAnimationEntry,
    appendFrameToActiveAnimation,
    removeFrameFromActiveAnimation,
    exportAnimationJson,
    updatePortraitWorkflow,
    updatePortraitNpc,
    loadPortraitWorkflowImage,
    addCustomExpressionSlot,
    setExpressionApproved,
    creatorUrlForPortraitWorkflow,
    sendPortraitToPixelLab,
    exportPortraitLog,
    updateCustomPortraitMaker,
    updateCustomPortraitNpc,
    loadCustomPortraitReferences,
    loadCustomPortraitImage,
    toggleCustomReference,
    updateCustomPortraitPart,
    sendCustomPortraitPrompt,
    approveCustomBasePortrait,
    approveCustomExpression,
    exportCustomPortraitLog,
    exportCustomPortraitSheet,
    exportCombinedPortraitSheet,
    buildPortraitExportLog,
    buildCustomPortraitExportLog,
  };
}
