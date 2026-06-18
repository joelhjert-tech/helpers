import React, { useState, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════
// GODLY HAND — Animation Builder
// A sneak peek at the Godly Hand NPC Creator
// by Aerishiph — coming to Nexus Mods
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════
const FRAME_W = 16;
const FRAME_H = 32;
const FRAMES_PER_ROW = 4;
const DISPLAY_SCALE = 4;
const DEFAULT_ANIM = { name: "", frames: [], speed: 1000, loop: 20000 };

// ═══════════════════════════════════════════════
// SHARED UI
// ═══════════════════════════════════════════════
const IS = {
  background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 4,
  color: "#e0e0f0", padding: "6px 10px", fontSize: 13, width: "100%", boxSizing: "border-box",
};

function Section({ title, children, warn }) {
  return (
    <div style={{ marginBottom: 20, background: "#1a1a2e", border: `1px solid ${warn ? "#4a3a0a" : "#2a2a4e"}`, borderRadius: 8, padding: 16 }}>
      <div style={{ color: warn ? "#cc9944" : "#7b8cde", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children, hint, warn }) {
  return (
    <div style={{ marginBottom: 10 }}>
      {label && <label style={{ display: "block", color: "#9aa0c0", fontSize: 12, marginBottom: 4 }}>{label}</label>}
      {children}
      {hint && <div style={{ color: warn ? "#cc9944" : "#555577", fontSize: 11, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function Btn({ onClick, children, danger, primary, small, full }) {
  return (
    <button onClick={onClick} style={{
      background: danger ? "#2a0a0a" : primary ? "#2a2a6e" : "transparent",
      border: `1px solid ${danger ? "#4a1a1a" : primary ? "#4a4a9e" : "#2a2a4e"}`,
      color: danger ? "#cc4444" : primary ? "#e0e0ff" : "#555577",
      borderRadius: 4, cursor: "pointer",
      padding: small ? "4px 10px" : "6px 14px",
      fontSize: small ? 11 : 13, fontWeight: primary ? 700 : 400,
      width: full ? "100%" : "auto",
      fontFamily: "monospace",
    }}>{children}</button>
  );
}

function OutputBlock({ output, onCopy, copied, backup }) {
  const [showBackup, setShowBackup] = useState(false);
  if (!output) return null;

  const downloadJson = () => {
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Animations.json";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: "#7b8cde", fontSize: 13, fontWeight: 600 }}>Generated Output</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {output.length > 30000 && <span style={{ color: "#cc4444", fontSize: 11 }}>⚠ Near file size limit</span>}
          {backup && <Btn small onClick={() => setShowBackup(s => !s)}>{showBackup ? "Hide Backup" : "📋 Show Backup"}</Btn>}
          <Btn small onClick={onCopy}>{copied ? "✓ Copied" : "Copy"}</Btn>
          <Btn small primary onClick={downloadJson}>⬇ Download Animations.json</Btn>
        </div>
      </div>
      <pre style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 6, padding: 14, fontSize: 11, color: "#c0c8e0", overflow: "auto", maxHeight: 500, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {output}
      </pre>
      {showBackup && backup && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: "#cc9944", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>📋 Previous Output (Backup)</div>
          <pre style={{ background: "#0d0d1a", border: "1px solid #4a3a0a", borderRadius: 6, padding: 14, fontSize: 11, color: "#9a8060", overflow: "auto", maxHeight: 300, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {backup}
          </pre>
          <Btn small onClick={() => {
            const ta = document.createElement("textarea");
            ta.value = backup;
            ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            try { document.execCommand("copy"); } catch {}
            document.body.removeChild(ta);
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(backup).catch(() => {});
          }}>Copy Backup</Btn>
        </div>
      )}
    </div>
  );
}

function SyntaxPopup({ issues, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={onClose}>
      <div style={{ background: "#1a1a2e", border: "1px solid #4a4a9e", borderRadius: 10, padding: 24, maxWidth: 480, width: "90%" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
          {issues.length === 0 ? "✓ No issues found" : `Syntax Check — ${issues.filter(i => i.level === "error").length} errors · ${issues.filter(i => i.level === "warning").length} warnings`}
        </div>
        {issues.length === 0
          ? <div style={{ color: "#44cc44", fontSize: 13, marginBottom: 16 }}>All animations look good. Ready to generate.</div>
          : issues.map((issue, idx) => (
            <div key={idx} style={{
              background: issue.level === "error" ? "#2a0a0a" : "#1a1a0a",
              border: `1px solid ${issue.level === "error" ? "#4a1a1a" : "#4a3a0a"}`,
              borderRadius: 4, padding: "6px 10px", marginBottom: 5,
              color: issue.level === "error" ? "#cc4444" : "#cc9944", fontSize: 12,
            }}>
              {issue.level === "error" ? "✖" : "⚠"} {issue.msg}
            </div>
          ))
        }
        <button onClick={onClose} style={{
          marginTop: 12, background: "#2a2a6e", border: "1px solid #4a4a9e", color: "#e0e0ff",
          borderRadius: 6, padding: "8px 24px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "monospace",
        }}>Close</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// FRAME CANVAS — renders a single spritesheet frame
// ═══════════════════════════════════════════════
function FrameCanvas({ imageData, frameIndex, size, selected, onClick, inSequence }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!imageData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const col = frameIndex % FRAMES_PER_ROW;
    const row = Math.floor(frameIndex / FRAMES_PER_ROW);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(imageData, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H, 0, 0, FRAME_W * size, FRAME_H * size);
  }, [imageData, frameIndex, size]);
  return (
    <div onClick={onClick} style={{ cursor: "pointer", position: "relative", display: "inline-block" }}>
      <canvas ref={canvasRef} width={FRAME_W * size} height={FRAME_H * size}
        style={{ display: "block", imageRendering: "pixelated", background: "#000",
          border: `2px solid ${selected ? "#7b8cde" : inSequence ? "#44aa44" : "#2a2a4e"}`, borderRadius: 3 }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)",
        color: selected ? "#7b8cde" : inSequence ? "#44cc44" : "#555577", fontSize: 9, textAlign: "center", lineHeight: "14px" }}>
        {frameIndex}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// ANIM PREVIEW — plays through a frame sequence
// ═══════════════════════════════════════════════
function AnimPreview({ imageData, frames, speed }) {
  const [idx, setIdx] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (!frames || frames.length === 0) return;
    setIdx(0);
    if (ref.current) clearInterval(ref.current);
    // Stardew divides AnimationDescriptions speed by 10 internally — match that here
    ref.current = setInterval(() => setIdx(i => (i + 1) % frames.length), Math.max(16, Math.floor(speed / 10)));
    return () => clearInterval(ref.current);
  }, [frames, speed]);
  if (!frames || frames.length === 0) return <div style={{ color: "#555577", fontSize: 12, padding: 20 }}>No frames</div>;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: "#555577", fontSize: 11, marginBottom: 6 }}>Preview — {Math.floor(speed / 10)}ms/frame ({speed} ticks)</div>
      <FrameCanvas imageData={imageData} frameIndex={frames[idx]} size={6} />
      <div style={{ color: "#555577", fontSize: 10, marginTop: 4 }}>Frame {frames[idx]} ({idx + 1}/{frames.length})</div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// ANIMATION BUILDER
// ═══════════════════════════════════════════════
function AnimationBuilder() {
  const [imageEl, setImageEl] = useState(null);
  const [totalFrames, setTotalFrames] = useState(0);
  const [animations, setAnimations] = useState([{ ...DEFAULT_ANIM, name: "MyAnimation" }]);
  const [activeAnim, setActiveAnim] = useState(0);
  const [output, setOutput] = useState("");
  const [outputBackup, setOutputBackup] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [animSyntaxRan, setAnimSyntaxRan] = useState(false);
  const [animSyntaxPopup, setAnimSyntaxPopup] = useState(null);
  const [animImportMsg, setAnimImportMsg] = useState("");
  const [importError, setImportError] = useState(null);
  const fileRef = useRef(null);
  const animImportRef = useRef(null);

  const stripJsonComments = (str) => {
    const result = [];
    let i = 0, inString = false;
    while (i < str.length) {
      const c = str[i];
      if (inString) {
        if (c === "\\") { result.push(c, str[++i]); i++; continue; }
        if (c === "\"") inString = false;
        result.push(c);
      } else {
        if (c === "\"") { inString = true; result.push(c); }
        else if (c === "/" && str[i + 1] === "/") { while (i < str.length && str[i] !== "\n") i++; continue; }
        else result.push(c);
      }
      i++;
    }
    return result.join("").replace(/,(\s*[}\]])/g, "$1");
  };

  const handleImportAnimationsData = (data) => {
    try {
      let entries = null;
      for (const change of (data.Changes || [])) {
        if (change.Target === "Data/AnimationDescriptions" && change.Entries) {
          entries = change.Entries; break;
        }
      }
      if (!entries) { setImportError({ title: "Wrong format", body: "No AnimationDescriptions entries found in this file. Make sure it is an Animations.json with a Data/AnimationDescriptions target — not a content.json, dialogue file, or other mod file." }); return; }
      const anims = Object.entries(entries).map(([name, value]) => {
        const parts = value.split("/");
        const speed = parseInt(parts[0]) || 1000;
        const frames = (parts[1] || "").split(/\s+/).map(Number).filter(n => !isNaN(n));
        const loop = parseInt(parts[2]) || 20000;
        return { name, frames, speed, loop };
      });
      setAnimations(anims);
      setActiveAnim(0);
      setAnimImportMsg("Loaded " + anims.length + " animations from Animations.json");
    } catch(e) { setImportError({ title: "Invalid JSON syntax", body: "The file could not be parsed. This usually means the JSON has a syntax error — a missing bracket, comma, or quote. Check the file in a text editor or JSON validator before loading it.\n\nError: " + e.message }); }
  };

  const handleImportAnimations = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { handleImportAnimationsData(JSON.parse(stripJsonComments(ev.target.result))); }
      catch(e) { setImportError({ title: "Invalid JSON syntax", body: "The file could not be parsed. This usually means the JSON has a syntax error — a missing bracket, comma, or quote. Check the file in a text editor or JSON validator before loading it.\n\nError: " + e.message }); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleUpload = useCallback(e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        if (img.width !== 64) { alert(`Invalid width: ${img.width}px. Must be exactly 64px.`); return; }
        if (img.height % 32 !== 0) { alert(`Invalid height: ${img.height}px. Must be a multiple of 32.`); return; }
        setImageEl(img);
        setTotalFrames((img.height / FRAME_H) * FRAMES_PER_ROW);
      };
      img.onerror = () => alert("Failed to load image. Make sure it is a valid PNG file.");
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const cur = animations[activeAnim] || animations[0];
  const hasLoadedAnimations = animations.some(a => a.name || a.frames.length > 0);
  const updateAnim = (k, v) => setAnimations(anims => { const a = [...anims]; a[activeAnim] = { ...a[activeAnim], [k]: v }; return a; });
  const addFrame = fi => setAnimations(anims => { const a = [...anims]; a[activeAnim] = { ...a[activeAnim], frames: [...a[activeAnim].frames, fi] }; return a; });
  const removeFrame = si => setAnimations(anims => { const a = [...anims]; const fr = [...a[activeAnim].frames]; fr.splice(si, 1); a[activeAnim] = { ...a[activeAnim], frames: fr }; return a; });
  const addAnimation = () => { setAnimations(a => [...a, { ...DEFAULT_ANIM, name: `Animation_${a.length}` }]); setActiveAnim(animations.length); };
  const removeAnimation = i => { setAnimations(a => a.filter((_, idx) => idx !== i)); setActiveAnim(Math.max(0, activeAnim - 1)); };

  const runSyntaxCheck = () => {
    const issues = [];
    const err = m => issues.push({ level: "error", msg: m });
    const warn = m => issues.push({ level: "warning", msg: m });
    if (animations.length === 0) err("No animations defined.");
    animations.forEach((a, i) => {
      if (!a.name) err(`Animation ${i + 1}: no name set.`);
      if (a.name && /\s/.test(a.name)) warn(`Animation "${a.name}": name contains spaces — must match schedule entry exactly.`);
      if (a.frames.length === 0) err(`Animation "${a.name || i + 1}": no frames selected.`);
      if (isNaN(Number(a.speed)) || Number(a.speed) <= 0) err(`Animation "${a.name || i + 1}": speed must be a number greater than 0.`);
      if (a.frames.some(f => f >= totalFrames)) err(`Animation "${a.name || i + 1}": contains frame number beyond spritesheet bounds.`);
    });
    const names = animations.map(a => a.name).filter(Boolean);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length > 0) err(`Duplicate animation names: ${[...new Set(dupes)].join(", ")}`);
    return issues;
  };

  const generate = () => {
    const entries = {};
    animations.forEach(a => { if (a.name && a.frames.length > 0) entries[a.name] = `${Number(a.speed)}/${a.frames.join(" ")}/${Number(a.loop)}`; });
    if (Object.keys(entries).length === 0) { setOutput("// No animations defined."); return; }
    if (output) setOutputBackup(output);
    setOutput(JSON.stringify({ Changes: [{ Action: "EditData", Target: "Data/AnimationDescriptions", Entries: entries }] }, null, 2));
  };

  const copy = () => {
    const tryClipboard = () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(output).then(() => {
          setCopied(true); setTimeout(() => setCopied(false), 2000);
        }).catch(() => fallbackCopy());
      } else { fallbackCopy(); }
    };
    const fallbackCopy = () => {
      const ta = document.createElement("textarea");
      ta.value = output;
      ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 2000); }
      catch { /* silent — user can still Ctrl+C the pre block */ }
      document.body.removeChild(ta);
    };
    tryClipboard();
  };

  return (
    <div style={{ background: "#0d0d1a", minHeight: "100vh", padding: 24, fontFamily: "monospace", color: "#e0e0f0" }}>

      {/* Import error modal */}
      {importError && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={() => setImportError(null)}>
          <div style={{ background: "#1a0a0a", border: "1px solid #cc4444", borderRadius: 10, padding: 28, maxWidth: 480, width: "90%" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ color: "#cc4444", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>⚠ Failed to load Animations.json</div>
            <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{importError.title}</div>
            <div style={{ color: "#9a6060", fontSize: 12, lineHeight: 1.8, marginBottom: 20, whiteSpace: "pre-wrap" }}>{importError.body}</div>
            <button onClick={() => setImportError(null)} style={{
              background: "#2a0a0a", border: "1px solid #cc4444", color: "#cc4444",
              borderRadius: 6, padding: "8px 24px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "monospace",
            }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ color: "#7b8cde", fontWeight: 700, fontSize: 18 }}>GODLY HAND</span>
          <span style={{ color: "#333355", fontSize: 12 }}>— Animation Builder</span>
          <span style={{ marginLeft: "auto", color: "#333355", fontSize: 11, border: "1px solid #2a2a4e", borderRadius: 4, padding: "2px 8px" }}>SNEAK PEEK</span>
        </div>
        <div style={{ color: "#555577", fontSize: 12, lineHeight: 1.6 }}>
          Upload your NPC spritesheet, build named animation sequences by clicking frames, and export a ready-to-use{" "}
          <code style={{ color: "#cc9944" }}>Animations.json</code>. Load an existing file to edit it.
          Animation names must match your schedule entries exactly.
        </div>
      </div>

      {/* Spritesheet requirements */}
      <div style={{ background: "#1a120a", border: "1px solid #4a3a0a", borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <div style={{ color: "#cc9944", fontWeight: 700, fontSize: 12, marginBottom: 6 }}>⚠ SPRITESHEET REQUIREMENTS</div>
        <div style={{ color: "#9a8060", fontSize: 12, lineHeight: 1.6 }}>
          Exactly <strong style={{ color: "#cc9944" }}>64px wide</strong>, multiple of <strong style={{ color: "#cc9944" }}>32px tall</strong>.
          Frames are 16×32px, 4 per row, numbered left→right top→bottom from 0.
          Animation names must match your schedule entries exactly.
          Spritesheet template credit: <strong style={{ color: "#cc9944" }}>Miss Coriel's NPC Creator</strong>.
        </div>
      </div>

      {/* Upload */}
      <Section title="Upload Spritesheet">
        <input ref={fileRef} type="file" accept="image/png" onChange={handleUpload} style={{ display: "none" }} />
        <input ref={animImportRef} type="file" accept=".json" onChange={handleImportAnimations} style={{ display: "none" }} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Btn primary onClick={() => fileRef.current.click()}>Choose PNG Spritesheet</Btn>
          <Btn onClick={() => animImportRef.current.click()}>📂 Load Animations.json</Btn>
          {imageEl && <span style={{ color: "#44cc44", fontSize: 12 }}>✓ {totalFrames} frames ({totalFrames / FRAMES_PER_ROW} rows)</span>}
          {animImportMsg && <span style={{ fontSize: 12, color: animImportMsg.startsWith("Loaded") ? "#44cc44" : "#cc4444" }}>{animImportMsg}</span>}
        </div>
      </Section>

      {/* No spritesheet notice — shown when animations loaded but no spritesheet */}
      {hasLoadedAnimations && !imageEl && (
        <div style={{ background: "#1a1a2e", border: "1px solid #4a4a9e", borderRadius: 8, padding: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#7b8cde", fontSize: 18 }}>ℹ</span>
          <div>
            <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 12, marginBottom: 3 }}>No spritesheet loaded</div>
            <div style={{ color: "#555577", fontSize: 12, lineHeight: 1.6 }}>
              You can check syntax and view animation data, but frame picking and live preview require a spritesheet PNG.
              Upload one with the <strong style={{ color: "#cc9944" }}>Choose PNG Spritesheet</strong> button above.
            </div>
          </div>
        </div>
      )}

      {/* Main grid — frame picker + animation editor */}
      {(imageEl || hasLoadedAnimations) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>

          {/* Left — frame grid + animation list */}
          <div>
            {/* Frame picker — only when spritesheet loaded */}
            {imageEl && (<Section title="Frame Picker — click to add to sequence">
              <div style={{ color: "#555577", fontSize: 11, marginBottom: 8 }}>
                <span style={{ color: "#7b8cde" }}>■</span> selected &nbsp;
                <span style={{ color: "#44aa44" }}>■</span> in sequence &nbsp;
                <span style={{ color: "#555577" }}>■</span> unused
              </div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${FRAMES_PER_ROW}, ${FRAME_W * DISPLAY_SCALE}px)`, gap: 4 }}>
                {Array.from({ length: totalFrames }, (_, i) => (
                  <FrameCanvas key={i} imageData={imageEl} frameIndex={i} size={DISPLAY_SCALE}
                    selected={selectedFrame === i} inSequence={cur.frames.includes(i)}
                    onClick={() => { setSelectedFrame(i); addFrame(i); }} />
                ))}
              </div>
            </Section>)}

            <Section title="Animations">
              {animations.map((anim, i) => (
                <div key={i} onClick={() => setActiveAnim(i)} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 12px", borderRadius: 4, marginBottom: 6, cursor: "pointer",
                  background: activeAnim === i ? "#2a2a6e" : "#0d0d1a",
                  border: `1px solid ${activeAnim === i ? "#4a4a9e" : "#2a2a4e"}`,
                }}>
                  <div>
                    <span style={{ color: activeAnim === i ? "#e0e0ff" : "#9aa0c0", fontWeight: 600, fontSize: 13 }}>{anim.name || "(unnamed)"}</span>
                    <span style={{ color: "#555577", fontSize: 11, marginLeft: 10 }}>{anim.frames.length} frames • {anim.speed}ms</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeAnimation(i); }} style={{ background: "transparent", border: "none", color: "#cc4444", cursor: "pointer", fontSize: 16, fontFamily: "monospace" }}>×</button>
                </div>
              ))}
              <button onClick={addAnimation} style={{ background: "transparent", border: "1px dashed #2a2a4e", color: "#555577", borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: 12, width: "100%", fontFamily: "monospace" }}>+ New Animation</button>
            </Section>
          </div>

          {/* Right — animation editor + preview */}
          <div>
            <div style={{ background: "#1a1a2e", border: "1px solid #4a4a9e", borderRadius: 8, padding: 16, position: "sticky", top: 20 }}>
              <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                Editing: {cur.name || "(unnamed)"}
              </div>
              <div style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 6, padding: 12, marginBottom: 14, textAlign: "center" }}>
                {imageEl
                  ? <AnimPreview imageData={imageEl} frames={cur.frames} speed={cur.speed} />
                  : <div style={{ color: "#333355", fontSize: 11, padding: "12px 0" }}>Upload a spritesheet to enable preview</div>
                }
              </div>
              <Field label="Name" hint="Must match schedule entry exactly">
                <input style={IS} value={cur.name} onChange={e => updateAnim("name", e.target.value)} placeholder="Arcade" />
              </Field>
              <Field
                label="Speed (ticks)"
                hint={cur.speed === "" || isNaN(Number(cur.speed)) || Number(cur.speed) <= 0 ? "⚠ Must be a number greater than 0" : `Game ticks per frame — divided by 10 in-game. ${Math.floor(Number(cur.speed) / 10)}ms per frame actual. Higher = slower.`}
                warn={cur.speed === "" || isNaN(Number(cur.speed)) || Number(cur.speed) <= 0}
              >
                <input
                  style={{ ...IS, border: `1px solid ${cur.speed === "" || isNaN(Number(cur.speed)) || Number(cur.speed) <= 0 ? "#cc4444" : "#2a2a4e"}` }}
                  type="text"
                  value={cur.speed}
                  onChange={e => {
                    const raw = e.target.value;
                    updateAnim("speed", raw);
                  }}
                  onBlur={e => {
                    const v = parseInt(e.target.value);
                    if (!isNaN(v) && v > 0) updateAnim("speed", v);
                  }}
                />
              </Field>
              <Field
                label="Loop Delay (ms)"
                hint={cur.loop === "" || isNaN(Number(cur.loop)) || Number(cur.loop) < 0 ? "⚠ Must be a number 0 or greater" : "Pause before restarting. 20000 = slow loop."}
                warn={cur.loop === "" || isNaN(Number(cur.loop)) || Number(cur.loop) < 0}
              >
                <input
                  style={{ ...IS, border: `1px solid ${cur.loop === "" || isNaN(Number(cur.loop)) || Number(cur.loop) < 0 ? "#cc4444" : "#2a2a4e"}` }}
                  type="text"
                  value={cur.loop}
                  onChange={e => {
                    const raw = e.target.value;
                    updateAnim("loop", raw);
                  }}
                  onBlur={e => {
                    const v = parseInt(e.target.value);
                    if (!isNaN(v) && v >= 0) updateAnim("loop", v);
                  }}
                />
              </Field>
              <Field label={`Sequence (${cur.frames.length} frames)`} hint="Click frame numbers to remove">
                {cur.frames.length === 0
                  ? <div style={{ color: "#555577", fontSize: 12 }}>Click frames in the grid to add</div>
                  : <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                    {cur.frames.map((fr, i) => (
                      <div key={i} onClick={() => removeFrame(i)} title="Click to remove" style={{
                        background: "#2a2a6e", border: "1px solid #4a4a9e", borderRadius: 3,
                        color: "#e0e0ff", fontSize: 11, padding: "2px 8px", cursor: "pointer",
                      }}>{fr}</div>
                    ))}
                  </div>
                }
              </Field>
              <Field label="Edit Raw" hint="Space-separated frame numbers">
                <input style={IS} value={cur.frames.join(" ")}
                  onChange={e => {
                    const fr = e.target.value.split(/\s+/).map(Number).filter(n => !isNaN(n) && n >= 0 && n < totalFrames);
                    updateAnim("frames", fr);
                  }}
                  placeholder="0 1 2 1" />
              </Field>
              {cur.frames.length > 0 && (
                <div style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 4, padding: 10 }}>
                  <div style={{ color: "#555577", fontSize: 11, marginBottom: 4 }}>Output string</div>
                  <code style={{ color: "#7b8cde", fontSize: 11, wordBreak: "break-all" }}>
                    {`"${cur.name}": "${cur.speed}/${cur.frames.join(" ")}/${cur.loop}"`}
                  </code>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Syntax check + generate */}
      {(imageEl || hasLoadedAnimations) && (
        <div style={{ marginTop: 20 }}>
          {animSyntaxRan && (() => {
            const issues = runSyntaxCheck();
            return (
              <div style={{ marginBottom: 10, background: "#0d0d1a", border: `1px solid ${issues.length === 0 ? "#2a6a2a" : issues.some(i => i.level === "error") ? "#4a1a1a" : "#4a3a0a"}`, borderRadius: 8, padding: 14 }}>
                {issues.length === 0
                  ? <div style={{ color: "#44cc44", fontWeight: 700, fontSize: 13 }}>✓ No issues found</div>
                  : <>
                    <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                      {issues.filter(i => i.level === "error").length} errors • {issues.filter(i => i.level === "warning").length} warnings
                    </div>
                    {issues.map((issue, idx) => (
                      <div key={idx} style={{ background: issue.level === "error" ? "#2a0a0a" : "#1a1a0a", border: `1px solid ${issue.level === "error" ? "#4a1a1a" : "#4a3a0a"}`, borderRadius: 4, padding: "6px 10px", marginBottom: 5, color: issue.level === "error" ? "#cc4444" : "#cc9944", fontSize: 12 }}>
                        {issue.level === "error" ? "✖" : "⚠"} {issue.msg}
                      </div>
                    ))}
                  </>
                }
              </div>
            );
          })()}
          <button onClick={() => { setAnimSyntaxRan(true); setAnimSyntaxPopup(runSyntaxCheck()); }} style={{
            width: "100%", padding: "10px", borderRadius: 6, cursor: "pointer",
            background: "#1a2a1a", border: "2px solid #2a6a2a",
            color: "#44cc88", fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 8, fontFamily: "monospace",
          }}>🔍 Check Syntax Before Generating</button>
          {animSyntaxPopup !== null && <SyntaxPopup issues={animSyntaxPopup} onClose={() => setAnimSyntaxPopup(null)} />}
          {imageEl
            ? <Btn primary full onClick={generate}>Generate Animations.json</Btn>
            : <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 6, padding: "10px 14px", textAlign: "center", color: "#555577", fontSize: 12 }}>
                Upload a spritesheet to enable generation
              </div>
          }
          <OutputBlock output={output} onCopy={copy} copied={copied} backup={outputBackup} />
        </div>
      )}

      <div style={{ marginTop: 24, borderTop: "1px solid #1a1a2e", paddingTop: 12, color: "#333355", fontSize: 11, textAlign: "center" }}>
        Spritesheet format: Miss Coriel's NPC Creator &nbsp;·&nbsp; Godly Hand by Aerishiph
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// GUIDE TAB
// ═══════════════════════════════════════════════
function Guide() {
  return (
    <div style={{ maxWidth: 820 }}>

      {/* What is this */}
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>What is this?</div>
        <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>
          This tool has two parts. The <strong style={{color:"#7b8cde"}}>Animation Builder</strong> lets you upload a spritesheet,
          click frames to build named animation sequences, and export a ready-to-use <code style={{ color: "#cc9944" }}>Animations.json</code> file.
          The <strong style={{color:"#44cc44"}}>Sprite Maker</strong> lets you draw your spritesheet from scratch using a pixel editor with layers,
          then export it as a PNG ready to load straight into the Animation Builder.
          Use them together — draw in Sprite Maker, export the sheet, load it into Animation Builder, build your animations.
        </div>
      </div>

      {/* Key concepts */}
      <div style={{ color: "#9aa0c0", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
        Key Concepts
      </div>

      {[
        {
          term: "Spritesheet",
          color: "#cc9944",
          body: "Your NPC's spritesheet is a single PNG image that contains all of their animation frames laid out in a grid. It must be exactly 64px wide. Each frame is 16px wide and 32px tall, with 4 frames per row. The game reads this file to know how to draw your NPC.",
        },
        {
          term: "Frame",
          color: "#cc9944",
          body: "A frame is one individual image of your NPC in a specific pose. Frames are numbered from 0 starting at the top-left of the spritesheet, going left to right, then down to the next row. So frames 0-3 are the first row, frames 4-7 are the second row, and so on.",
        },
        {
          term: "Animation sequence",
          color: "#cc9944",
          body: "An animation is a named list of frame numbers that play in order. For example, the sequence 16 17 18 17 plays frames 16, 17, 18, then 17 again before looping. You can repeat frames, go backwards, or use the same frame multiple times to control timing.",
        },
        {
          term: "Animation name",
          color: "#7b8cde",
          body: "Every animation must have a name. This name is what you reference in your NPC's schedule file. If your schedule says Nicholas goes to play Arcade at 9am, the animation name must be exactly Arcade — spelling, capitalisation, and all. One wrong character and the game won't find it.",
        },
        {
          term: "Speed",
          color: "#7b8cde",
          body: "Speed is measured in game ticks — the game divides this number by 10 to get the actual milliseconds per frame. So speed=100 = 10ms per frame (fast), speed=1000 = 100ms per frame (moderate), speed=2000 = 200ms per frame (slow). Most NPC animations sit around 100-400 ticks. The live preview matches in-game speed exactly.",
        },
        {
          term: "Loop delay",
          color: "#7b8cde",
          body: "Loop delay is how long the animation pauses before starting again from the beginning. The default of 20000ms (20 seconds) means there is a long gap between loops — good for idle animations that should play occasionally rather than constantly. Set it lower for something that loops continuously.",
        },
        {
          term: "Animations.json",
          color: "#44cc44",
          body: "The file this tool generates. It is a Content Patcher patch that adds your animations to the game's Data/AnimationDescriptions list. Place it in your mod folder and reference it from your content.json. The file can hold as many named animations as you need.",
        },
        {
          term: "Sprite Maker — the drawing tool",
          color: "#44cc44",
          body: "The Sprite Maker tab lets you draw your NPC's spritesheet frame by frame using a pixel editor. Draw one frame, copy it to a sheet slot, draw the next. Each slot corresponds to a row in the final spritesheet. Frames fill left to right across four columns — exactly how Stardew reads them. When done, export the whole sheet as a single 64px wide PNG. That PNG is what you load into the Animation Builder.",
        },
        {
          term: "Layers in the Sprite Maker",
          color: "#44cc44",
          body: "Each frame has separate layers — Skin, Hair, Clothes, Details by default. Paint on each layer independently. They composite together on the canvas. When you copy a frame to the sheet, all layers are saved. You can load a slot back and still edit the skin separately from the hair. The final export flattens all visible layers into one PNG.",
        },
      ].map(item => (
        <div key={item.term} style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: 14, marginBottom: 10 }}>
          <div style={{ color: item.color, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{item.term}</div>
          <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.7 }}>{item.body}</div>
        </div>
      ))}

      {/* Step by step */}
      <div style={{ color: "#9aa0c0", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, marginTop: 24 }}>
        Step by Step — Animation Builder
      </div>

      {[
        {
          n: "1",
          title: "Prepare your spritesheet",
          body: "Your spritesheet PNG must be exactly 64px wide and a multiple of 32px tall. If you are using Miss Coriel's NPC Creator template this is already the correct format. The first four rows (frames 0-15) are the walk cycles the game always uses. Your custom animations go in the rows below that.",
          note: "Check the Spritesheet Ref tab for a full diagram showing which row does what, including which frame numbers are hardcoded by the game for things like the kiss animation.",
        },
        {
          n: "2",
          title: "Upload your spritesheet",
          body: "Click Choose PNG Spritesheet and select your spritesheet file. The tool will slice it into individual frames and display them all in a grid. You will see each frame rendered from your actual image. If you get an error about width or height, check that your PNG is exactly 64px wide and a multiple of 32px tall.",
          note: null,
        },
        {
          n: "3",
          title: "Load an existing Animations.json (optional)",
          body: "If you already have an Animations.json you want to edit, click Load Animations.json and select it. All your existing animations will load into the builder ready to modify. If you are starting from scratch skip this step.",
          note: null,
        },
        {
          n: "4",
          title: "Name your animation",
          body: "In the editor panel on the right, type the name of your animation. This must exactly match what you write in your schedule file. For example if your schedule says 1000 Town 35 70 2 Arcade, the animation name must be Arcade. No spaces allowed — the game will not find it.",
          note: "You can add multiple animations by clicking + New Animation at the bottom of the animation list. Each gets its own name, frame sequence, speed, and loop delay.",
        },
        {
          n: "5",
          title: "Build your frame sequence",
          body: "Click frames in the grid to add them to your sequence one at a time. Frames highlight blue when selected and green when they are already in the current sequence. The sequence builds up in the editor panel on the right where you can see each frame number. Click any frame number in the sequence list to remove it. You can also type the sequence directly into the Edit Raw field as space-separated numbers.",
          note: null,
        },
        {
          n: "6",
          title: "Set speed and loop delay",
          body: "Adjust the Speed field to control how fast the animation plays. Lower numbers are faster. The live preview at the top of the editor panel updates in real time so you can see exactly what the animation looks like before you export. Adjust Loop Delay if you want a pause between loops.",
          note: null,
        },
        {
          n: "7",
          title: "Check syntax and generate",
          body: "When all your animations are ready, click Check Syntax Before Generating. This will catch common problems — missing names, empty sequences, duplicate animation names, frame numbers outside the spritesheet bounds. Fix any errors shown, then click Generate Animations.json to produce the output.",
          note: "The tool keeps a backup of your previous output every time you regenerate. If you accidentally overwrite something you wanted, click Show Backup to retrieve it.",
        },
        {
          n: "8",
          title: "Copy or save the output",
          body: "Copy the generated JSON from the output box and paste it into your Animations.json file in your mod folder. Make sure your content.json has a Load entry pointing to it. Then test in-game by triggering the schedule entry that uses the animation name.",
          note: null,
        },
      ].map(step => (
        <div key={step.n} style={{ display: "flex", gap: 16, marginBottom: 14 }}>
          <div style={{
            minWidth: 28, height: 28, borderRadius: "50%",
            background: "#1a1a3a", border: "1px solid #4a4a9e",
            color: "#7b8cde", fontWeight: 700, fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>{step.n}</div>
          <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: "12px 14px", flex: 1 }}>
            <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{step.title}</div>
            <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>{step.body}</div>
            {step.note && (
              <div style={{ marginTop: 8, background: "#0d0d1a", borderLeft: "3px solid #4a4a9e", padding: "6px 10px", borderRadius: "0 4px 4px 0" }}>
                <span style={{ color: "#7b8cde", fontSize: 11, lineHeight: 1.6 }}>{step.note}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Sprite Maker steps */}
      <div style={{ color: "#9aa0c0", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, marginTop: 24 }}>
        Step by Step — Sprite Maker
      </div>

      {[
        {
          n: "1",
          title: "Open the Sprite Maker tab",
          body: "Click Sprite Maker in the top bar. You will see the drawing canvas, the color and tool panel on the left, the layer panel and sheet slots on the right. The canvas is your 16×32 working area for one frame at a time.",
          note: null,
        },
        {
          n: "2",
          title: "Choose a template or start from scratch",
          body: "Click the Template button in the tools panel to load a base sprite. Pick Adult or Child and select one of the four walking direction frames as your starting point. The template pixels load into the active layer and are fully editable. Or skip this and start drawing from a blank canvas.",
          note: "Templates load into whichever layer is currently active. Load the base body into the Skin layer, then switch to Hair before loading or drawing hair.",
        },
        {
          n: "3",
          title: "Paint using layers",
          body: "The default layers are Skin, Hair, Clothes, and Details. Click a layer in the layer panel to make it active — only the active layer gets painted on. Use the Draw, Erase, and Fill tools as needed. Adjust Opacity to blend colours. Use Lasso to select pixels and drag them to a new position.",
          note: "Toggle layer visibility with the eye icon to see individual layers in isolation. Add custom layers with the + button.",
        },
        {
          n: "4",
          title: "Check the Assembly tab",
          body: "Switch to the Assembly sub-tab at any time to see your frame composited at multiple zoom levels. All visible layers are shown stacked together exactly as they will look in the final export. You can toggle layers on and off from here too.",
          note: null,
        },
        {
          n: "5",
          title: "Copy to sheet",
          body: "When the frame looks right, click Copy to sheet. The frame is saved as a slot in the Sheet panel on the right. The slot shows a preview, a frame number (f0–f3, f4–f7, etc.), and the corresponding row label from the spritesheet reference. The canvas clears ready for the next frame.",
          note: "Frames fill left to right, four per row — exactly how Stardew reads the spritesheet. Your first four slots are frames 0–3 (row 0, Front Walk). The fifth slot starts row 1 at frame 4.",
        },
        {
          n: "6",
          title: "Edit, move, or delete slots",
          body: "Click the pencil icon on any slot to load it back into the canvas with all its layers intact. Edit it, then click Save to slot. Use the arrow buttons to reorder slots. The × button deletes a slot after confirmation.",
          note: null,
        },
        {
          n: "7",
          title: "Load an existing spritesheet to edit",
          body: "If you already have a spritesheet PNG, click Load Sheet to Edit. The tool validates it is 64px wide and slices it into individual frames. Each frame becomes a slot with a Base layer containing the original pixels, plus empty Hair, Clothes, and Details layers ready to paint on.",
          note: null,
        },
        {
          n: "8",
          title: "Export the spritesheet",
          body: "When all your frames are in the sheet panel, click Download Spritesheet PNG. The tool assembles all frames into a single 64px wide PNG with 4 frames per row — the standard Stardew Valley spritesheet format. Load this PNG into the Animation Builder tab to start building animation sequences.",
          note: null,
        },
      ].map(step => (
        <div key={step.n} style={{ display: "flex", gap: 16, marginBottom: 14 }}>
          <div style={{
            minWidth: 28, height: 28, borderRadius: "50%",
            background: "#1a1a3a", border: "1px solid #4a4a9e",
            color: "#7b8cde", fontWeight: 700, fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>{step.n}</div>
          <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: "12px 14px", flex: 1 }}>
            <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{step.title}</div>
            <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>{step.body}</div>
            {step.note && (
              <div style={{ marginTop: 8, background: "#0d0d1a", borderLeft: "3px solid #44cc44", padding: "6px 10px", borderRadius: "0 4px 4px 0" }}>
                <span style={{ color: "#44cc44", fontSize: 11, lineHeight: 1.6 }}>{step.note}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Common mistakes */}
      <div style={{ color: "#9aa0c0", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, marginTop: 24 }}>
        Common Mistakes
      </div>

      {[
        { icon: "✖", color: "#cc4444", title: "Animation name doesn't match the schedule", body: "The most common problem. The name in this tool and the name in your schedule must be character-for-character identical. Check capitalisation. Arcade and arcade are different names to the game." },
        { icon: "✖", color: "#cc4444", title: "Spritesheet wrong size", body: "The tool will reject the file if it is not exactly 64px wide or not a multiple of 32px tall. Check your image dimensions in any image editor before uploading." },
        { icon: "⚠", color: "#cc9944", title: "Using frame 28 for a custom animation on an adult NPC", body: "Frame 28 is hardcoded by the game for the kiss animation on adult NPCs. If you put custom frames there they will be overridden. Use a different row for your custom animation. Check the Spritesheet Ref tab for all hardcoded slots." },
        { icon: "⚠", color: "#cc9944", title: "Animation plays once and stops", body: "If your loop delay is very high, the animation plays through once and then waits a long time before looping. Lower the loop delay or set it to match your frame count times the speed for a seamless loop." },
        { icon: "⚠", color: "#cc9944", title: "Frames look wrong in game but fine in preview", body: "Make sure you are loading the correct spritesheet — the same file your mod uses in game. If the mod replaces the spritesheet at runtime the preview will show the base file, not the final result." },
      ].map((item, i) => (
        <div key={i} style={{ background: "#1a1a2e", border: `1px solid ${item.color}44`, borderLeft: `3px solid ${item.color}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
            <span style={{ color: item.color, fontSize: 13 }}>{item.icon}</span>
            <span style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13 }}>{item.title}</span>
          </div>
          <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.7 }}>{item.body}</div>
        </div>
      ))}

    </div>
  );
}



const SKIN_TONES = [
  "#FDDBB4","#F5C28B","#E8A96A","#D4845A","#C06840","#A0522D","#7B3F20","#4A2511",
  "#FFCBA4","#F0B07A","#D4956A","#B87350","#8B4513","#6B3410",
];
const HAIR_COLORS = [
  "#1C1008","#3B2314","#6B3A2A","#8B4513","#A0522D","#C68642","#D4A017",
  "#F5DEB3","#FAF0E6","#708090","#C0C0C0","#FFFFFF",
  "#8B0000","#FF4500","#FF8C00","#FFD700","#228B22","#00008B","#800080","#FF1493",
];

const TEMPLATE_ADULT_B64 = "data:image/png;base64,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";
const TEMPLATE_CHILD_B64 = "data:image/png;base64,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";
const TEMPLATE_ROW_LABELS = ["Walking Front","Walking Right","Walking Back","Walking Left"];

const DEFAULT_LAYERS = () => [
  { id:1, name:"Skin",    visible:true, pixels:new Array(16*32).fill(null) },
  { id:2, name:"Hair",    visible:true, pixels:new Array(16*32).fill(null) },
  { id:3, name:"Clothes", visible:true, pixels:new Array(16*32).fill(null) },
  { id:4, name:"Details", visible:true, pixels:new Array(16*32).fill(null) },
];

const SHEET_REF = [
  "Front Walk","Right Walk","Back Walk","Left Walk",
  "Row 4","Row 5","Row 6","Row 7","Row 8","Row 9","Row 10","Row 11","Row 12","Row 13","Row 14","Row 15",
];

function LoadFramePreview({ pixels, scale }) {
  const W=16,H=32;
  const ref = useRef(null);
  useEffect(() => {
    const canvas=ref.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"); ctx.clearRect(0,0,W*scale,H*scale);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const c=pixels[y*W+x];
      ctx.fillStyle=c||(((x+y)%2===0)?"#2a2a3a":"#1a1a2a");
      ctx.fillRect(x*scale,y*scale,scale,scale);
    }
  }, [pixels,scale]);
  return <canvas ref={ref} width={W*scale} height={H*scale}
    style={{imageRendering:"pixelated",border:"1px solid #2a2a4e",borderRadius:2,display:"block"}} />;
}

function TemplateFramePreview({ src, frameIndex, scale }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0,0,16*scale,32*scale);
      ctx.drawImage(img,(frameIndex%4)*16,Math.floor(frameIndex/4)*32,16,32,0,0,16*scale,32*scale);
    };
    img.src = src;
  }, [src, frameIndex, scale]);
  return <canvas ref={ref} width={16*scale} height={32*scale}
    style={{ imageRendering:"pixelated",border:"1px solid #2a2a4e",borderRadius:3,display:"block",background:"#0d0d1a" }} />;
}

function SlotPreview({ layers, scale }) {
  const W=16,H=32;
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,W*scale,H*scale);
    for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
      ctx.fillStyle=(x+y)%2===0?"#2a2a3a":"#1a1a2a";
      ctx.fillRect(x*scale,y*scale,scale,scale);
    }
    for (const layer of layers) {
      if (!layer.visible) continue;
      for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
        const c=layer.pixels[y*W+x];
        if (c) { ctx.fillStyle=c; ctx.fillRect(x*scale,y*scale,scale,scale); }
      }
    }
  }, [layers, scale]);
  return <canvas ref={ref} width={W*scale} height={H*scale}
    style={{ imageRendering:"pixelated",border:"1px solid #2a2a4e",borderRadius:2,flexShrink:0 }} />;
}

function SpriteMaker({ onExportSheet, adultB64, childB64 }) {
  const PIXEL_SCALE=18, W=16, H=32;

  const [layers, setLayers]             = useState(DEFAULT_LAYERS);
  const [activeLayerId, setActiveLayerId] = useState(1);
  const [nextLayerId, setNextLayerId]   = useState(5);
  const [newLayerName, setNewLayerName] = useState("");
  const [activeColor, setActiveColor]   = useState("#FDDBB4");
  const [tool, setTool]                 = useState("draw");
  const [showGrid, setShowGrid]         = useState(true);
  const [opacity, setOpacity]           = useState(100);
  const [colorMode, setColorMode]       = useState("wheel");
  const [savedColors, setSavedColors]   = useState([]);
  const [lassoPhase, setLassoPhase]     = useState("idle");
  const [lassoPoints, setLassoPoints]   = useState([]);
  const [lassoSelection, setLassoSelection] = useState(null);
  const [lassoPixels, setLassoPixels]   = useState(null);
  const [lassoOffset, setLassoOffset]   = useState({x:0,y:0});
  const [lassoDragStart, setLassoDragStart] = useState(null);
  const [isDrawing, setIsDrawing]       = useState(false);
  const [slots, setSlots]               = useState([]);
  const [editingSlot, setEditingSlot]   = useState(null);
  const [slotToDelete, setSlotToDelete] = useState(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [showLoadSheet, setShowLoadSheet] = useState(false);
  const [loadSheetPreview, setLoadSheetPreview] = useState(null); // { img, frames: [{pixels}] }
  const loadSheetRef = React.useRef(null);
  const [templateType, setTemplateType] = useState("adult");
  const [spritTab, setSpritTab]         = useState("draw");
  const canvasRef = useRef(null);
  const previewRef = useRef(null);

  const getComposite = (layersArr, lSel, lPix, lOff) => {
    const flat = new Array(W*H).fill(null);
    for (const layer of (layersArr||layers)) {
      if (!layer.visible) continue;
      for (let i=0;i<W*H;i++) if (layer.pixels[i]) flat[i]=layer.pixels[i];
    }
    if (lSel&&lPix) {
      lSel.forEach(key => { const[x,y]=key.split(",").map(Number); flat[y*W+x]=null; });
      lPix.forEach((c,key) => {
        const[x,y]=key.split(",").map(Number);
        const nx=x+(lOff||{x:0}).x, ny=y+(lOff||{y:0}).y;
        if (nx>=0&&nx<W&&ny>=0&&ny<H) flat[ny*W+nx]=c;
      });
    }
    return flat;
  };

  useEffect(() => {
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    ctx.clearRect(0,0,W*PIXEL_SCALE,H*PIXEL_SCALE);
    const flat=getComposite(layers,lassoSelection,lassoPixels,lassoOffset);
    for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
      const c=flat[y*W+x];
      ctx.fillStyle=c||(((x+y)%2===0)?"#2a2a3a":"#1a1a2a");
      ctx.fillRect(x*PIXEL_SCALE,y*PIXEL_SCALE,PIXEL_SCALE,PIXEL_SCALE);
    }
    if (showGrid) {
      ctx.strokeStyle="rgba(255,255,255,0.07)"; ctx.lineWidth=0.5;
      for(let x=0;x<=W;x++){ctx.beginPath();ctx.moveTo(x*PIXEL_SCALE,0);ctx.lineTo(x*PIXEL_SCALE,H*PIXEL_SCALE);ctx.stroke();}
      for(let y=0;y<=H;y++){ctx.beginPath();ctx.moveTo(0,y*PIXEL_SCALE);ctx.lineTo(W*PIXEL_SCALE,y*PIXEL_SCALE);ctx.stroke();}
    }
    if (lassoPhase==="drawing"&&lassoPoints.length>1) {
      ctx.strokeStyle="rgba(123,140,222,0.9)"; ctx.lineWidth=1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(lassoPoints[0].x*PIXEL_SCALE,lassoPoints[0].y*PIXEL_SCALE);
      lassoPoints.forEach(p=>ctx.lineTo(p.x*PIXEL_SCALE,p.y*PIXEL_SCALE));
      ctx.stroke(); ctx.setLineDash([]);
    }
    if ((lassoPhase==="selected"||lassoPhase==="moving")&&lassoSelection) {
      ctx.fillStyle="rgba(123,140,222,0.2)"; ctx.strokeStyle="#7b8cde"; ctx.lineWidth=1;
      lassoSelection.forEach(key=>{
        const[x,y]=key.split(",").map(Number);
        const nx=x+lassoOffset.x, ny=y+lassoOffset.y;
        if(nx>=0&&nx<W&&ny>=0&&ny<H){
          ctx.fillRect(nx*PIXEL_SCALE,ny*PIXEL_SCALE,PIXEL_SCALE,PIXEL_SCALE);
          ctx.strokeRect(nx*PIXEL_SCALE+0.5,ny*PIXEL_SCALE+0.5,PIXEL_SCALE-1,PIXEL_SCALE-1);
        }
      });
    }
  }, [layers,showGrid,lassoPhase,lassoPoints,lassoSelection,lassoPixels,lassoOffset]);

  useEffect(() => {
    const canvas=previewRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"); ctx.clearRect(0,0,W,H);
    const flat=getComposite(layers,lassoSelection,lassoPixels,lassoOffset);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++) { const c=flat[y*W+x]; if(c){ctx.fillStyle=c;ctx.fillRect(x,y,1,1);} }
  }, [layers,lassoSelection,lassoPixels,lassoOffset]);

  const hexToRgb = hex => ({r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)});
  const blendColor = (base,top,a) => {
    if(!base) return top;
    const al=a/100, br=hexToRgb(base), tr=hexToRgb(top);
    const r=Math.round(br.r*(1-al)+tr.r*al),g=Math.round(br.g*(1-al)+tr.g*al),b=Math.round(br.b*(1-al)+tr.b*al);
    return "#"+r.toString(16).padStart(2,"0")+g.toString(16).padStart(2,"0")+b.toString(16).padStart(2,"0");
  };
  const getPixel = e => {
    const rect=canvasRef.current.getBoundingClientRect();
    return {x:Math.floor((e.clientX-rect.left)/PIXEL_SCALE),y:Math.floor((e.clientY-rect.top)/PIXEL_SCALE)};
  };
  const getActiveLayer = () => layers.find(l=>l.id===activeLayerId);
  const updateActive = fn => setLayers(prev=>prev.map(l=>l.id===activeLayerId?{...l,pixels:fn(l.pixels)}:l));

  const floodFill = (idx,newColor) => {
    const layer=getActiveLayer(); if(!layer) return;
    const px=[...layer.pixels]; const target=px[idx]; if(target===newColor) return;
    const stack=[idx];
    while(stack.length){
      const i=stack.pop(); if(i<0||i>=W*H||px[i]!==target) continue;
      px[i]=newColor;
      const x=i%W,y=Math.floor(i/W);
      if(x>0)stack.push(i-1);if(x<W-1)stack.push(i+1);if(y>0)stack.push(i-W);if(y<H-1)stack.push(i+W);
    }
    setLayers(prev=>prev.map(l=>l.id===activeLayerId?{...l,pixels:px}:l));
  };

  const paintAt = (x,y) => {
    if(x<0||x>=W||y<0||y>=H) return;
    const idx=y*W+x;
    if(tool==="fill"){floodFill(idx,blendColor(null,activeColor,opacity));return;}
    if(tool==="erase"){updateActive(p=>{const n=[...p];n[idx]=null;return n;});return;}
    updateActive(p=>{const n=[...p];n[idx]=blendColor(p[idx],activeColor,opacity);return n;});
  };

  const getLassoSet = pts => {
    const inPoly=(px,py)=>{
      let inside=false;
      for(let i=0,j=pts.length-1;i<pts.length;j=i++){
        const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y;
        if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
      }
      return inside;
    };
    const sel=new Set();
    for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(inPoly(x+0.5,y+0.5)) sel.add(x+","+y);
    return sel;
  };

  const commitLasso = () => {
    if(!lassoSelection||!lassoPixels) return;
    updateActive(prev=>{
      const n=[...prev];
      lassoSelection.forEach(key=>{const[x,y]=key.split(",").map(Number);n[y*W+x]=null;});
      lassoPixels.forEach((c,key)=>{
        const[x,y]=key.split(",").map(Number);
        const nx=x+lassoOffset.x,ny=y+lassoOffset.y;
        if(nx>=0&&nx<W&&ny>=0&&ny<H) n[ny*W+nx]=c;
      });
      return n;
    });
    setLassoPhase("idle");setLassoSelection(null);setLassoPixels(null);setLassoOffset({x:0,y:0});
  };

  const handleDown = e => {
    const{x,y}=getPixel(e);
    if(tool==="lasso"){
      if(lassoPhase==="selected"&&lassoSelection&&lassoSelection.has((x+lassoOffset.x)+","+(y+lassoOffset.y))){
        // clicking on the floating selection to drag it
        setLassoPhase("moving");setLassoDragStart({x,y});
      } else if(lassoPhase==="selected"){
        commitLasso();setLassoPhase("drawing");setLassoPoints([{x,y}]);
      } else if(lassoPhase==="moving"){
        setLassoDragStart({x,y});
      } else {
        setLassoPhase("drawing");setLassoPoints([{x,y}]);
        setLassoSelection(null);setLassoPixels(null);setLassoOffset({x:0,y:0});
      }
    } else { setIsDrawing(true); paintAt(x,y); }
  };

  const handleMove = e => {
    const{x,y}=getPixel(e);
    if(tool==="lasso"){
      if(lassoPhase==="drawing") setLassoPoints(prev=>[...prev,{x,y}]);
      else if(lassoPhase==="moving"&&lassoDragStart){
        const dx=x-lassoDragStart.x,dy=y-lassoDragStart.y;
        if(dx||dy){setLassoOffset(prev=>({x:prev.x+dx,y:prev.y+dy}));setLassoDragStart({x,y});}
      }
    } else if(isDrawing) paintAt(x,y);
  };

  const handleUp = () => {
    if(tool==="lasso"){
      if(lassoPhase==="drawing"&&lassoPoints.length>2){
        const sel=getLassoSet(lassoPoints);
        const layer=getActiveLayer();
        const captured=new Map();
        sel.forEach(key=>{const[x,y]=key.split(",").map(Number);captured.set(key,layer?layer.pixels[y*W+x]:null);});
        setLassoSelection(sel);setLassoPixels(captured);setLassoOffset({x:0,y:0});setLassoPhase("selected");setLassoPoints([]);
      } else if(lassoPhase==="moving"){
        setLassoPhase("selected");setLassoDragStart(null);
      }
    } else setIsDrawing(false);
  };

  const loadTemplate = (type,fi) => {
    const src=type==="adult"?adultB64:childB64;
    const img=new Image();
    img.onload=()=>{
      const oc=document.createElement("canvas");oc.width=16;oc.height=32;
      const ctx=oc.getContext("2d");ctx.imageSmoothingEnabled=false;
      ctx.drawImage(img,(fi%4)*16,Math.floor(fi/4)*32,16,32,0,0,16,32);
      const id=ctx.getImageData(0,0,16,32);
      const px=new Array(16*32).fill(null);
      for(let i=0;i<512;i++){
        const r=id.data[i*4],g=id.data[i*4+1],b=id.data[i*4+2],a=id.data[i*4+3];
        if(a>128) px[i]="#"+r.toString(16).padStart(2,"0")+g.toString(16).padStart(2,"0")+b.toString(16).padStart(2,"0");
      }
      setLayers(prev=>prev.map(l=>l.id===activeLayerId?{...l,pixels:px}:l));
      setShowTemplate(false);
    };
    img.src=src;
  };

  const copyToSlot = () => {
    if(lassoPhase==="selected"||lassoPhase==="moving") commitLasso();
    const snap=layers.map(l=>({...l,pixels:[...l.pixels]}));
    if(editingSlot!==null){
      setSlots(prev=>prev.map(s=>s.id===editingSlot?{...s,layers:snap}:s));
      setEditingSlot(null);
    } else {
      setSlots(prev=>[...prev,{layers:snap,id:Date.now()}]);
    }
    setLayers(DEFAULT_LAYERS());
    setLassoPhase("idle");setLassoSelection(null);setLassoPixels(null);setLassoOffset({x:0,y:0});
  };

  const handleLoadSheet = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Accept 16px wide (single column) or 64px wide (4 frames per row — standard Stardew format)
        const cols = img.width === 64 ? 4 : img.width === 16 ? 1 : 0;
        if (cols === 0) {
          alert("Spritesheet must be 64px wide (standard Stardew format) or 16px wide. This file is " + img.width + "px wide.");
          return;
        }
        if (img.height % 32 !== 0) {
          alert("Spritesheet height must be a multiple of 32px. This file is " + img.height + "px tall.");
          return;
        }
        const rows = img.height / 32;
        const frameCount = rows * cols;
        const oc = document.createElement("canvas"); oc.width=16; oc.height=32;
        const ctx = oc.getContext("2d"); ctx.imageSmoothingEnabled = false;
        const frames = [];
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            ctx.clearRect(0,0,16,32);
            ctx.drawImage(img, col*16, row*32, 16, 32, 0, 0, 16, 32);
            const id = ctx.getImageData(0,0,16,32);
            const px = new Array(16*32).fill(null);
            for (let j=0;j<512;j++) {
              const r=id.data[j*4],g=id.data[j*4+1],b=id.data[j*4+2],a=id.data[j*4+3];
              if (a>128) px[j]="#"+r.toString(16).padStart(2,"0")+g.toString(16).padStart(2,"0")+b.toString(16).padStart(2,"0");
            }
            frames.push(px);
          }
        }
        setLoadSheetPreview({ img: ev.target.result, frames, name: file.name, cols });
        setShowLoadSheet(true);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const importSheetFrames = (frames) => {
    // Each frame becomes a slot with a single "Base" layer containing all pixels
    const newSlots = frames.map((px, i) => ({
      id: Date.now() + i,
      layers: [
        { id:1, name:"Base",    visible:true, pixels:[...px] },
        { id:2, name:"Hair",    visible:true, pixels:new Array(16*32).fill(null) },
        { id:3, name:"Clothes", visible:true, pixels:new Array(16*32).fill(null) },
        { id:4, name:"Details", visible:true, pixels:new Array(16*32).fill(null) },
      ],
    }));
    setSlots(newSlots);
    setShowLoadSheet(false);
    setLoadSheetPreview(null);
  };

  const exportSheet = () => {
    if(!slots.length) return;
    // Stardew format: 64px wide, 4 frames per row, rows stack downward
    // Minimum height is 128px (4 rows) even if fewer slots are filled
    const cols = 4;
    const rows = Math.max(4, Math.ceil(slots.length / cols));
    const canvas=document.createElement("canvas");
    canvas.width=W*cols;  // 64px
    canvas.height=H*rows; // 32px * rows, minimum 128px
    const ctx=canvas.getContext("2d");ctx.clearRect(0,0,canvas.width,canvas.height);
    slots.forEach((slot,i)=>{
      const col = i % cols;
      const row = Math.floor(i / cols);
      const flat=getComposite(slot.layers,null,null,null);
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const c=flat[y*W+x];
        if(c){ctx.fillStyle=c;ctx.fillRect(col*W+x,row*H+y,1,1);}
      }
    });
    const url=canvas.toDataURL("image/png");
    const a=document.createElement("a");a.href=url;a.download="spritesheet.png";
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    if(onExportSheet) onExportSheet(url);
  };

  const SLOT_SCALE=3;

  return (
    <div style={{fontFamily:"monospace",color:"#e0e0f0"}}>
      {/* Sub-tabs */}
      <div style={{display:"flex",marginBottom:14,borderBottom:"1px solid #2a2a4e"}}>
        {[["draw","🎨 Draw"],["assembly","🗂 Assembly"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSpritTab(id)} style={{
            background:"none",border:"none",borderBottom:`2px solid ${spritTab===id?"#7b8cde":"transparent"}`,
            color:spritTab===id?"#e0e0ff":"#555577",padding:"7px 14px",cursor:"pointer",
            fontSize:12,fontWeight:spritTab===id?700:400,fontFamily:"monospace",
          }}>{label}</button>
        ))}
      </div>

      {spritTab==="draw" && (
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto",gap:14,alignItems:"start"}}>

          {/* Left */}
          <div style={{width:176}}>
            {/* Color */}
            <div style={{background:"#1a1a2e",border:"1px solid #2a2a4e",borderRadius:7,padding:11,marginBottom:9}}>
              <div style={{color:"#7b8cde",fontWeight:700,fontSize:11,letterSpacing:2,textTransform:"uppercase",marginBottom:7}}>Color</div>
              <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:7}}>
                <div style={{width:30,height:30,background:activeColor,border:"2px solid #4a4a9e",borderRadius:3,flexShrink:0}} />
                <code style={{color:"#cc9944",fontSize:11}}>{activeColor}</code>
              </div>
              <div style={{display:"flex",gap:3,marginBottom:7}}>
                {[["wheel","🎨"],["skin","👤"],["hair","💇"]].map(([id,icon])=>(
                  <button key={id} onClick={()=>setColorMode(id)} style={{
                    flex:1,padding:"3px 0",fontSize:11,cursor:"pointer",fontFamily:"monospace",
                    background:colorMode===id?"#2a2a6e":"#0d0d1a",
                    border:`1px solid ${colorMode===id?"#4a4a9e":"#2a2a4e"}`,
                    color:colorMode===id?"#e0e0ff":"#555577",borderRadius:3,
                  }}>{icon}</button>
                ))}
              </div>
              {colorMode==="wheel" && <input type="color" value={activeColor} onChange={e=>setActiveColor(e.target.value)} style={{width:"100%",height:34,border:"none",borderRadius:3,cursor:"pointer",background:"none",padding:0}} />}
              {colorMode==="skin" && <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:3}}>{SKIN_TONES.map(c=><div key={c} onClick={()=>setActiveColor(c)} title={c} style={{width:"100%",paddingBottom:"100%",background:c,borderRadius:2,cursor:"pointer",border:`2px solid ${activeColor===c?"#7b8cde":"transparent"}`,boxSizing:"border-box"}} />)}</div>}
              {colorMode==="hair" && <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:3}}>{HAIR_COLORS.map(c=><div key={c} onClick={()=>setActiveColor(c)} title={c} style={{width:"100%",paddingBottom:"100%",background:c,borderRadius:2,cursor:"pointer",border:`2px solid ${activeColor===c?"#7b8cde":"transparent"}`,boxSizing:"border-box"}} />)}</div>}
              <button onClick={()=>!savedColors.includes(activeColor)&&setSavedColors(p=>[...p,activeColor])} style={{marginTop:5,width:"100%",background:"#1a1a3a",border:"1px solid #2a2a6e",color:"#7b8cde",borderRadius:3,padding:"3px 0",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>+ Save</button>
              {savedColors.length>0 && <div style={{marginTop:5,display:"flex",flexWrap:"wrap",gap:3}}>{savedColors.map((c,i)=><div key={i} onClick={()=>setActiveColor(c)} title={c} style={{width:17,height:17,background:c,borderRadius:2,cursor:"pointer",border:`2px solid ${activeColor===c?"#7b8cde":"transparent"}`}} />)}</div>}
            </div>
            {/* Tools */}
            <div style={{background:"#1a1a2e",border:"1px solid #2a2a4e",borderRadius:7,padding:11}}>
              <div style={{color:"#7b8cde",fontWeight:700,fontSize:11,letterSpacing:2,textTransform:"uppercase",marginBottom:7}}>Tools</div>
              {[["draw","✏️ Draw"],["erase","⬜ Erase"],["fill","🪣 Fill"],["lasso","🔲 Lasso"]].map(([id,label])=>(
                <button key={id} onClick={()=>{setTool(id);if(id!=="lasso")commitLasso();}} style={{
                  display:"block",width:"100%",padding:"5px 8px",borderRadius:3,cursor:"pointer",fontSize:11,
                  textAlign:"left",fontFamily:"monospace",marginBottom:3,
                  background:tool===id?"#2a2a6e":"#0d0d1a",
                  border:`1px solid ${tool===id?"#4a4a9e":"#2a2a4e"}`,
                  color:tool===id?"#e0e0ff":"#555577",
                }}>{label}</button>
              ))}
              {tool==="lasso" && (
                <div style={{marginTop:3,fontSize:10,color:"#555577",lineHeight:1.5}}>
                  {lassoPhase==="idle"&&"Draw to select."}
                  {lassoPhase==="drawing"&&"Drawing..."}
                  {lassoPhase==="selected"&&<span style={{color:"#7b8cde"}}>Drag selection to move.</span>}
                  {lassoPhase==="moving"&&<span style={{color:"#cc9944"}}>Moving...</span>}
                  {(lassoPhase==="selected"||lassoPhase==="moving")&&(
                    <div style={{display:"flex",gap:6,marginTop:3}}>
                      <button onClick={commitLasso} style={{background:"none",border:"none",color:"#44cc44",cursor:"pointer",fontSize:10,fontFamily:"monospace",padding:0}}>✓ Apply</button>
                      <button onClick={()=>{setLassoPhase("idle");setLassoSelection(null);setLassoPixels(null);setLassoOffset({x:0,y:0});}} style={{background:"none",border:"none",color:"#cc4444",cursor:"pointer",fontSize:10,fontFamily:"monospace",padding:0}}>✕ Cancel</button>
                    </div>
                  )}
                </div>
              )}
              <div style={{marginTop:8}}>
                <div style={{color:"#9aa0c0",fontSize:10,marginBottom:2}}>Opacity: {opacity}%</div>
                <input type="range" min="1" max="100" value={opacity} onChange={e=>setOpacity(Number(e.target.value))} style={{width:"100%",cursor:"pointer"}} />
              </div>
              <div style={{marginTop:7,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}} onClick={()=>setShowGrid(g=>!g)}>
                <div style={{width:13,height:13,border:"1px solid #4a4a9e",borderRadius:2,background:showGrid?"#2a2a6e":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {showGrid&&<span style={{color:"#7b8cde",fontSize:8}}>✓</span>}
                </div>
                <span style={{color:"#9aa0c0",fontSize:11}}>Grid</span>
              </div>
              <button onClick={()=>setLayers(prev=>prev.map(l=>l.id===activeLayerId?{...l,pixels:new Array(W*H).fill(null)}:l))} style={{marginTop:7,width:"100%",background:"#2a0a0a",border:"1px solid #4a1a1a",color:"#cc4444",borderRadius:3,padding:"3px 0",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>🗑 Clear Layer</button>
              <button onClick={()=>setShowTemplate(true)} style={{marginTop:4,width:"100%",background:"#1a2a1a",border:"1px solid #2a6a2a",color:"#44cc44",borderRadius:3,padding:"3px 0",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>📋 Template</button>
            </div>
          </div>

          {/* Centre */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
            <div style={{color:"#555577",fontSize:11}}>
              {editingSlot!==null
                ? <span style={{color:"#cc9944"}}>✏ Editing frame {slots.findIndex(s=>s.id===editingSlot)}</span>
                : <span>Layer: <span style={{color:"#7b8cde"}}>{getActiveLayer()?.name||"—"}</span></span>
              }
            </div>
            <canvas ref={canvasRef} width={W*PIXEL_SCALE} height={H*PIXEL_SCALE}
              style={{imageRendering:"pixelated",cursor:"crosshair",border:"1px solid #4a4a9e",borderRadius:4}}
              onMouseDown={handleDown} onMouseMove={handleMove} onMouseUp={handleUp}
              onMouseLeave={()=>{setIsDrawing(false);if(lassoPhase==="drawing"){setLassoPhase("idle");setLassoPoints([]);}}}
            />
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div>
                <div style={{color:"#555577",fontSize:9,marginBottom:2,textAlign:"center"}}>Preview</div>
                <canvas ref={previewRef} width={W} height={H} style={{imageRendering:"pixelated",border:"1px solid #2a2a4e",borderRadius:2,display:"block"}} />
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                <button onClick={copyToSlot} style={{background:"#0a2a0a",border:"1px solid #2a6a2a",color:"#44cc44",borderRadius:5,padding:"7px 13px",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"monospace"}}>{editingSlot!==null?"💾 Save to slot":"➕ Copy to sheet"}</button>
                {editingSlot!==null&&<button onClick={()=>{setEditingSlot(null);setLayers(DEFAULT_LAYERS());}} style={{background:"transparent",border:"1px solid #2a2a4e",color:"#555577",borderRadius:5,padding:"5px 13px",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>Cancel</button>}
              </div>
            </div>
          </div>

          {/* Right */}
          <div style={{width:196}}>
            {/* Layers */}
            <div style={{background:"#1a1a2e",border:"1px solid #2a2a4e",borderRadius:7,padding:11,marginBottom:9}}>
              <div style={{color:"#7b8cde",fontWeight:700,fontSize:11,letterSpacing:2,textTransform:"uppercase",marginBottom:7}}>Layers</div>
              <div style={{display:"flex",gap:4,marginBottom:7}}>
                <input value={newLayerName} onChange={e=>setNewLayerName(e.target.value)} placeholder="New layer..." onKeyDown={e=>e.key==="Enter"&&addLayer()}
                  style={{flex:1,background:"#0d0d1a",border:"1px solid #2a2a4e",borderRadius:3,color:"#e0e0f0",padding:"3px 5px",fontSize:11,fontFamily:"monospace"}} />
                <button onClick={addLayer} style={{background:"#1a1a3a",border:"1px solid #2a2a6e",color:"#7b8cde",borderRadius:3,padding:"3px 7px",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>+</button>
              </div>
              {[...layers].reverse().map((layer,ri)=>{
                const i=layers.length-1-ri;
                return (
                  <div key={layer.id} onClick={()=>setActiveLayerId(layer.id)} style={{
                    display:"flex",alignItems:"center",gap:5,padding:"5px 6px",borderRadius:3,marginBottom:3,cursor:"pointer",
                    background:activeLayerId===layer.id?"#2a2a6e":"#0d0d1a",
                    border:`1px solid ${activeLayerId===layer.id?"#4a4a9e":"#2a2a4e"}`,
                  }}>
                    <button onClick={e=>{e.stopPropagation();setLayers(prev=>prev.map(l=>l.id===layer.id?{...l,visible:!l.visible}:l));}} style={{background:"none",border:"none",cursor:"pointer",padding:0,fontSize:11,opacity:layer.visible?1:0.3}}>👁</button>
                    <span style={{flex:1,color:activeLayerId===layer.id?"#e0e0ff":"#9aa0c0",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{layer.name}</span>
                    <button onClick={e=>{e.stopPropagation();setLayers(prev=>{const a=[...prev];const idx=a.findIndex(l=>l.id===layer.id);if(idx>0){[a[idx],a[idx-1]]=[a[idx-1],a[idx]];}return a;});}} style={{background:"none",border:"none",color:"#555577",cursor:"pointer",fontSize:9,padding:0,fontFamily:"monospace"}}>↓</button>
                    <button onClick={e=>{e.stopPropagation();setLayers(prev=>{const a=[...prev];const idx=a.findIndex(l=>l.id===layer.id);if(idx<a.length-1){[a[idx],a[idx+1]]=[a[idx+1],a[idx]];}return a;});}} style={{background:"none",border:"none",color:"#555577",cursor:"pointer",fontSize:9,padding:0,fontFamily:"monospace"}}>↑</button>
                    <button onClick={e=>{e.stopPropagation();if(layers.length>1){setLayers(prev=>prev.filter(l=>l.id!==layer.id));if(activeLayerId===layer.id)setActiveLayerId(layers.find(l=>l.id!==layer.id)?.id||layers[0].id);}}} disabled={layers.length<=1} style={{background:"none",border:"none",color:layers.length<=1?"#2a2a2a":"#cc4444",cursor:layers.length<=1?"default":"pointer",fontSize:12,padding:0,fontFamily:"monospace"}}>×</button>
                  </div>
                );
              })}
            </div>
            {/* Sheet */}
            <div style={{background:"#1a1a2e",border:"1px solid #2a2a4e",borderRadius:7,padding:11}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                <div style={{color:"#7b8cde",fontWeight:700,fontSize:11,letterSpacing:2,textTransform:"uppercase"}}>Sheet ({slots.length})</div>
              </div>
              {slots.length===0&&<div style={{color:"#333355",fontSize:10,textAlign:"center",padding:"10px 0"}}>Copy frames to<br/>build your sheet</div>}
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {slots.map((slot,i)=>{
                  const isEdit=editingSlot===slot.id;
                  return (
                    <div key={slot.id} style={{background:isEdit?"#1a1a3a":"#0d0d1a",border:`1px solid ${isEdit?"#4a4a9e":"#2a2a4e"}`,borderRadius:5,padding:6,display:"flex",gap:5,alignItems:"center"}}>
                      <SlotPreview layers={slot.layers} scale={SLOT_SCALE} />
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{color:"#7b8cde",fontSize:9,fontWeight:700}}>f{i*4}–{i*4+3}</div>
                        <div style={{color:"#555577",fontSize:8,marginBottom:3}}>{SHEET_REF[i]||"Row "+i}</div>
                        <div style={{display:"flex",gap:3}}>
                          <button onClick={()=>{setLayers(slot.layers.map(l=>({...l,pixels:[...l.pixels]})));setEditingSlot(slot.id);}} style={{background:"#1a1a3a",border:"1px solid #2a2a6e",color:"#7b8cde",borderRadius:2,padding:"1px 4px",cursor:"pointer",fontSize:9,fontFamily:"monospace"}}>✏</button>
                          <button onClick={()=>setSlots(prev=>{const a=[...prev];const idx=a.findIndex(s=>s.id===slot.id);if(idx>0){[a[idx],a[idx-1]]=[a[idx-1],a[idx]];}return a;})} disabled={i===0} style={{background:"#1a1a1a",border:"1px solid #2a2a2a",color:i===0?"#2a2a2a":"#9aa0c0",borderRadius:2,padding:"1px 4px",cursor:i===0?"default":"pointer",fontSize:9,fontFamily:"monospace"}}>↑</button>
                          <button onClick={()=>setSlots(prev=>{const a=[...prev];const idx=a.findIndex(s=>s.id===slot.id);if(idx<a.length-1){[a[idx],a[idx+1]]=[a[idx+1],a[idx]];}return a;})} disabled={i===slots.length-1} style={{background:"#1a1a1a",border:"1px solid #2a2a2a",color:i===slots.length-1?"#2a2a2a":"#9aa0c0",borderRadius:2,padding:"1px 4px",cursor:i===slots.length-1?"default":"pointer",fontSize:9,fontFamily:"monospace"}}>↓</button>
                          <button onClick={()=>setSlotToDelete(slot.id)} style={{background:"#2a0a0a",border:"1px solid #4a1a1a",color:"#cc4444",borderRadius:2,padding:"1px 4px",cursor:"pointer",fontSize:9,fontFamily:"monospace"}}>×</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Prominent export + load sheet */}
              <input ref={loadSheetRef} type="file" accept="image/png" onChange={handleLoadSheet} style={{display:"none"}} />
              {slots.length>0&&(
                <button onClick={exportSheet} style={{
                  marginTop:8,width:"100%",background:"#0a2a0a",border:"2px solid #2a6a2a",
                  color:"#44cc44",borderRadius:5,padding:"8px 0",cursor:"pointer",
                  fontSize:12,fontWeight:700,fontFamily:"monospace",letterSpacing:1,
                }}>⬇ Download Spritesheet PNG</button>
              )}
              <button onClick={()=>loadSheetRef.current.click()} style={{
                marginTop:5,width:"100%",background:"#1a1a3a",border:"1px solid #4a4a9e",
                color:"#7b8cde",borderRadius:5,padding:"7px 0",cursor:"pointer",
                fontSize:11,fontWeight:700,fontFamily:"monospace",
              }}>📂 Load Sheet to Edit</button>
            </div>
          </div>
        </div>
      )}

      {spritTab==="assembly" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"start"}}>
          <div style={{background:"#1a1a2e",border:"1px solid #2a2a4e",borderRadius:8,padding:16}}>
            <div style={{color:"#7b8cde",fontWeight:700,fontSize:11,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Layer Stack</div>
            <div style={{color:"#555577",fontSize:11,marginBottom:12,lineHeight:1.6}}>Layers composite bottom to top. Toggle visibility with the eye icon. Click a layer to edit it in the Draw tab.</div>
            {[...layers].reverse().map((layer,ri)=>{
              const i=layers.length-1-ri;
              const count=layer.pixels.filter(p=>p!==null).length;
              return (
                <div key={layer.id} onClick={()=>{setActiveLayerId(layer.id);setSpritTab("draw");}} style={{
                  display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:6,marginBottom:6,
                  background:activeLayerId===layer.id?"#1a1a3a":"#0d0d1a",
                  border:`1px solid ${activeLayerId===layer.id?"#4a4a9e":"#2a2a4e"}`,cursor:"pointer",
                }}>
                  <button onClick={e=>{e.stopPropagation();setLayers(prev=>prev.map(l=>l.id===layer.id?{...l,visible:!l.visible}:l));}} style={{background:"none",border:"none",cursor:"pointer",padding:0,fontSize:16,opacity:layer.visible?1:0.3,flexShrink:0}}>👁</button>
                  <div style={{flex:1}}>
                    <div style={{color:activeLayerId===layer.id?"#e0e0ff":"#9aa0c0",fontWeight:600,fontSize:13}}>{layer.name}</div>
                    <div style={{color:"#555577",fontSize:10,marginTop:2}}>{count} pixels{count===0?" — empty":""}</div>
                  </div>
                  <div style={{color:"#333355",fontSize:10,flexShrink:0}}>↕ {i+1}</div>
                </div>
              );
            })}
          </div>
          <div style={{background:"#1a1a2e",border:"1px solid #2a2a4e",borderRadius:8,padding:16}}>
            <div style={{color:"#7b8cde",fontWeight:700,fontSize:11,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Composite Preview</div>
            <div style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap",marginBottom:14}}>
              {[1,2,3,4,6].map(scale=>(
                <div key={scale} style={{textAlign:"center"}}>
                  <div style={{color:"#555577",fontSize:9,marginBottom:3}}>{scale}×</div>
                  <SlotPreview layers={layers} scale={scale} />
                </div>
              ))}
            </div>
            <div style={{marginBottom:12}}>
              <div style={{color:"#9aa0c0",fontSize:11,marginBottom:6}}>Visible:</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {layers.filter(l=>l.visible).map(l=><span key={l.id} style={{background:"#2a2a6e",border:"1px solid #4a4a9e",borderRadius:3,padding:"2px 7px",fontSize:11,color:"#e0e0ff"}}>{l.name}</span>)}
                {layers.filter(l=>!l.visible).map(l=><span key={l.id} style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:3,padding:"2px 7px",fontSize:11,color:"#333355"}}>{l.name}</span>)}
              </div>
            </div>
            <button onClick={copyToSlot} style={{width:"100%",background:"#0a2a0a",border:"1px solid #2a6a2a",color:"#44cc44",borderRadius:6,padding:"9px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"monospace"}}>{editingSlot!==null?"💾 Save to slot":"➕ Copy to sheet"}</button>
          </div>
        </div>
      )}

      {/* Load sheet modal */}
      {showLoadSheet&&loadSheetPreview&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={()=>setShowLoadSheet(false)}>
          <div style={{background:"#1a1a2e",border:"1px solid #4a4a9e",borderRadius:10,padding:24,maxWidth:560,width:"90%",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{color:"#7b8cde",fontWeight:700,fontSize:14,marginBottom:6}}>Load Sheet to Edit</div>
            <div style={{color:"#555577",fontSize:12,marginBottom:4}}>{loadSheetPreview.name}</div>
            <div style={{color:"#9aa0c0",fontSize:12,marginBottom:16,lineHeight:1.6}}>
              Found <strong style={{color:"#e0e0f0"}}>{loadSheetPreview.frames.length} frames</strong>.
              Each frame will become a slot with a <strong style={{color:"#cc9944"}}>Base</strong> layer containing the existing pixels,
              plus empty Hair, Clothes, and Details layers ready to paint on.
              This will replace your current sheet.
            </div>
            {/* Preview all frames */}
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20,maxHeight:300,overflowY:"auto",padding:4}}>
              {loadSheetPreview.frames.map((px,i)=>(
                <div key={i} style={{textAlign:"center"}}>
                  <LoadFramePreview pixels={px} scale={4} />
                  <div style={{color:"#555577",fontSize:9,marginTop:2}}>f{i*4}–{i*4+3}<br/>{SHEET_REF[i]||"Row "+i}</div>
                </div>
              ))}
            </div>
            {slots.length>0&&(
              <div style={{background:"#2a1a0a",border:"1px solid #6a4a0a",borderRadius:6,padding:"8px 12px",marginBottom:14,color:"#cc9944",fontSize:12}}>
                ⚠ This will replace your current {slots.length} frame{slots.length!==1?"s":""}.
              </div>
            )}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>importSheetFrames(loadSheetPreview.frames)} style={{background:"#0a2a0a",border:"1px solid #2a6a2a",color:"#44cc44",borderRadius:6,padding:"9px 20px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"monospace"}}>Import {loadSheetPreview.frames.length} Frames</button>
              <button onClick={()=>setShowLoadSheet(false)} style={{background:"transparent",border:"1px solid #2a2a4e",color:"#555577",borderRadius:6,padding:"9px 16px",cursor:"pointer",fontSize:13,fontFamily:"monospace"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showTemplate&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={()=>setShowTemplate(false)}>
          <div style={{background:"#1a1a2e",border:"1px solid #4a4a9e",borderRadius:10,padding:22,maxWidth:510,width:"90%",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{color:"#7b8cde",fontWeight:700,fontSize:14,marginBottom:5}}>Choose template base</div>
            <div style={{color:"#555577",fontSize:11,marginBottom:12}}>Loads into: <span style={{color:"#cc9944"}}>{getActiveLayer()?.name}</span></div>
            <div style={{display:"flex",gap:7,marginBottom:13}}>
              {[["adult","Adult"],["child","Child"]].map(([id,label])=>(
                <button key={id} onClick={()=>setTemplateType(id)} style={{padding:"5px 13px",borderRadius:5,cursor:"pointer",fontSize:12,fontFamily:"monospace",background:templateType===id?"#2a2a6e":"#0d0d1a",border:`1px solid ${templateType===id?"#4a4a9e":"#2a2a4e"}`,color:templateType===id?"#e0e0ff":"#555577"}}>{label}</button>
              ))}
            </div>
            {TEMPLATE_ROW_LABELS.map((label,ri)=>(
              <div key={ri} style={{marginBottom:10}}>
                <div style={{color:"#555577",fontSize:11,marginBottom:5}}>{label} — f{ri*4}–{ri*4+3}</div>
                <div style={{display:"flex",gap:6}}>
                  {[0,1,2,3].map(col=>{
                    const fi=ri*4+col;
                    return (
                      <div key={col} onClick={()=>loadTemplate(templateType,fi)} style={{cursor:"pointer"}}>
                        <TemplateFramePreview src={templateType==="adult"?adultB64:childB64} frameIndex={fi} scale={4} />
                        <div style={{color:"#555577",fontSize:9,textAlign:"center",marginTop:2}}>f{fi}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button onClick={()=>setShowTemplate(false)} style={{marginTop:7,background:"transparent",border:"1px solid #2a2a4e",color:"#555577",borderRadius:5,padding:"6px 16px",cursor:"pointer",fontSize:12,fontFamily:"monospace"}}>Cancel</button>
          </div>
        </div>
      )}

      {slotToDelete!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={()=>setSlotToDelete(null)}>
          <div style={{background:"#1a0a0a",border:"1px solid #cc4444",borderRadius:10,padding:22,maxWidth:290,width:"90%"}} onClick={e=>e.stopPropagation()}>
            <div style={{color:"#cc4444",fontWeight:700,fontSize:14,marginBottom:7}}>Delete this frame?</div>
            <div style={{color:"#9a6060",fontSize:12,marginBottom:16}}>This cannot be undone.</div>
            <div style={{display:"flex",gap:9}}>
              <button onClick={()=>{setSlots(prev=>prev.filter(s=>s.id!==slotToDelete));if(editingSlot===slotToDelete){setEditingSlot(null);setLayers(DEFAULT_LAYERS());}setSlotToDelete(null);}} style={{background:"#2a0a0a",border:"1px solid #cc4444",color:"#cc4444",borderRadius:5,padding:"6px 16px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"monospace"}}>Delete</button>
              <button onClick={()=>setSlotToDelete(null)} style={{background:"transparent",border:"1px solid #2a2a4e",color:"#555577",borderRadius:5,padding:"6px 16px",cursor:"pointer",fontSize:13,fontFamily:"monospace"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function addLayer() {
    const name=newLayerName.trim()||"Layer "+nextLayerId;
    setLayers(prev=>[...prev,{id:nextLayerId,name,visible:true,pixels:new Array(W*H).fill(null)}]);
    setNextLayerId(n=>n+1);setNewLayerName("");
  }
}


const TABS = [
  { id: "guide", label: "Guide" },
  { id: "builder", label: "Animation Builder" },
  { id: "sprite", label: "Sprite Maker" },
  { id: "reference", label: "Spritesheet Ref" },
  { id: "credits", label: "Credits" },
];

function Credits() {
  return (
    <div style={{ padding: "4px 0", maxWidth: 820 }}>
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>GODLY HAND — Animation Builder</div>
        <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>
          A sneak peek at the Godly Hand NPC Creator — a full all-in-one tool for creating custom Stardew Valley NPCs.
          This standalone release is the animation builder component, released for early community testing.
        </div>
      </div>

      <div style={{ color: "#9aa0c0", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Made By</div>

      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderLeft: "3px solid #44cc44", borderRadius: 8, padding: 14, marginBottom: 10 }}>
        <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Aerishiph</div>
        <div style={{ color: "#44cc44", fontSize: 11, marginBottom: 6 }}>Author · Engine Designer · Tester</div>
        <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.6 }}>
          Creator of Godly Hand. Designed and built this tool to solve the real-world frustrations of creating custom Stardew Valley NPCs.
          Responsible for the full engine design, feature direction, and all in-game testing.
        </div>
      </div>

      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderLeft: "3px solid #7b8cde", borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Claude</div>
        <div style={{ color: "#7b8cde", fontSize: 11, marginBottom: 6 }}>Development Assistant · by Anthropic</div>
        <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.6 }}>
          Assisted with engineering throughout development. Built the animation builder component, frame canvas rendering, real-time preview, syntax checker, and JSON output logic.
        </div>
      </div>

      <div style={{ color: "#9aa0c0", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Reference</div>

      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderLeft: "3px solid #cc9944", borderRadius: 8, padding: 14 }}>
        <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Miss Coriel's NPC Creator</div>
        <div style={{ color: "#cc9944", fontSize: 11, marginBottom: 6 }}>Spritesheet Format Reference</div>
        <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.6 }}>
          The 64px wide, 32px per frame spritesheet format used by this tool follows the standard established by Miss Coriel's NPC Creator.
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════
// SPRITESHEET REFERENCE DATA
// ═══════════════════════════════════════════════
const SPRITESHEET_ROWS = [
  { frames: "0-3",   label: "Walking Front",    color: "#2a3a6e", note: "" },
  { frames: "4-7",   label: "Walking Right",    color: "#2a3a6e", note: "" },
  { frames: "8-11",  label: "Walking Back",     color: "#2a3a6e", note: "" },
  { frames: "12-15", label: "Walking Left",     color: "#2a3a6e", note: "" },
  { frames: "16-19", label: "Custom",           color: "#1a2a1a", note: "Your animations start here" },
  { frames: "20-23", label: "Custom",           color: "#1a2a1a", note: "" },
  { frames: "24-27", label: "Custom",           color: "#1a2a1a", note: "" },
  { frames: "28-31", label: "Custom",           color: "#1a2a1a", note: "" },
  { frames: "32-35", label: "Custom / Kiss",    color: "#1a2a1a", note: "Marriage interaction frames" },
  { frames: "36-39", label: "♀ Wedding",        color: "#2a1a2a", note: "Female farmer wedding" },
  { frames: "40-43", label: "♀ Flower Dance",   color: "#2a1a2a", note: "Female farmer flower dance" },
  { frames: "44-47", label: "♂ Flower Dance",   color: "#2a1a2a", note: "Male farmer flower dance" },
  { frames: "48-51", label: "♂ Wedding",        color: "#2a1a2a", note: "Male farmer wedding" },
];

const OVERSIZED_ROWS = [
  { frames: "0-3",     label: "Walking Front",         color: "#2a3a6e", note: "Required",                                  tag: "required" },
  { frames: "4-7",     label: "Walking Right",         color: "#2a3a6e", note: "Required",                                  tag: "required" },
  { frames: "8-11",    label: "Walking Back",          color: "#2a3a6e", note: "Required",                                  tag: "required" },
  { frames: "12-15",   label: "Walking Left",          color: "#2a3a6e", note: "Required",                                  tag: "required" },
  { frames: "16-19",   label: "Idle / Standing",       color: "#1a3a2a", note: "Blink, breath, or idle loop",               tag: "custom" },
  { frames: "20-23",   label: "Sitting",               color: "#1a2a3a", note: "Seated facing south",                       tag: "custom" },
  { frames: "24-27",   label: "Custom",                color: "#1a2a1a", note: "e.g. eating, drinking, crafting",           tag: "custom" },
  { frames: "28-31",   label: "Row 7 — Kiss at 28",    color: "#3a1a3a", note: "Frame 28 hardcoded for kiss. 29-31 free.", tag: "hardcoded" },
  { frames: "32-35",   label: "Custom",                color: "#1a2a1a", note: "e.g. reading, sleeping, working",           tag: "custom" },
  { frames: "36-39",   label: "♀ Wedding",             color: "#2a1a2a", note: "Hardcoded — always row 9",                  tag: "hardcoded" },
  { frames: "40-43",   label: "♀ Flower Dance",        color: "#2a1a2a", note: "Hardcoded — female farmer flower dance",   tag: "hardcoded" },
  { frames: "44-47",   label: "♂ Flower Dance",        color: "#2a1a2a", note: "Hardcoded — male farmer flower dance",     tag: "hardcoded" },
  { frames: "48-51",   label: "♂ Wedding",             color: "#2a1a2a", note: "Hardcoded — always row 12",                tag: "hardcoded" },
  { frames: "52-55",   label: "Custom",                color: "#1a2a1a", note: "e.g. exercise, dancing, playing",          tag: "custom" },
  { frames: "56-59",   label: "Custom",                color: "#1a2a1a", note: "e.g. fishing, farming, digging",           tag: "custom" },
  { frames: "60-63",   label: "Custom",                color: "#1a2a1a", note: "e.g. shocked, scared, excited",            tag: "custom" },
  { frames: "64-67",   label: "Custom",                color: "#1a2a1a", note: "e.g. thinking, writing, inspecting",       tag: "custom" },
  { frames: "68-71",   label: "Custom",                color: "#1a2a1a", note: "e.g. waving, pointing, gesturing",         tag: "custom" },
  { frames: "72-75",   label: "Custom",                color: "#1a2a1a", note: "e.g. carrying, lifting, working",          tag: "custom" },
  { frames: "76-79",   label: "Custom",                color: "#1a2a1a", note: "e.g. laughing, crying, singing",           tag: "custom" },
  { frames: "80-83",   label: "Custom",                color: "#1a2a1a", note: "e.g. stretching, yawning, resting",        tag: "custom" },
  { frames: "84-87",   label: "Custom",                color: "#1a2a1a", note: "e.g. cooking, crafting, smithing",         tag: "custom" },
  { frames: "88-91",   label: "Custom",                color: "#1a2a1a", note: "e.g. sleeping, passed out, napping",       tag: "custom" },
  { frames: "92-95",   label: "Custom",                color: "#1a2a1a", note: "e.g. combat stance, alert, defending",     tag: "custom" },
  { frames: "96-99",   label: "Custom",                color: "#1a2a1a", note: "e.g. celebrating, cheering, jumping",      tag: "custom" },
  { frames: "100-103", label: "Custom",                color: "#1a2a1a", note: "e.g. confused, shrugging, looking",        tag: "custom" },
  { frames: "104-107", label: "Custom",                color: "#1a2a1a", note: "e.g. pet interaction, animal care",        tag: "custom" },
  { frames: "108-111", label: "Free",                  color: "#1a1a1a", note: "Unused — reserve for future",              tag: "free" },
  { frames: "112-115", label: "Free",                  color: "#1a1a1a", note: "Unused — reserve for future",              tag: "free" },
  { frames: "116-119", label: "Free",                  color: "#1a1a1a", note: "Unused — reserve for future",              tag: "free" },
  { frames: "120-123", label: "Free",                  color: "#1a1a1a", note: "Unused — reserve for future",              tag: "free" },
];

const CHILD_ROWS = [
  { frames: "0-3",   label: "Walking Front",     color: "#2a3a6e", note: "Required",                                           tag: "required" },
  { frames: "4-7",   label: "Walking Right",     color: "#2a3a6e", note: "Required",                                           tag: "required" },
  { frames: "8-11",  label: "Walking Back",      color: "#2a3a6e", note: "Required",                                           tag: "required" },
  { frames: "12-15", label: "Walking Left",      color: "#2a3a6e", note: "Required",                                           tag: "required" },
  { frames: "16-19", label: "Custom",            color: "#1a3a2a", note: "e.g. playing, jumping, skipping",                    tag: "custom" },
  { frames: "20-23", label: "Custom",            color: "#1a3a2a", note: "e.g. sitting, reading, drawing",                     tag: "custom" },
  { frames: "24-27", label: "Custom",            color: "#1a3a2a", note: "e.g. sleeping, napping, yawning",                    tag: "custom" },
  { frames: "28-31", label: "Custom",            color: "#1a3a2a", note: "Frame 28 is free use for child NPCs.",                tag: "custom" },
  { frames: "32-35", label: "Custom",            color: "#1a3a2a", note: "e.g. scared, hiding, shy",                           tag: "custom" },
  { frames: "36-39", label: "Custom",            color: "#1a3a2a", note: "e.g. eating, snacking, drinking",                    tag: "custom" },
  { frames: "40-43", label: "Custom",            color: "#1a3a2a", note: "e.g. crying, sad, upset",                            tag: "custom" },
  { frames: "44-47", label: "Free",              color: "#1a1a1a", note: "Unused — reserve for future",                        tag: "free" },
];

const CHILD_OVERSIZED_ROWS = [
  { frames: "0-3",     label: "Walking Front",   color: "#2a3a6e", note: "Required",                                  tag: "required" },
  { frames: "4-7",     label: "Walking Right",   color: "#2a3a6e", note: "Required",                                  tag: "required" },
  { frames: "8-11",    label: "Walking Back",    color: "#2a3a6e", note: "Required",                                  tag: "required" },
  { frames: "12-15",   label: "Walking Left",    color: "#2a3a6e", note: "Required",                                  tag: "required" },
  { frames: "16-19",   label: "Idle / Standing", color: "#1a3a2a", note: "Blink, breath, or idle loop",               tag: "custom" },
  { frames: "20-23",   label: "Sitting",         color: "#1a2a3a", note: "Seated facing south",                       tag: "custom" },
  { frames: "24-27",   label: "Custom",          color: "#1a2a1a", note: "e.g. eating, drinking, snacking",           tag: "custom" },
  { frames: "28-31",   label: "Custom",          color: "#1a2a1a", note: "e.g. playing, jumping, skipping",           tag: "custom" },
  { frames: "32-35",   label: "Custom",          color: "#1a2a1a", note: "e.g. reading, drawing, crafting",           tag: "custom" },
  { frames: "36-39",   label: "Custom",          color: "#1a2a1a", note: "e.g. sleeping, napping, yawning",           tag: "custom" },
  { frames: "40-43",   label: "Custom",          color: "#1a2a1a", note: "e.g. scared, hiding, shy",                  tag: "custom" },
  { frames: "44-47",   label: "Custom",          color: "#1a2a1a", note: "e.g. crying, sad, upset",                   tag: "custom" },
  { frames: "48-51",   label: "Custom",          color: "#1a2a1a", note: "e.g. excited, happy, cheering",             tag: "custom" },
  { frames: "52-55",   label: "Custom",          color: "#1a2a1a", note: "e.g. waving, pointing, gesturing",          tag: "custom" },
  { frames: "56-59",   label: "Custom",          color: "#1a2a1a", note: "e.g. thinking, confused, shrugging",        tag: "custom" },
  { frames: "60-63",   label: "Custom",          color: "#1a2a1a", note: "e.g. laughing, giggling, smiling",          tag: "custom" },
  { frames: "64-67",   label: "Custom",          color: "#1a2a1a", note: "e.g. running, chasing, fleeing",            tag: "custom" },
  { frames: "68-71",   label: "Custom",          color: "#1a2a1a", note: "e.g. looking around, curious, inspecting",  tag: "custom" },
  { frames: "72-75",   label: "Custom",          color: "#1a2a1a", note: "e.g. carrying, holding, lifting",           tag: "custom" },
  { frames: "76-79",   label: "Custom",          color: "#1a2a1a", note: "e.g. fishing, farming, digging",            tag: "custom" },
  { frames: "80-83",   label: "Custom",          color: "#1a2a1a", note: "e.g. swimming, splashing, playing in water",tag: "custom" },
  { frames: "84-87",   label: "Custom",          color: "#1a2a1a", note: "e.g. pet interaction, animal care",         tag: "custom" },
  { frames: "88-91",   label: "Custom",          color: "#1a2a1a", note: "e.g. celebration, spinning, dancing",       tag: "custom" },
  { frames: "92-95",   label: "Custom",          color: "#1a2a1a", note: "e.g. stretching, exercising, playing sport",tag: "custom" },
  { frames: "96-99",   label: "Custom",          color: "#1a2a1a", note: "e.g. cooking, baking, helping",             tag: "custom" },
  { frames: "100-103", label: "Custom",          color: "#1a2a1a", note: "e.g. studying, writing, learning",          tag: "custom" },
  { frames: "104-107", label: "Custom",          color: "#1a2a1a", note: "e.g. singing, performing, storytelling",    tag: "custom" },
  { frames: "108-111", label: "Free",            color: "#1a1a1a", note: "Unused — reserve for future",               tag: "free" },
  { frames: "112-115", label: "Free",            color: "#1a1a1a", note: "Unused — reserve for future",               tag: "free" },
  { frames: "116-119", label: "Free",            color: "#1a1a1a", note: "Unused — reserve for future",               tag: "free" },
  { frames: "120-123", label: "Free",            color: "#1a1a1a", note: "Unused — reserve for future",               tag: "free" },
];

// ═══════════════════════════════════════════════
// SPRITESHEET REFERENCE TAB
// ═══════════════════════════════════════════════
function SpritesheetReference() {
  const [activeTemplate, setActiveTemplate] = useState("adult");
  const [sheetType, setSheetType] = useState("standard");

  const FRAME_SIZE = 28;
  const LABEL_W = 140;
  const GRID_W = FRAME_SIZE * 4;
  const ROW_H = FRAME_SIZE * 2;

  return (
    <div>
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Spritesheet Format Reference</div>
        <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.7 }}>
          Stardew Valley NPC spritesheets must be exactly <strong style={{ color: "#cc9944" }}>64px wide</strong> and a multiple of{" "}
          <strong style={{ color: "#cc9944" }}>32px tall</strong>. Each frame is <strong style={{ color: "#cc9944" }}>16×32px</strong>.
          Four frames per row, numbered left→right, top→bottom from 0.
          The first four rows are the standard walk cycles and are required for all NPCs.
          Rows beyond that are your custom animations — name them in <code style={{ color: "#cc9944" }}>Animations.json</code> and reference them in your schedule.
        </div>
        <div style={{ color: "#555577", fontSize: 11, marginTop: 8 }}>
          Template layout inspired by <strong style={{ color: "#7b8cde" }}>Miss Coriel's NPC Creator</strong>.
        </div>
      </div>

      {/* Template selector */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { id: "adult", label: "Adult Template", status: "Current" },
          { id: "child", label: "Child Template", status: "Current" },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTemplate(t.id)} style={{
            padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "monospace",
            background: activeTemplate === t.id ? "#2a2a6e" : "#1a1a2e",
            color: activeTemplate === t.id ? "#e0e0ff" : "#555577",
            border: `1px solid ${activeTemplate === t.id ? "#4a4a9e" : "#2a2a4e"}`,
          }}>
            {t.label}
            <span style={{ marginLeft: 8, fontSize: 10, color: t.status === "Current" ? "#44cc44" : "#cc9944",
              border: `1px solid ${t.status === "Current" ? "#44cc44" : "#cc9944"}`, borderRadius: 3, padding: "1px 6px" }}>
              {t.status}
            </span>
          </button>
        ))}
      </div>

      {/* Sheet type selector */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { id: "standard",  label: "Standard (128px — 4 rows)",     desc: "13 rows max with wedding frames" },
          { id: "oversized", label: "Oversized (992px — 31 rows)",    desc: "124 frames, full animation suite" },
        ].map(s => (
          <button key={s.id} onClick={() => setSheetType(s.id)} style={{
            padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "monospace",
            background: sheetType === s.id ? "#1a3a2a" : "#1a1a2e",
            color: sheetType === s.id ? "#44cc88" : "#555577",
            border: `1px solid ${sheetType === s.id ? "#2a6a4a" : "#2a2a4e"}`,
          }}>
            {s.label}
            <div style={{ fontSize: 10, color: sheetType === s.id ? "#44aa66" : "#333355", marginTop: 2 }}>{s.desc}</div>
          </button>
        ))}
      </div>



      {/* Frame layout diagram */}
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: 16, marginBottom: 20, overflowX: "auto" }}>
        <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Frame Layout Diagram</div>

        {/* Column headers */}
        <div style={{ display: "flex", marginLeft: LABEL_W, marginBottom: 4 }}>
          {[0,1,2,3].map(col => (
            <div key={col} style={{ width: FRAME_SIZE * 2, textAlign: "center", color: "#555577", fontSize: 11 }}>Col {col}</div>
          ))}
        </div>

        {(activeTemplate === "child" ? (sheetType === "oversized" ? CHILD_OVERSIZED_ROWS : CHILD_ROWS) : sheetType === "oversized" ? OVERSIZED_ROWS : SPRITESHEET_ROWS).map((row, i) => {
          const frameNums = row.frames.split("-").map(Number);
          const frames = frameNums.length === 1
            ? [frameNums[0]]
            : [frameNums[0], frameNums[0]+1, frameNums[0]+2, frameNums[0]+3];
          const tagColor = row.tag === "required" ? "#44cc44" : row.tag === "hardcoded" ? "#cc7700" : row.tag === "marriage" ? "#cc44cc" : row.tag === "free" ? "#888888" : "#7b8cde";
          const tagLabel = row.tag === "required" ? "Required" : row.tag === "hardcoded" ? "Hardcoded" : row.tag === "marriage" ? "Marriage" : row.tag === "free" ? "Free" : "Custom";
          const FRAME_OVERRIDES = activeTemplate !== "child" ? { 28: { color: "#cc7700", label: "Kiss" } } : {};
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: 3 }}>
              <div style={{ width: LABEL_W, color: "#9aa0c0", fontSize: 11, paddingRight: 10, textAlign: "right", flexShrink: 0 }}>
                <span style={{ color: "#555577" }}>Row {i} </span>{row.label}
              </div>
              {frames.map(fn => {
                const override = FRAME_OVERRIDES[fn];
                return (
                  <div key={fn} style={{
                    width: FRAME_SIZE * 2, height: ROW_H,
                    border: `1px solid ${override ? override.color + "88" : "#2a2a4e"}`,
                    background: override ? "#2a1a0a" : row.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexDirection: "column", flexShrink: 0,
                  }}>
                    <span style={{ color: override ? override.color : "#7b8cde", fontSize: 10, fontWeight: 700 }}>{fn}</span>
                    {override
                      ? <span style={{ color: override.color, fontSize: 7, fontWeight: 700 }}>{override.label}</span>
                      : <span style={{ color: "#333355", fontSize: 8 }}>16×32</span>
                    }
                  </div>
                );
              })}
              <div style={{ marginLeft: 10, display: "flex", alignItems: "center", gap: 6 }}>
                {row.note && <span style={{ color: "#555577", fontSize: 11, fontStyle: "italic" }}>{row.note}</span>}
                {row.tag && <span style={{ color: tagColor, fontSize: 10, border: `1px solid ${tagColor}`, borderRadius: 3, padding: "1px 5px" }}>{tagLabel}</span>}
              </div>
            </div>
          );
        })}

        {sheetType === "standard" && (
          <div style={{ display: "flex", alignItems: "center", marginTop: 6 }}>
            <div style={{ width: LABEL_W, color: "#333355", fontSize: 11, textAlign: "right", paddingRight: 10 }}>Row 13+</div>
            <div style={{ width: GRID_W, height: 20, border: "1px dashed #2a2a4e", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#333355", fontSize: 10 }}>Additional custom rows — any multiple of 32px</span>
            </div>
          </div>
        )}
        {sheetType === "oversized" && (
          <div style={{ marginTop: 10, color: "#555577", fontSize: 11 }}>992px tall • 31 rows • 124 frames total • 64px wide</div>
        )}
      </div>

      {/* Portrait reference */}
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: 16 }}>
        <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Portrait Reference</div>
        <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.7 }}>
          Portraits are separate from the spritesheet. Vanilla portraits are <strong style={{ color: "#cc9944" }}>64×64px per expression</strong>, arranged in a 2×3 grid.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 12, maxWidth: 340 }}>
          {[
            ["$0", "Neutral", "#1a1a2e", "Row 0, Col 0"],
            ["$1", "Happy",   "#1a2a1a", "Row 0, Col 1"],
            ["$2", "Sad",     "#1a1a2e", "Row 1, Col 0"],
            ["$3", "Unique",  "#2a1a2a", "Row 1, Col 1 — NPC specific expression"],
            ["$4", "Blush",   "#2a1a1a", "Row 2, Col 0"],
            ["$5", "Anger",   "#2a1a1a", "Row 2, Col 1"],
          ].map(([tag, label, bg, note]) => (
            <div key={tag} style={{ background: bg, border: "1px solid #2a2a4e", borderRadius: 4, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <code style={{ color: "#cc9944", fontSize: 16, fontWeight: 700 }}>{tag}</code>
                <span style={{ color: "#e0e0f0", fontSize: 13, fontWeight: 600 }}>{label}</span>
              </div>
              <div style={{ color: "#555577", fontSize: 10 }}>{note}</div>
            </div>
          ))}
        </div>
        <div style={{ color: "#555577", fontSize: 11, marginTop: 12 }}>
          Use expression tags at the end of dialogue strings — e.g. <code style={{ color: "#cc9944" }}>speak Nicholas "Hello.$1"</code>.
          <code style={{ color: "#cc9944" }}>$3</code> is your NPC's unique expression — define it to match their personality.
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = React.useState("guide");
  return (
    <div style={{ background: "#0d0d1a", minHeight: "100vh", fontFamily: "monospace", color: "#e0e0f0" }}>
      <div style={{ background: "#13132a", borderBottom: "1px solid #2a2a4e", padding: "0 24px", display: "flex", alignItems: "center", gap: 0 }}>
        <span style={{ color: "#7b8cde", fontWeight: 700, fontSize: 14, padding: "12px 24px 12px 0", borderRight: "1px solid #2a2a4e", marginRight: 16 }}>
          GODLY HAND
        </span>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? "#7b8cde" : "transparent"}`,
            color: tab === t.id ? "#e0e0ff" : "#555577",
            padding: "12px 16px", cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 700 : 400,
            fontFamily: "monospace",
          }}>{t.label}</button>
        ))}
        <span style={{ marginLeft: "auto", color: "#333355", fontSize: 10, border: "1px solid #2a2a4e", borderRadius: 4, padding: "2px 8px" }}>SNEAK PEEK</span>
      </div>
      <div style={{ padding: 24 }}>
        {tab === "builder" && <AnimationBuilder />}
        {tab === "guide" && <Guide />}
        {tab === "sprite" && <SpriteMaker adultB64={TEMPLATE_ADULT_B64} childB64={TEMPLATE_CHILD_B64} />}
        {tab === "reference" && <SpritesheetReference />}
        {tab === "credits" && <Credits />}
      </div>
    </div>
  );
}
