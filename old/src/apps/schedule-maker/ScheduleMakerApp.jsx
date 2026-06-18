import "./schedule-maker.css";
import { ExportBox } from "../../shared/ui-common/components";
import {
  DIRECTIONS,
  SCHEDULE_ANIMATIONS,
  SCHEDULE_KEYS,
  buildSchedulePatch,
  compileSchedule,
} from "../../shared/stardew-core";
import { copyText } from "../../shared/export-utils/download";

const SPEED_OPTIONS = ["0.5", "1", "2", "4", "8"];

export default function ScheduleMakerApp({ sched, canvasRef }) {
  const {
    activeSchedule, scheduleNpcOptions, scheduleLocationOptions,
    updateSchedule, updateSchedulePoint, addSchedulePoint, removeSchedulePoint, addSchedule, exportScheduleJson,
    selectedSchedulePoint, selectedSchedulePointId, setSelectedSchedulePointId,
    scheduleChecks, schedulePlaybackDebug, customRouteEdges, addCustomRouteEdge,
    testSchedule, playSchedule, pauseSchedule, stopSchedule, restartSchedule, stepSchedule,
    schedulePlayback, setSchedulePlayback, currentPlaybackStep,
    scheduleSpeed, setScheduleSpeed, followScheduleNpc, setFollowScheduleNpc,
    routeMode, setRouteMode, activeMap, mapWarning, mapNameInput, setMapNameInput, loadMapByName,
    zoom, setZoom, fitFullMap, centerOnScheduleStop,
    canvasHandlers, onBack,
  } = sched;

  const points = activeSchedule.points ?? [];
  const routeLen = schedulePlayback.route.length;

  const sortByTime = () => updateSchedule({ points: [...points].sort((a, b) => Number(a.time) - Number(b.time)) });
  const duplicateStep = () => {
    const base = selectedSchedulePoint ?? points.at(-1);
    if (!base) return;
    updateSchedule({ points: [...points, { ...base, uid: crypto.randomUUID(), time: String((Number(base.time) || 900) + 100) }].sort((a, b) => Number(a.time) - Number(b.time)) });
  };

  return (
    <div className="planner">
      {/* TOP */}
      <header className="planner__bar">
        <div className="planner__npc-head">
          <span className="planner__pin" aria-hidden="true" />
          <label>NPC<input list="planner-npcs" value={activeSchedule.npc} onChange={(event) => updateSchedule({ npc: event.target.value })} placeholder="Moonvillage_Annette" /></label>
          <datalist id="planner-npcs">{scheduleNpcOptions.map((n) => <option key={n.name} value={n.name}>{n.displayName}</option>)}</datalist>
          <label>Day<input list="planner-days" value={activeSchedule.key} onChange={(event) => updateSchedule({ key: event.target.value })} /></label>
          <datalist id="planner-days">{SCHEDULE_KEYS.map((k) => <option key={k} value={k} />)}</datalist>
        </div>
        <div className="planner__actions">
          <button type="button" className="planner__test" onClick={testSchedule}>Test Day</button>
          <button type="button" onClick={() => addSchedule()}>New Schedule</button>
          <button type="button" onClick={exportScheduleJson}>Export Schedule</button>
          <button type="button" className="planner__back" onClick={onBack}>Back to Launcher</button>
        </div>
      </header>

      <div className="planner__body">
        {/* LEFT: day planner + step cards */}
        <aside className="planner__plan">
          <h2>Day Planner</h2>
          <div className="planner-npc-card">
            <div className="planner-avatar">{(activeSchedule.npc || "?").replace(/^Moonvillage_/, "").slice(0, 2).toUpperCase()}</div>
            <div>
              <strong>{activeSchedule.npc || "NPC"}</strong>
              <span>{activeSchedule.key || "day key"}</span>
            </div>
          </div>
          <div className="planner-step-actions">
            <button type="button" onClick={addSchedulePoint}>+ Add step</button>
            <button type="button" onClick={duplicateStep}>Duplicate</button>
            <button type="button" onClick={() => selectedSchedulePointId && removeSchedulePoint(selectedSchedulePointId)}>Delete</button>
            <button type="button" onClick={sortByTime}>Sort by time</button>
          </div>
          <div className="planner-steps">
            {points.map((point, index) => (
              <div key={point.uid} className={selectedSchedulePointId === point.uid ? "planner-note selected" : "planner-note"}>
                <button type="button" className="planner-note__head" onClick={() => { setSelectedSchedulePointId(point.uid); setMapNameInput(point.location || ""); }}>
                  <span className="planner-note__num">{index + 1}</span>
                  <span className="planner-note__time">{point.time || "----"}</span>
                  <span className="planner-note__loc">{point.location || "location"}</span>
                </button>
                <div className="planner-note__grid">
                  <label>Time<input value={point.time} onChange={(event) => updateSchedulePoint(point.uid, { time: event.target.value })} /></label>
                  <label>Location<input list="planner-locs" value={point.location} onChange={(event) => updateSchedulePoint(point.uid, { location: event.target.value })} /></label>
                  <label>X<input type="number" value={point.x} onChange={(event) => updateSchedulePoint(point.uid, { x: Number(event.target.value) })} /></label>
                  <label>Y<input type="number" value={point.y} onChange={(event) => updateSchedulePoint(point.uid, { y: Number(event.target.value) })} /></label>
                  <label>Facing
                    <select value={point.facing} onChange={(event) => updateSchedulePoint(point.uid, { facing: Number(event.target.value) })}>
                      {DIRECTIONS.map((dir, i) => <option key={dir} value={i}>{dir}</option>)}
                    </select>
                  </label>
                  <label>Action<input list="planner-anims" value={point.animation} onChange={(event) => updateSchedulePoint(point.uid, { animation: event.target.value })} /></label>
                  <label className="wide">Dialogue / extra<input value={point.dialogue} onChange={(event) => updateSchedulePoint(point.uid, { dialogue: event.target.value })} placeholder="optional" /></label>
                </div>
              </div>
            ))}
            {!points.length && <div className="planner-empty">No steps yet. Add one to start the day.</div>}
          </div>
          <datalist id="planner-locs">{scheduleLocationOptions.map((l) => <option key={l} value={l} />)}</datalist>
          <datalist id="planner-anims">{SCHEDULE_ANIMATIONS.map((a) => <option key={a || "none"} value={a} />)}</datalist>
        </aside>

        {/* CENTER: route map */}
        <main className="planner__map">
          <div className="planner__map-head">
            <div><strong>Route Map</strong><span>{activeMap ? activeMap.id : "No map loaded"}</span></div>
            <div className="planner__map-tools">
              <input value={mapNameInput} onChange={(event) => setMapNameInput(event.target.value)} placeholder="Map name" onKeyDown={(event) => event.key === "Enter" && loadMapByName(mapNameInput)} />
              <button type="button" onClick={() => loadMapByName(mapNameInput)}>Load</button>
              <button type="button" onClick={() => setZoom((v) => Math.max(0.5, v - 0.25))}>-</button>
              <span>{zoom.toFixed(2)}x</span>
              <button type="button" onClick={() => setZoom((v) => Math.min(2, v + 0.25))}>+</button>
              <button type="button" onClick={fitFullMap}>Fit</button>
              <button type="button" onClick={centerOnScheduleStop}>Stop</button>
              <label className="planner-route-mode">
                <select value={routeMode} onChange={(event) => setRouteMode(event.target.value)}>
                  <option value="legal">Legal route</option>
                  <option value="closest">Closest (debug)</option>
                </select>
              </label>
            </div>
          </div>
          <div className="planner__screen">
            <canvas
              ref={canvasRef}
              className="planner-canvas"
              onClick={canvasHandlers.onClick}
              onPointerDown={canvasHandlers.onPointerDown}
              onPointerMove={canvasHandlers.onPointerMove}
              onPointerUp={canvasHandlers.onPointerUp}
              onPointerCancel={canvasHandlers.onPointerUp}
              onPointerLeave={canvasHandlers.onPointerLeave}
              onWheel={canvasHandlers.onWheel}
            />
          </div>
          <div className="planner__route-line">
            {points.map((point, index) => (
              <span key={point.uid} className="planner-route-dot">
                <b>{index + 1}</b>{point.location}
                {index < points.length - 1 && <i className="planner-route-arrow">→</i>}
              </span>
            ))}
          </div>
        </main>

        {/* RIGHT: step inspector */}
        <aside className="planner__inspector">
          <h2>Step Inspector</h2>
          <div className="planner-card">
            <div className="planner-kv"><strong>NPC</strong><span>{schedulePlaybackDebug.npc}</span></div>
            <div className="planner-kv"><strong>Time block</strong><span>{schedulePlaybackDebug.timeBlock}</span></div>
            <div className="planner-kv"><strong>Current map</strong><span>{schedulePlaybackDebug.map}</span></div>
            <div className="planner-kv"><strong>Current X/Y</strong><span>{schedulePlaybackDebug.position}</span></div>
            <div className="planner-kv"><strong>Target X/Y</strong><span>{schedulePlaybackDebug.target}</span></div>
            <div className="planner-kv"><strong>Command</strong><span>{schedulePlaybackDebug.command}</span></div>
            <div className="planner-kv"><strong>Path status</strong><span>{schedulePlaybackDebug.status}</span></div>
            <div className="planner-kv"><strong>Route mode</strong><span>{schedulePlaybackDebug.routeMode}</span></div>
          </div>
          <div className="planner-card">
            <div className="planner-card__title"><strong>World Route Graph</strong><button type="button" onClick={addCustomRouteEdge}>Add edge</button></div>
            <div className="planner-kv"><strong>Custom edges</strong><span>{customRouteEdges.length}</span></div>
          </div>
          <div className="planner-card">
            <strong>Warnings</strong>
            <div className="planner-checks">
              {scheduleChecks.map((check, index) => (
                <div key={`${check.level}-${index}`} className={`planner-check planner-check--${check.level}`}><span>{check.level}</span><p>{check.message}</p></div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* BOTTOM: day simulator */}
      <footer className="planner__sim">
        <div className="planner__transport">
          <button type="button" onClick={playSchedule}>Play</button>
          <button type="button" onClick={pauseSchedule}>Pause</button>
          <button type="button" onClick={stopSchedule}>Stop</button>
          <button type="button" onClick={restartSchedule}>Restart</button>
          <button type="button" onClick={() => stepSchedule(-1)}>Step Back</button>
          <button type="button" onClick={() => stepSchedule(1)}>Step Forward</button>
        </div>
        <input
          className="planner__slider"
          type="range"
          min={0}
          max={Math.max(0, routeLen - 1)}
          value={schedulePlayback.index}
          onChange={(event) => setSchedulePlayback((current) => ({ ...current, playing: false, index: Number(event.target.value), status: current.status === "idle" ? "valid" : current.status }))}
        />
        <div className="planner__sim-meta">
          <label>Speed
            <select value={scheduleSpeed} onChange={(event) => setScheduleSpeed(event.target.value)}>
              {SPEED_OPTIONS.map((s) => <option key={s} value={s}>{s}x</option>)}
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={followScheduleNpc} onChange={(event) => setFollowScheduleNpc(event.target.checked)} /> Follow NPC</label>
          <span>Map: {currentPlaybackStep?.location ?? "-"}</span>
          <span>X/Y: {currentPlaybackStep ? `${currentPlaybackStep.x}, ${currentPlaybackStep.y}` : "-"}</span>
          <span>Step {routeLen ? schedulePlayback.index + 1 : 0}/{routeLen}</span>
          {mapWarning && <span className="planner-warn">{mapWarning}</span>}
        </div>
        <ExportBox title="Schedule EditData" value={buildSchedulePatch(activeSchedule)} onCopy={copyText} rows={3} />
        <ExportBox title="Schedule entry" value={`${JSON.stringify(activeSchedule.key)}: ${JSON.stringify(compileSchedule(activeSchedule))}`} onCopy={copyText} rows={2} />
      </footer>
    </div>
  );
}
