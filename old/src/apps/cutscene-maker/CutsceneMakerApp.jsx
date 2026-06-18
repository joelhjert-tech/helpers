import "./cutscene-maker.css";
import { ActorEditor, CommandFields, ExportBox } from "../../shared/ui-common/components";
import { compileCommand, compileScript } from "../../shared/stardew-core";
import { copyText } from "../../shared/export-utils/download";

const OVERLAY_TOGGLES = [
  { key: "grid", label: "Grid" },
  { key: "blocked", label: "Collision" },
  { key: "warpTiles", label: "Warps" },
  { key: "viewport", label: "Camera frame" },
];

export default function CutsceneMakerApp({ cut, canvasRef }) {
  const {
    activeCutscene, selectedActorKey, setSelectedActorKey, getNpcDisplayName,
    actorSearch, setActorSearch, filteredLiveNpcs, addActor, updateActorByUid, removeActor,
    updateCutscene, updateEventLocation, musicOptions, liveLocations,
    commandSearch, setCommandSearch, filteredCommands, addCommand,
    selectedCommand, selectedCommandId, setSelectedCommandId, updateCommand, moveCommand, removeCommand,
    overlays, setOverlays, zoom, setZoom, fitFullMap, centerMapOnTile, centerOnSelectedNpc, centerOnViewport,
    selectedTile, hoveredTile, activeMap, mapWarning, mapNameInput, setMapNameInput, loadMapByName,
    apiBaseUrl, setApiBaseUrl, apiToken, setApiToken, apiStatus, connectLiveApi, testCurrentEvent, endCurrentEvent,
    forceRepeatTest, setForceRepeatTest, exportFinishedJson, saveDraft, validationChecks,
    canvasHandlers, onBack,
  } = cut;

  return (
    <div className="director">
      {/* TOP: clapperboard bar */}
      <header className="director__bar">
        <div className="director__slate">
          <span className="director__clap" aria-hidden="true" />
          <label className="director__title">Scene
            <input value={activeCutscene.name} onChange={(event) => updateCutscene({ ...activeCutscene, name: event.target.value })} />
          </label>
          <label className="director__id">Event ID
            <input value={activeCutscene.id} onChange={(event) => updateCutscene({ ...activeCutscene, id: event.target.value })} />
          </label>
        </div>
        <div className="director__actions">
          <button type="button" className="director__take" onClick={testCurrentEvent}>▶ Test Scene</button>
          <button type="button" onClick={saveDraft}>Save Draft</button>
          <button type="button" onClick={exportFinishedJson}>Export Event</button>
          <button type="button" className="director__back" onClick={onBack}>Back to Launcher</button>
        </div>
      </header>

      <div className="director__stage-row">
        {/* LEFT: scene cast */}
        <aside className="director__cast">
          <h2>Scene Cast</h2>
          <div className="director-card">
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
          <div className="director-card">
            <strong>Add actor</strong>
            <input value={actorSearch} onChange={(event) => setActorSearch(event.target.value)} placeholder="Search characters..." />
            <div className="director-castlist">
              {filteredLiveNpcs.length === 0 && <div className="director-empty">Connect Live API to load characters, or use Add below.</div>}
              {filteredLiveNpcs.slice(0, 40).map((npc) => (
                <button key={npc.name} type="button" onClick={() => addActor(npc)}>
                  <span>{npc.displayName}</span><small>{npc.name}</small>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => addActor()}>+ Add blank actor</button>
          </div>
          <div className="director-card">
            <strong>Scene details</strong>
            <label>Location<input list="cut-locations" value={activeCutscene.location} onChange={(event) => updateEventLocation(event.target.value)} /></label>
            <datalist id="cut-locations">{liveLocations.map((loc) => <option key={loc} value={loc} />)}</datalist>
            <label>Music
              <select value={activeCutscene.music} onChange={(event) => updateCutscene({ ...activeCutscene, music: event.target.value })}>
                {!musicOptions.some((o) => o.value === activeCutscene.music) && activeCutscene.music && <option value={activeCutscene.music}>{activeCutscene.music}</option>}
                {musicOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <div className="grid two">
              <label>Viewport X<input type="number" value={activeCutscene.viewportX} disabled={!activeCutscene.customViewport} onChange={(event) => updateCutscene({ ...activeCutscene, viewportX: Number(event.target.value), customViewport: true })} /></label>
              <label>Viewport Y<input type="number" value={activeCutscene.viewportY} disabled={!activeCutscene.customViewport} onChange={(event) => updateCutscene({ ...activeCutscene, viewportY: Number(event.target.value), customViewport: true })} /></label>
            </div>
            <label className="check"><input type="checkbox" checked={activeCutscene.customViewport} onChange={(event) => updateCutscene((c) => ({ ...c, customViewport: event.target.checked, viewportX: event.target.checked ? c.viewportX : c.farmer.x, viewportY: event.target.checked ? c.viewportY : c.farmer.y }))} /> Custom viewport</label>
            <label className="check"><input type="checkbox" checked={activeCutscene.skippable} onChange={(event) => updateCutscene({ ...activeCutscene, skippable: event.target.checked })} /> Skippable</label>
            <label>Preconditions<textarea value={activeCutscene.preconditions.join("\n")} onChange={(event) => updateCutscene({ ...activeCutscene, preconditions: event.target.value.split("\n").map((l) => l.trim()).filter(Boolean) })} /></label>
          </div>
        </aside>

        {/* CENTER: stage map */}
        <main className="director__stage">
          <div className="director__stage-head">
            <div>
              <strong>Stage</strong>
              <span>{activeMap ? activeMap.id : "No map loaded"}</span>
            </div>
            <div className="director__maptools">
              <input value={mapNameInput} onChange={(event) => setMapNameInput(event.target.value)} placeholder="Map name" onKeyDown={(event) => event.key === "Enter" && loadMapByName(mapNameInput)} />
              <button type="button" onClick={() => loadMapByName(mapNameInput)}>Load</button>
              <button type="button" onClick={() => setZoom((v) => Math.max(0.5, v - 0.25))}>-</button>
              <span>{zoom.toFixed(2)}x</span>
              <button type="button" onClick={() => setZoom((v) => Math.min(2, v + 0.25))}>+</button>
              <button type="button" onClick={fitFullMap}>Fit</button>
              <button type="button" onClick={() => activeCutscene?.farmer && centerMapOnTile(activeCutscene.farmer)}>Player</button>
              <button type="button" onClick={centerOnSelectedNpc}>NPC</button>
              <button type="button" onClick={centerOnViewport}>Camera</button>
            </div>
          </div>
          <div className="director__overlays">
            {OVERLAY_TOGGLES.map((toggle) => (
              <label key={toggle.key} className="check">
                <input type="checkbox" checked={Boolean(overlays[toggle.key])} onChange={(event) => setOverlays((current) => ({ ...current, [toggle.key]: event.target.checked }))} />
                {toggle.label}
              </label>
            ))}
          </div>
          <div className="director__screen">
            <canvas
              ref={canvasRef}
              className="director-canvas"
              onClick={canvasHandlers.onClick}
              onPointerDown={canvasHandlers.onPointerDown}
              onPointerMove={canvasHandlers.onPointerMove}
              onPointerUp={canvasHandlers.onPointerUp}
              onPointerCancel={canvasHandlers.onPointerUp}
              onPointerLeave={canvasHandlers.onPointerLeave}
              onWheel={canvasHandlers.onWheel}
            />
          </div>
          <div className="director__readout">
            <span>{hoveredTile ? `Hover ${hoveredTile.x}, ${hoveredTile.y}` : selectedTile ? `Tile ${selectedTile.x}, ${selectedTile.y}` : "Tile -"}</span>
            <span>{activeMap ? `${activeMap.warps?.length ?? 0} warps / ${activeMap.blockedTiles?.size ?? 0} blocked` : "No overlay data"}</span>
            {mapWarning && <span className="director-warn">{mapWarning}</span>}
            <span className="director-hint">Select a cast member, then click a tile to place them.</span>
          </div>
        </main>

        {/* RIGHT: director commands */}
        <aside className="director__commands">
          <h2>Director Commands</h2>
          <input value={commandSearch} onChange={(event) => setCommandSearch(event.target.value)} placeholder="Search commands..." />
          <div className="director-cmdgrid">
            {filteredCommands.map((definition) => (
              <button key={definition.verb} type="button" className="director-cmd" onClick={() => addCommand(definition.verb)}>{definition.label}</button>
            ))}
          </div>
          {selectedCommand && (
            <div className="director-card director-cmd-editor">
              <div className="director-card__title">
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
              <code className="director-compiled">{compileCommand(selectedCommand)}</code>
            </div>
          )}
          <div className="director-card">
            <div className="director-card__title"><strong>Live Test</strong>
              <div className="mini-actions">
                <button type="button" onClick={connectLiveApi}>Connect</button>
                <button type="button" onClick={endCurrentEvent}>End</button>
              </div>
            </div>
            <label>Live API URL<input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} /></label>
            <label>Token<input value={apiToken} onChange={(event) => setApiToken(event.target.value)} placeholder="From SMAPI console" /></label>
            <label className="check"><input type="checkbox" checked={forceRepeatTest} onChange={(event) => setForceRepeatTest(event.target.checked)} /> Force repeat test</label>
            <div className="director-status">{apiStatus}</div>
          </div>
          <div className="director-card">
            <strong>Validation</strong>
            <div className="director-checks">
              {validationChecks.map((check, index) => (
                <div key={`${check.level}-${index}`} className={`director-check director-check--${check.level}`}><span>{check.level}</span><p>{check.message}</p></div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* BOTTOM: parchment scene timeline */}
      <footer className="director__timeline">
        <div className="director__timeline-head">
          <strong>Scene Timeline</strong>
          <span>{activeCutscene.commands.length} commands</span>
        </div>
        <div className="director__strip">
          <button type="button" className={selectedCommandId === null ? "director-block setup active" : "director-block setup"} onClick={() => setSelectedCommandId(null)}>
            <span>Setup</span><small>{activeCutscene.location}</small>
          </button>
          {activeCutscene.commands.map((command) => (
            <button key={command.id} type="button" className={selectedCommandId === command.id ? "director-block active" : "director-block"} onClick={() => setSelectedCommandId(command.id)}>
              <span>{command.label}</span>
              <small>{compileCommand(command).slice(0, 26) || command.verb}</small>
            </button>
          ))}
        </div>
        <ExportBox title="Scene script preview" value={compileScript(activeCutscene)} onCopy={copyText} rows={3} />
      </footer>
    </div>
  );
}
