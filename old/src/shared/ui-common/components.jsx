import { useEffect, useRef, useState } from "react";
import {
  DEFINITION_BY_VERB,
  DIRECTIONS,
  EMOTE_OPTIONS,
  PORTRAIT_CELL_SIZE,
  SPRITE_FRAMES_PER_ROW,
  SPRITE_FRAME_HEIGHT,
  SPRITE_FRAME_WIDTH,
  parseFrameList,
} from "../stardew-core";

export function CommandFields({ command, actors, onChange }) {
  const definition = DEFINITION_BY_VERB.get(command.verb.toLowerCase());
  const values = command.values ?? {};
  if (!definition) return null;

  const setValue = (key, value) => onChange({ ...values, [key]: value });

  return (
    <div className="grid two">
      {definition.fields.map((field) => {
        if (field.type === "boolean") {
          return (
            <label key={field.key} className="check">
              <input type="checkbox" checked={values[field.key] === "true"} onChange={(event) => setValue(field.key, event.target.checked ? "true" : "")} />
              {field.label}
            </label>
          );
        }
        if (field.type === "direction") {
          return (
            <label key={field.key}>{field.label}
              <select value={values[field.key] ?? "2"} onChange={(event) => setValue(field.key, event.target.value)}>
                {DIRECTIONS.map((direction, index) => <option key={direction} value={index}>{direction}</option>)}
              </select>
            </label>
          );
        }
        if (field.key === "emote") {
          const current = String(values[field.key] ?? "");
          return (
            <label key={field.key} className="wide">{field.label}
              <div className="emote-field">
                <select value={EMOTE_OPTIONS.some((option) => option.value === current) ? current : ""} onChange={(event) => setValue(field.key, event.target.value)}>
                  <option value="">Custom / unknown</option>
                  {EMOTE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <input type="number" value={current} onChange={(event) => setValue(field.key, event.target.value)} placeholder="Custom ID" />
              </div>
            </label>
          );
        }
        if (field.type === "actor") {
          return (
            <label key={field.key}>{field.label}
              <select value={values[field.key] ?? "farmer"} onChange={(event) => setValue(field.key, event.target.value)}>
                {actors.map((actor, index) => <option key={`${actor.actor}-${index}`} value={actor.actor}>{actor.actor}</option>)}
              </select>
            </label>
          );
        }
        const isLong = field.type === "raw" || field.key === "text" || field.key === "payload";
        return (
          <label key={field.key} className={isLong ? "wide" : ""}>{field.label}
            {isLong ? (
              <textarea value={values[field.key] ?? ""} onChange={(event) => setValue(field.key, event.target.value)} />
            ) : (
              <input type={field.type === "number" ? "number" : "text"} value={values[field.key] ?? ""} onChange={(event) => setValue(field.key, event.target.value)} />
            )}
          </label>
        );
      })}
    </div>
  );
}

export function SpriteFrameCanvas({ image, frame, scale = 3, selected = false, used = false, onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !image) return;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const col = frame % SPRITE_FRAMES_PER_ROW;
    const row = Math.floor(frame / SPRITE_FRAMES_PER_ROW);
    context.drawImage(
      image,
      col * SPRITE_FRAME_WIDTH,
      row * SPRITE_FRAME_HEIGHT,
      SPRITE_FRAME_WIDTH,
      SPRITE_FRAME_HEIGHT,
      0,
      0,
      SPRITE_FRAME_WIDTH * scale,
      SPRITE_FRAME_HEIGHT * scale,
    );
  }, [frame, image, scale]);
  return (
    <button type="button" className={`sprite-frame ${selected ? "selected" : ""} ${used ? "used" : ""}`} onClick={onClick}>
      <canvas ref={ref} width={SPRITE_FRAME_WIDTH * scale} height={SPRITE_FRAME_HEIGHT * scale} />
      <span>{frame}</span>
    </button>
  );
}

export function AnimationPreview({ image, frames, speed }) {
  const cleanFrames = parseFrameList(frames);
  const frameKey = cleanFrames.join(",");
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!cleanFrames.length) return undefined;
    const delay = Math.max(40, Math.floor((Number(speed) || 1000) / 10));
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % cleanFrames.length), delay);
    return () => window.clearInterval(timer);
  }, [cleanFrames.length, frameKey, speed]);
  if (!image || !cleanFrames.length) return <div className="empty compact-empty">No preview</div>;
  const frame = cleanFrames[index % cleanFrames.length] ?? 0;
  return (
    <div className="animation-preview">
      <SpriteFrameCanvas image={image} frame={frame} scale={5} />
      <small>Frame {frame} {(index % cleanFrames.length) + 1}/{cleanFrames.length}</small>
    </div>
  );
}

export function PortraitSheetPreview({ image }) {
  if (!image) return <div className="empty compact-empty">No portrait sheet loaded.</div>;
  const cols = Math.max(1, Math.floor(image.width / PORTRAIT_CELL_SIZE));
  const rows = Math.max(1, Math.floor(image.height / PORTRAIT_CELL_SIZE));
  const cells = [];
  for (let index = 0; index < cols * rows; index += 1) cells.push(index);
  return (
    <div className="portrait-grid" style={{ gridTemplateColumns: `repeat(${Math.min(cols, 4)}, 1fr)` }}>
      {cells.map((cell) => (
        <div key={cell} className="portrait-cell">
          <img
            alt={`Portrait ${cell}`}
            src={image.src}
            style={{
              width: image.width,
              height: image.height,
              transform: `translate(${-((cell % cols) * PORTRAIT_CELL_SIZE)}px, ${-(Math.floor(cell / cols) * PORTRAIT_CELL_SIZE)}px)`,
            }}
          />
          <span>{cell}</span>
        </div>
      ))}
    </div>
  );
}

export function PortraitThumb({ title, entry, compact = false }) {
  const image = entry?.image;
  return (
    <div className={compact ? "portrait-thumb compact" : "portrait-thumb"}>
      <strong>{title}</strong>
      {image ? (
        <>
          <div className="portrait-thumb-image">
            <img src={image.src} alt={title} />
          </div>
          <span>{entry.name || `${image.width} x ${image.height}`}</span>
        </>
      ) : (
        <div className="empty compact-empty">No image</div>
      )}
    </div>
  );
}

export function ActorEditor({ actor, displayName, selected, onSelect, onChange, onRemove }) {
  return (
    <div className={selected ? "placed-actor selected" : "placed-actor"}>
      <button type="button" className="actor-select-button" onClick={onSelect}>
        <span>{displayName}</span>
        <small>{actor.actor}</small>
      </button>
      <div className="actor-controls">
        <label>X<input type="number" value={actor.x} onChange={(event) => onChange({ x: Number(event.target.value) })} /></label>
        <label>Y<input type="number" value={actor.y} onChange={(event) => onChange({ y: Number(event.target.value) })} /></label>
        <label>Facing
          <select value={actor.facing} onChange={(event) => onChange({ facing: Number(event.target.value) })}>
            {DIRECTIONS.map((direction, index) => <option key={direction} value={index}>{direction}</option>)}
          </select>
        </label>
        {onRemove && <button type="button" onClick={onRemove}>Remove</button>}
      </div>
    </div>
  );
}

export function ExportBox({ title, value, onCopy, rows = 4 }) {
  return (
    <div className="card">
      <div className="card-title">
        <strong>{title}</strong>
        <button type="button" onClick={() => onCopy(value)}>Copy</button>
      </div>
      <textarea readOnly value={value} rows={rows} />
    </div>
  );
}
