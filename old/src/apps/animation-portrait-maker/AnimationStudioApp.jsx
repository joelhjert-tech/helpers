import { useState } from "react";
import "./animation-studio.css";
import { useAnimationStudio } from "./useAnimationStudio";
import { copyText, downloadTextFile } from "../../shared/export-utils/download";
import {
  AnimationPreview,
  ExportBox,
  PortraitSheetPreview,
  PortraitThumb,
  SpriteFrameCanvas,
} from "../../shared/ui-common/components";
import {
  CUSTOM_PORTRAIT_PARTS,
  MOONVILLAGE_PORTRAIT_NPCS,
  PIXELLAB_MCP_CONFIG_SNIPPET,
  formatFrameList,
  parseFrameList,
} from "../../shared/stardew-core";

const CANVAS_TABS = [
  { id: "base", label: "Base Portrait" },
  { id: "parts", label: "Parts" },
  { id: "expressions", label: "Expressions" },
  { id: "godly", label: "Godly Hand" },
];

const DESCRIPTION_FIELDS = [
  { key: "hair", label: "Hair" },
  { key: "face", label: "Face" },
  { key: "eyes", label: "Eyes" },
  { key: "clothes", label: "Clothes" },
  { key: "specialFeatures", label: "Special features" },
  { key: "styleNotes", label: "Style notes" },
];

function ChecksList({ checks }) {
  return (
    <div className="studio-checks">
      {checks.map((check, index) => (
        <div key={`${check.level}-${index}`} className={`studio-check studio-check--${check.level}`}>
          <span>{check.level}</span>
          <p>{check.message}</p>
        </div>
      ))}
    </div>
  );
}

export default function AnimationStudioApp({ onBack }) {
  const [images, setImages] = useState({});
  const [canvasTab, setCanvasTab] = useState("base");
  const studio = useAnimationStudio({ schedules: [], setImages, downloadTextFile });
  void images;

  const {
    customPortraitMaker, customPortraitExpressionKeys, customPortraitChecks, customPortraitOutputPath,
    animationSpriteSheet, animationPortraitSheet, animationEntries, activeAnimation, animationFrameInfo,
    animationImportStatus, animationOutput, animationChecks, spriteSheetChecks, portraitSheetChecks,
    setActiveAnimationId,
    updateCustomPortraitNpc, updateCustomPortraitMaker, loadCustomPortraitReferences, loadCustomPortraitImage,
    toggleCustomReference, updateCustomPortraitPart, sendCustomPortraitPrompt, approveCustomBasePortrait,
    approveCustomExpression, exportCustomPortraitSheet, exportCustomPortraitLog,
    loadAnimationImage, importAnimationDescriptions, addAnimationEntry, removeAnimationEntry,
    updateAnimationEntry, appendFrameToActiveAnimation, removeFrameFromActiveAnimation, exportAnimationJson,
  } = studio;

  const selectedExpression = customPortraitMaker.selectedExpression;

  return (
    <div className="studio">
      <header className="studio__topbar">
        <div className="studio__title">
          <span className="studio__eyebrow">Artist Studio</span>
          <label className="studio__npc">
            NPC
            <input list="studio-npcs" value={customPortraitMaker.npcName} onChange={(event) => updateCustomPortraitNpc(event.target.value)} />
          </label>
          <datalist id="studio-npcs">
            {MOONVILLAGE_PORTRAIT_NPCS.map((npc) => <option key={npc} value={npc} />)}
          </datalist>
        </div>
        <span className="studio__pixellab" title={customPortraitMaker.pixelLabStatus}>PixelLab: {customPortraitMaker.pixelLabStatus ? "ready" : "idle"}</span>
        <div className="studio__topactions">
          <button type="button" onClick={exportCustomPortraitLog}>Save Work</button>
          <button type="button" onClick={exportCustomPortraitSheet}>Export Portrait</button>
          <button type="button" onClick={exportAnimationJson}>Export Animation</button>
          <button type="button" className="studio__back" onClick={onBack}>Back to Launcher</button>
        </div>
      </header>

      <div className="studio__body">
        {/* LEFT: Character references */}
        <aside className="studio__refs">
          <h2>Character References</h2>
          <label>Reference folder
            <input value={customPortraitMaker.referenceFolder} onChange={(event) => updateCustomPortraitMaker({ referenceFolder: event.target.value })} />
          </label>
          <label className="studio-file">Load reference images
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => loadCustomPortraitReferences(event.target.files)} />
          </label>
          <div className="studio-ref-grid">
            {customPortraitMaker.references.slice(0, 24).map((reference) => (
              <label key={reference.name} className={customPortraitMaker.selectedReferenceNames.includes(reference.name) ? "studio-ref selected" : "studio-ref"}>
                <input type="checkbox" checked={customPortraitMaker.selectedReferenceNames.includes(reference.name)} onChange={() => toggleCustomReference(reference.name)} />
                <PortraitThumb title={reference.name.split(/[\\/]/).pop()} entry={reference} compact />
              </label>
            ))}
            {!customPortraitMaker.references.length && <div className="studio-empty">No references loaded yet.</div>}
          </div>
          <h3>Description</h3>
          <label>Summary
            <textarea rows={3} value={customPortraitMaker.description} onChange={(event) => updateCustomPortraitMaker({ description: event.target.value })} />
          </label>
          {DESCRIPTION_FIELDS.map((field) => (
            <label key={field.key}>{field.label}
              <input value={customPortraitMaker[field.key] ?? ""} onChange={(event) => updateCustomPortraitMaker({ [field.key]: event.target.value })} />
            </label>
          ))}
        </aside>

        {/* CENTER: Portrait canvas with internal tabs */}
        <main className="studio__canvas">
          <nav className="studio-tabs">
            {CANVAS_TABS.map((tab) => (
              <button key={tab.id} type="button" className={tab.id === canvasTab ? "active" : ""} onClick={() => setCanvasTab(tab.id)}>{tab.label}</button>
            ))}
          </nav>

          {canvasTab === "base" && (
            <div className="studio-pane studio-pane--base">
              <div className="studio-stage">
                <PortraitThumb title={customPortraitMaker.npcName || "Base"} entry={customPortraitMaker.basePortrait} />
              </div>
              <div className="studio-actions">
                <button type="button" onClick={() => sendCustomPortraitPrompt("base")}>Generate base with PixelLab</button>
                <label className="studio-file">Import PixelLab result<input type="file" accept="image/png" onChange={(event) => loadCustomPortraitImage(event.target.files?.[0], "base")} /></label>
                <button type="button" onClick={() => sendCustomPortraitPrompt("base")}>Regenerate</button>
                <button type="button" onClick={approveCustomBasePortrait}>Approve base</button>
              </div>
            </div>
          )}

          {canvasTab === "parts" && (
            <div className="studio-pane studio-layer-stack">
              {customPortraitMaker.parts.map((part) => (
                <div key={part.name} className="studio-layer">
                  <PortraitThumb title={part.name} entry={part.image ? { image: part.image, name: part.fileName } : null} compact />
                  <div className="studio-layer__controls">
                    <strong>{part.name}</strong>
                    <label className="check"><input type="checkbox" checked={!part.hidden} onChange={(event) => updateCustomPortraitPart(part.name, { hidden: !event.target.checked })} /> show</label>
                    <label className="check"><input type="checkbox" checked={part.locked} onChange={(event) => updateCustomPortraitPart(part.name, { locked: event.target.checked })} /> lock</label>
                    <button type="button" onClick={() => sendCustomPortraitPrompt("part", part.name)}>Regenerate</button>
                    <label className="studio-file">Replace<input type="file" accept="image/png" onChange={(event) => loadCustomPortraitImage(event.target.files?.[0], "part", part.name)} /></label>
                  </div>
                </div>
              ))}
              {!CUSTOM_PORTRAIT_PARTS.length && <div className="studio-empty">No part layers.</div>}
            </div>
          )}

          {canvasTab === "expressions" && (
            <div className="studio-pane">
              <div className="studio-actions">
                <label>Expression slot
                  <select value={selectedExpression} onChange={(event) => updateCustomPortraitMaker({ selectedExpression: event.target.value })}>
                    {customPortraitExpressionKeys.map((key) => <option key={key} value={key}>{key}</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => sendCustomPortraitPrompt("expression", selectedExpression)}>Generate</button>
                <label className="studio-file">Import<input type="file" accept="image/png" onChange={(event) => loadCustomPortraitImage(event.target.files?.[0], "expression", selectedExpression)} /></label>
                <button type="button" onClick={() => approveCustomExpression(selectedExpression)}>Approve</button>
              </div>
              <div className="studio-expr-grid">
                {customPortraitExpressionKeys.map((key) => {
                  const expression = customPortraitMaker.expressions[key];
                  return (
                    <button key={key} type="button" className={key === selectedExpression ? "studio-expr active" : "studio-expr"} onClick={() => updateCustomPortraitMaker({ selectedExpression: key })}>
                      <PortraitThumb title={key} entry={expression} compact />
                      <span>{expression?.approved ? "approved" : expression?.image ? "draft" : "empty"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {canvasTab === "godly" && (
            <div className="studio-pane studio-pane--godly">
              <div className="studio-godly-previews">
                <div><strong>Final portrait sheet</strong><PortraitSheetPreview image={animationPortraitSheet.image} /></div>
                <div><strong>Animation preview</strong><AnimationPreview image={animationSpriteSheet.image} frames={activeAnimation.frames} speed={activeAnimation.speed} /></div>
              </div>
              <div className="studio-actions">
                <button type="button" onClick={exportCustomPortraitSheet}>Combine expressions</button>
                <button type="button" onClick={exportCustomPortraitSheet}>Validate sheet</button>
                <button type="button" onClick={exportCustomPortraitLog}>Export final file</button>
              </div>
              <div className="studio-anim">
                <div className="studio-actions">
                  <label className="studio-file">Load sprite PNG<input type="file" accept="image/png" onChange={(event) => loadAnimationImage(event.target.files?.[0], "sprite")} /></label>
                  <label className="studio-file">Import Animations.json<input type="file" accept=".json,application/json" onChange={(event) => importAnimationDescriptions(event.target.files?.[0])} /></label>
                  <button type="button" onClick={addAnimationEntry}>New animation</button>
                </div>
                {animationSpriteSheet.image && animationFrameInfo.totalFrames ? (
                  <div className="studio-frame-grid">
                    {Array.from({ length: animationFrameInfo.totalFrames }, (_, frame) => (
                      <SpriteFrameCanvas key={frame} image={animationSpriteSheet.image} frame={frame} used={parseFrameList(activeAnimation.frames).includes(frame)} onClick={() => appendFrameToActiveAnimation(frame)} />
                    ))}
                  </div>
                ) : <div className="studio-empty">Load a 64px-wide sprite sheet to pick frames.</div>}
                <div className="studio-anim__list">
                  {animationEntries.map((animation) => (
                    <button key={animation.id} type="button" className={animation.id === activeAnimation.id ? "active" : ""} onClick={() => setActiveAnimationId(animation.id)}>
                      {animation.name || "Unnamed"} <small>{formatFrameList(animation.frames) || "no frames"}</small>
                    </button>
                  ))}
                </div>
                <div className="grid two">
                  <label>Name<input value={activeAnimation.name} onChange={(event) => updateAnimationEntry(activeAnimation.id, { name: event.target.value })} /></label>
                  <label>Speed<input type="number" min="1" value={activeAnimation.speed} onChange={(event) => updateAnimationEntry(activeAnimation.id, { speed: Number(event.target.value) })} /></label>
                  <label>Frames<input value={formatFrameList(activeAnimation.frames)} onChange={(event) => updateAnimationEntry(activeAnimation.id, { frames: parseFrameList(event.target.value) })} /></label>
                </div>
                <div className="frame-sequence">
                  {parseFrameList(activeAnimation.frames).map((frame, index) => (
                    <button key={`${frame}-${index}`} type="button" onClick={() => removeFrameFromActiveAnimation(index)}>{frame}</button>
                  ))}
                </div>
                <button type="button" onClick={() => removeAnimationEntry(activeAnimation.id)}>Remove animation</button>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT: PixelLab tools + validation */}
        <aside className="studio__tools">
          <h2>PixelLab Tools</h2>
          <button type="button" onClick={() => sendCustomPortraitPrompt("base")}>Generate from references</button>
          <button type="button" onClick={() => sendCustomPortraitPrompt("part", customPortraitMaker.selectedPart)}>Generate selected part</button>
          <button type="button" onClick={() => sendCustomPortraitPrompt("expression", selectedExpression)}>Generate expression</button>
          <button type="button" onClick={() => sendCustomPortraitPrompt("expression", selectedExpression)}>Animate with text</button>
          <h3>Validation</h3>
          <ChecksList checks={customPortraitChecks} />
          <div className="studio-paths">
            <div><strong>Output</strong><span>{customPortraitOutputPath}</span></div>
          </div>
        </aside>
      </div>

      {/* BOTTOM: studio log */}
      <footer className="studio__log">
        <strong>Studio Log</strong>
        <div className="studio-log__lines">
          <span>{customPortraitMaker.pixelLabStatus}</span>
          {animationImportStatus && <span>{animationImportStatus}</span>}
          {customPortraitMaker.pixelLabToolsUsed.length > 0 && <span>Tools used: {customPortraitMaker.pixelLabToolsUsed.join(", ")}</span>}
          {[...spriteSheetChecks, ...portraitSheetChecks, ...animationChecks].filter((c) => c.level !== "ok").slice(0, 4).map((c, i) => <span key={i} className={`log-${c.level}`}>{c.message}</span>)}
        </div>
        <ExportBox title="AnimationDescriptions JSON" value={animationOutput} onCopy={copyText} rows={4} />
        <ExportBox title="PixelLab MCP Config" value={PIXELLAB_MCP_CONFIG_SNIPPET.replace(/YOUR_API_TOKEN/g, "configured-in-codex")} onCopy={copyText} rows={4} />
      </footer>
    </div>
  );
}
