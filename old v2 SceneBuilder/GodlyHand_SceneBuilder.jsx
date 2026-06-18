import { useState, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════
// GODLY HAND — Scene Builder
// Coordinate Picker + Event Builder
// by Aerishiph — coming to Nexus Mods
// ═══════════════════════════════════════════════

const IS = {
  background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 4,
  color: "#e0e0f0", padding: "6px 10px", fontSize: 13, width: "100%", boxSizing: "border-box",
};
const SS = { ...IS, cursor: "pointer" };

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
    }}>{children}</button>
  );
}

function CoordWarning() {
  return (
    <div style={{ background: "#1a120a", border: "1px solid #4a3a0a", borderRadius: 8, padding: 14, marginBottom: 20 }}>
      <div style={{ color: "#cc9944", fontWeight: 700, fontSize: 12, marginBottom: 6 }}>⚠ COORDINATES MUST COME FROM IN-GAME</div>
      <div style={{ color: "#9a8060", fontSize: 12, lineHeight: 1.6 }}>
        All X/Y tile positions and facing directions must be obtained using a coordinate finder mod.
        Recommended: <strong style={{ color: "#cc9944" }}>Debug Mode</strong> or <strong style={{ color: "#cc9944" }}>Tile Info</strong> on Nexus Mods.
        This tool structures your data — it does not invent positions.
      </div>
    </div>
  );
}

// Robust clipboard copy. The async Clipboard API is unavailable from file:// URLs
// and blocked in many sandboxed iframes (navigator.clipboard is undefined there), so
// when it's missing or rejects we fall back to a hidden-textarea + execCommand("copy"),
// which still works in those contexts. Returns Promise<boolean> for whether it copied.
function copyText(text) {
  const fallback = () => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => fallback());
    }
  } catch (e) { /* fall through to legacy path */ }
  return Promise.resolve(fallback());
}

function OutputBlock({ output, onCopy, copied, backup }) {
  const [showBackup, setShowBackup] = useState(false);
  if (!output) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: "#7b8cde", fontSize: 13, fontWeight: 600 }}>Generated Output</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {output.length > 30000 && <span style={{ color: "#cc4444", fontSize: 11 }}>⚠ Near file size limit</span>}
          {backup && <Btn small onClick={() => setShowBackup(s => !s)}>{showBackup ? "Hide Backup" : "📋 Show Backup"}</Btn>}
          <Btn small onClick={onCopy}>{copied ? "✓ Copied" : "Copy"}</Btn>
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
          <Btn small onClick={() => { copyText(backup); }}>Copy Backup</Btn>
        </div>
      )}
    </div>
  );
}
// Verified pure-JS zlib inflate — canonical Huffman, handles all deflate block types
// Translated from a working Python implementation verified against farm.tmx
function zlibInflate(data) {
  // Strip 2-byte zlib header (0x78 0x9C etc)
  return rawInflate(data, 2);
}

function rawInflate(data, startByte) {
  let pos = startByte * 8;

  const readBits = (n) => {
    let v = 0;
    for (let i = 0; i < n; i++) {
      v |= ((data[pos >> 3] >> (pos & 7)) & 1) << i;
      pos++;
    }
    return v;
  };

  const buildCanonical = (lengths, n) => {
    const blCount = new Array(16).fill(0);
    for (let i = 0; i < n; i++) blCount[lengths[i]]++;
    blCount[0] = 0;
    let code = 0;
    const nextCode = new Array(16).fill(0);
    for (let bl = 1; bl < 16; bl++) {
      code = (code + blCount[bl - 1]) << 1;
      nextCode[bl] = code;
    }
    // Map "length_code" string key -> symbol for fast lookup
    const table = {};
    for (let sym = 0; sym < n; sym++) {
      const l = lengths[sym];
      if (l !== 0) {
        const c = nextCode[l];
        table[l + '_' + c] = sym;
        nextCode[l]++;
      }
    }
    return table;
  };

  const decodeSym = (table) => {
    let code = 0;
    for (let length = 1; length < 16; length++) {
      code = (code << 1) | readBits(1);
      const key = length + '_' + code;
      if (key in table) return table[key];
    }
    return -1;
  };

  const LENBASE  = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  const LENEXT   = [0,0,0,0,0,0,0,0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4,  4,  5,  5,  5,  5,  0];
  const DISTBASE = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  const DISTEXT  = [0,0,0,0,1,1,2,2, 3, 3, 4, 4, 5, 5,  6,  6,  7,  7,  8,  8,   9,   9,  10,  10,  11,  11,  12,   12,   13,   13];
  const CL_ORDER = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];

  const fixedLitLens = new Array(288);
  for (let i=0;i<144;i++) fixedLitLens[i]=8;
  for (let i=144;i<256;i++) fixedLitLens[i]=9;
  for (let i=256;i<280;i++) fixedLitLens[i]=7;
  for (let i=280;i<288;i++) fixedLitLens[i]=8;
  const fixedDistLens = new Array(32).fill(5);

  const output = [];

  const inflateBlock = (litTable, distTable) => {
    while (true) {
      const sym = decodeSym(litTable);
      if (sym < 0) throw new Error('inflate: bad literal symbol');
      if (sym < 256) {
        output.push(sym);
      } else if (sym === 256) {
        break;
      } else {
        const li = sym - 257;
        const length = LENBASE[li] + readBits(LENEXT[li]);
        const dsym = decodeSym(distTable);
        if (dsym < 0) throw new Error('inflate: bad dist symbol');
        const dist = DISTBASE[dsym] + readBits(DISTEXT[dsym]);
        const start = output.length - dist;
        for (let i = 0; i < length; i++) output.push(output[start + (i % dist)]);
      }
    }
  };

  let bfinal = 0;
  while (!bfinal) {
    bfinal = readBits(1);
    const btype = readBits(2);

    if (btype === 0) {
      // Uncompressed block
      pos = (pos + 7) & ~7;
      const len = data[pos >> 3] | (data[(pos >> 3) + 1] << 8);
      pos += 32;
      for (let i = 0; i < len; i++) output.push(data[(pos >> 3) + i]);
      pos += len * 8;

    } else if (btype === 1) {
      // Fixed Huffman
      inflateBlock(buildCanonical(fixedLitLens, 288), buildCanonical(fixedDistLens, 32));

    } else if (btype === 2) {
      // Dynamic Huffman
      const hlit  = readBits(5) + 257;
      const hdist = readBits(5) + 1;
      const hclen = readBits(4) + 4;

      const clLens = new Array(19).fill(0);
      for (let i = 0; i < hclen; i++) clLens[CL_ORDER[i]] = readBits(3);
      const clTable = buildCanonical(clLens, 19);

      const lens = [];
      while (lens.length < hlit + hdist) {
        const sym = decodeSym(clTable);
        if (sym < 0) throw new Error('inflate: bad cl symbol');
        if (sym < 16) {
          lens.push(sym);
        } else if (sym === 16) {
          const rep = lens[lens.length - 1];
          const cnt = readBits(2) + 3;
          for (let i = 0; i < cnt; i++) lens.push(rep);
        } else if (sym === 17) {
          const cnt = readBits(3) + 3;
          for (let i = 0; i < cnt; i++) lens.push(0);
        } else {
          const cnt = readBits(7) + 11;
          for (let i = 0; i < cnt; i++) lens.push(0);
        }
      }
      inflateBlock(buildCanonical(lens.slice(0, hlit), hlit), buildCanonical(lens.slice(hlit), hdist));

    } else {
      throw new Error('inflate: invalid block type');
    }
  }

  return new Uint8Array(output);
}


// ═══════════════════════════════════════════════
// COORD SELECTOR — pick saved coords for event setup
// ═══════════════════════════════════════════════
function CoordSelector({ folders, onSelect, label }) {
  const [open, setOpen] = useState(false);
  const allCoords = folders.flatMap((f, fi) => f.coords.map(c => ({ ...c, folderName: f.name, folderIdx: fi })));
  if (allCoords.length === 0) return null;
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(o => !o)} title={label || "Use saved coordinate"} style={{
        background: open ? "#1a1a3a" : "transparent", border: "1px solid #2a2a4e",
        color: "#7b8cde", borderRadius: 4, padding: "4px 8px", cursor: "pointer",
        fontSize: 12, fontFamily: "monospace", whiteSpace: "nowrap",
      }}>📍 Saved</button>
      {open && (
        <div style={{ position: "absolute", zIndex: 200, top: "100%", left: 0, background: "#0d0d1a", border: "1px solid #4a4a9e", borderRadius: 6, minWidth: 280, maxHeight: 240, overflowY: "auto", marginTop: 2, boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
          {folders.map((folder, fi) => folder.coords.length > 0 && (
            <div key={fi}>
              <div style={{ padding: "6px 10px", background: "#1a1a2e", color: "#555577", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", borderBottom: "1px solid #2a2a4e" }}>{folder.name}</div>
              {folder.coords.map(c => (
                <div key={c.id} onClick={() => { onSelect(c); setOpen(false); }} style={{
                  padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid #1a1a2e",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ color: "#e0e0f0", fontSize: 12 }}>{c.label}</span>
                  <span style={{ color: "#555577", fontSize: 11, fontFamily: "monospace" }}>
                    {c.map} {c.x},{c.y} {c.direction !== undefined ? ["S","N","W","E"][c.direction] : ""}
                  </span>
                </div>
              ))}
            </div>
          ))}
          <div style={{ padding: "4px 8px", background: "#1a1a2e", borderTop: "1px solid #2a2a4e" }}>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#555577", cursor: "pointer", fontSize: 11, fontFamily: "monospace" }}>Close ▲</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CoordPicker({ folders, setFolders }) {
  const [mapData, setMapData] = useState(null);
  const [mapName, setMapName] = useState("");
  const [loadMsg, setLoadMsg] = useState("");
  const [zoom, setZoom] = useState(2);
  const [newFolderName, setNewFolderName] = useState("");
  const [hoveredTile, setHoveredTile] = useState(null);
  const [labelInput, setLabelInput] = useState("");
  const [activeFolder, setActiveFolder] = useState(0);
  const [openFolders, setOpenFolders] = useState({ 0: true });
  const [pendingDir, setPendingDir] = useState(0);
  const [pendingTile, setPendingTile] = useState(null);
  const [tilesheetImgs, setTilesheetImgs] = useState({});
  const [renderReady, setRenderReady] = useState(false);
  const [parseError, setParseError] = useState(null);
  const fileRef = useRef(null);
  const tsFileRef = useRef(null);
  const canvasRef = useRef(null);
  const importTxtRef = useRef(null);

  // Import a previously exported coordinates .txt back into folders
  const importTxt = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const lines = ev.target.result.split("\n");
        const imported = [];
        let currentFolder = null;
        let pendingLabel = null;

        for (const line of lines) {
          // Folder header: ── FOLDER_NAME ─────
          const folderMatch = line.match(/^──\s+(.+?)\s+─/);
          if (folderMatch) {
            currentFolder = { name: folderMatch[1].charAt(0) + folderMatch[1].slice(1).toLowerCase(), coords: [] };
            imported.push(currentFolder);
            pendingLabel = null;
            continue;
          }

          // Detail line:     Map: Town   X: 23   Y: 49   Dir: 0
          const detailMatch = line.match(/^\s{4,}Map:\s*(\S+)\s+X:\s*(\d+)\s+Y:\s*(\d+)(?:\s+Dir:\s*(\S+))?/);
          if (detailMatch && currentFolder && pendingLabel) {
            const dir = detailMatch[4] !== undefined && detailMatch[4] !== "—" ? parseInt(detailMatch[4]) : 0;
            currentFolder.coords.push({
              label: pendingLabel,
              map: detailMatch[1],
              x: parseInt(detailMatch[2]),
              y: parseInt(detailMatch[3]),
              direction: isNaN(dir) ? 0 : dir,
              id: Date.now() + Math.random(),
            });
            pendingLabel = null;
            continue;
          }

          // Label line:   Some label (2-space indent, not 4+)
          const labelMatch = line.match(/^  (\S.+)$/);
          if (labelMatch && currentFolder) {
            pendingLabel = labelMatch[1].trim();
          }
        }

        if (imported.length === 0) {
          setLoadMsg("⚠ No coordinates found in file. Check the format matches a Godly Hand export.");
          return;
        }

        const totalCoords = imported.reduce((a, f) => a + f.coords.length, 0);
        setFolders(prev => {
          // Merge into existing folders — add new folders, append coords to matching names
          const merged = [...prev];
          for (const imp of imported) {
            const existing = merged.find(f => f.name.toLowerCase() === imp.name.toLowerCase());
            if (existing) {
              existing.coords = [...existing.coords, ...imp.coords];
            } else {
              merged.push(imp);
            }
          }
          return merged;
        });
        setLoadMsg("✓ Imported " + totalCoords + " coordinate" + (totalCoords !== 1 ? "s" : "") + " from " + imported.length + " folder" + (imported.length !== 1 ? "s" : ""));
      } catch (err) {
        setLoadMsg("⚠ Failed to parse .txt file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Full tbin parser — verified format:
  // Header: magic(6) + padding(8) = pos 14, then map props
  // Tilesheet: id(str) desc(str) img(str) + 8×uint32 (sw,sh,tw,th,marginW,marginH,spacingW,spacingH) + props
  // Layer: id(str) visible(u8) desc(str) lw(u32) lh(u32) tw(u32) th(u32) props tile_stream
  // Tile tokens: 0x00=null(1), 0x4e=run-null(N+u32count), 0x54=tilesheet(T+str),
  //              0x53=static(S+u32idx+u8blend+props), 0x41=animated(A+u32interval+u32fc+frames+props)
  // Animated frames: each frame = optional T(tilesheet) then S(u32idx+u8blend+props) — NO null frames
  const parseTbinFull = (buffer) => {
    const data = new Uint8Array(buffer);
    const sz = data.length;
    let pos = 14; // skip magic(6) + padding(8)

    const ri = () => {
      if (pos+4 > sz) throw new Error("unexpected end of file");
      const v = data[pos]|(data[pos+1]<<8)|(data[pos+2]<<16)|(data[pos+3]<<24);
      pos += 4; return v >>> 0;
    };
    const rs = () => {
      const l = ri();
      if (l < 0 || pos+l > sz) throw new Error("string out of bounds");
      let s = ""; for (let i=0;i<l;i++) s+=String.fromCharCode(data[pos+i]);
      pos += l; return s;
    };
    const rp = () => {
      const c = ri();
      for (let i=0;i<c;i++) {
        rs();
        if (pos >= sz) return;
        const vt = data[pos++];
        if (vt===0) pos++;
        else if (vt===1||vt===2) pos+=4;
        else rs();
      }
    };

    try {
      rp();

      const tc = ri();
      const tsheets = [];
      for (let i=0;i<tc;i++) {
        const tid = rs(); rs();
        const timg = rs();
        const sw=ri(), sh=ri(), tw=ri(), th=ri();
        pos += 16;
        rp();
        tsheets.push({id:tid, img:timg.replace(/(\.png)+$/i, ""), sw, sh, tw, th});
      }

      const lc = ri();
      const layers = [];
      for (let li=0;li<lc;li++) {
        const lid = rs();
        pos++;
        rs();
        const lw=ri(), lh=ri(), ltw=ri(), lth=ri();
        rp();
        const total = lw*lh;
        const tiles = new Array(total).fill(null);
        let idx=0, curTs=null;

        while (idx < total && pos < sz) {
          const b = data[pos];
          if (b===0x00) { pos++; idx++; }
          else if (b===0x4e) { pos++; const cnt=ri(); idx+=Math.min(cnt,total-idx); }
          else if (b===0x54) { pos++; curTs=rs(); }
          else if (b===0x53) {
            pos++;
            const ti=ri();
            pos++;
            rp();
            tiles[idx++]=[curTs,ti];
          }
          else if (b===0x41) {
            pos++;
            ri();
            const fc=ri();
            let first=null, framets=curTs;
            for (let fi=0;fi<fc;fi++) {
              if (data[pos]===0x54) { pos++; framets=rs(); }
              if (data[pos]===0x53) {
                pos++;
                const fti=ri();
                pos++;
                rp();
                if (fi===0) first=[framets,fti];
              }
            }
            curTs=framets;
            rp();
            tiles[idx++]=first;
          }
          else { pos++; idx++; }
        }
        layers.push({id:lid, width:lw, height:lh, tileW:ltw, tileH:lth, tiles});
      }
      return {tsheets, layers, error:null};
    } catch(e) { return {tsheets:[], layers:[], error:e.message}; }
  };

  // TMX parser — standard Tiled XML format
  const parseTmx = (text) => {
    try {
      const doc = new DOMParser().parseFromString(text, "text/xml");
      if (doc.querySelector("parsererror")) throw new Error("Invalid XML");
      const mapEl = doc.querySelector("map");
      if (!mapEl) throw new Error("No <map> element found");

      const tsheets = [];
      doc.querySelectorAll("tileset").forEach(ts => {
        const firstGid = parseInt(ts.getAttribute("firstgid") || "1");
        const name = ts.getAttribute("name") || "";
        const imgEl = ts.querySelector("image");
        if (!imgEl) return;
        const src = imgEl.getAttribute("source") || "";
        const img = src.replace(/^.*[\\/]/, "").replace(/(\.png)+$/i, "");
        const tw = parseInt(ts.getAttribute("tilewidth") || imgEl.getAttribute("tilewidth") || "16");
        const th = parseInt(ts.getAttribute("tileheight") || imgEl.getAttribute("tileheight") || "16");
        const imgW = parseInt(imgEl.getAttribute("width") || "0");
        const sw = tw > 0 && imgW > 0 ? Math.floor(imgW / tw) : 1;
        const imgH = parseInt(imgEl.getAttribute("height") || "0");
        const sh = th > 0 && imgH > 0 ? Math.floor(imgH / th) : 1;
        tsheets.push({ id: name, img, sw, sh, tw, th, firstGid });
      });

      tsheets.sort((a, b) => a.firstGid - b.firstGid);

      const resolveGid = (gid) => {
        if (!gid) return null;
        const cleanGid = gid & 0x1FFFFFFF;
        if (cleanGid === 0) return null;
        let ts = null;
        for (let i = tsheets.length - 1; i >= 0; i--) {
          if (tsheets[i].firstGid <= cleanGid) { ts = tsheets[i]; break; }
        }
        if (!ts) return null;
        return [ts.id, cleanGid - ts.firstGid];
      };

      const layers = [];
      doc.querySelectorAll("map > layer").forEach(layerEl => {
        const lid = layerEl.getAttribute("name") || "Layer";
        const lw = parseInt(layerEl.getAttribute("width") || "0");
        const lh = parseInt(layerEl.getAttribute("height") || "0");
        const dataEl = layerEl.querySelector("data");
        if (!dataEl) return;
        const encoding = dataEl.getAttribute("encoding") || "xml";
        const total = lw * lh;
        const tiles = new Array(total).fill(null);

        if (encoding === "csv") {
          const gids = dataEl.textContent.trim().split(",").map(s => parseInt(s.trim()) || 0);
          gids.forEach((gid, i) => { if (i < total) tiles[i] = resolveGid(gid); });
        } else if (encoding === "base64") {
          const compression = dataEl.getAttribute("compression") || "none";
          const raw = atob(dataEl.textContent.trim());
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
          if (compression === "none") {
            const dv = new DataView(bytes.buffer);
            for (let i = 0; i < total && i * 4 + 4 <= bytes.length; i++) {
              tiles[i] = resolveGid(dv.getUint32(i * 4, true));
            }
          } else if (compression === "zlib" || compression === "gzip") {
            try {
              // unzlibSync handles zlib-wrapped deflate directly — no header stripping needed
              const decompressed = zlibInflate(bytes);
              const dv = new DataView(decompressed.buffer);
              for (let i = 0; i < total && i * 4 + 4 <= decompressed.length; i++) {
                tiles[i] = resolveGid(dv.getUint32(i * 4, true));
              }
            } catch(e) {
              throw new Error("Failed to decompress layer " + lid + ": " + e.message);
            }
          }
        } else {
          const tileEls = layerEl.querySelectorAll("tile");
          tileEls.forEach((t, i) => {
            if (i < total) tiles[i] = resolveGid(parseInt(t.getAttribute("gid") || "0"));
          });
        }
        layers.push({ id: lid, width: lw, height: lh, tileW: 16, tileH: 16, tiles });
      });

      if (!layers.length) throw new Error("No layers found in TMX");
      return { tsheets, layers, error: null };
    } catch(e) { return { tsheets: [], layers: [], error: e.message }; }
  };

  const handleMapUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const nm = file.name.replace(/\.(tbin|tmx|json)$/i, "");
    const isTmx = file.name.toLowerCase().endsWith(".tmx");
    setMapName(nm);
    setRenderReady(false);
    setParseError(null);
    const reader = new FileReader();
    reader.onerror = () => setParseError("FileReader failed to read the map file. The file may be corrupted or inaccessible.");
    reader.onload = (ev) => {
      const result = isTmx
        ? parseTmx(ev.target.result)
        : parseTbinFull(ev.target.result);
      if (result.error) { setParseError(result.error); return; }
      if (!result.layers.length) { setParseError("No layers found in this file. The map may use an unsupported format or be empty."); return; }
      setMapData(result);
      setTilesheetImgs(prev => {
        const allLoaded = result.tsheets.every(ts => prev[ts.img.toLowerCase()]);
        if (allLoaded) {
          setRenderReady(true);
          setLoadMsg(`Loaded ${nm} — ${result.layers[0].width}x${result.layers[0].height} tiles. All tilesheets already in memory.`);
        } else {
          const needed = result.tsheets.filter(ts => !prev[ts.img.toLowerCase()]).map(t => t.img + ".png").join(", ");
          setLoadMsg(`Loaded ${nm} — ${result.layers[0].width}x${result.layers[0].height} tiles. Still need: ${needed}`);
        }
        return prev;
      });
    };
    if (isTmx) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleTilesheetUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const name = file.name.replace(/(\.png)+$/i, "").toLowerCase();
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = () => setLoadMsg(`⚠ Failed to load ${name}.png — file may not be a valid PNG.`);
        img.onload = () => {
          setTilesheetImgs(prev => {
            const updated = {...prev, [name]: img};
            if (mapData) {
              const allLoaded = mapData.tsheets.every(ts => updated[ts.img.toLowerCase()]);
              if (allLoaded) {
                setRenderReady(true);
                setLoadMsg(`All tilesheets loaded — map ready to render.`);
              } else {
                const remaining = mapData.tsheets.filter(ts => !updated[ts.img.toLowerCase()]).map(ts => ts.img + ".png");
                setLoadMsg(`Loaded ${name}.png — still need: ${remaining.join(", ")}`);
              }
            }
            return updated;
          });
        };
        img.src = ev.target.result;
      };
      reader.onerror = () => setLoadMsg(`⚠ Failed to read ${file.name} — file may be corrupted.`);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  useEffect(() => {
    if (!renderReady || !mapData || !canvasRef.current) return;
    try {
    const canvas = canvasRef.current;
    const layer = mapData.layers[0];
    const TILE = 16 * zoom;
    canvas.width = layer.width * TILE;
    canvas.height = layer.height * TILE;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderOrder = ["Back","Back2","Back3","Buildings","Buildings2","Paths","Front","AlwaysFront"];
    const layersToRender = renderOrder
      .map(name => mapData.layers.find(l => l.id === name))
      .filter(Boolean);
    mapData.layers.filter(l => !renderOrder.includes(l.id) && l.id).forEach(l => layersToRender.push(l));

    for (const layer of layersToRender) {
      for (let y = 0; y < layer.height; y++) {
        for (let x = 0; x < layer.width; x++) {
          const tile = layer.tiles[y * layer.width + x];
          if (!tile) continue;
          const [tsName, tileIdx] = tile;
          const ts = mapData.tsheets.find(t => t.id === tsName || t.img === tsName);
          if (!ts) continue;
          const img = tilesheetImgs[ts.img.toLowerCase()];
          if (!img) continue;
          const cols = ts.sw;
          const srcX = (tileIdx % cols) * ts.tw;
          const srcY = Math.floor(tileIdx / cols) * ts.th;
          ctx.drawImage(img, srcX, srcY, ts.tw, ts.th, x*TILE, y*TILE, TILE, TILE);
        }
      }
    }
    } catch(e) {
      setLoadMsg("⚠ Render error: " + e.message + " — try a different zoom level or reload the map.");
    }
  }, [renderReady, mapData, tilesheetImgs, zoom]);

  const addCoord = (x, y, label, dir) => {
    const coord = { x, y, label: label || `${x},${y}`, map: mapName, direction: dir !== undefined ? dir : 0, id: Date.now() };
    setFolders(prev => {
      const updated = [...prev];
      updated[activeFolder] = { ...updated[activeFolder], coords: [...updated[activeFolder].coords, coord] };
      return updated;
    });
    setPendingTile(null);
    setLabelInput("");
  };

  const removeCoord = (folderIdx, coordId) => {
    setFolders(prev => {
      const updated = [...prev];
      updated[folderIdx] = { ...updated[folderIdx], coords: updated[folderIdx].coords.filter(c => c.id !== coordId) };
      return updated;
    });
  };

  const exportTxt = () => {
    const lines = ["GODLY HAND — COORDINATE REFERENCE", "Generated: " + new Date().toLocaleString(), ""];
    folders.forEach(folder => {
      if (folder.coords.length === 0) return;
      lines.push("── " + folder.name.toUpperCase() + " ─────────────────────────");
      folder.coords.forEach(c => {
        lines.push(`  ${c.label}`);
        lines.push(`    Map: ${c.map}   X: ${c.x}   Y: ${c.y}   Dir: ${c.direction !== undefined ? c.direction : "—"}`);
      });
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "coordinates.txt";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const allCoordCount = folders.reduce((acc, f) => acc + f.coords.length, 0);

  return (
    <div>

      {/* Parse error modal */}
      {parseError && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
        }} onClick={() => setParseError(null)}>
          <div style={{
            background: "#1a0a0a", border: "1px solid #cc4444", borderRadius: 10,
            padding: 28, maxWidth: 480, width: "90%",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ color: "#cc4444", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>⚠ Failed to read map file</div>
            <div style={{ color: "#9a6060", fontSize: 12, lineHeight: 1.8, marginBottom: 16 }}>
              <strong style={{ color: "#e0e0f0" }}>Error:</strong> {parseError}
            </div>
            <div style={{ color: "#9a6060", fontSize: 12, lineHeight: 1.8, marginBottom: 20 }}>
              This can happen if:<br />
              — The file is not a valid <code style={{ color: "#cc9944" }}>.tbin</code> or <code style={{ color: "#cc9944" }}>.tmx</code> map file<br />
              — The file is still packed as an <code style={{ color: "#cc9944" }}>.xnb</code> — unpack it with xnbcli first<br />
              — The TMX uses an unsupported compression format<br />
              — The file is corrupted or incomplete<br />
              Check the <strong style={{ color: "#e0e0f0" }}>Bugs</strong> tab for known issues.
            </div>
            <button onClick={() => setParseError(null)} style={{
              background: "#2a0a0a", border: "1px solid #cc4444", color: "#cc4444",
              borderRadius: 6, padding: "8px 24px", cursor: "pointer", fontSize: 13, fontWeight: 700,
            }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Upload bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <input ref={fileRef} type="file" accept=".tbin,.tmx,.json" onChange={handleMapUpload} style={{ display: "none" }} />
        <input ref={tsFileRef} type="file" accept="image/png" multiple onChange={handleTilesheetUpload} style={{ display: "none" }} />
        <button onClick={() => fileRef.current.click()} style={{
          background: "#2a2a6e", border: "1px solid #4a4a9e", color: "#e0e0ff",
          borderRadius: 6, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700,
        }}>📂 Load Map File (.tbin / .tmx)</button>
        <button onClick={() => tsFileRef.current.click()} style={{
          background: mapData ? "#2a1a0a" : "#1a1a1a",
          border: `1px solid ${mapData ? "#6a4a0a" : "#2a2a2a"}`,
          color: mapData ? "#cc9944" : "#333355",
          borderRadius: 6, padding: "8px 18px", cursor: mapData ? "pointer" : "default", fontSize: 13, fontWeight: 700,
        }}>🖼 Upload Tilesheet PNG(s)</button>
        {loadMsg && <span style={{ color: loadMsg.startsWith("⚠") || loadMsg.startsWith("Parse error") ? "#cc9944" : "#44cc44", fontSize: 12 }}>{loadMsg}</span>}
        {mapData && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
            <span style={{ color: "#555577", fontSize: 12 }}>Zoom:</span>
            {[0.5,1,2,3].map(z => (
              <button key={z} onClick={() => setZoom(z)} style={{
                background: zoom === z ? "#2a2a6e" : "#0d0d1a",
                border: `1px solid ${zoom === z ? "#4a4a9e" : "#2a2a4e"}`,
                color: zoom === z ? "#e0e0ff" : "#555577",
                borderRadius: 4, padding: "3px 10px", cursor: "pointer", fontSize: 12,
              }}>{z}×</button>
            ))}
          </div>
        )}
      </div>

      {/* Tilesheet status */}
      {mapData && (
        <div style={{ background: "#1a120a", border: `1px solid ${renderReady ? "#2a6a2a" : "#4a3a0a"}`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ color: renderReady ? "#44cc44" : "#cc9944", fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
            {renderReady ? "✓ All tilesheets loaded — map rendering" : "⚠ Tilesheets needed to render this map"}
          </div>
          {mapData.tsheets.map(ts => {
            const loaded = !!tilesheetImgs[ts.img.toLowerCase()];
            return (
              <div key={ts.img} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>{loaded ? "✓" : "○"}</span>
                <code style={{ color: loaded ? "#44cc44" : "#cc9944", fontSize: 12 }}>{ts.img}.png</code>
                <span style={{ color: "#555577", fontSize: 11 }}>
                  {loaded ? "loaded" : `— unpack ${ts.img}.xnb with xnbcli`}
                </span>
              </div>
            );
          })}
          {!renderReady && (
            <div style={{ color: "#555577", fontSize: 11, marginTop: 8, borderTop: "1px solid #4a3a0a", paddingTop: 8 }}>
              Use the <strong style={{ color: "#cc9944" }}>🖼 Upload Tilesheet PNG(s)</strong> button above. You can select multiple files at once.
            </div>
          )}
        </div>
      )}

      {/* Saved Coordinates */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ color: "#9aa0c0", fontSize: 13, fontWeight: 600 }}>Saved Coordinates</span>
          <div style={{ display: "flex", gap: 6 }}>
            <input ref={importTxtRef} type="file" accept=".txt" onChange={importTxt} style={{ display: "none" }} />
            <button onClick={() => importTxtRef.current.click()} style={{
              background: "#1a1a2a", border: "1px solid #2a2a6e", color: "#7b8cde",
              borderRadius: 4, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700,
            }}>📂 Import .txt</button>
            {allCoordCount > 0 && (
              <button onClick={exportTxt} style={{
                background: "#1a2a1a", border: "1px solid #2a6a2a", color: "#44cc44",
                borderRadius: 4, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700,
              }}>📄 Export .txt</button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <input style={{ ...IS, flex: 1, fontSize: 12 }} value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            placeholder="New folder name..."
            onKeyDown={e => {
              if (e.key === "Enter" && newFolderName.trim()) {
                setFolders(prev => [...prev, { name: newFolderName.trim(), coords: [] }]);
                setNewFolderName("");
              }
            }} />
          <button onClick={() => {
            if (!newFolderName.trim()) return;
            setFolders(prev => [...prev, { name: newFolderName.trim(), coords: [] }]);
            setNewFolderName("");
          }} style={{
            background: "#1a1a3a", border: "1px solid #2a2a6e", color: "#7b8cde",
            borderRadius: 4, padding: "6px 10px", cursor: "pointer", fontSize: 12,
          }}>+ Folder</button>
        </div>

        {folders.map((folder, fi) => (
          <div key={fi} style={{ marginBottom: 8 }}>
            <div
              onClick={() => { setOpenFolders(prev => ({ ...prev, [fi]: !prev[fi] })); setActiveFolder(fi); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: activeFolder === fi ? "#1a1a3a" : "#1a1a2e",
                border: `1px solid ${activeFolder === fi ? "#4a4a9e" : "#2a2a4e"}`,
                borderRadius: openFolders[fi] ? "6px 6px 0 0" : 6,
                padding: "8px 12px", cursor: "pointer",
              }}>
              <span style={{ color: "#555577", fontSize: 12 }}>{openFolders[fi] ? "▼" : "▶"}</span>
              <span style={{ color: activeFolder === fi ? "#e0e0ff" : "#9aa0c0", fontSize: 13, fontWeight: 600, flex: 1 }}>{folder.name}</span>
              <span style={{ color: "#555577", fontSize: 11 }}>{folder.coords.length}</span>
            </div>
            {openFolders[fi] && (
              <div style={{ background: "#13132a", border: "1px solid #2a2a6e", borderTop: "none", borderRadius: "0 0 6px 6px", padding: 8 }}>
                {folder.coords.length === 0 ? (
                  <div style={{ color: "#333355", fontSize: 11, padding: "4px 4px" }}>No coordinates saved yet</div>
                ) : folder.coords.map(coord => (
                  <div key={coord.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 4px", borderBottom: "1px solid #1a1a2e" }}>
                    <div>
                      <div style={{ color: "#e0e0f0", fontSize: 12 }}>{coord.label}</div>
                      <div style={{ color: "#555577", fontSize: 11 }}>{coord.map} X:{coord.x} Y:{coord.y} {coord.direction !== undefined ? ["S","N","W","E"][coord.direction] : ""}</div>
                    </div>
                    <button onClick={() => removeCoord(fi, coord.id)} style={{
                      background: "none", border: "none", color: "#cc4444", cursor: "pointer", fontSize: 13,
                    }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {allCoordCount === 0 && (
          <div style={{ color: "#333355", fontSize: 12, marginTop: 4, marginLeft: 4 }}>
            Click any tile on the map to save a coordinate
          </div>
        )}
      </div>

      {/* Save coordinate input */}
      {pendingTile && (
        <div style={{ background: "#1a1a3a", border: "1px solid #4a4a9e", borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
            Save coordinate — {mapName} X:{pendingTile.x} Y:{pendingTile.y}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input style={{ ...IS, flex: 1 }} value={labelInput} onChange={e => setLabelInput(e.target.value)}
              placeholder="Label — e.g. Nicholas morning spawn"
              onKeyDown={e => { if (e.key === "Enter") addCoord(pendingTile.x, pendingTile.y, labelInput, pendingDir); }}
              autoFocus />
            <select style={{ ...SS }} value={activeFolder} onChange={e => setActiveFolder(Number(e.target.value))}>
              {folders.map((f, i) => <option key={i} value={i}>{f.name}</option>)}
            </select>
            <select style={{ ...SS, width: 100 }} value={pendingDir} onChange={e => setPendingDir(Number(e.target.value))}>
              <option value={0}>0 — South</option>
              <option value={1}>1 — North</option>
              <option value={2}>2 — West</option>
              <option value={3}>3 — East</option>
            </select>
            <button onClick={() => addCoord(pendingTile.x, pendingTile.y, labelInput, pendingDir)} style={{
              background: "#0a2a0a", border: "1px solid #2a6a2a", color: "#44cc44",
              borderRadius: 4, padding: "6px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700,
            }}>Save</button>
            <button onClick={() => { setPendingTile(null); setLabelInput(""); setPendingDir(0); }} style={{
              background: "transparent", border: "1px solid #2a2a4e", color: "#555577",
              borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: 12,
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Map */}
      <div style={{ minWidth: 0, overflow: "hidden" }}>
        {mapData && (
          <div style={{ border: "1px solid #2a2a4e", borderRadius: 8, overflow: "auto", width: "100%", maxWidth: "100%", height: 560, background: "#0a0a14", position: "relative", boxSizing: "border-box" }}>
            <div style={{ position: "relative", display: "inline-block", cursor: "crosshair" }}>
              <canvas ref={canvasRef}
                style={{ display: "block", imageRendering: "pixelated" }}
                onMouseMove={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const TILE = 16 * zoom;
                  const x = Math.floor((e.clientX - rect.left) / TILE);
                  const y = Math.floor((e.clientY - rect.top) / TILE);
                  const layer = mapData.layers[0];
                  if (x >= 0 && x < layer.width && y >= 0 && y < layer.height) setHoveredTile({x, y});
                }}
                onMouseLeave={() => setHoveredTile(null)}
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const TILE = 16 * zoom;
                  const x = Math.floor((e.clientX - rect.left) / TILE);
                  const y = Math.floor((e.clientY - rect.top) / TILE);
                  setPendingTile({x, y});
                }}
              />
              {mapData.layers[0] && (() => {
                const layer = mapData.layers[0];
                const TILE = 16 * zoom;
                return Array.from({length: layer.height}, (_, y) =>
                  Array.from({length: layer.width}, (_, x) => {
                    const isSaved = folders.some(f => f.coords.some(c => c.x===x && c.y===y));
                    const isHovered = hoveredTile?.x===x && hoveredTile?.y===y;
                    const isPending = pendingTile?.x===x && pendingTile?.y===y;
                    if (!isSaved && !isHovered && !isPending) return null;
                    return (
                      <div key={`${x},${y}`} style={{
                        position: "absolute",
                        left: x*TILE, top: y*TILE,
                        width: TILE, height: TILE,
                        background: isPending ? "rgba(74,74,158,0.5)" : isSaved ? "rgba(10,42,10,0.6)" : "rgba(42,42,78,0.4)",
                        border: isPending ? "2px solid #7b8cde" : isSaved ? "2px solid #44cc44" : "1px solid #4a4a9e",
                        boxSizing: "border-box", pointerEvents: "none",
                      }}/>
                    );
                  })
                );
              })()}
            </div>
            {!renderReady && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(10,10,20,0.8)", color: "#555577", fontSize: 13 }}>
                Upload tilesheet PNG(s) to render the map
              </div>
            )}
            {hoveredTile && (
              <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
                background: "#1a1a2e", border: "1px solid #4a4a9e", borderRadius: 4,
                padding: "4px 12px", color: "#7b8cde", fontSize: 12, fontWeight: 700,
                pointerEvents: "none", zIndex: 100 }}>
                {mapName} X: {hoveredTile.x} Y: {hoveredTile.y}
              </div>
            )}
          </div>
        )}
        {!mapData && (
          <div style={{ background: "#0d0d1a", border: "1px dashed #2a2a4e", borderRadius: 8, padding: 40, textAlign: "center", color: "#333355" }}>
            Load a .tbin or .tmx file to display the map
          </div>
        )}
      </div>
    </div>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MUSIC_TRACKS = [
  { value: "none", group: "None", label: "none — silence" },

  // ── Seasonal overworld ──
  { value: "spring1", group: "Seasonal", label: "Spring — It's a Big World Outside" },
  { value: "spring2", group: "Seasonal", label: "Spring — The Valley Comes Alive" },
  { value: "spring3", group: "Seasonal", label: "Spring — Wild Horseradish Jam" },
  { value: "summer1", group: "Seasonal", label: "Summer — Nature's Crescendo" },
  { value: "summer2", group: "Seasonal", label: "Summer — Orange Sky" },
  { value: "summer3", group: "Seasonal", label: "Summer — Tropicala" },
  { value: "fall1", group: "Seasonal", label: "Fall — The Smell of Mushroom" },
  { value: "fall2", group: "Seasonal", label: "Fall — Ghost Synth" },
  { value: "fall3", group: "Seasonal", label: "Fall — Raven's Descent" },
  { value: "winter1", group: "Seasonal", label: "Winter — Nocturne of Ice" },
  { value: "winter2", group: "Seasonal", label: "Winter — The Wind Can Be Still" },
  { value: "winter3", group: "Seasonal", label: "Winter — Ancient" },
  { value: "springtown", group: "Seasonal", label: "Pelican Town" },
  { value: "wavy", group: "Seasonal", label: "Calico Desert" },

  // ── Festivals ──
  { value: "event1", group: "Festival", label: "Fun Festival (Egg Festival)" },
  { value: "event2", group: "Festival", label: "Luau Festival" },
  { value: "fallFest", group: "Festival", label: "Stardew Valley Fair" },
  { value: "spirits_eve", group: "Festival", label: "Spirit's Eve Festival" },
  { value: "christmasTheme", group: "Festival", label: "Winter Festival (Feast of the Winter Star)" },
  { value: "FlowerDance", group: "Festival", label: "Flower Dance" },
  { value: "moonlightJellies", group: "Festival", label: "Dance of the Moonlight Jellies" },
  { value: "night_market", group: "Festival", label: "Night Market" },
  { value: "mermaidSong", group: "Festival", label: "Mermaid Song (Night Market show)" },
  { value: "tickTock", group: "Festival", label: "Festival Game" },
  { value: "wedding", group: "Festival", label: "Wedding Celebration" },

  // ── Character / heart-event themes ──
  { value: "50s", group: "Character", label: "Pleasant Memory (Penny's Theme)" },
  { value: "ragtime", group: "Character", label: "Pickle Jar Rag (Haley's Theme)" },
  { value: "desolate", group: "Character", label: "A Sad Song (Alex's Theme)" },
  { value: "gusviolin", group: "Character", label: "Violin Solo (Alex 10-heart)" },
  { value: "breezy", group: "Character", label: "Land of Green and Gold (Leah's Theme)" },
  { value: "elliottPiano", group: "Character", label: "Piano Solo (Elliott's Theme)" },
  { value: "echos", group: "Character", label: "Echos (Sebastian's Theme)" },
  { value: "bigDrums", group: "Character", label: "Sebastian — 6-heart drums" },
  { value: "EmilyTheme", group: "Character", label: "Song of Feathers (Emily's Theme)" },
  { value: "EmilyDance", group: "Character", label: "Emily's Dance (6-heart)" },
  { value: "EmilyDream", group: "Character", label: "Dreamscape (Emily 2-heart)" },
  { value: "shaneTheme", group: "Character", label: "Frozen Pizza & Eggs (Shane's Theme)" },
  { value: "spaceMusic", group: "Character", label: "Starwatcher (Maru's Theme)" },
  { value: "kindadumbautumn", group: "Character", label: "Grapefruit Sky (Harvey's Theme)" },
  { value: "harveys_theme_jazz", group: "Character", label: "Grapefruit Sky jazz (Harvey 14-heart)" },
  { value: "aerobics", group: "Character", label: "Aerobics Class (Harvey 6-heart)" },
  { value: "sadpiano", group: "Character", label: "A Dark Corner of the Past" },
  { value: "sad_kid", group: "Character", label: "Leo's Song" },
  { value: "AbigailFlute", group: "Character", label: "A Stillness in the Rain — solo (Abigail)" },
  { value: "AbigailFluteDuet", group: "Character", label: "A Stillness in the Rain — duet (Abigail)" },
  { value: "WizardSong", group: "Character", label: "A Glimpse of the Other World (Wizard)" },
  { value: "grandpas_theme", group: "Character", label: "Grandpa's Theme (music box lullaby)" },
  { value: "poppy", group: "Character", label: "Sam's Band — Pop" },
  { value: "heavy", group: "Character", label: "Sam's Band — Heavy" },
  { value: "honkytonky", group: "Character", label: "Sam's Band — Bluegrass" },
  { value: "shimmeringbastion", group: "Character", label: "Sam's Band — Electronic" },
  { value: "sampractice", group: "Character", label: "Band Practice (Sam 2-heart)" },
  { value: "sam_acoustic1", group: "Character", label: "Happy Junimo Show (Sam 14-heart)" },

  // ── Locations ──
  { value: "Saloon1", group: "Location", label: "The Stardrop Saloon" },
  { value: "marnieShop", group: "Location", label: "Country Shop (Marnie's / Carpenter's)" },
  { value: "libraryTheme", group: "Location", label: "Library & Museum" },
  { value: "MarlonsTheme", group: "Location", label: "The Adventure Guild" },
  { value: "IslandMusic", group: "Location", label: "Ginger Island" },
  { value: "woodsTheme", group: "Location", label: "In the Deep Woods" },
  { value: "Cavern", group: "Location", label: "Mines (a Flicker in the Deep)" },
  { value: "caldera", group: "Location", label: "Mystery of the Caldera" },
  { value: "PIRATE_THEME", group: "Location", label: "Pirate Theme (Pirate Cove)" },

  // ── Movie theater ──
  { value: "movieTheater", group: "Movie", label: "Movie Theater" },
  { value: "movieTheaterAfter", group: "Movie", label: "Movie Theater (Closing Time)" },
  { value: "movie_classic", group: "Movie", label: "Zuzu City Express (movie)" },

  // ── Mood / generic event ──
  { value: "jaunty", group: "Mood", label: "Jaunty — flute & harpsichord" },
  { value: "playful", group: "Mood", label: "Playful — clarinet & xylophone" },
  { value: "sweet", group: "Mood", label: "Buttercup Melody — soft, sweet" },
  { value: "distantBanjo", group: "Mood", label: "Distant Banjo — relaxed" },
  { value: "starshoot", group: "Mood", label: "Starshoot" },
  { value: "wind", group: "Mood", label: "Wind (loop)" },

  // ── Title / ambient / misc ──
  { value: "MainTheme", group: "Misc", label: "Stardew Valley Overture (main title)" },
  { value: "title_night", group: "Misc", label: "Load Game theme" },
  { value: "end_credits", group: "Misc", label: "Summit Celebration" },
  { value: "musicboxsong", group: "Misc", label: "Music Box Song" },
  { value: "ocean", group: "Misc", label: "Ocean waves (ambient)" },
  { value: "rain", group: "Misc", label: "Rain (ambient)" },
  { value: "cricketsAmbient", group: "Misc", label: "Crickets (night ambient)" },
  { value: "nightTime", group: "Misc", label: "Night crickets (overnight)" },
];

const MUSIC_GROUPS = ["None", "Seasonal", "Festival", "Character", "Location", "Movie", "Minigame", "Mood", "Misc"];
const MUSIC = MUSIC_TRACKS.map(t => t.value); // keep backward compat
const DIRECTIONS = [
  { value: "0", label: "0 — South" },
  { value: "1", label: "1 — North" },
  { value: "2", label: "2 — West" },
  { value: "3", label: "3 — East" },
];
const EMOTES = [
  { value: "", label: "None" },
  { value: "8", label: "8 — Question" },
  { value: "12", label: "12 — Angry" },
  { value: "16", label: "16 — Exclamation" },
  { value: "20", label: "20 — Heart" },
  { value: "24", label: "24 — Sleep" },
  { value: "28", label: "28 — Sad drop" },
  { value: "32", label: "32 — Happy" },
  { value: "40", label: "40 — Pause" },
  { value: "52", label: "52 — Videogame" },
  { value: "56", label: "56 — Music note" },
  { value: "60", label: "60 — Blush" },
];
const DEFAULT_FORK = { key: "", choiceLabel: "", dialogueKey: "", dlgAdvanced: false, dialogueContent: "", speakNPC: "", branchCommands: "", friendshipNPC: "", friendship: "", emoteNPC: "", emote: "", endNewDay: false };
const DEFAULT_EXTRAFORKGROUP = { label: "", questionId: "", questionNPC: "", questionText: "", hasValleyTalk: false, forks: [] };


// ═══════════════════════════════════════════════
// EVENT BUILDER
// ═══════════════════════════════════════════════


// ═══════════════════════════════════════════════
// DIALOGUE TAG HELPER
// ═══════════════════════════════════════════════

const DIALOGUE_TAGS = [
  // Expressions
  { tag: "$h",        label: "Happy",         group: "Expression", desc: "Switches to the happy portrait ($1 in portrait sheet)." },
  { tag: "$s",        label: "Sad",           group: "Expression", desc: "Switches to the sad portrait ($2 in portrait sheet)." },
  { tag: "$u",        label: "Unique",        group: "Expression", desc: "Switches to the unique/custom portrait ($3 in portrait sheet). Good for surprised, intense, or NPC-specific expressions." },
  { tag: "$neutral",  label: "Neutral",       group: "Expression", desc: "Returns to the neutral/default portrait ($0)." },
  { tag: "$l",        label: "Love",          group: "Expression", desc: "Switches to the love/blush portrait ($4 in portrait sheet)." },
  { tag: "$a",        label: "Angry",         group: "Expression", desc: "Switches to the angry portrait ($5 in portrait sheet)." },
  // Dynamic text
  { tag: "@",         label: "Player Name",   group: "Dynamic",    desc: "Inserts the player's actual farmer name. e.g. 'Hello, @!' becomes 'Hello, Farmer!'" },
  { tag: "%spouse",   label: "Spouse",        group: "Dynamic",    desc: "Inserts the name of the player's current spouse." },
  { tag: "%pet",      label: "Pet",           group: "Dynamic",    desc: "Inserts the name of the player's pet." },
  { tag: "%farm",     label: "Farm Name",     group: "Dynamic",    desc: "Inserts the name of the player's farm." },
  { tag: "%favorite", label: "Favorite",      group: "Dynamic",    desc: "Inserts the player's stated favorite thing from character creation." },
  { tag: "%name",     label: "NPC Name",      group: "Dynamic",    desc: "Inserts the display name of the NPC speaking." },
  // Structure
  { tag: "$b",        label: "Break",         group: "Structure",  desc: "Breaks dialogue into a new box. Same as #$b# in event strings — chains multiple dialogue boxes together." },
  { tag: "$e",        label: "End",           group: "Structure",  desc: "Ends the dialogue sequence. Used in dialogue files, not typically in event speak commands." },
  { tag: "$k",        label: "Kill",          group: "Structure",  desc: "Ends dialogue and immediately closes the box without waiting for player input." },
  // Advanced
  { tag: "$c",        label: "Chance",        group: "Advanced",   desc: "Dialogue shown based on a random chance. e.g. $c 0.5 shows 50% of the time." },
  { tag: "$d",        label: "World State",   group: "Advanced",   desc: "Shows different dialogue depending on world state flags. e.g. $d married." },
  { tag: "$y",        label: "Quick Response",group: "Advanced",   desc: "Triggers a yes/no quick response from the player." },
  { tag: "$p",        label: "Prerequisite",  group: "Advanced",   desc: "Only shows if a prerequisite condition is met." },
  { tag: "%adj",      label: "Adjective",     group: "Advanced",   desc: "Inserts a random adjective." },
  { tag: "%noun",     label: "Noun",          group: "Advanced",   desc: "Inserts a random noun." },
  { tag: "%place",    label: "Place",         group: "Advanced",   desc: "Inserts a random place name from the valley." },
];

const TAG_GROUP_COLORS = {
  Expression: "#2a2a6e",
  Dynamic:    "#1a3a2a",
  Structure:  "#2a1a2a",
  Advanced:   "#1a1a2e",
};

const TAG_GROUP_TEXT = {
  Expression: "#7b8cde",
  Dynamic:    "#44cc88",
  Structure:  "#cc44cc",
  Advanced:   "#555577",
};

function DialogueTagHelper({ onInsert }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  const groups = ["Expression", "Dynamic", "Structure"];
  if (showAdvanced) groups.push("Advanced");

  return (
    <div style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 6, padding: 10, marginBottom: 8 }}>
      <div style={{ color: "#555577", fontSize: 11, marginBottom: 8 }}>
        Click a tag to insert at cursor — hover for info
      </div>

      {groups.map(group => (
        <div key={group} style={{ marginBottom: 8 }}>
          <div style={{ color: TAG_GROUP_TEXT[group], fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{group}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {DIALOGUE_TAGS.filter(t => t.group === group).map(t => (
              <div key={t.tag} style={{ position: "relative" }}>
                <button
                  onClick={() => onInsert(t.tag)}
                  onMouseEnter={() => setTooltip(t)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    background: TAG_GROUP_COLORS[group],
                    border: `1px solid ${TAG_GROUP_TEXT[group]}44`,
                    color: "#e0e0f0", borderRadius: 4, cursor: "pointer",
                    padding: "3px 8px", fontSize: 12,
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                  <code style={{ color: TAG_GROUP_TEXT[group], fontSize: 11 }}>{t.tag}</code>
                  <span>{t.label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Tooltip */}
      {tooltip && (
        <div style={{ background: "#1a1a2e", border: "1px solid #4a4a9e", borderRadius: 4, padding: "8px 12px", marginTop: 6 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <code style={{ color: TAG_GROUP_TEXT[tooltip.group], fontSize: 13, fontWeight: 700 }}>{tooltip.tag}</code>
            <span style={{ color: "#e0e0f0", fontWeight: 600, fontSize: 13 }}>{tooltip.label}</span>
            <span style={{ color: TAG_GROUP_TEXT[tooltip.group], fontSize: 10, border: `1px solid ${TAG_GROUP_TEXT[tooltip.group]}44`, borderRadius: 3, padding: "1px 6px" }}>{tooltip.group}</span>
          </div>
          <div style={{ color: "#9aa0c0", fontSize: 12 }}>{tooltip.desc}</div>
        </div>
      )}

      <button onClick={() => setShowAdvanced(s => !s)} style={{
        background: "none", border: "none", color: "#333355", cursor: "pointer",
        fontSize: 11, marginTop: 6, padding: 0,
      }}>{showAdvanced ? "▲ Hide advanced tags" : "▼ Show advanced tags"}</button>
    </div>
  );
}


// ═══════════════════════════════════════════════
// SCENE COMMAND HELPER
// ═══════════════════════════════════════════════

const SCENE_COMMANDS = [
  // Movement
  { cmd: "move",          label: "Move",        group: "Movement",  snippet: "move NPC 0 -2 0",                  desc: "Move an actor by tiles (dx dy) then face a direction. Add a trailing `true` to run without waiting for it to finish." },
  { cmd: "faceDirection", label: "Face",        group: "Movement",  snippet: "faceDirection NPC 2",              desc: "Turn an actor to face a direction (0 up, 1 right, 2 down, 3 left)." },
  { cmd: "warp",          label: "Warp",        group: "Movement",  snippet: "warp NPC 0 0",                     desc: "Instantly place an actor at an absolute tile. Use -1000 -1000 to send them offscreen." },
  // Timing
  { cmd: "pause",         label: "Pause",       group: "Timing",    snippet: "pause 400",                       desc: "Wait, in milliseconds, before the next command runs." },
  // Dialogue
  { cmd: "speak",         label: "Speak",       group: "Dialogue",  snippet: "speak NPC \"Text here.$0\"",       desc: "NPC dialogue box with portrait. End with a portrait tag like $0. Use the tag helper below for expressions." },
  { cmd: "message",       label: "Message",     group: "Dialogue",  snippet: "message \"Narration text.\"",      desc: "A text box with no portrait — narration the player reads." },
  { cmd: "textAboveHead", label: "Text Above",  group: "Dialogue",  snippet: "textAboveHead NPC \"...\"",        desc: "Small floating text above an actor's head." },
  // Animation
  { cmd: "animate",       label: "Animate",     group: "Animation", snippet: "animate NPC false true 200 0 1 2", desc: "Play frames on an actor: actor, flip, loop, ms-per-frame, then the frame numbers." },
  { cmd: "stopAnimation", label: "Stop Anim",   group: "Animation", snippet: "stopAnimation NPC",                desc: "Stop an actor's currently running animation." },
  { cmd: "showFrame",     label: "Show Frame",  group: "Animation", snippet: "showFrame NPC 0",                  desc: "Freeze an actor on a single sprite frame." },
  { cmd: "emote",         label: "Emote",       group: "Animation", snippet: "emote NPC 32",                     desc: "Emote bubble above an actor (16 heart, 28 sweat, 32 surprised, 40 sad, 56 angry)." },
  // Audio
  { cmd: "playSound",     label: "Sound",       group: "Audio",     snippet: "playSound dwop",                   desc: "Play a sound cue by name (dwop, doorClose, coin, crickets, hammer)." },
  // Camera & Fade
  { cmd: "viewport",      label: "Viewport",    group: "Camera",    snippet: "viewport 14 20 true",             desc: "Pan the camera to a tile. Trailing `true` makes it a smooth pan." },
  { cmd: "globalFade",    label: "Global Fade", group: "Camera",    snippet: "globalFade",                      desc: "Screen fade command." },
  { cmd: "fade",          label: "Fade",        group: "Camera",    snippet: "fade",                            desc: "Screen fade command." },
  // Advanced
  { cmd: "addTemporaryActor",       label: "Temp Actor",    group: "Advanced", snippet: "addTemporaryActor NPC 16 32 0 0 0 false Character", desc: "Spawn a temporary actor: name, sprite width, sprite height, x, y, dir, breather, type." },
  { cmd: "removeSprite",            label: "Remove Sprite", group: "Advanced", snippet: "removeSprite 0 0",                                 desc: "Remove a temporary sprite at a tile." },
  { cmd: "specificTemporarySprite", label: "Temp Sprite",   group: "Advanced", snippet: "specificTemporarySprite id",                       desc: "Show a named hardcoded temporary sprite effect." },
  { cmd: "shake",                   label: "Shake",         group: "Advanced", snippet: "shake NPC 1000",                                   desc: "Shake an actor for a duration in milliseconds." },
];

const CMD_GROUP_COLORS = {
  Movement:  "#1a2a3a",
  Timing:    "#2a2a1a",
  Dialogue:  "#2a2a6e",
  Animation: "#1a3a2a",
  Audio:     "#2a1a2a",
  Camera:    "#1a2a2a",
  Advanced:  "#1a1a2e",
};

const CMD_GROUP_TEXT = {
  Movement:  "#6a9ad0",
  Timing:    "#cccc66",
  Dialogue:  "#7b8cde",
  Animation: "#44cc88",
  Audio:     "#cc44cc",
  Camera:    "#44cccc",
  Advanced:  "#555577",
};

const SPEAK_EXPRESSIONS = [
  { tag: "$0", label: "Neutral" },
  { tag: "$1", label: "Happy" },
  { tag: "$2", label: "Sad" },
  { tag: "$3", label: "Unique" },
  { tag: "$4", label: "Blush / Love" },
  { tag: "$5", label: "Angry" },
];

const TEXT_INSERTS = [
  { group: "Expression", items: SPEAK_EXPRESSIONS.map(x => [x.tag, x.label]) },
  { group: "Dynamic", items: [["@", "Player name"], ["%spouse", "Spouse"], ["%pet", "Pet"], ["%farm", "Farm"], ["%favorite", "Favorite"], ["%name", "NPC name"]] },
  { group: "Box break", items: [["#$b#", "New box"]] },
];

function TagPalette({ onInsert, mode }) {
  const groups = mode === "dynamic" ? TEXT_INSERTS.filter(g => g.group !== "Expression") : TEXT_INSERTS;
  return (
    <div style={{ marginTop: 6, background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 4, padding: 8 }}>
      <div style={{ color: "#555577", fontSize: 10, marginBottom: 6 }}>Click to insert at cursor</div>
      {groups.map(grp => (
        <div key={grp.group} style={{ marginBottom: 6 }}>
          <div style={{ color: "#555577", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>{grp.group}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {grp.items.map(([tok, lbl]) => (
              <button key={tok} type="button" onClick={() => onInsert(tok)} title={tok}
                style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", color: "#9aa0c0", borderRadius: 3, cursor: "pointer", padding: "2px 7px", fontSize: 11, fontFamily: "monospace" }}>
                <span style={{ color: "#7b8cde" }}>{tok}</span> {lbl}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Per-command fill-in forms ──
const DIR_OPTS = [
  { value: "0", label: "0 — Up" },
  { value: "1", label: "1 — Right" },
  { value: "2", label: "2 — Down" },
  { value: "3", label: "3 — Left" },
];
const BOOL_OPTS = [
  { value: "false", label: "false" },
  { value: "true", label: "true" },
];
// Emote IDs use the first frame of each row. (0–3 is the start animation; 44–51 are unused.)
const EMOTE_OPTIONS = [
  { value: "4", label: "Empty can (4)" },
  { value: "8", label: "Question (8)" },
  { value: "12", label: "Angry (12)" },
  { value: "16", label: "Exclamation (16)" },
  { value: "20", label: "Heart (20)" },
  { value: "24", label: "Sleep (24)" },
  { value: "28", label: "Sad (28)" },
  { value: "32", label: "Happy (32)" },
  { value: "36", label: "X (36)" },
  { value: "40", label: "Pause (40)" },
  { value: "52", label: "Videogame (52)" },
  { value: "56", label: "Music note (56)" },
  { value: "60", label: "Blush (60)" },
];

const SOUND_CUES = Array.from(new Set([
  // Footsteps
  "Cowboy_Footstep","grassyStep","jingleBell","sandyStep","snowyStep","stoneStep","thudStep","woodyStep",
  // Music
  "50s","AbigailFlute","AbigailFluteDuet","aerobics","archaeo","bigDrums","breezy","caldera","Cavern","christmasTheme","Cloth","CloudCountry","clubloop","cowboy_boss","cowboy_outlawsong","Cowboy_OVERWORLD","Cowboy_singing","Cowboy_undead","crane_game","crane_game_fast","Crystal Bells","Cyclops","desolate","distantBanjo","EarthMine","echos","elliottPiano","EmilyDance","EmilyDream","EmilyTheme","end_credits","event1","event2","fall1","fall2","fall3","fallFest","fieldofficeTentMusic","FlowerDance","FrogCave","FrostMine","Ghost Synth","grandpas_theme","gusviolin","harveys_theme_jazz","heavy","honkytonky","Icicles","IslandMusic","jaunty","junimoKart","junimoKart_ghostMusic","junimoKart_mushroomMusic","junimoKart_slimeMusic","junimoKart_whaleMusic","junimoStarSong","kindadumbautumn","LavaMine","libraryTheme","MainTheme","Majestic","MarlonsTheme","marnieShop","mermaidSong","moonlightJellies","movie_classic","movie_nature","movie_wumbus","movieTheater","movieTheaterAfter","musicboxsong","Near The Planet Core","New Snow","night_market","Of Dwarves","Orange","Overcast","Pink Petals","PIRATE_THEME","PIRATE_THEME(muffled)","playful","Plums","poppy","raccoonSong","ragtime","sad_kid","sadpiano","Saloon1","sam_acoustic1","sam_acoustic2","sampractice","sappypiano","Secret Gnomes","SettlingIn","shaneTheme","shimmeringbastion","spaceMusic","spirits_eve","spring1","spring2","spring3","springsongs","springtown","Stadium_ambient","starshoot","submarine_song","summer1","summer2","summer3","SunRoom","sweet","tickTock","tinymusicbox","title_night","tribal","Tropical Jam","VolcanoMines","VolcanoMines1","VolcanoMines2","wavy","wedding","winter1","winter2","winter3","WizardSong","woodsTheme","XOR",
  // Ambient music
  "babblingBrook","bugLevelLoop","communityCenter","cracklingFire","darkCaveLoop","fall_day_ambient","Frost_Ambient","heavyEngine","Hospital_Ambient","jojaOfficeSoundscape","jungle_ambience","Lava_Ambient","movieScreenAmbience","nightTime","ocean","pool_ambient","rain","roadnoise","spring_day_ambient","spring_night_ambient","summer_day_ambient","tropical_island_day_ambient","Upper_Ambient","Volcano_Ambient","waterfall","waterfall_big","wind","winter_day_ambient",
  // Sound effects
  "achievement","axchop","axe","backpackIN","barrelBreak","batFlap","batScreech","bigDeSelect","bigSelect","bob","book_read","boop","boulderBreak","boulderCrack","breakingGlass","breathin","breathout","bubbles","busDoorOpen","busDriveOff","button_press","button_tap","button1","cacklingWitch","camel","cameraNoise","cancel","cast","cat","cavedrip","clam_tone","clank","clubhit","clubSmash","clubswipe","cluck","coin","coldSpell","cow","cowboy_dead","cowboy_explosion","cowboy_gopher","cowboy_gunload","Cowboy_gunshot","Cowboy_monsterDie","cowboy_monsterhit","cowboy_powerup","Cowboy_Secret","crafting","crane","crickets","cricketsAmbient","crit","croak","crow","crystal","cursed_mannequin","cut","daggerswipe","death","debuffHit","debuffSpell","detector","dialogueCharacter","dialogueCharacterClose","dirtyHit","discoverMineral","distantTrain","dog_bark","dog_pant","dogs","dogWhining","doorClose","doorCreak","doorCreakReverse","doorOpen","dropItemInWater","drumkit0","drumkit1","drumkit2","drumkit3","drumkit4","drumkit5","drumkit6","Duck","Duggy","dustMeep","DwarvishSentry","dwoop","dwop","eat","explosion","fairy_heal","fallDown","fastReel","fireball","firework","fishBite","fishBite_alternate_0","fishBite_alternate_1","fishBite_alternate_2","fishEscape","FishHit","fishingRodBend","fishSlap","flameSpell","flameSpellHit","flute","flybuzzing","frog_slap","frozen","furnace","fuse","getNewSpecialItem","ghost","give_gift","glug","goat","goldenWalnut","gorilla_intro","grunt","gulp","hammer","harvest","healSound","hitEnemy","hoeHit","horse_flute","jingle1","junimoKart_coin","junimoMeep1","keyboardTyping","killAnimal","leafrustle","machine_bell","magic_arrow","magic_arrow_hit","magma_sprite_die","magma_sprite_hit","magma_sprite_spot","metal_tap","Meteorite","Milking","minecartLoop","miniharp_note","money","moneyDial","monkey1","monsterdead","moss_cut","mouseClick","newArtifact","newRecipe","newRecord","objectiveComplete","openBox","openChest","Ostrich","ow","owl","parachute","parrot","parrot_flap","parrot_squawk","parry","phone","Pickup_Coin15","pickUpItem","pig","planeflyby","potterySmash","powerup","pullItemFromWater","purchase","purchaseClick","purchaseRepeat","qi_shop","qi_shop_purchase","questcomplete","quickSlosh","rabbit","Raccoon","rainsound","reward","robotBLASTOFF","robotSoundEffects","rockGolemDie","rockGolemHit","rockGolemSpawn","rooster","scissors","seagulls","secret1","seeds","select","sell","serpentDie","serpentHit","sewing_loop","shadowDie","shadowHit","shadowpeep","sheep","shiny4","Ship","shwip","SinWave","sipTea","skeletonDie","skeletonHit","skeletonStep","slime","slimedead","slimeHit","slingshot","slosh","slowReel","smallSelect","SpringBirds","squid_bubble","squid_hit","squid_move","Stadium_cheer","stairsdown","stardrop","statue_of_blessings","steam","stone_button","stoneCrack","stumpCrack","submarine_landing","swordswipe","telephone_buttonPush","telephone_dialtone","telephone_ringingInEar","terraria_boneSerpent","terraria_meowmere","terraria_warp","throw","throwDownITem","thunder","thunder_small","ticket_machine_whir","tinyWhip","toolCharge","toolSwap","toyPiano","trainLoop","trainWhistle","trashbear","trashbear_flute","trashcan","trashcanlid","treasure_totem","treecrack","treethud","turtle_pet","UFO","wand","warrior","wateringCan","waterSlosh","weed_cut","whistle","windstorm","woodchipper","woodchipper_occasional","woodWhack","woodyHit","yoba",
])).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

const AUDIO_PREVIEW_LINKS = [
  { label: "Music previews (Lewis G)", url: "https://www.youtube.com/playlist?list=PLKDOdCjxOjzIFucHobwJpSK4-vAVXST90" },
  // Add the sound-effects preview link here when found: { label: "Sound-effect previews", url: "..." },
];

function SoundPicker({ value, onChange }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const matches = needle ? SOUND_CUES.filter(s => s.toLowerCase().includes(needle)) : SOUND_CUES;
  return (
    <div>
      <input style={IS} value={value} onChange={e => onChange(e.target.value)} placeholder="dwop" />
      <input style={{ ...IS, marginTop: 6 }} value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${SOUND_CUES.length} sounds…`} />
      <div style={{ marginTop: 6, maxHeight: 170, overflowY: "auto", background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 4 }}>
        {matches.map(s => (
          <button key={s} type="button" onClick={() => onChange(s)}
            style={{ display: "block", width: "100%", textAlign: "left", background: value === s ? "#1f2540" : "transparent", border: "none", borderBottom: "1px solid #15152a", color: value === s ? "#7b8cde" : "#9aa0c0", cursor: "pointer", padding: "4px 8px", fontSize: 12, fontFamily: "monospace" }}>
            {s}
          </button>
        ))}
        {matches.length === 0 && <div style={{ color: "#555577", fontSize: 11, padding: 8 }}>No match — you can still type a custom cue in the field above.</div>}
      </div>
      {AUDIO_PREVIEW_LINKS.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#555577" }}>
          Hear them:{" "}
          {AUDIO_PREVIEW_LINKS.map((l, i) => (
            <span key={l.url}>
              {i > 0 && " · "}
              <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: "#7b8cde", textDecoration: "none" }}>{l.label} ↗</a>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Base-game (vanilla) NPC actor names usable in events. "farmer" is the player.
// Custom/modded NPCs aren't here — the picker always lets you type any name in the field.
const BASE_GAME_NPCS = [
  "farmer",
  "Abigail", "Alex", "Caroline", "Clint", "Demetrius", "Dwarf", "Elliott", "Emily",
  "Evelyn", "George", "Gunther", "Gus", "Haley", "Harvey", "Jas", "Jodi", "Kent",
  "Krobus", "Leah", "Leo", "Lewis", "Linus", "Marlon", "Marnie", "Maru", "Morris",
  "Pam", "Penny", "Pierre", "Robin", "Sam", "Sandy", "Sebastian", "Shane",
  "Vincent", "Willy", "Wizard",
];

// Searchable NPC name picker — base-game list plus free-typing for custom/modded NPCs.
// Same pattern as SoundPicker: the top field is the real value (type anything), the list fills it.
function NpcPicker({ value, onChange, placeholder, compact }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(!compact); // compact starts collapsed; full stays open
  const needle = q.trim().toLowerCase();
  const matches = needle ? BASE_GAME_NPCS.filter(n => n.toLowerCase().includes(needle)) : BASE_GAME_NPCS;
  const isCustom = value && !BASE_GAME_NPCS.some(n => n.toLowerCase() === value.toLowerCase());
  return (
    <div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input style={{ ...IS, flex: 1 }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || "Nicholas"} />
        {compact && (
          <button type="button" onClick={() => setOpen(o => !o)} title="Pick a base-game NPC"
            style={{ background: open ? "#1a1a3a" : "transparent", border: "1px solid #2a2a4e", color: "#7b8cde", borderRadius: 4, padding: "6px 9px", cursor: "pointer", fontSize: 11, fontFamily: "monospace", whiteSpace: "nowrap" }}>
            👤 {open ? "▲" : "Pick ▾"}
          </button>
        )}
      </div>
      {isCustom && <div style={{ color: "#cc9944", fontSize: 11, marginTop: 3 }}>Custom NPC — make sure the name matches the NPC's internal name exactly.</div>}
      {open && (
        <>
          <input style={{ ...IS, marginTop: 6 }} value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${BASE_GAME_NPCS.length} base-game NPCs…`} />
          <div style={{ marginTop: 6, maxHeight: 170, overflowY: "auto", background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 4 }}>
            {matches.map(n => (
              <button key={n} type="button" onClick={() => { onChange(n); if (compact) setOpen(false); }}
                style={{ display: "block", width: "100%", textAlign: "left", background: value === n ? "#1f2540" : "transparent", border: "none", borderBottom: "1px solid #15152a", color: value === n ? "#7b8cde" : "#9aa0c0", cursor: "pointer", padding: "4px 8px", fontSize: 12, fontFamily: "monospace" }}>
                {n === "farmer" ? "farmer — the player" : n}
              </button>
            ))}
            {matches.length === 0 && <div style={{ color: "#555577", fontSize: 11, padding: 8 }}>No base-game match — type a custom/modded NPC name in the field above.</div>}
          </div>
        </>
      )}
    </div>
  );
}

const COMMAND_FORMS = {
  move: {
    title: "Move — walk an actor by tiles",
    fields: [
      { key: "actor", type: "npc", label: "Actor", placeholder: "Nicholas" },
      { key: "dx", type: "number", label: "Δ X (tiles, − is left)", default: "0" },
      { key: "dy", type: "number", label: "Δ Y (tiles, − is up)", default: "0" },
      { key: "dir", type: "select", label: "End facing", options: DIR_OPTS, default: "0" },
      { key: "nowait", type: "checkbox", checkboxLabel: "Run without waiting (true)", default: false },
    ],
    build: v => `move ${v.actor || "NPC"} ${v.dx || 0} ${v.dy || 0} ${v.dir}${v.nowait ? " true" : ""}`,
  },
  faceDirection: {
    title: "Face Direction — turn an actor",
    fields: [
      { key: "actor", type: "npc", label: "Actor", placeholder: "Nicholas" },
      { key: "dir", type: "select", label: "Facing", options: DIR_OPTS, default: "0" },
      { key: "nowait", type: "checkbox", checkboxLabel: "Run without waiting (true)", default: false },
    ],
    build: v => `faceDirection ${v.actor || "NPC"} ${v.dir}${v.nowait ? " true" : ""}`,
  },
  warp: {
    title: "Warp — teleport an actor to a tile",
    fields: [
      { key: "actor", type: "npc", label: "Actor", placeholder: "Nicholas" },
      { key: "x", type: "number", label: "X", default: "0" },
      { key: "y", type: "number", label: "Y", default: "0" },
    ],
    build: v => `warp ${v.actor || "NPC"} ${v.x || 0} ${v.y || 0}`,
  },
  pause: {
    title: "Pause — wait",
    fields: [ { key: "ms", type: "number", label: "Milliseconds", default: "400" } ],
    build: v => `pause ${v.ms || 0}`,
  },
  message: {
    title: "Message — narration box (no portrait)",
    fields: [ { key: "text", type: "textarea", label: "Text", tags: "dynamic", placeholder: "He stumbles, catching himself on the doorframe." } ],
    build: v => `message "${v.text}"`,
  },
  speak: {
    title: "Speak — build a dialogue line",
    fields: [
      { key: "actor", type: "npc", label: "NPC", placeholder: "Nicholas" },
      { key: "text", type: "textarea", label: "What they say", tags: "full", hint: "Insert expressions, @player, %spouse, and box breaks from the buttons below.", placeholder: "Don't get smug when I beat you.$1" },
    ],
    build: v => `speak ${v.actor || "NPC"} "${v.text}"`,
  },
  textAboveHead: {
    title: "Text Above Head",
    fields: [
      { key: "actor", type: "npc", label: "Actor", placeholder: "Nicholas" },
      { key: "text", type: "text", label: "Text", tags: "dynamic", placeholder: "..." },
    ],
    build: v => `textAboveHead ${v.actor || "NPC"} "${v.text}"`,
  },
  animate: {
    title: "Animate — play frames from the sheet",
    fields: [
      { key: "actor", type: "npc", label: "Actor", placeholder: "Nicholas" },
      { key: "flip", type: "select", label: "Flip horizontally", options: BOOL_OPTS, default: "false" },
      { key: "loop", type: "select", label: "Loop", options: BOOL_OPTS, default: "true" },
      { key: "interval", type: "number", label: "ms per frame", default: "200" },
      { key: "frames", type: "frames", label: "Frame numbers (space-separated)", placeholder: "63 67 71 67", hint: "Click 🎞 Pick frames to choose them visually, or type them in play order." },
    ],
    build: v => `animate ${v.actor || "NPC"} ${v.flip} ${v.loop} ${v.interval || 100} ${v.frames}`.trim(),
  },
  stopAnimation: {
    title: "Stop Animation",
    fields: [ { key: "actor", type: "npc", label: "Actor", placeholder: "Nicholas" } ],
    build: v => `stopAnimation ${v.actor || "NPC"}`,
  },
  showFrame: {
    title: "Show Frame — freeze on one frame",
    fields: [
      { key: "actor", type: "npc", label: "Actor", placeholder: "Nicholas" },
      { key: "frame", type: "number", label: "Frame number", default: "0" },
    ],
    build: v => `showFrame ${v.actor || "NPC"} ${v.frame || 0}`,
  },
  emote: {
    title: "Emote — bubble above an actor",
    fields: [
      { key: "actor", type: "npc", label: "Actor", placeholder: "Nicholas" },
      { key: "id", type: "select", label: "Emote", options: EMOTE_OPTIONS, default: "32" },
    ],
    build: v => `emote ${v.actor || "NPC"} ${v.id}`,
  },
  playSound: {
    title: "Play Sound",
    fields: [ { key: "sound", type: "sound", label: "Sound cue", default: "dwop", hint: "Search or scroll the list. You can also type a custom/modded cue." } ],
    build: v => `playSound ${v.sound || "dwop"}`,
  },
  viewport: {
    title: "Viewport — pan the camera",
    fields: [
      { key: "x", type: "number", label: "X", default: "0" },
      { key: "y", type: "number", label: "Y", default: "0" },
      { key: "smooth", type: "checkbox", checkboxLabel: "Smooth pan (true)", default: false },
    ],
    build: v => `viewport ${v.x || 0} ${v.y || 0}${v.smooth ? " true" : ""}`,
  },
  shake: {
    title: "Shake — shake an actor",
    fields: [
      { key: "actor", type: "npc", label: "Actor", placeholder: "Nicholas" },
      { key: "ms", type: "number", label: "Milliseconds", default: "1000" },
    ],
    build: v => `shake ${v.actor || "NPC"} ${v.ms || 1000}`,
  },
  removeSprite: {
    title: "Remove Sprite",
    fields: [
      { key: "x", type: "number", label: "X", default: "0" },
      { key: "y", type: "number", label: "Y", default: "0" },
    ],
    build: v => `removeSprite ${v.x || 0} ${v.y || 0}`,
  },
  specificTemporarySprite: {
    title: "Specific Temporary Sprite",
    fields: [ { key: "id", type: "text", label: "Sprite ID", placeholder: "pennyMess" } ],
    build: v => `specificTemporarySprite ${v.id}`,
  },
  addTemporaryActor: {
    title: "Add Temporary Actor",
    fields: [
      { key: "name", type: "npc", label: "Name / sheet", placeholder: "Nicholas" },
      { key: "sw", type: "number", label: "Sprite width", default: "16" },
      { key: "sh", type: "number", label: "Sprite height", default: "32" },
      { key: "x", type: "number", label: "X", default: "0" },
      { key: "y", type: "number", label: "Y", default: "0" },
      { key: "dir", type: "select", label: "Facing", options: DIR_OPTS, default: "0" },
      { key: "breather", type: "select", label: "Breather", options: BOOL_OPTS, default: "false" },
      { key: "type", type: "text", label: "Type", default: "Character" },
    ],
    build: v => `addTemporaryActor ${v.name || "NPC"} ${v.sw || 16} ${v.sh || 32} ${v.x || 0} ${v.y || 0} ${v.dir} ${v.breather} ${v.type || "Character"}`,
  },
  // globalFade and fade take no arguments — they insert directly with no form.
};

// Inverse of COMMAND_FORMS[cmd].build — turns a raw line back into { cmd, initial }
// so an existing line can re-open its builder pre-filled. Returns null if not parseable.
function parseLineToForm(line) {
  const t = (line || "").trim();
  if (!t) return null;
  const cmd = t.split(/\s+/)[0];
  if (!COMMAND_FORMS[cmd]) return null;
  const rest = t.slice(cmd.length).trim();

  // Commands whose last field is a quoted string (actor + "text")
  if (cmd === "speak" || cmd === "textAboveHead") {
    const m = rest.match(/^(\S+)\s+"([\s\S]*)"$/);
    if (!m) return null;
    return { cmd, initial: { actor: m[1], text: m[2] } };
  }
  if (cmd === "message") {
    const m = rest.match(/^"([\s\S]*)"$/);
    if (!m) return null;
    return { cmd, initial: { text: m[1] } };
  }

  const a = rest.length ? rest.split(/\s+/) : [];
  switch (cmd) {
    case "move": {
      // move actor dx dy dir [true]
      const initial = { actor: a[0] || "", dx: a[1] || "0", dy: a[2] || "0", dir: a[3] || "0", nowait: a[4] === "true" };
      return { cmd, initial };
    }
    case "faceDirection":
      return { cmd, initial: { actor: a[0] || "", dir: a[1] || "0", nowait: a[2] === "true" } };
    case "warp":
      return { cmd, initial: { actor: a[0] || "", x: a[1] || "0", y: a[2] || "0" } };
    case "pause":
      return { cmd, initial: { ms: a[0] || "0" } };
    case "animate":
      // animate actor flip loop interval frame frame ...
      return { cmd, initial: { actor: a[0] || "", flip: a[1] || "false", loop: a[2] || "true", interval: a[3] || "100", frames: a.slice(4).join(" ") } };
    case "stopAnimation":
      return { cmd, initial: { actor: a[0] || "" } };
    case "showFrame":
      return { cmd, initial: { actor: a[0] || "", frame: a[1] || "0" } };
    case "emote":
      return { cmd, initial: { actor: a[0] || "", id: a[1] || "32" } };
    case "playSound":
      return { cmd, initial: { sound: a[0] || "dwop" } };
    case "viewport":
      return { cmd, initial: { x: a[0] || "0", y: a[1] || "0", smooth: a[2] === "true" } };
    case "shake":
      return { cmd, initial: { actor: a[0] || "", ms: a[1] || "1000" } };
    case "removeSprite":
      return { cmd, initial: { x: a[0] || "0", y: a[1] || "0" } };
    case "specificTemporarySprite":
      return { cmd, initial: { id: a[0] || "" } };
    case "addTemporaryActor":
      return { cmd, initial: { name: a[0] || "", sw: a[1] || "16", sh: a[2] || "32", x: a[3] || "0", y: a[4] || "0", dir: a[5] || "0", breather: a[6] || "false", type: a[7] || "Character" } };
    default:
      // No-arg or unsupported command — not editable via builder
      return { cmd, initial: {} };
  }
}

// ─── FRAME PICKER ───
// Visual frame selector for the animate command. Loads a PNG spritesheet,
// lets you click frames in play order, previews at the chosen interval, and
// returns ONLY the space-separated frame list (no JSON, no sheet output).
const FP_FRAME_W = 16, FP_FRAME_H = 32, FP_PER_ROW = 4;

function FpFrameCanvas({ img, frameIndex, size, selected, inSequence, seqPos, onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!img || !ref.current) return;
    const ctx = ref.current.getContext("2d");
    const col = frameIndex % FP_PER_ROW, row = Math.floor(frameIndex / FP_PER_ROW);
    ctx.clearRect(0, 0, ref.current.width, ref.current.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, col * FP_FRAME_W, row * FP_FRAME_H, FP_FRAME_W, FP_FRAME_H, 0, 0, FP_FRAME_W * size, FP_FRAME_H * size);
  }, [img, frameIndex, size]);
  return (
    <div onClick={onClick} style={{ cursor: "pointer", position: "relative", display: "inline-block" }}>
      <canvas ref={ref} width={FP_FRAME_W * size} height={FP_FRAME_H * size}
        style={{ display: "block", imageRendering: "pixelated", background: "#000",
          border: `2px solid ${selected ? "#7b8cde" : inSequence ? "#44aa44" : "#2a2a4e"}`, borderRadius: 3 }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)", color: "#9aa0c0", fontSize: 9, textAlign: "center", lineHeight: "13px" }}>{frameIndex}</div>
      {inSequence && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(40,120,40,0.85)", color: "#dfe", fontSize: 9, textAlign: "center", lineHeight: "13px" }}>#{seqPos}</div>}
    </div>
  );
}

function FpPreview({ img, frames, interval }) {
  const [idx, setIdx] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (!frames || frames.length === 0) return;
    setIdx(0);
    if (ref.current) clearInterval(ref.current);
    // animate command interval is milliseconds-per-frame directly (no /10 like AnimationDescriptions)
    ref.current = setInterval(() => setIdx(i => (i + 1) % frames.length), Math.max(16, interval || 200));
    return () => clearInterval(ref.current);
  }, [frames, interval]);
  if (!frames || frames.length === 0) return <div style={{ color: "#555577", fontSize: 12, padding: 16 }}>No frames picked yet</div>;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: "#555577", fontSize: 11, marginBottom: 6 }}>Preview — {interval || 200}ms/frame</div>
      <FpFrameCanvas img={img} frameIndex={frames[idx]} size={5} />
      <div style={{ color: "#555577", fontSize: 10, marginTop: 4 }}>Frame {frames[idx]} ({idx + 1}/{frames.length})</div>
    </div>
  );
}

function FramePicker({ initialFrames, interval, onConfirm, onClose }) {
  const [img, setImg] = useState(null);
  const [total, setTotal] = useState(0);
  const [seq, setSeq] = useState(() => {
    const f = (initialFrames || "").trim();
    return f ? f.split(/\s+/).map(Number).filter(n => !isNaN(n)) : [];
  });
  const [loadErr, setLoadErr] = useState("");
  const fileRef = useRef(null);
  // Editable speed, same units as the Animation Builder (ticks); the animate command uses ms = ticks/10.
  const [speed, setSpeed] = useState(() => (parseInt(interval) || 200) * 10);
  const ms = Math.max(16, Math.floor((Number(speed) || 2000) / 10));

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const image = new Image();
      image.onload = () => {
        if (image.width % FP_FRAME_W !== 0 || image.height % FP_FRAME_H !== 0) {
          setLoadErr(`Sheet is ${image.width}×${image.height}. Expected width a multiple of ${FP_FRAME_W} and height a multiple of ${FP_FRAME_H}.`);
        } else { setLoadErr(""); }
        const cols = Math.max(1, Math.floor(image.width / FP_FRAME_W));
        const rows = Math.max(1, Math.floor(image.height / FP_FRAME_H));
        setImg(image);
        setTotal(cols * rows);
      };
      image.onerror = () => setLoadErr("Could not load that image.");
      image.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2100 };
  const card = { background: "#1a1a2e", border: "1px solid #4a4a9e", borderRadius: 10, padding: 24, maxWidth: 640, width: "92%", maxHeight: "88vh", overflowY: "auto" };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Pick Animation Frames</div>
        <div style={{ color: "#9aa0c0", fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>
          Load the actor's spritesheet, then click frames in play order. This only builds the frame list for the <code style={{ color: "#cc9944" }}>animate</code> command — it doesn't make a JSON or a sprite sheet.
        </div>

        <input ref={fileRef} type="file" accept="image/png" onChange={onFile} style={{ display: "none" }} />
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <Btn onClick={() => fileRef.current.click()}>{img ? "Load a different sheet" : "Load spritesheet PNG"}</Btn>
          {seq.length > 0 && <Btn danger small onClick={() => setSeq([])}>Clear sequence</Btn>}
          {seq.length > 0 && <Btn small onClick={() => setSeq(s => s.slice(0, -1))}>Undo last</Btn>}
        </div>
        {loadErr && <div style={{ background: "#2a1010", border: "1px solid #6a2020", borderRadius: 4, padding: "8px 10px", marginBottom: 12, color: "#ee8888", fontSize: 12 }}>⚠ {loadErr}</div>}

        {img && (
          <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 320px", maxHeight: 320, overflowY: "auto", background: "#0a0a14", border: "1px solid #2a2a4e", borderRadius: 6, padding: 8 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {Array.from({ length: total }, (_, fi) => {
                  const positions = seq.map((s, si) => s === fi ? si + 1 : null).filter(x => x !== null);
                  return (
                    <FpFrameCanvas key={fi} img={img} frameIndex={fi} size={2}
                      inSequence={positions.length > 0} seqPos={positions.join(",")}
                      onClick={() => setSeq(s => [...s, fi])} />
                  );
                })}
              </div>
            </div>
            <div style={{ flex: "0 0 auto" }}>
              <FpPreview img={img} frames={seq} interval={ms} />
              <div style={{ marginTop: 10, color: "#9aa0c0", fontSize: 11, fontFamily: "monospace", wordBreak: "break-all", maxWidth: 180 }}>
                {seq.length > 0 ? seq.join(" ") : "—"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap", borderTop: "1px solid #2a2a4e", paddingTop: 12 }}>
            <label style={{ color: "#cfd2e8", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              Speed (ticks)
              <input type="number" min="10" value={speed} onChange={e => setSpeed(e.target.value)}
                style={{ width: 80, background: "#0a0a14", border: "1px solid #2a2a4e", color: "#e0e0f0", borderRadius: 4, padding: "4px 7px", fontSize: 12 }} />
            </label>
            <span style={{ color: "#7b8cde", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>→ {ms} ms/frame</span>
            <span style={{ color: "#555577", fontSize: 10 }}>same units as the Animation Builder — this ms is what the animate command uses</span>
          </div>
          </>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Btn primary onClick={() => { onConfirm(seq.join(" "), ms); onClose(); }}>Use these frames</Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </div>
        <div style={{ color: "#555577", fontSize: 11, marginTop: 10 }}>
          Click a frame as many times as you need — repeats are allowed (e.g. 63 67 71 67 for a back-and-forth).
        </div>
      </div>
    </div>
  );
}

function CommandBuilder({ form, initial, onInsert, onClose, editMode, folders }) {
  const [vals, setVals] = useState(() => {
    const init = {};
    form.fields.forEach(fld => { init[fld.key] = fld.default !== undefined ? fld.default : (fld.type === "checkbox" ? false : ""); });
    if (initial) form.fields.forEach(fld => { if (initial[fld.key] !== undefined && initial[fld.key] !== "") init[fld.key] = initial[fld.key]; });
    return init;
  });
  // Re-sync fields whenever the form or initial values change (keyless equivalent of a remount).
  useEffect(() => {
    const init = {};
    form.fields.forEach(fld => { init[fld.key] = fld.default !== undefined ? fld.default : (fld.type === "checkbox" ? false : ""); });
    if (initial) form.fields.forEach(fld => { if (initial[fld.key] !== undefined && initial[fld.key] !== "") init[fld.key] = initial[fld.key]; });
    setVals(init);
  }, [form, initial]);
  const setVal = (k, v) => setVals(s => ({ ...s, [k]: v }));
  const [framePickerOpen, setFramePickerOpen] = useState(false);
  // Does this form carry an x/y tile pair? If so we can offer the saved-coordinate picker.
  const hasXY = form.fields.some(f => f.key === "x") && form.fields.some(f => f.key === "y");
  const hasDir = form.fields.some(f => f.key === "dir");
  const fieldRefs = useRef({});
  const insertIntoField = (key, token) => {
    const el = fieldRefs.current[key];
    const text = vals[key] || "";
    if (!el) { setVal(key, text + token); return; }
    const start = el.selectionStart, endd = el.selectionEnd;
    setVal(key, text.substring(0, start) + token + text.substring(endd));
    setTimeout(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length); }, 0);
  };
  const [buildErr, setBuildErr] = useState("");
  // Named submit, mirroring MoveBuilder.tryInsert: build from current state, fire, close.
  // No window.confirm/alert here — blocking dialogs are silently swallowed in a sandboxed
  // iframe, which would make the button look dead. Move works precisely because it never gated
  // on confirm(). Errors surface inline via buildErr instead.
  const doSubmit = () => {
    let out;
    try { out = form.build(vals); }
    catch (e) { setBuildErr("Couldn't build this line: " + e.message); return; }
    setBuildErr("");
    if (typeof onInsert === "function") onInsert(out);
    onClose();
  };
  const preview = form.build(vals);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }} onClick={onClose}>
      <div style={{ background: "#1a1a2e", border: "1px solid #4a4a9e", borderRadius: 10, padding: 24, maxWidth: 480, width: "90%", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>{form.title}</div>
        {hasXY && folders && folders.some(fo => (fo.coords || []).length > 0) && (
          <div style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 6, padding: "8px 10px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <CoordSelector folders={folders} label="Fill X/Y from a saved coordinate"
              onSelect={c => { setVal("x", String(c.x)); setVal("y", String(c.y)); if (hasDir && c.direction !== undefined) setVal("dir", String(c.direction)); }} />
            <span style={{ color: "#7b8cde", fontSize: 11 }}>Fill X/Y from your imported coordinates</span>
          </div>
        )}
        {form.fields.map(fld => (
          <Field key={fld.key} label={fld.label} hint={fld.hint}>
            {fld.type === "select" ? (
              <select style={SS} value={vals[fld.key]} onChange={e => setVal(fld.key, e.target.value)}>
                {fld.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : fld.type === "checkbox" ? (
              <label style={{ color: "#9aa0c0", fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={!!vals[fld.key]} onChange={e => setVal(fld.key, e.target.checked)} />
                {fld.checkboxLabel || "Enabled"}
              </label>
            ) : fld.type === "sound" ? (
              <SoundPicker value={vals[fld.key]} onChange={val => setVal(fld.key, val)} />
            ) : fld.type === "npc" ? (
              <NpcPicker value={vals[fld.key]} onChange={val => setVal(fld.key, val)} placeholder={fld.placeholder} />
            ) : fld.type === "frames" ? (
              <>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input ref={el => (fieldRefs.current[fld.key] = el)} style={{ ...IS, flex: 1 }} type="text" value={vals[fld.key]} onChange={e => setVal(fld.key, e.target.value)} placeholder={fld.placeholder || ""} />
                  <Btn small onClick={() => setFramePickerOpen(true)}>🎞 Pick frames</Btn>
                </div>
                {framePickerOpen && (
                  <FramePicker
                    initialFrames={vals[fld.key]}
                    interval={parseInt(vals.interval) || 200}
                    onConfirm={(frameStr, chosenMs) => { setVal(fld.key, frameStr); if (chosenMs != null) setVal("interval", String(chosenMs)); }}
                    onClose={() => setFramePickerOpen(false)}
                  />
                )}
              </>
            ) : fld.type === "textarea" ? (
              <>
                <textarea ref={el => (fieldRefs.current[fld.key] = el)} style={{ ...IS, minHeight: 70, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} value={vals[fld.key]} onChange={e => setVal(fld.key, e.target.value)} placeholder={fld.placeholder || ""} />
                {fld.tags && <TagPalette mode={fld.tags} onInsert={t => insertIntoField(fld.key, t)} />}
              </>
            ) : (
              <>
                <input ref={el => (fieldRefs.current[fld.key] = el)} style={IS} type={fld.type === "number" ? "number" : "text"} value={vals[fld.key]} onChange={e => setVal(fld.key, e.target.value)} placeholder={fld.placeholder || ""} />
                {fld.tags && <TagPalette mode={fld.tags} onInsert={t => insertIntoField(fld.key, t)} />}
              </>
            )}
          </Field>
        ))}
        <div style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 4, padding: 10, marginBottom: 14 }}>
          <div style={{ color: "#555577", fontSize: 11, marginBottom: 4 }}>Preview</div>
          <code style={{ color: "#7b8cde", fontSize: 12, wordBreak: "break-all" }}>{preview}</code>
        </div>
        {buildErr && (
          <div style={{ color: "#cc4444", fontSize: 12, marginBottom: 8 }}>⚠ {buildErr}</div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <Btn primary onClick={doSubmit}>{editMode ? "Overwrite line" : "Insert"}</Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </div>
        <div style={{ color: "#555577", fontSize: 11, marginTop: 10 }}>
          {editMode
            ? "Editing an existing line — saving replaces it in place. Cancel leaves it unchanged."
            : "Inserts onto its own line in Raw Commands — edit the code directly afterward if you need to."}
        </div>
      </div>
    </div>
  );
}

function MoveBuilder({ coords, defaultActor, onInsert, onClose, initial, editMode }) {
  const hasCoords = coords && coords.length > 0;
  // Default to direct (manual) when editing a line or when there are no saved coords to math from.
  const [mode, setMode] = useState(initial || !hasCoords ? "direct" : "safe");
  const [actor, setActor] = useState((initial && initial.actor) || defaultActor || "");
  const [axis, setAxis] = useState("x");
  const [startId, setStartId] = useState("");
  const [endId, setEndId] = useState("");
  const [facing, setFacing] = useState((initial && initial.dir) || "");
  const [nowait, setNowait] = useState(initial ? !!initial.nowait : false);
  const [warn, setWarn] = useState("");
  // manual-entry fields
  const [mdx, setMdx] = useState(initial && initial.dx !== undefined ? String(initial.dx) : "0");
  const [mdy, setMdy] = useState(initial && initial.dy !== undefined ? String(initial.dy) : "0");

  const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 };
  const card = { background: "#1a1a2e", border: "1px solid #4a4a9e", borderRadius: 10, padding: 24, maxWidth: 480, width: "90%", maxHeight: "85vh", overflowY: "auto" };

  const start = coords && coords.find(c => String(c.id) === String(startId));
  const end = coords && coords.find(c => String(c.id) === String(endId));
  const haveBoth = !!(start && end);
  const dx = haveBoth && axis === "x" ? end.x - start.x : 0;
  const dy = haveBoth && axis === "y" ? end.y - start.y : 0;
  const offAxis = haveBoth ? (axis === "x" ? end.y - start.y : end.x - start.x) : 0;

  const preview = mode === "safe"
    ? `move ${actor || "NPC"} ${dx} ${dy} ${facing === "" ? "?" : facing}${nowait ? " true" : ""}`
    : `move ${actor || "NPC"} ${mdx || 0} ${mdy || 0} ${facing === "" ? "?" : facing}${nowait ? " true" : ""}`;

  const tryInsert = () => {
    if (mode === "safe") {
      if (!haveBoth) { setWarn("Pick both a start and an end coordinate."); return; }
      if (facing === "") { setWarn("Missing the last facing direction — choose where they end up facing."); return; }
      onInsert(`move ${actor || "NPC"} ${dx} ${dy} ${facing}${nowait ? " true" : ""}`);
      onClose();
    } else {
      if (facing === "") { setWarn("Missing the last facing direction — choose where they end up facing."); return; }
      onInsert(`move ${actor || "NPC"} ${mdx || 0} ${mdy || 0} ${facing}${nowait ? " true" : ""}`);
      onClose();
    }
  };

  const coordOpt = c => `${c.label} · ${c.map} (${c.x},${c.y})`;
  const axisBtn = (val, lbl) => (
    <button type="button" onClick={() => { setAxis(val); setWarn(""); }} style={{
      flex: 1, padding: "6px 0", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 700,
      background: axis === val ? "#2a3a6e" : "#0d0d1a", color: axis === val ? "#e0e0f0" : "#7b8cde",
      border: `1px solid ${axis === val ? "#4a4a9e" : "#2a2a4e"}`,
    }}>{lbl}</button>
  );

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Move — {mode === "safe" ? "position math" : "manual entry"}</div>

        {/* mode toggle — mirrors the Safe Edit / Direct Syntax pattern on scene lines */}
        <div style={{ display: "flex", gap: 0, marginBottom: 14, background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 6, padding: 3, width: "fit-content" }}>
          <button onClick={() => { setMode("safe"); setWarn(""); }} disabled={!hasCoords}
            title={!hasCoords ? "No saved coordinates to compute from" : ""}
            style={{ background: mode === "safe" ? "#2a2a4e" : "transparent", color: !hasCoords ? "#444466" : mode === "safe" ? "#e0e0f0" : "#7b8cde", border: "none", borderRadius: 4, padding: "5px 12px", fontSize: 12, cursor: hasCoords ? "pointer" : "not-allowed", fontWeight: 600 }}>Tile Math 📍</button>
          <button onClick={() => { setMode("direct"); setWarn(""); }}
            style={{ background: mode === "direct" ? "#2a2a4e" : "transparent", color: mode === "direct" ? "#e0e0f0" : "#7b8cde", border: "none", borderRadius: 4, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Type Numbers</button>
        </div>

        <Field label="Actor">
          <NpcPicker value={actor} onChange={setActor} />
        </Field>

        {mode === "safe" ? (
          <>
            {!hasCoords ? (
              <div style={{ background: "#1a120a", border: "1px solid #4a3a0a", borderRadius: 6, padding: "12px 14px", color: "#cc9944", fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
                🔒 No saved coordinates found. Tile Math reads tiles from the Coordinate Picker — save a start and end tile there, or switch to <b>Type Numbers</b>.
              </div>
            ) : (
              <>
                <Field label="Axis to move along" hint="One move travels a single axis. A diagonal needs two move commands.">
                  <div style={{ display: "flex", gap: 6 }}>{axisBtn("x", "X (left ↔ right)")}{axisBtn("y", "Y (up ↕ down)")}</div>
                </Field>
                <Field label="Start tile">
                  <select style={SS} value={startId} onChange={e => { setStartId(e.target.value); setWarn(""); }}>
                    <option value="">— choose start —</option>
                    {coords.map(c => <option key={c.id} value={c.id}>{coordOpt(c)}</option>)}
                  </select>
                </Field>
                <Field label="End tile">
                  <select style={SS} value={endId} onChange={e => { setEndId(e.target.value); setWarn(""); }}>
                    <option value="">— choose end —</option>
                    {coords.map(c => <option key={c.id} value={c.id}>{coordOpt(c)}</option>)}
                  </select>
                </Field>
                {haveBoth && (
                  <div style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 4, padding: 10, marginBottom: 12, fontSize: 12, color: "#9aa0c0", lineHeight: 1.6 }}>
                    Moves <b style={{ color: "#7b8cde" }}>{axis === "x" ? dx : dy}</b> tile(s) on {axis.toUpperCase()}.
                    {offAxis !== 0 && <span style={{ color: "#cc9944" }}> {" "}The {axis === "x" ? "Y" : "X"} axis differs by {offAxis} — that won't move. Add a second move command for a diagonal.</span>}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Δ X (tiles, − is left)"><input style={IS} type="number" value={mdx} onChange={e => { setMdx(e.target.value); setWarn(""); }} /></Field>
            <Field label="Δ Y (tiles, − is up)"><input style={IS} type="number" value={mdy} onChange={e => { setMdy(e.target.value); setWarn(""); }} /></Field>
          </div>
        )}

        <Field label="End facing" hint="Required — the direction they face when the move ends.">
          <select value={facing} onChange={e => { setFacing(e.target.value); setWarn(""); }}
            style={{ ...SS, border: facing === "" ? "1px solid #cc8844" : "1px solid #2a2a4e", boxShadow: facing === "" ? "0 0 0 2px rgba(204,136,68,0.35)" : "none" }}>
            <option value="">— choose facing —</option>
            {DIR_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        <Field label="">
          <label style={{ color: "#9aa0c0", fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={nowait} onChange={e => setNowait(e.target.checked)} /> Run without waiting (true)
          </label>
        </Field>

        <div style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 4, padding: 10, marginBottom: 12 }}>
          <div style={{ color: "#555577", fontSize: 11, marginBottom: 4 }}>Preview</div>
          <code style={{ color: "#7b8cde", fontSize: 12, wordBreak: "break-all" }}>{preview}</code>
        </div>

        {warn && (
          <div style={{ background: "#2a1010", border: "1px solid #6a2020", borderRadius: 4, padding: "8px 10px", marginBottom: 12, color: "#ee8888", fontSize: 12 }}>⚠ {warn}</div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <Btn primary onClick={tryInsert}>{editMode ? "Overwrite line" : "Insert"}</Btn>
          <Btn onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </div>
  );
}

function SceneCommandHelper({ onInsert, onBuild }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  const groups = ["Movement", "Timing", "Dialogue", "Animation", "Audio", "Camera"];
  if (showAdvanced) groups.push("Advanced");

  return (
    <div style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 6, padding: 10, marginBottom: 8 }}>
      <div style={{ color: "#555577", fontSize: 11, marginBottom: 8 }}>
        Click a command to insert it on its own line — hover for info. Replace the placeholder values after inserting.
      </div>

      {groups.map(group => (
        <div key={group} style={{ marginBottom: 8 }}>
          <div style={{ color: CMD_GROUP_TEXT[group], fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{group}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {SCENE_COMMANDS.filter(c => c.group === group).map(c => (
              <button key={c.cmd}
                onClick={() => onBuild(c.cmd)}
                onMouseEnter={() => setTooltip(c)}
                onMouseLeave={() => setTooltip(null)}
                style={{
                  background: CMD_GROUP_COLORS[group],
                  border: `1px solid ${CMD_GROUP_TEXT[group]}44`,
                  color: "#e0e0f0", borderRadius: 4, cursor: "pointer",
                  padding: "3px 8px", fontSize: 12,
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                <code style={{ color: CMD_GROUP_TEXT[group], fontSize: 11 }}>{c.cmd}</code>
                <span>{c.label}{COMMAND_FORMS[c.cmd] && COMMAND_FORMS[c.cmd].fields.length ? " ✎" : ""}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {tooltip && (
        <div style={{ background: "#1a1a2e", border: "1px solid #4a4a9e", borderRadius: 4, padding: "8px 12px", marginTop: 6 }}>
          <div style={{ marginBottom: 4 }}>
            <code style={{ color: CMD_GROUP_TEXT[tooltip.group], fontSize: 13, fontWeight: 700 }}>{tooltip.snippet}</code>
          </div>
          <div style={{ color: "#9aa0c0", fontSize: 12 }}>{tooltip.desc}</div>
        </div>
      )}

      <button onClick={() => setShowAdvanced(s => !s)} style={{
        background: "none", border: "none", color: "#333355", cursor: "pointer",
        fontSize: 11, marginTop: 6, padding: 0,
      }}>{showAdvanced ? "▲ Hide advanced commands" : "▼ Show advanced commands"}</button>
    </div>
  );
}


// ═══════════════════════════════════════════════
// MAP NAMES
// ═══════════════════════════════════════════════

const MAP_NAMES = [
  { value: "Town",              label: "Town",                        desc: "The main town square and surrounding streets" },
  { value: "Saloon",            label: "Saloon — Stardrop Saloon",    desc: "Gus's bar. Where Sam, Emily, Shane, and others hang out evenings" },
  { value: "SeedShop",          label: "Seed Shop — Pierre's Store",  desc: "Pierre's general store. Caroline and Abigail live upstairs" },
  { value: "Hospital",          label: "Hospital — Harvey's Clinic",  desc: "Harvey's medical clinic. NOT HarveyHouse" },
  { value: "ManorHouse",        label: "Manor House — Lewis's Home",  desc: "Mayor Lewis's house" },
  { value: "ScienceHouse",      label: "Science House — Demetrius's Home", desc: "Robin and Demetrius's home. Maru and Sebastian also live here" },
  { value: "JoshHouse",         label: "Josh House — George & Evelyn's Home", desc: "George, Evelyn, and Alex's house. Sometimes called Alex's house" },
  { value: "HaleyHouse",        label: "Haley House — Emily & Haley's Home", desc: "Emily and Haley's house" },
  { value: "ElliottHouse",      label: "Elliott's Cabin",             desc: "Elliott's small cabin on the beach" },
  { value: "LeahHouse",         label: "Leah's Cottage",              desc: "Leah's cottage in Cindersap Forest" },
  { value: "SamHouse",          label: "Sam's House — Jodi's Home",   desc: "Sam, Jodi, Vincent, and Kent's house" },
  { value: "HarveyRoom",        label: "Harvey's Room — Above Clinic", desc: "Harvey's private room above the clinic" },
  { value: "WizardHouse",       label: "Wizard's Tower",              desc: "The Wizard's tower in Cindersap Forest" },
  { value: "AnimalShop",        label: "Animal Shop — Marnie's Ranch", desc: "Marnie's ranch. Shane and Jas also live here" },
  { value: "ArchaeologyHouse",  label: "Archaeology House — Museum",  desc: "Gunther's museum and archaeology center" },
  { value: "AdventureGuild",    label: "Adventure Guild",             desc: "Marlon and Gil's adventurer guild near the mines" },
  { value: "Mountain",          label: "Mountain",                    desc: "Area with the mine entrance, Robin's shop, and Linus's tent" },
  { value: "Forest",            label: "Forest — Cindersap Forest",   desc: "Large forest south of the farm. Leah's cottage and Wizard tower are here" },
  { value: "Beach",             label: "Beach",                       desc: "The ocean beach. Willy's shop and Elliott's cabin are here" },
  { value: "Farm",              label: "Farm",                        desc: "The player's farm" },
  { value: "FarmHouse",         label: "Farm House",                  desc: "Inside the player's farmhouse" },
  { value: "BusStop",           label: "Bus Stop",                    desc: "The bus stop area between the farm and town" },
  { value: "Backwoods",         label: "Backwoods",                   desc: "The road north of the farm leading to the mountain" },
  { value: "Woods",             label: "Secret Woods",                desc: "The secret wooded area accessible through Cindersap Forest" },
  { value: "Railroad",          label: "Railroad",                    desc: "The railroad area north of the mountain. Spa and Witch's Swamp access" },
  { value: "BathHouse_Entry",   label: "Bath House — Spa Entry",      desc: "The entrance to the bathhouse/spa" },
  { value: "BathHouse_Pool",    label: "Bath House — Spa Pool",       desc: "The indoor spa pool" },
  { value: "Sewer",             label: "Sewer",                       desc: "Krobus's sewer home, accessible via the sewers" },
  { value: "Tent",              label: "Tent — Linus's Tent",         desc: "Linus's tent on the mountain" },
  { value: "Trailer",           label: "Trailer — Pam's Trailer",     desc: "Pam and Penny's trailer in town" },
  { value: "ElliottBoat",       label: "Elliott's Boat",              desc: "Elliott's rowboat on the beach" },
  { value: "FishShop",          label: "Fish Shop — Willy's",         desc: "Willy's fish shop on the beach" },
  { value: "Blacksmith",        label: "Blacksmith — Clint's",        desc: "Clint's blacksmith shop in town" },
  { value: "JojaMart",          label: "JojaMart",                    desc: "The Joja Corporation store. May be abandoned depending on game progress" },
  { value: "Sunroom",           label: "Sunroom — Caroline's",        desc: "Caroline's private sunroom behind Pierre's store" },
  { value: "Club",              label: "Sandy's Oasis",               desc: "Sandy's shop in the Calico Desert" },
  { value: "Greenhouse",        label: "Greenhouse",                  desc: "The farm greenhouse, unlocked via community center" },
  { value: "Mine",              label: "Mine Entrance",               desc: "The entrance to the mines on the mountain" },
];

// ═══════════════════════════════════════════════
// VANILLA EVENT ID REFERENCE
// ═══════════════════════════════════════════════
const VANILLA_EVENT_IDS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 25, 26, 27, 29, 33, 34, 35, 36, 38, 39, 40, 43, 44, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58, 63, 65, 67, 91, 92, 93, 94, 95, 96, 97, 100, 101, 102, 112, 100162, 150938, 181928, 191393, 195012, 195013, 195019, 195099, 233104, 288847, 318560, 371652, 384882, 384883, 404798, 418172, 423502, 463391, 471942, 502261, 502969, 503180, 528052, 529952, 558291, 558292, 571102, 584059, 611173, 611944, 639373, 690006, 691039, 711130, 719926, 733330, 739330, 831125, 897405, 900553, 901756, 911526, 917409, 963113, 980558, 992253, 992553, 992559, 1039573, 1053978, 1590166, 1848481, 2118991, 2119820, 2120303, 2123243, 2123343, 2128292, 2146991, 2481135, 2794460, 3091462, 3102768, 3131209, 3206194, 3900074, 3910674, 3910974, 3910975, 3910979, 3911124, 3912125, 3912132, 3917584, 3917585, 3917586, 3917587, 3917589, 3917590, 3917600, 3917601, 3917626, 3917666, 3918600, 3918601, 3918602, 3918603, 4081148, 4324303, 4325434, 5183338, 5837189, 6184643, 6184644, 6497421, 6497423, 6497428, 6963327, 7771191, 8357109, 8675611, 8959199, 9333219, 9333220, 9348571, 9581348, 10040609, 15389722]);

// ═══════════════════════════════════════════════
// SYNTAX CHECKER
// ═══════════════════════════════════════════════

const checkEventSyntax = (f) => {
  const issues = [];
  const warn = (msg) => issues.push({ level: "warning", msg });
  const err  = (msg) => issues.push({ level: "error",   msg });

  // ── Generation prerequisites (NOT script syntax) ──
  // These are requirements for building the event KEY, not for whether the SCRIPT is well-formed.
  // The generate flow's own validate() hard-blocks on them, so here they're reminders only —
  // that lets you syntax-check a loaded or in-progress script without first filling the new-event form.
  if (!f.eventId)  warn("Event ID not set — required before generating, but not needed to check script syntax.");
  if (!f.mapName)  warn("No map selected — required before generating, not for the syntax check itself.");
  if (f.eventId && !/^\d+$/.test(f.eventId)) err("Event ID must be a number.");
  if (f.timeEnd && parseInt(f.timeEnd) > 2400) err("Time end exceeds 2400 hard cap.");
  if (f.timeStart && f.timeEnd && parseInt(f.timeStart) >= parseInt(f.timeEnd)) err("Time start must be less than time end.");
  if (f.requireDating && f.requireMarriage) err("Cannot require both Dating and Spouse.");

  // ── Viewport / position ──
  if (f.viewportX && !f.viewportY) warn("Viewport X set but Y is missing.");
  if (f.viewportY && !f.viewportX) warn("Viewport Y set but X is missing.");

  // ── NPC start positions ──
  f.npcs.forEach(npc => {
    if (npc.name && npc.name.trim() && (!npc.x || !npc.y)) {
      warn(`${npc.name.trim()} has no start position — it won't be placed in the scene until X and Y are set.`);
    }
  });

  // ── Scene commands ──
  const raw = f.sceneCommands || "";

  // $ token in a choice/answer label → silent in-game loop (the question re-asks and
  // never advances, with no error in the log). Flag every offender; the Strip button fixes it.
  scanForkAnswerTokens(f).forEach(h => {
    const tok = (h.label.match(/\$[0-9A-Za-z]+/g) || []).join(" ");
    err(`Choice "${h.label.trim()}" contains a $ token (${tok}) — a $ in an answer label breaks the choice and makes the question loop in-game with no error. Strip it from the answer (portraits belong in the question text and the branch, not the button).`);
  });

  // Per-line checks — reused for the main scene and each fork branch.
  // Inner err/warn shadow the outer ones and rewrite the "Line N" prefix for context.
  const checkLines = (script, ctxLabel) => {
    const pfx = (msg) => ctxLabel === "Line" ? msg : msg.replace(/^Line (\d+)/, `${ctxLabel} $1`);
    const err = (m) => issues.push({ level: "error", msg: pfx(m) });
    const warn = (m) => issues.push({ level: "warning", msg: pfx(m) });
    const lines = (script || "").split("\n").map((l, i) => ({ text: l, num: i + 1 }));
    for (const { text, num } of lines) {
    const t = text.trim();
    if (!t) continue;

    // Extra commas
    if (t.includes(",,")) err(`Line ${num}: double comma — "${t}"`);
    if (t.endsWith(","))  warn(`Line ${num}: trailing comma — "${t}"`);

    // Double spaces in commands (not in dialogue strings)
    const outsideQuotes = t.replace(/"[^"]*"/g, '""');
    if (/  +/.test(outsideQuotes)) warn(`Line ${num}: extra spaces — "${t}"`);

    // Unbalanced double-quotes (an unclosed dialogue string)
    const quoteCount = (t.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) err(`Line ${num}: unbalanced quote — odd number of " marks — "${t}"`);

    // Bracket balance & doubled brackets (checked outside dialogue text, where brackets are likely typos)
    for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
      const o = outsideQuotes.split(open).length - 1;
      const c = outsideQuotes.split(close).length - 1;
      if (o !== c) warn(`Line ${num}: unbalanced ${open}${close} — ${o} "${open}" vs ${c} "${close}" — "${t}"`);
    }
    if (/\(\(|\)\)|\[\[|\]\]|\{\{|\}\}/.test(outsideQuotes)) warn(`Line ${num}: doubled bracket — likely a typo — "${t}"`);

    // emote must have NPC name
    if (/^emote\s/.test(t)) {
      const parts = t.split(/\s+/);
      if (parts.length < 3 || isNaN(parseInt(parts[parts.length - 1]))) {
        err(`Line ${num}: emote requires NPC name and ID — e.g. "emote Nicholas 32" — got "${t}"`);
      }
      if (parts[1] === "farmer" && parts.length < 3) warn(`Line ${num}: emote farmer needs an emote ID`);
    }

    // faceDirection must have NPC and direction
    if (/^faceDirection\s/.test(t)) {
      const parts = t.split(/\s+/);
      if (parts.length < 3) err(`Line ${num}: faceDirection needs actor and direction — got "${t}"`);
      if (parts[2] && !["0","1","2","3"].includes(parts[2])) warn(`Line ${num}: faceDirection value should be 0-3, got "${parts[2]}"`);
    }

    // speak must have actor and quoted text
    if (/^speak\s/.test(t)) {
      const parts = t.split(/\s+/);
      if (parts.length < 3) err(`Line ${num}: speak needs actor and text — got "${t}"`);
      if (!t.includes('"')) err(`Line ${num}: speak text must be in quotes — got "${t}"`);
      // No portrait/expression-token check here, on purpose. A speak line without one is valid —
      // the game keeps the current/original portrait. Requiring a token (even as a warning) flags
      // correct behavior as a defect, so it's intentionally omitted. Don't re-add it.
    }

    // pause must have a numeric value
    if (/^pause\s/.test(t)) {
      const val = t.split(/\s+/)[1];
      if (!val || isNaN(parseInt(val))) err(`Line ${num}: pause needs a numeric value — got "${t}"`);
      if (parseInt(val) > 10000) warn(`Line ${num}: pause ${val}ms is very long — intentional?`);
    }

    // friendship must have NPC and amount
    if (/^friendship\s/.test(t)) {
      const parts = t.split(/\s+/);
      if (parts.length < 3) err(`Line ${num}: friendship needs NPC name and amount — got "${t}"`);
      if (parts[2] && isNaN(parseInt(parts[2]))) err(`Line ${num}: friendship amount must be a number — got "${parts[2]}"`);
    }

    // move must have actor and coordinates
    if (/^move\s/.test(t)) {
      const parts = t.split(/\s+/);
      if (parts.length < 5) warn(`Line ${num}: move usually needs actor x y direction — got "${t}"`);
    }

    // warp must have actor and coordinates  
    if (/^warp\s/.test(t)) {
      const parts = t.split(/\s+/);
      if (parts.length < 4) err(`Line ${num}: warp needs actor x y — got "${t}"`);
    }

    // animate must have actor
    if (/^animate\s/.test(t)) {
      const parts = t.split(/\s+/);
      if (parts.length < 3) warn(`Line ${num}: animate needs actor and parameters — got "${t}"`);
    }

    // fork in script — check it has a key
    if (/^fork\s/.test(t)) {
      const parts = t.split(/\s+/);
      if (parts.length < 3) err(`Line ${num}: fork needs response ID and key — got "${t}"`);
    }

    // Slash inside a line (would break the / delimiter)
    if (!t.startsWith("speak") && !t.startsWith("message") && !t.startsWith("textAboveHead")) {
      const slashCount = (t.match(/\//g) || []).length;
      if (slashCount > 0) warn(`Line ${num}: unexpected "/" in command — commands use newlines not slashes in this editor — "${t}"`);
    }

    // end newDay typo check
    if (t === "endDay" || t === "endNewDay" || t === "end_newDay") {
      err(`Line ${num}: incorrect end syntax — use "end newDay" (two words) — got "${t}"`);
    }
    }
  };

  checkLines(raw, "Line");

  // ── End check ──
  const trimmed = raw.trim();
  if (trimmed && !trimmed.endsWith("end") && !trimmed.endsWith("end newDay") && !trimmed.endsWith("/") && f.forks.length === 0) {
    warn("Scene commands don't end with 'end' or 'end newDay'. Required unless using forks with trailing slash.");
  }

  // ── Fork checks ──
  // A forked main event can't end the day — the day-end belongs in the executed branch.
  if (f.forks.length > 0 && f.forks.some(fk => fk.key) && f.endNewDay) {
    warn(`"end newDay" is set on the main event, but a forked event can't end the day from the main scene — it won't fire. Move it to the branch that should roll to morning (the End newDay checkbox on that fork).`);
  }
  // A branch must end with one terminator. Flag a hand-written branch that has both.
  f.forks.forEach((fk, i) => {
    const bc = fk.branchCommands || "";
    if (/(^|\/|\n)\s*end\s*(\/|\n|$)/.test(bc) && /(^|\/|\n)\s*end newDay\s*(\/|\n|$)/.test(bc)) {
      warn(`Fork ${i+1} branch has both "end" and "end newDay" — a scene ends with one or the other. The extra terminator is dropped on build; keep just the one the checkbox selects.`);
    }
  });
  // A "/" or newline in the question text or any answer label corrupts the $q command:
  // it becomes a single quoted event command, and a stray "/" splits it mid-question so
  // every option after it breaks (the "Yes, I will./#$r ..." garbage). The builder now
  // scrubs these on build, but flag them so the source text gets cleaned up too.
  if (/[\r\n/]/.test(f.questionText || "")) {
    warn(`Question text contains a slash or line break — these are removed on build (they would otherwise split the question and break the options).`);
  }
  f.forks.forEach((fk, i) => {
    if (/[\r\n/]/.test(fk.choiceLabel || "")) warn(`Option ${i+1} label contains a slash or line break — removed on build; clean it up to avoid a malformed question.`);
  });
  // A $q question with a single option loops in-game with no error: the choice never
  // registers, so the fork never fires and the question re-asks. Confirmed in-game —
  // every working event had 2+ options; the one-option event looped. Needs at least two.
  if (f.forks.filter(fk => fk.key).length === 1) {
    err(`Only one fork option — a $q question with a single choice loops in-game (it re-asks and never advances, with no error). Add a second option.`);
  }
  f.forks.forEach((fk, i) => {
    if (!fk.key) err(`Fork ${i+1}: missing key.`);
    if (fk.dlgAdvanced && !fk.dialogueKey) warn(`Fork ${i+1}: Advanced is on but no custom dialogue key set — the fork key "${fk.key || "?"}" will be reused.`);
    if (fk.dialogueContent === "") warn(`Fork ${i+1}: blank dialogue content — ValleyTalk defaults to fork 1.`);
    if (fk.key && fk.key === f.eventId) err(`Fork ${i+1}: fork key matches event ID — will cause conflict.`);
    if (fk.branchCommands && fk.branchCommands.trim()) checkLines(fk.branchCommands, `Fork ${i+1} line`);
  });

  // ── Duplicate ValleyTalk fork keys within this event ──
  // Both keys must be unique. A reused `key` becomes a duplicate object key in the generated
  // Data/Events JSON — last write wins, so one branch silently disappears. A reused `dialogueKey`
  // points two $r choices at the same Characters/Dialogue memory token, so ValleyTalk can't tell
  // the choices apart. Either one breaks the fork, so both are errors.
  const forkKeyCounts = {}, dlgKeyCounts = {};
  f.forks.forEach(fk => {
    if (fk.key)        forkKeyCounts[fk.key]        = (forkKeyCounts[fk.key]        || 0) + 1;
    const dk = forkDlgKey(fk); if (dk) dlgKeyCounts[dk] = (dlgKeyCounts[dk] || 0) + 1;
  });
  Object.keys(forkKeyCounts).forEach(k => {
    if (forkKeyCounts[k] > 1) err(`Duplicate fork key "${k}" used by ${forkKeyCounts[k]} forks — branch keys must be unique or one branch overwrites the other in the JSON.`);
  });
  Object.keys(dlgKeyCounts).forEach(k => {
    if (dlgKeyCounts[k] > 1) err(`Duplicate dialogue key "${k}" used by ${dlgKeyCounts[k]} forks — each $r choice needs its own key or ValleyTalk can't distinguish the choices.`);
  });

  // ── Vanilla ID check ──
  if (f.eventId && VANILLA_EVENT_IDS.has(parseInt(f.eventId))) {
    err(`Event ID ${f.eventId} conflicts with a vanilla Stardew event.`);
  }

  return issues;
};

// ═══════════════════════════════════════════════
// DIRECTION REFERENCE COMPONENT
// ═══════════════════════════════════════════════

function DirectionRef() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: "transparent", border: "1px solid #2a2a4e", color: "#555577",
        borderRadius: 4, padding: "4px 12px", cursor: "pointer", fontSize: 11,
      }}>{open ? "▲ Hide" : "▼ Direction Reference"}</button>
      {open && (
        <div style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 6, padding: 14, marginTop: 8 }}>
          <div style={{ color: "#9aa0c0", fontSize: 11, marginBottom: 10 }}>Direction values used in events, schedules, and faceDirection commands:</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, maxWidth: 400 }}>
            {[
              ["0", "North", "Back to you — NPC faces away from camera", "#2a3a6e", "#7b8cde"],
              ["1", "East",  "Facing right",                              "#2a2a1a", "#cccc44"],
              ["2", "South", "Facing toward you — front facing",          "#1a3a2a", "#44cc88"],
              ["3", "West",  "Facing left",                               "#2a1a1a", "#cc7744"],
            ].map(([val, label, desc, bg, col]) => (
              <div key={val} style={{ background: bg, border: `1px solid ${col}44`, borderRadius: 4, padding: "8px 10px" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                  <code style={{ color: col, fontSize: 16, fontWeight: 700 }}>{val}</code>
                  <span style={{ color: "#e0e0f0", fontSize: 13, fontWeight: 600 }}>{label}</span>
                </div>
                <div style={{ color: "#9aa0c0", fontSize: 11 }}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{ color: "#555577", fontSize: 11, marginTop: 10 }}>
            South (2) is the most common — NPC faces the player. North (0) has the NPC showing their back.
            Used in: spawn positions, faceDirection, schedule entries, Home direction in NPC Setup.
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// SYNTAX POPUP
// ═══════════════════════════════════════════════

function SyntaxPopup({ issues, onClose }) {
  if (!issues) return null;
  const errors = issues.filter(i => i.level === "error");
  const warnings = issues.filter(i => i.level === "warning");
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#1a1a2e", border: `2px solid ${errors.length > 0 ? "#cc4444" : warnings.length > 0 ? "#cc9944" : "#2a6a2a"}`, borderRadius: 12, padding: 24, maxWidth: 520, width: "90%", maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: errors.length > 0 ? "#cc4444" : warnings.length > 0 ? "#cc9944" : "#44cc44" }}>
            {errors.length > 0 ? "✖ Syntax Errors Found" : warnings.length > 0 ? "⚠ Warnings Found" : "✓ No Issues Found"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555577", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {issues.length === 0 ? (
          <div style={{ color: "#44cc44", fontSize: 13, lineHeight: 1.7 }}>
            All checks passed. You're good to generate.
          </div>
        ) : (
          <>
            {errors.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "#cc4444", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                  {errors.length} Error{errors.length !== 1 ? "s" : ""} — must fix before generating
                </div>
                {errors.map((e, i) => (
                  <div key={i} style={{ background: "#2a0a0a", border: "1px solid #4a1a1a", borderRadius: 4, padding: "8px 12px", marginBottom: 6, color: "#cc4444", fontSize: 12, lineHeight: 1.5 }}>
                    ✖ {e.msg}
                  </div>
                ))}
              </div>
            )}
            {warnings.length > 0 && (
              <div>
                <div style={{ color: "#cc9944", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                  {warnings.length} Warning{warnings.length !== 1 ? "s" : ""} — review before generating
                </div>
                {warnings.map((w, i) => (
                  <div key={i} style={{ background: "#1a1a0a", border: "1px solid #4a3a0a", borderRadius: 4, padding: "8px 12px", marginBottom: 6, color: "#cc9944", fontSize: 12, lineHeight: 1.5 }}>
                    ⚠ {w.msg}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <button onClick={onClose} style={{
          marginTop: 16, width: "100%", padding: "10px", borderRadius: 6, cursor: "pointer",
          background: errors.length > 0 ? "#2a0a0a" : "#0a2a0a",
          border: `1px solid ${errors.length > 0 ? "#cc4444" : "#44cc44"}`,
          color: errors.length > 0 ? "#cc4444" : "#44cc44",
          fontSize: 13, fontWeight: 700,
        }}>{errors.length > 0 ? "Fix errors then generate" : "Got it — generate away"}</button>
      </div>
    </div>
  );
}

// The dialogue key a fork's $r points at. Falls back to the fork key when the
// dialogue-key field is blank, so generation never emits an empty $r token —
// an empty key makes the game's dialogue parser throw IndexOutOfRange and the
// whole event fails to load. The same effective key is used for the $r and for
// the Characters/Dialogue registration, so the two always match.
function forkDlgKey(fk) {
  // Auto-mirror the fork key unless the author opted into a custom key (Advanced).
  return (fk.dlgAdvanced && (fk.dialogueKey || "").trim()) ? (fk.dialogueKey || "").trim() : (fk.key || "");
}

// Safety net for the as-is path: a loaded event keeps its $q/fork lines verbatim
// in the scene text, so a blank $r key slot ("$r <id> <n> #") that was generated
// before the dialogue-key fix would pass straight through and crash the game's
// parser (IndexOutOfRange). This fills any blank $r key from its matching
// `fork <id> <branchKey>` command — the same key the Characters/Dialogue
// registration uses — so the two always agree. Already-filled keys are untouched.
function repairBlankForkKeys(script) {
  const branchByRid = {};
  let m; const forkRe = /fork\s+(\S+)\s+([^/\s]+)/g;
  while ((m = forkRe.exec(script)) !== null) branchByRid[m[1]] = m[2];
  return script.replace(/\$r\s+(\S+)\s+(\S+)\s+#/g, (full, rid, n) =>
    branchByRid[rid] ? `$r ${rid} ${n} ${branchByRid[rid]}#` : full);
}

// A $ portrait/emotion token ($0, $h, $e, …) is valid in QUESTION text and in
// branch dialogue, but NOT in a choice/answer label. In an answer label the $ is
// read as a dialogue command, which breaks the answer's binding to its response id —
// so the pick never matches its `fork`, and the $q just re-asks. That's the silent,
// no-error ValleyTalk loop: the event runs clean but won't advance past the question.
// We scan for it and offer to strip it, touching ONLY the answer-label segment.
function stripAnswerTokens(label) {
  return label.replace(/\$[0-9A-Za-z]+/g, "").replace(/ {2,}/g, " ").replace(/ +$/, "");
}
// Strip tokens from the answer-label part of every $r line in a scene script.
// The label runs from after "$r <id> <fr> <key>#" up to the next # or closing ".
function stripSceneAnswerTokens(script) {
  return (script || "").replace(/(\$r\s+\S+\s+\S+\s+\S+#)([^#"]*)/g, (mm, head, label) => head + stripAnswerTokens(label));
}
// Find every answer label carrying a $ token, across BOTH the loaded scene text
// ($r lines in sceneCommands) and freshly-built forks (choiceLabel). Returns the
// offending {key,label} list so the UI can warn and offer a one-click fix.
function scanForkAnswerTokens(f) {
  const hits = [];
  const re = /\$r\s+\S+\s+\S+\s+(\S+)#([^#"]*)/g;
  let m;
  while ((m = re.exec(f.sceneCommands || "")) !== null) {
    if (/\$[0-9A-Za-z]/.test(m[2])) hits.push({ key: m[1], label: m[2] });
  }
  (f.forks || []).forEach((fk, i) => {
    if (fk.choiceLabel && /\$[0-9A-Za-z]/.test(fk.choiceLabel)) hits.push({ key: fk.key || `fork ${i + 1}`, label: fk.choiceLabel });
  });
  return hits;
}

function buildEventKey(f) {
  let key = f.eventId;
  if (f.prereqId) key += `/e ${f.prereqId}`;
  if (f.days.length > 0) key += `/DayOfWeek ${f.days.join(" ")}`;
  const fParts = [];
  if (f.npcName && f.heartsRequired) fParts.push(`${f.npcName} ${parseInt(f.heartsRequired) * 250}`);
  f.extraFriendship.forEach(ef => { if (ef.npc && ef.hearts) fParts.push(`${ef.npc} ${parseInt(ef.hearts) * 250}`); });
  if (fParts.length > 0) key += `/f ${fParts.join(" ")}`;
  if (f.timeStart && f.timeEnd) key += `/t ${f.timeStart} ${f.timeEnd}`;
  if (f.weather) key += `/w ${f.weather}`;
  if (f.requireDating) key += `/Dating ${f.npcName}`;
  if (f.requireMarriage) key += `/Spouse ${f.npcName}`;
  return key;
}

// For a LOADED forked event, the scene text holds the $q question + fork lines verbatim,
// but the Fork UI (f.forks) is what the author actually edits. This rewrites the question's
// $r choices and the fork lines FROM f.forks while preserving the question's speaker, key,
// fallback, and text, plus every other scene command. Keeping the UI authoritative is what
// lets an added option reach the question — no more orphaned branches, no single-option loop.
// Question text and answer labels become part of ONE quoted event command. A newline
// or "/" inside that command is illegal: the build joins lines with "/", so an embedded
// newline turns into a stray "/" that splits the $q and breaks every option after it
// (the "Yes, I will./#$r ..." garbage). Scrub those out so a label/question can never
// corrupt the line. "/" can't legally appear inside an event command at all.
function sanitizeInline(s) {
  return String(s || "").replace(/[\r\n/]+/g, " ").replace(/\s+/g, " ").trim();
}

// Heal an already-corrupted file on load: a "/" or newline sitting INSIDE a double-quoted
// string is illegal and makes split("/") shatter the question — the second option lands in
// its own fragment and its fork is lost. Drop any in-quote "/" and fold in-quote newlines to
// spaces before parsing, so a broken "...will./#$r..." re-stitches to "...will.#$r..." and
// both options parse again.
function stripSlashInsideQuotes(script) {
  let out = "", inQ = false;
  for (const ch of String(script || "")) {
    if (ch === '"') { inQ = !inQ; out += ch; continue; }
    if (inQ && ch === "/") continue;
    if (inQ && (ch === "\n" || ch === "\r")) { out += " "; continue; }
    out += ch;
  }
  return out;
}

function syncLoadedQuestion(sceneCommands, forks, eventId) {
  const useForks = (forks || []).filter(fk => fk.key);
  const lines = (sceneCommands || "").split("\n").map(l => l.trim()).filter(Boolean);
  const qIdx = lines.findIndex(l => l.startsWith("speak") && l.includes("$q") && l.includes("$r"));
  if (qIdx === -1 || useForks.length === 0) return sceneCommands; // nothing to sync — keep verbatim
  const rid = `${eventId}`;
  const qLine = lines[qIdx];
  // Keep everything up to the first "#$r" (speaker + $q key + fallback + question text, $0 and all).
  const pm = qLine.match(/^(speak\s+\S+\s+"\$q\s+\S+\s+\S+\s*#[\s\S]*?)#\$r/);
  const prefix = pm ? pm[1] : qLine.replace(/#\$r[\s\S]*$/, "").replace(/"\s*$/, "");
  const choices = useForks.map((fk, i) => `#$r ${rid}${i} 0 ${forkDlgKey(fk)}#${sanitizeInline(fk.choiceLabel) || `Option ${i + 1}`}`).join("");
  const newQLine = sanitizeInline(`${prefix}${choices}`) + '"';
  const forkLines = useForks.map((fk, i) => `fork ${rid}${i} ${fk.key}`);
  const out = [];
  for (let j = 0; j < lines.length; j++) {
    if (j === qIdx) { out.push(newQLine); out.push(...forkLines); continue; }
    if (lines[j].startsWith("fork ")) continue; // drop stale fork lines — rebuilt above
    out.push(lines[j]);
  }
  return out.join("\n");
}

function buildScript(f) {
  const lines = [];
  // music and viewport are REQUIRED positional segments — if either is dropped,
  // every following segment shifts left and the game mis-reads positions as the
  // camera. "none" is the valid literal for no music; "follow" is the valid
  // literal for a farmer-following camera (per the engine's own error text).
  lines.push(f.music && f.music.trim() ? f.music.trim() : "none");
  lines.push(f.viewportX && f.viewportY ? `${f.viewportX} ${f.viewportY}` : "follow");
  const positions = [];
  if (f.farmerX && f.farmerY) positions.push(`farmer ${f.farmerX} ${f.farmerY} ${f.farmerDir}`);
  f.npcs.forEach(npc => { if (npc.name && npc.x && npc.y) positions.push(`${npc.name} ${npc.x} ${npc.y} ${npc.dir}`); });
  if (positions.length > 0) lines.push(positions.join(" "));
  lines.push("pause 400");
  // The parser keeps any existing $q/fork lines inside sceneCommands (so they show in Safe Edit).
  const sceneHasForks = /(^|\n)\s*fork\s+/.test(f.sceneCommands || "") || (f.sceneCommands || "").includes("$q");
  if (sceneHasForks) {
    // Loaded forked event: rebuild the question's $r choices + fork lines FROM the Fork UI
    // (authoritative), preserving the speaker/key/text and all other scene commands. If the
    // UI has no forks yet, syncLoadedQuestion returns the scene verbatim as a safety fallback.
    // Strip any fork group markers first — they're UI-only and must never reach the output.
    const cleanedScene = (f.sceneCommands || "").replace(/%%FG\d+%%\n?/g, "");
    const synced = syncLoadedQuestion(cleanedScene, f.forks || [], f.eventId);
    synced.split("\n").forEach(l => { if (l.trim()) lines.push(l.trim()); });
    return repairBlankForkKeys(lines.join("/") + "/");
  }
  // Track which fork groups were placed by an explicit marker in the scene commands.
  const referencedGroups = new Set();

  if (f.sceneCommands) {
    f.sceneCommands.split("\n").forEach(l => {
      const trimmed = l.trim();
      if (!trimmed) return;
      const fgMatch = trimmed.match(/^%%FG(\d+)%%$/);
      if (fgMatch) {
        const idx = parseInt(fgMatch[1]);
        referencedGroups.add(idx);
        let block = "";
        if (idx === 0) {
          // Group 0 = the main fork block
          if (f.forks.length > 0 && f.forks.some(fk => fk.key)) {
            const rid = `${f.eventId}`;
            const choices = f.forks.map((fk, i) => fk.key ? `#$r ${rid}${i} 0 ${forkDlgKey(fk)}#${sanitizeInline(fk.choiceLabel) || `Option ${i+1}`}` : "").filter(Boolean).join("");
            const qLine = sanitizeInline(`speak ${f.questionNPC || f.npcs[0]?.name || "NPC"} "$q ${f.eventId} null #${sanitizeInline(f.questionText) || "..."}$0${choices}`) + '"';
            const forkLines = f.forks.filter(fk => fk.key).map((fk, i) => `fork ${rid}${i} ${fk.key}`);
            block = [qLine, ...forkLines].join("/");
          }
        } else {
          // Group 1+ = extra fork groups
          const eg = (f.extraForkGroups || [])[idx - 1];
          if (eg) block = buildForkGroupBlock(eg, f.eventId, f.questionNPC || f.npcs[0]?.name);
        }
        if (block) block.split("/").forEach(cmd => { if (cmd.trim()) lines.push(cmd.trim()); });
      } else {
        lines.push(trimmed);
      }
    });
  }

  // Append any fork groups that weren't explicitly placed by a marker.
  const hasGroup0 = f.forks.length > 0 && f.forks.some(fk => fk.key);
  if (hasGroup0 && !referencedGroups.has(0)) {
    const rid = `${f.eventId}`;
    const choices = f.forks.map((fk, i) => fk.key ? `#$r ${rid}${i} 0 ${forkDlgKey(fk)}#${sanitizeInline(fk.choiceLabel) || `Option ${i+1}`}` : "").filter(Boolean).join("");
    lines.push(sanitizeInline(`speak ${f.questionNPC || f.npcs[0]?.name || "NPC"} "$q ${f.eventId} null #${sanitizeInline(f.questionText) || "..."}$0${choices}`) + '"');
    f.forks.forEach((fk, i) => { if (fk.key) lines.push(`fork ${rid}${i} ${fk.key}`); });
  }
  (f.extraForkGroups || []).forEach((eg, ei) => {
    if (referencedGroups.has(ei + 1)) return;
    if (!eg.forks.length || !eg.forks.some(fk => fk.key)) return;
    const block = buildForkGroupBlock(eg, f.eventId, f.questionNPC || f.npcs[0]?.name);
    if (block) block.split("/").forEach(cmd => { if (cmd.trim()) lines.push(cmd.trim()); });
  });

  const hasForks = hasGroup0 || (f.extraForkGroups || []).some(eg => eg.forks.length > 0 && eg.forks.some(fk => fk.key));
  if (hasForks) return repairBlankForkKeys(lines.join("/").replace(/%%FG\d+%%/g, "") + "/");

  if (f.friendshipReward && f.npcName) lines.push(`friendship ${f.npcName} ${f.friendshipReward}`);
  lines.push(f.endNewDay ? "end newDay" : "end");
  return lines.join("/").replace(/%%FG\d+%%\//g, "");
}

function buildForkScript(fk, hasVT) {
  // A branch ends with exactly ONE terminator: "end" or "end newDay", never both.
  // "end newDay" rolls to the next morning and belongs HERE on the branch — a forked
  // main event can't end the day, so the day-end lives in the executed branch. Strip any
  // terminators the text already has and append the one the per-fork checkbox selects.
  const term = fk.endNewDay ? "end newDay" : "end";
  // A hand-written branch script takes precedence — the branch is its own full scene.
  if (fk.branchCommands && fk.branchCommands.trim()) {
    const lines = fk.branchCommands.split("\n").map(l => l.trim()).filter(l => l && l !== "end" && l !== "end newDay");
    lines.push(term);
    return lines.join("/");
  }
  // Fallback: simple canned assembly from the helper fields.
  const lines = ["pause 200"];
  if (!hasVT && fk.dialogueContent) lines.push(`speak ${fk.speakNPC || "NPC"} "${fk.dialogueContent}$0"`);
  if (fk.emote && fk.emoteNPC) lines.push(`emote ${fk.emoteNPC} ${fk.emote}`);
  if (fk.friendship && fk.friendshipNPC) lines.push(`friendship ${fk.friendshipNPC} ${fk.friendship}`);
  lines.push(term);
  return lines.join("/");
}

// Build a single fork group's $q speak + fork lines as a slash-joined string.
// Used by buildScript to expand %%FGN%% markers placed in the scene commands.
function buildForkGroupBlock(group, eventId, fallbackNPC) {
  const forks = (group.forks || []).filter(fk => fk.key);
  if (forks.length === 0) return "";
  const qId = (group.questionId && group.questionId.trim()) || eventId;
  const npc = (group.questionNPC && group.questionNPC.trim()) || fallbackNPC || "NPC";
  const choices = forks.map((fk, i) =>
    "#$r " + qId + i + " 0 " + forkDlgKey(fk) + "#" + (sanitizeInline(fk.choiceLabel) || ("Option " + (i + 1)))
  ).join("");
  const qLine = sanitizeInline(`speak ${npc} "$q ${qId} null #${sanitizeInline(group.questionText) || "..."}$0${choices}`) + '"';
  const forkLines = forks.map((fk, i) => `fork ${qId}${i} ${fk.key}`);
  return [qLine, ...forkLines].join("/");
}

function parseCoordsTxt(text) {
  const lines = text.split("\n");
  const imported = [];
  let currentFolder = null;
  let pendingLabel = null;
  for (const line of lines) {
    const folderMatch = line.match(/^──\s+(.+?)\s+─/);
    if (folderMatch) {
      currentFolder = { name: folderMatch[1].charAt(0) + folderMatch[1].slice(1).toLowerCase(), coords: [] };
      imported.push(currentFolder);
      pendingLabel = null;
      continue;
    }
    const detailMatch = line.match(/^\s{4,}Map:\s*(\S+)\s+X:\s*(\d+)\s+Y:\s*(\d+)(?:\s+Dir:\s*(\S+))?/);
    if (detailMatch && currentFolder && pendingLabel) {
      const dir = detailMatch[4] !== undefined && detailMatch[4] !== "—" ? parseInt(detailMatch[4]) : 0;
      currentFolder.coords.push({
        label: pendingLabel, map: detailMatch[1],
        x: parseInt(detailMatch[2]), y: parseInt(detailMatch[3]),
        direction: isNaN(dir) ? 0 : dir, id: Date.now() + Math.random(),
      });
      pendingLabel = null;
      continue;
    }
    const labelMatch = line.match(/^  (\S.+)$/);
    if (labelMatch && currentFolder) pendingLabel = labelMatch[1].trim();
  }
  return imported;
}

function mergeFolders(prev, imported) {
  const merged = [...prev];
  for (const imp of imported) {
    const existing = merged.find(f => f.name.toLowerCase() === imp.name.toLowerCase());
    if (existing) existing.coords = [...existing.coords, ...imp.coords];
    else merged.push(imp);
  }
  return merged;
}


// Hand-edited event files often pick up RAW line breaks inside a string value (e.g. a
// fork block written across several lines). A raw newline/tab inside a JSON string is
// illegal, so JSON.parse rejects the whole file with "Bad control character". This walks
// the text tracking string boundaries (respecting \" escapes) and drops raw newlines /
// folds tabs that sit inside a string, so a hand-broken value re-stitches into valid JSON.
// It's a no-op on already-valid JSON (which never contains raw control chars in a string).
function healJsonControlChars(t) {
  let out = "", inStr = false, esc = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (esc) { out += c; esc = false; continue; }
    if (c === "\\") { out += c; esc = true; continue; }
    if (c === '"') { inStr = !inStr; out += c; continue; }
    if (inStr && (c === "\n" || c === "\r")) continue;
    if (inStr && c === "\t") { out += " "; continue; }
    out += c;
  }
  return out;
}

// Try a strict JSON.parse; if it fails only because of raw control chars inside strings,
// heal and retry. Returns { data, repaired }. Throws the ORIGINAL error if heal doesn't help,
// so describeJsonError still points at the user's actual file.
function parseEventJson(raw) {
  try { return { data: JSON.parse(raw), repaired: false }; }
  catch (err) {
    const healed = healJsonControlChars(raw);
    if (healed !== raw) {
      try { return { data: JSON.parse(healed), repaired: true }; }
      catch (_) { throw err; }
    }
    throw err;
  }
}

// Turn a JSON.parse failure into a specific, actionable message: where it broke + the offending line.
// Note: JSON flags where parsing got stuck, which is usually just *after* the real mistake.
function describeJsonError(raw, err) {
  const msg = (err && err.message) ? err.message : String(err);
  const posMatch = msg.match(/position (\d+)/i);
  if (raw && posMatch) {
    const pos = Math.min(parseInt(posMatch[1], 10), raw.length);
    const before = raw.slice(0, pos);
    const line = before.split("\n").length;
    const col = pos - (before.lastIndexOf("\n") + 1) + 1;
    const lineText = (raw.split("\n")[line - 1] || "").trim();
    const snippet = lineText.length > 100 ? lineText.slice(0, 100) + "…" : lineText;
    return `${msg}. Near line ${line}, col ${col}:  ${snippet}  — JSON flags where it got stuck, usually just past the real mistake (a missing comma, a stray or missing brace, or a block missing its Action/Target/Entries wrapper).`;
  }
  return msg;
}

function EventBuilderTab({ integrations = {}, folders = [], setFolders = () => {}, onDirtyChange = () => {} }) {
  const [f, setF] = useState({
    eventId: "", prereqId: "", mapName: "", npcName: "", heartsRequired: "",
    extraFriendship: [], days: [], timeStart: "", timeEnd: "", weather: "",
    requireDating: false, requireMarriage: false, music: "none",
    viewportX: "", viewportY: "", farmerX: "", farmerY: "", farmerDir: "0",
    npcs: [{ name: "", x: "", y: "", dir: "0" }],
    sceneCommands: "", questionNPC: "", questionText: "",
    forks: [], extraForkGroups: [], friendshipReward: "", endNewDay: false, hasValleyTalk: !!integrations.valleyTalk,
  });

  // Report whether the event being built holds real work, so App's close-tab warning
  // (beforeunload) fires for an unsaved event, not just for saved coordinates. Cleared on
  // unmount so switching tabs doesn't leave a stale "dirty" flag.
  const eventHasWork = !!(
    (f.eventId && f.eventId.trim()) ||
    (f.sceneCommands && f.sceneCommands.trim()) ||
    (f.questionText && f.questionText.trim()) ||
    (f.forks && f.forks.some(fk => (fk.key || "").trim() || (fk.choiceLabel || "").trim() || (fk.branchCommands || "").trim())) ||
    (f.npcs && f.npcs.some(n => (n.name || "").trim())) ||
    (f.farmerX && f.farmerY) ||
    (f.friendshipReward && String(f.friendshipReward).trim())
  );
  useEffect(() => { onDirtyChange(eventHasWork); }, [eventHasWork]);
  useEffect(() => () => onDirtyChange(false), []);
  const [output, setOutput] = useState("");
  const [mergeNote, setMergeNote] = useState("");
  // Accumulated session output — every Generate merges into this so switching
  // between events doesn't throw away prior work. Null means "no session yet";
  // the first Generate of a session seeds it from the loaded file (if any) then
  // accumulates independently. Clear Session resets it to null.
  const [sessionChanges, setSessionChanges] = useState(null);
  const [vtKeysUnlocked, setVtKeysUnlocked] = useState(false); // ValleyTalk dialogue keys locked by default
  const [validation, setValidation] = useState({ errors: [], warnings: [] });
  const [copied, setCopied] = useState(false);
  const [eventCollection, setEventCollection] = useState([]);
  const [collectionMsg, setCollectionMsg] = useState("");
  const [collectionCopied, setCollectionCopied] = useState(false);
  const [syntaxIssues, setSyntaxIssues] = useState([]);
  const [syntaxRan, setSyntaxRan] = useState(false);
  const [mergeFile, setMergeFile] = useState(null);
  const [mergeFileName, setMergeFileName] = useState("");
  const [mergeMsg, setMergeMsg] = useState("");
  const [mergedOutput, setMergedOutput] = useState("");
  const [mergedCopied, setMergedCopied] = useState(false);
  const mergeRef = useRef(null);
  const sceneRef = useRef(null);
  const [eventFile, setEventFile] = useState(null);
  const [eventFileEntries, setEventFileEntries] = useState([]);
  const [eventFileWarnings, setEventFileWarnings] = useState([]);
  const [eventFileName, setEventFileName] = useState("");
  const [eventFileMsg, setEventFileMsg] = useState("");
  // Track the fork keys that existed when the event was loaded so that removed
  // forks can be cleaned out of the output file — f.forks only contains current
  // forks, so iterating it misses any fork the user deleted after loading.
  const [loadedForkKeys, setLoadedForkKeys] = useState([]);
  const [showEventList, setShowEventList] = useState(false);
  const [fileUsesVT, setFileUsesVT] = useState(null);    // file-level ValleyTalk answer: null = not yet asked, true/false = answered
  const [fileVTGuess, setFileVTGuess] = useState(false); // auto-detected suggestion shown in the prompt
  const eventFileRef = useRef(null);

  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  const [cmdBuilder, setCmdBuilder] = useState(null); // { form, initial } | null
  const [moveBuilder, setMoveBuilder] = useState(false);
  const [moveEditInitial, setMoveEditInitial] = useState(null);
  const [builderTarget, setBuilderTarget] = useState({ type: "scene" });
  const [safeEditMode, setSafeEditMode] = useState(true); // true = click line -> builder (default), false = direct syntax
  const [forkSafeEditMode, setForkSafeEditMode] = useState(true); // same toggle, applied to fork branch scripts
  const [showForks, setShowForks] = useState(false); // gates the fork UI — auto-opens when a forked event is loaded
  const [clipboardLine, setClipboardLine] = useState(null); // a single copied Safe-Edit line, paste-able into scene or any fork
  const [editingLine, setEditingLine] = useState(null); // { index } of the line being overwritten, or null
  const [overwriteMsg, setOverwriteMsg] = useState("");
  const [customMap, setCustomMap] = useState(false);
  const coordTxtRef = useRef(null);
  const [coordImportMsg, setCoordImportMsg] = useState("");
  const importCoordTxt = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = parseCoordsTxt(ev.target.result);
        if (imported.length === 0) { setCoordImportMsg("⚠ No coordinates found — check it's a Godly Hand .txt export."); return; }
        const total = imported.reduce((a, fo) => a + fo.coords.length, 0);
        setFolders(prev => mergeFolders(prev, imported));
        setCoordImportMsg(`✓ Imported ${total} coordinate${total !== 1 ? "s" : ""} — now available in the 📍 Saved pickers.`);
      } catch (err) { setCoordImportMsg("⚠ Failed to parse .txt: " + err.message); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const forkRefs = useRef({});

  // Insert a command line into the main scene or a specific fork branch, at the cursor.
  const insertToTarget = (target, snippet) => {
    if (target && target.type === "fork") {
      const i = target.index;
      const el = forkRefs.current[i];
      const cur = (f.forks[i] && f.forks[i].branchCommands) || "";
      if (!el) {
        const base = cur ? cur.replace(/\n*$/, "") + "\n" : "";
        updateFork(i, "branchCommands", base + snippet);
        return;
      }
      const start = el.selectionStart, end = el.selectionEnd;
      const before = cur.substring(0, start), after = cur.substring(end);
      const needNL = before.length > 0 && !before.endsWith("\n");
      const insertText = (needNL ? "\n" : "") + snippet;
      updateFork(i, "branchCommands", before + insertText + after);
      const caret = before.length + insertText.length;
      setTimeout(() => { el.focus(); el.setSelectionRange(caret, caret); }, 0);
      return;
    }
    insertCommand(snippet);
  };

  const openCmdBuilder = (cmd, target = { type: "scene" }) => {
    setBuilderTarget(target);
    if (cmd === "move") { setCmdBuilder(null); setMoveEditInitial(null); setMoveBuilder(true); return; }
    const form = COMMAND_FORMS[cmd];
    if (!form || !form.fields || form.fields.length === 0) {
      const c = SCENE_COMMANDS.find(s => s.cmd === cmd);
      if (c) insertToTarget(target, c.snippet);
      return;
    }
    const defaultNPC = f.questionNPC || (f.npcs[0] && f.npcs[0].name) || "";
    setMoveBuilder(false); setMoveEditInitial(null);
    setCmdBuilder({ form, initial: { actor: defaultNPC, name: defaultNPC } });
  };

  // Read/write the command text for a target: the main scene, or a specific fork's branch.
  const getTargetText = (target) =>
    target && target.type === "fork"
      ? ((f.forks[target.index] && f.forks[target.index].branchCommands) || "")
      : (f.sceneCommands || "");
  const setTargetText = (target, text) => {
    if (target && target.type === "fork") updateFork(target.index, "branchCommands", text);
    else set("sceneCommands", text);
  };

  // Safe-edit: open an existing line (scene or fork branch) back into its builder, pre-filled.
  const openLineForEdit = (lineIndex, target = { type: "scene" }) => {
    const lines = getTargetText(target).split("\n");
    const parsed = parseLineToForm(lines[lineIndex]);
    if (!parsed) { setOverwriteMsg("This line can't be opened in a builder — use Direct Syntax to edit it by hand."); setTimeout(() => setOverwriteMsg(""), 4000); return; }
    if (parsed.cmd === "move") {
      setCmdBuilder(null);            // ensure the generic builder isn't also mounted
      setBuilderTarget(target);
      setEditingLine({ index: lineIndex, target });
      setMoveEditInitial(parsed.initial);
      setMoveBuilder(true);
      return;
    }
    const form = COMMAND_FORMS[parsed.cmd];
    if (!form || !form.fields || form.fields.length === 0) {
      setOverwriteMsg(`"${parsed.cmd}" takes no arguments — nothing to edit.`);
      setTimeout(() => setOverwriteMsg(""), 4000);
      return;
    }
    setMoveBuilder(false);           // ensure the move builder isn't also mounted on top
    setMoveEditInitial(null);
    setBuilderTarget(target);
    setEditingLine({ index: lineIndex, target });
    setCmdBuilder({ form, initial: parsed.initial });
  };

  const overwriteLine = (newText) => {
    if (!editingLine) { insertToTarget({ type: "scene" }, newText); return; }
    const target = editingLine.target || { type: "scene" };
    const lines = getTargetText(target).split("\n");
    lines[editingLine.index] = newText;
    setTargetText(target, lines.join("\n"));
    setEditingLine(null);
    // Close the builders here too — don't rely solely on the child's onClose.
    setCmdBuilder(null); setMoveBuilder(false); setMoveEditInitial(null);
    const where = target.type === "fork" ? `Fork ${target.index + 1}` : "Scene";
    setOverwriteMsg(`${where} line ${editingLine.index + 1} overwritten.`);
    setTimeout(() => setOverwriteMsg(""), 4000);
  };

  // Reorder a line up (-1) or down (+1) within its target, skipping blank lines so a real
  // command swaps with the next/previous real command, not an empty gap.
  const moveLine = (index, dir, target = { type: "scene" }) => {
    const lines = getTargetText(target).split("\n");
    let dest = index + dir;
    while (dest >= 0 && dest < lines.length && lines[dest].trim() === "") dest += dir;
    if (dest < 0 || dest >= lines.length) return; // nothing to swap with
    const tmp = lines[index];
    lines[index] = lines[dest];
    lines[dest] = tmp;
    setTargetText(target, lines.join("\n"));
  };

  // Remove a single line from its target (scene or a specific fork branch).
  const deleteLine = (index, target = { type: "scene" }) => {
    const lines = getTargetText(target).split("\n");
    if (index < 0 || index >= lines.length) return;
    lines.splice(index, 1);
    setTargetText(target, lines.join("\n"));
  };

  // Copy a line to the shared clipboard; paste it into a gap (scene or any fork).
  const copyLine = (line) => setClipboardLine(line);
  const pasteAt = (index, target = { type: "scene" }) => {
    if (clipboardLine == null) return;
    const lines = getTargetText(target).split("\n");
    lines.splice(index, 0, clipboardLine);
    setTargetText(target, lines.join("\n"));
  };

  // Reusable Safe-Edit line list — clickable lines that open in a builder, with reorder arrows.
  // Used for both the main scene and each fork branch by passing the matching target.
  const renderSafeLines = (text, target) => {
    const allLines = (text || "").split("\n");
    const hasRealBefore = (idx) => allLines.slice(0, idx).some(l => l.trim() !== "");
    const hasRealAfter = (idx) => allLines.slice(idx + 1).some(l => l.trim() !== "");
    const arrowStyle = (enabled) => ({
      background: "transparent", border: "1px solid #2a2a4e", borderRadius: 3,
      color: enabled ? "#7b8cde" : "#33334e", cursor: enabled ? "pointer" : "default",
      fontSize: 11, lineHeight: 1, padding: "2px 5px", width: 22,
    });
    const iconBtn = (color, borderC) => ({
      background: "transparent", border: `1px solid ${borderC}`, borderRadius: 3,
      color, cursor: "pointer", fontSize: 12, lineHeight: 1, padding: "2px 6px", width: 22,
    });
    // A thin clickable gap between lines — only shown when a line is on the clipboard.
    // insertIndex is where the pasted line lands (0 = top, N = after line N-1).
    const pasteZone = (insertIndex) => clipboardLine == null ? null : (
      <div key={`paste-${insertIndex}`} onClick={() => pasteAt(insertIndex, target)}
        title="Paste the copied line here"
        style={{ height: 16, margin: "1px 0", borderRadius: 3, border: "1px dashed #2a4a6a",
          background: "#0d1a2a", color: "#6aa8d8", fontSize: 10, display: "flex",
          alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        ⤵ paste here
      </div>
    );
    const out = [pasteZone(0)];
    allLines.forEach((ln, i) => {
      const trimmed = ln.trim();
      // ── Fork group marker line ──
      const fgMatch = trimmed.match(/^%%FG(\d+)%%$/);
      if (fgMatch) {
        const idx = parseInt(fgMatch[1]);
        const groupLabel = idx === 0
          ? `Fork Group 1${f.questionText ? ` — "${f.questionText.slice(0, 40)}"` : ""}`
          : (() => { const eg = (f.extraForkGroups || [])[idx - 1]; return eg ? `${eg.label || `Fork Group ${idx + 1}`}${eg.questionText ? ` — "${eg.questionText.slice(0, 40)}"` : ""}` : `Fork Group ${idx + 1}`; })();
        out.push(
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "4px 8px", marginBottom: 2, borderRadius: 4,
            background: "#1a120a", border: "1px solid #4a3a0a",
            fontFamily: "monospace", fontSize: 10.5, color: "#cc9944",
          }}>
            <span>⇄ {groupLabel}</span>
            <button title="Remove from scene" onClick={(e) => { e.stopPropagation(); deleteLine(i, target); }}
              style={{ background: "transparent", border: "1px solid #4a1a1a", borderRadius: 3, color: "#cc4444", cursor: "pointer", fontSize: 12, lineHeight: 1, padding: "2px 6px", width: 22 }}>×</button>
          </div>
        );
        out.push(pasteZone(i + 1));
        return;
      }
      const parsed = trimmed ? parseLineToForm(trimmed) : null;
      const editable = parsed && COMMAND_FORMS[parsed.cmd] && COMMAND_FORMS[parsed.cmd].fields.length > 0;
      if (!trimmed) { out.push(<div key={i} style={{ height: 18 }} />); out.push(pasteZone(i + 1)); return; }
      const canUp = hasRealBefore(i), canDown = hasRealAfter(i);
      out.push(
        <div key={i} style={{
          fontFamily: "monospace", fontSize: 10.5, padding: "3px 4px 3px 8px", marginBottom: 2, borderRadius: 4,
          color: editable ? "#7b8cde" : "#666688",
          background: editable ? "#15152a" : "transparent",
          border: editable ? "1px solid #2a2a4e" : "1px solid transparent",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
        }}>
          {/* Wrap long lines cleanly — no horizontal scrollbar; small monospace keeps them compact. */}
          <span onClick={() => editable && openLineForEdit(i, target)}
            style={{ flex: 1, minWidth: 0, cursor: editable ? "pointer" : "default", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{ln}</span>
          <span style={{ display: "flex", gap: 3, alignItems: "center", flexShrink: 0 }}>
            {editable && <span style={{ fontSize: 10, color: "#555577", marginRight: 4 }}>✎ edit</span>}
            <button title="Copy line" onClick={(e) => { e.stopPropagation(); copyLine(ln); }} style={iconBtn("#7b8cde", "#2a2a4e")}>⧉</button>
            <button title="Move up" disabled={!canUp} onClick={(e) => { e.stopPropagation(); moveLine(i, -1, target); }} style={arrowStyle(canUp)}>▲</button>
            <button title="Move down" disabled={!canDown} onClick={(e) => { e.stopPropagation(); moveLine(i, 1, target); }} style={arrowStyle(canDown)}>▼</button>
            <button title="Delete line" onClick={(e) => { e.stopPropagation(); deleteLine(i, target); }} style={iconBtn("#cc4444", "#4a1a1a")}>×</button>
          </span>
        </div>
      );
      out.push(pasteZone(i + 1));
    });
    return out;
  };

  const [generatedIds, setGeneratedIds] = useState([]);
  const generateEventId = () => {
    const used = new Set();
    VANILLA_EVENT_IDS.forEach(id => used.add(id));
    eventCollection.forEach(e => Object.keys(e.entries || {}).forEach(k => {
      const n = parseInt(String(k).split("/")[0]);
      if (!isNaN(n)) used.add(n);
    }));
    eventFileEntries.forEach(en => {
      const n = parseInt(en.eventId);
      if (!isNaN(n)) used.add(n);
    });
    generatedIds.forEach(id => used.add(id));
    const cur = parseInt(f.eventId);
    if (!isNaN(cur)) used.add(cur);
    // Stay in the custom NPC band (9871000+). Continue past the highest one already in use there.
    const BASE = 9871000;
    let maxInBand = BASE;
    used.forEach(id => { if (id > maxInBand && id < 9880000) maxInBand = id; });
    let candidate = maxInBand + 1;
    while (used.has(candidate)) candidate++;
    setGeneratedIds(prev => [...prev, candidate]);
    set("eventId", String(candidate));
  };

  const insertCommand = (snippet) => {
    const el = sceneRef.current;
    if (!el) {
      const base = f.sceneCommands ? f.sceneCommands.replace(/\n*$/, "") + "\n" : "";
      set("sceneCommands", base + snippet);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = f.sceneCommands.substring(0, start);
    const after = f.sceneCommands.substring(end);
    const needLeadingNL = before.length > 0 && !before.endsWith("\n");
    const insertText = (needLeadingNL ? "\n" : "") + snippet;
    set("sceneCommands", before + insertText + after);
    const caret = before.length + insertText.length;
    setTimeout(() => { el.focus(); el.setSelectionRange(caret, caret); }, 0);
  };

  // ── Event file loader ──
  const parseEventKey = (key) => {
    const parts = key.split("/");
    const eventId = parts[0];
    let prereqId = "", days = [], npcName = "", heartsRequired = "",
        timeStart = "", timeEnd = "", weather = "",
        requireDating = false, requireMarriage = false,
        extraFriendship = [], unknownFlags = [];
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i].trim();
      if (p.startsWith("e ")) { prereqId = p.slice(2).trim(); }
      else if (p.startsWith("DayOfWeek ")) { days = p.slice(10).trim().split(" "); }
      else if (p.startsWith("f ")) {
        const tokens = p.slice(2).trim().split(" ");
        for (let j = 0; j < tokens.length; j += 2) {
          const npc = tokens[j], pts = parseInt(tokens[j+1]);
          if (!isNaN(pts)) {
            if (!npcName) { npcName = npc; heartsRequired = Math.round(pts / 250).toString(); }
            else extraFriendship.push({ npc, hearts: Math.round(pts / 250).toString() });
          }
        }
      }
      else if (p.startsWith("t ")) { const tt = p.slice(2).trim().split(" "); timeStart = tt[0]||""; timeEnd = tt[1]||""; }
      else if (p.startsWith("w ")) { weather = p.slice(2).trim(); }
      else if (p.startsWith("Dating ")) { requireDating = true; if (!npcName) npcName = p.slice(7).trim(); }
      else if (p.startsWith("Spouse ")) { requireMarriage = true; if (!npcName) npcName = p.slice(7).trim(); }
      else if (p.startsWith("c ")) { unknownFlags.push(`/c (chance condition — not supported)`); }
      else if (p.startsWith("n ")) { unknownFlags.push(`/n (played before check — not supported)`); }
      else if (p.startsWith("j")) { unknownFlags.push(`/j (Joja route condition — not supported)`); }
      else if (p.startsWith("k ")) { unknownFlags.push(`/k (NOT played condition — not supported)`); }
      else if (p.length > 0) { unknownFlags.push(`/${p} (unrecognized flag)`); }
    }
    return { eventId, prereqId, days, npcName, heartsRequired, timeStart, timeEnd, weather, requireDating, requireMarriage, extraFriendship, unknownFlags };
  };

  const parseEventScript = (script, mapName) => {
    const parts = stripSlashInsideQuotes(script).split("/");
    let music = "none", viewportX = "", viewportY = "", farmerX = "", farmerY = "", farmerDir = "0";
    const npcs = [];
    const sceneLines = [];
    const forks = [];
    const scriptWarnings = [];
    let endNewDay = false;
    let positionsParsed = false;
    // Detect i18n localization tokens
    if (script.includes("{{i18n:")) scriptWarnings.push("uses i18n localization tokens ({{i18n:...}}) — dialogue content not readable, loaded as raw commands");
    // Detect skippable
    if (script.includes("skippable")) scriptWarnings.push("uses 'skippable' flag — loaded as raw command");

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i].trim();
      if (!p) continue;

      // Music — first token that matches known music
      // Segment 0 is the music slot (positional) — take it verbatim, including
      // custom or unlisted cues (e.g. elliottPiano, grandpas_theme), so a loaded
      // event never loses its music. Skip only if it's obviously a shifted viewport
      // (two ints) or a positions line (name + three ints), meaning music was omitted.
      if (i === 0 && !/^\d+\s+\d+$/.test(p) && !/^\S+(\s+\d+){3}/.test(p)) { music = p; continue; }

      // Viewport line — exactly two integers (the camera tile). Appears before positions.
      if (!positionsParsed && /^\d+\s+\d+$/.test(p) && i <= 2) {
        const [vx, vy] = p.split(/\s+/);
        viewportX = vx; viewportY = vy;
        continue;
      }

      // Positions line — "farmer x y dir [Name x y dir]…". NOTE it starts with a NAME
      // (usually "farmer"), not digits, so the viewport regex above can't catch it. It's
      // one or more "<name> <int> <int> <int>" groups and nothing else, which also keeps it
      // from matching real commands like "move farmer 9 0 1" (those start with a verb, then a name).
      if (!positionsParsed && i <= 3 &&
          /^\S+\s+\d+\s+\d+\s+\d+(\s+\S+\s+\d+\s+\d+\s+\d+)*$/.test(p)) {
        positionsParsed = true;
        const tokens = p.split(/\s+/); // regex guarantees groups of exactly 4
        for (let j = 0; j < tokens.length; j += 4) {
          const name = tokens[j], x = tokens[j+1], y = tokens[j+2], dir = tokens[j+3] || "0";
          if (name === "farmer") { farmerX = x; farmerY = y; farmerDir = dir; }
          else npcs.push({ name, x, y, dir });
        }
        continue;
      }

      // Fork commands — store responseId->forkKey mapping
      if (p.startsWith("fork ")) {
        const tokens = p.trim().split(/\s+/);
        const responseId = tokens[1] || "";
        const forkKey = tokens[2] || tokens[1] || "";
        // Store raw for now — will be enriched after speak $q is parsed
        forks.push({ _responseId: responseId, key: forkKey, choiceLabel: "", dialogueKey: "", dialogueContent: "", friendshipNPC: "", friendship: "", emoteNPC: "", emote: "", speakNPC: "" });
        sceneLines.push(p);
        continue;
      }

      // Speak with $q — extract $r response options and match to forks
      if (p.startsWith("speak ") && p.includes("$q") && p.includes("$r")) {
        const actorMatch = p.match(/^speak\s+(\S+)/);
        const actor = actorMatch ? actorMatch[1] : "";
        // Extract $r blocks: $r responseId points dialogueKey#ChoiceLabel
        const rPattern = /\$r\s+(\S+)\s+\S+\s+(\S+)#([^#$"\\]+)/g;
        let m;
        const rMap = {};
        while ((m = rPattern.exec(p)) !== null) {
          rMap[m[1]] = { dialogueKey: m[2], choiceLabel: m[3].trim() };
        }
        // Store actor and rMap for fork enrichment
        sceneLines._questionActor = actor;
        sceneLines._rMap = { ...(sceneLines._rMap || {}), ...rMap };
        // Question text = the dialogue between "$q <key> <fallback>#" and the first "#$r".
        // (A trailing portrait token like $0 stays in — it round-trips as written.)
        const qtMatch = p.match(/\$q\s+\S+\s+\S+\s*#([\s\S]*?)#\s*\$r/);
        if (qtMatch && !sceneLines._questionText) sceneLines._questionText = qtMatch[1].trim();
        sceneLines.push(p);
        continue;
      }

      // End
      if (p === "end") { endNewDay = false; sceneLines.push("end"); continue; }
      if (p === "end newDay") { endNewDay = true; continue; }

      sceneLines.push(p);
    }

    // Remove trailing end from sceneLines
    while (sceneLines.length && (sceneLines[sceneLines.length-1] === "end" || sceneLines[sceneLines.length-1] === "end newDay")) {
      sceneLines.pop();
    }

    // Enrich forks with $r data matched by responseId
    const rMap = sceneLines._rMap || {};
    const enrichedForks = forks.map(fk => {
      const rData = rMap[fk._responseId] || {};
      return {
        ...fk,
        choiceLabel: rData.choiceLabel || fk.choiceLabel || "",
        dialogueKey: rData.dialogueKey || fk.dialogueKey || fk.key || "",
        speakNPC: sceneLines._questionActor || "",
      };
    });

    // Recover options whose fork line was lost to corruption. When a stray "/" split the
    // question, the second option's "fork <id> <key>" line could go missing, leaving a $r
    // entry (in rMap) with no matching fork. Rebuild a fork from each orphaned $r so the
    // option comes back instead of silently vanishing.
    const haveResponseIds = new Set(enrichedForks.map(fk => fk._responseId));
    Object.keys(rMap).forEach(respId => {
      if (haveResponseIds.has(respId)) return;
      const rData = rMap[respId];
      enrichedForks.push({
        ...DEFAULT_FORK,
        _responseId: respId,
        key: rData.dialogueKey || `fork_recovered_${respId}`,
        choiceLabel: rData.choiceLabel || "",
        dialogueKey: rData.dialogueKey || "",
        speakNPC: sceneLines._questionActor || "",
        _recovered: true,
      });
    });

    // Clean up internal markers from sceneLines
    const questionText = sceneLines._questionText || "";
    const questionNPC = sceneLines._questionActor || "";
    delete sceneLines._rMap;
    delete sceneLines._questionActor;
    delete sceneLines._questionText;

    return { music, viewportX, viewportY, farmerX, farmerY, farmerDir, npcs: npcs.length ? npcs : [{ name:"", x:"", y:"", dir:"0" }], sceneCommands: sceneLines.join("\n"), forks: enrichedForks, endNewDay, scriptWarnings, questionText, questionNPC };
  };

  const handleEventFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseEventJson(ev.target.result);
        const data = parsed.data;
        const warnings = [];
        if (parsed.repaired) warnings.push("This file had raw line breaks inside a value (usually from hand-editing a fork across multiple lines). They've been cleaned up on load — re-save to keep the file valid JSON.");
        const entries = [];

        // First pass — collect all dialogue keys from Characters/Dialogue blocks
        const dialogueIndex = {};
        for (const change of (data.Changes || [])) {
          if (change.Target?.startsWith("Characters/Dialogue/") && change.Entries) {
            for (const [k, v] of Object.entries(change.Entries)) {
              dialogueIndex[k] = v;
            }
          }
        }

        // Index fork branch entries (non-numeric keys under Data/Events) so forks round-trip
        const branchIndex = {};
        for (const change of (data.Changes || [])) {
          if (change.Target?.startsWith("Data/Events/") && change.Entries) {
            for (const [k, v] of Object.entries(change.Entries)) {
              if (!/^\d+$/.test(k.split("/")[0])) branchIndex[k] = v;
            }
          }
        }

        for (const change of (data.Changes || [])) {
          if (!change.Target?.startsWith("Data/Events/")) continue;
          const mapName = change.Target.replace("Data/Events/", "");
          for (const [key, script] of Object.entries(change.Entries || {})) {
            const eventId = key.split("/")[0];
            // Skip non-event keys — ValleyTalk dialogue keys like nick_response_a
            if (!/^\d+$/.test(eventId)) {
              continue;
            }
            try {
              const keyData = parseEventKey(key);
              const scriptData = parseEventScript(script, mapName);
              // Enrich fork dialogue content from dialogue index
              if (scriptData.forks) {
                scriptData.forks = scriptData.forks.map(fk => {
                  const branchRaw = fk.key && branchIndex[fk.key] ? branchIndex[fk.key] : "";
                  const fr = branchRaw.match(/friendship\s+(\S+)\s+(-?\d+)/);
                  const em = branchRaw.match(/emote\s+(\S+)\s+(\d+)/);
                  return {
                    ...fk,
                    dialogueContent: fk.dialogueKey && dialogueIndex[fk.dialogueKey]
                      ? dialogueIndex[fk.dialogueKey]
                      : fk.dialogueContent || "",
                    branchCommands: branchRaw
                      ? branchRaw.split("/").map(s => s.trim()).filter(Boolean).join("\n")
                      : fk.branchCommands || "",
                    // A branch ending in "end newDay" rolls to the next morning — reflect that
                    // in the per-fork checkbox so it round-trips and the build keeps it.
                    endNewDay: /(^|\/)end newDay(\/|$)/.test(branchRaw) || !!fk.endNewDay,
                    // Surface the branch's friendship/emote in the helper fields so they're
                    // visible after load (the branch script still drives output).
                    friendshipNPC: fk.friendshipNPC || (fr ? fr[1] : ""),
                    friendship:    fk.friendship    || (fr ? fr[2] : ""),
                    emoteNPC:      fk.emoteNPC      || (em ? em[1] : ""),
                    emote:         fk.emote         || (em ? em[2] : ""),
                    // If the loaded $r key differs from the fork key, it's a custom key — show it as Advanced.
                    dlgAdvanced: !!(fk.dialogueKey && fk.dialogueKey !== fk.key),
                  };
                });
              }
              // Pull in orphaned branches: fork_<eventId>_* entries that exist but aren't
              // referenced by a fork line, so every option the author made shows in the UI.
              if (scriptData.forks) {
                const haveKeys = new Set(scriptData.forks.map(fk => fk.key));
                const orphanPrefix = `fork_${eventId}_`;
                for (const [bk, bv] of Object.entries(branchIndex)) {
                  if (bk.startsWith(orphanPrefix) && !haveKeys.has(bk) && typeof bv === "string") {
                    const fr = bv.match(/friendship\s+(\S+)\s+(-?\d+)/);
                    const em = bv.match(/emote\s+(\S+)\s+(\d+)/);
                    scriptData.forks.push({
                      key: bk, choiceLabel: "", dialogueKey: "", dlgAdvanced: false,
                      dialogueContent: "", speakNPC: "",
                      branchCommands: bv.split("/").map(s => s.trim()).filter(Boolean).join("\n"),
                      endNewDay: /(^|\/)end newDay(\/|$)/.test(bv),
                      friendshipNPC: fr ? fr[1] : "", friendship: fr ? fr[2] : "",
                      emoteNPC: em ? em[1] : "", emote: em ? em[2] : "",
                    });
                  }
                }
              }
              const entryWarnings = [
                ...(keyData.unknownFlags || []).map(f => `key flag: ${f}`),
                ...(scriptData.scriptWarnings || []),
              ];
              entries.push({ key, eventId, mapName, keyData, scriptData, raw: script, entryWarnings });
              if (entryWarnings.length > 0) {
                warnings.push(`Event ${eventId}: loaded with warnings — ${entryWarnings.join("; ")}`);
              }
            } catch (err) {
              warnings.push(`Event ${eventId}: could not parse — ${err.message}`);
              entries.push({ key, eventId, mapName, keyData: null, scriptData: null, raw: script, parseError: true });
            }
          }
        }

        setEventFile(data);
        setEventFileName(file.name);
        setEventFileEntries(entries);
        setEventFileWarnings(warnings);
        setShowEventList(true);
        setEventFileMsg(`Loaded ${file.name} — ${entries.length} events, ${warnings.length} warning${warnings.length !== 1 ? "s" : ""}`);
        // A loaded event must know whether its forks are ValleyTalk, or regeneration
        // won't register the $r keys in Characters/Dialogue and ValleyTalk crashes on
        // the choice (KeyNotFound). Detect a likely answer, then ask to confirm.
        const vtSignal = Object.keys(dialogueIndex).length > 0 || entries.some(en => (en.scriptData?.forks || []).length > 0);
        setFileVTGuess(vtSignal);
        setFileUsesVT(null);
      } catch (err) { setEventFileMsg("Couldn't load file — " + describeJsonError(ev.target.result, err)); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const loadEventIntoBuilder = (entry) => {
    if (entry.parseError || !entry.keyData) return;
    const k = entry.keyData;
    const s = entry.scriptData;
    setF({
      eventId: k.eventId,
      prereqId: k.prereqId,
      mapName: entry.mapName,
      npcName: k.npcName,
      heartsRequired: k.heartsRequired,
      extraFriendship: k.extraFriendship,
      days: k.days,
      timeStart: k.timeStart,
      timeEnd: k.timeEnd,
      weather: k.weather,
      requireDating: k.requireDating,
      requireMarriage: k.requireMarriage,
      music: s.music,
      viewportX: s.viewportX,
      viewportY: s.viewportY,
      farmerX: s.farmerX,
      farmerY: s.farmerY,
      farmerDir: s.farmerDir,
      npcs: s.npcs,
      sceneCommands: s.sceneCommands,
      questionNPC: s.questionNPC || "",
      questionText: s.questionText || "",
      forks: s.forks,
      friendshipReward: "",
      endNewDay: s.endNewDay,
      hasValleyTalk: fileUsesVT !== null ? fileUsesVT : f.hasValleyTalk,
    });
    setShowEventList(false);
    setEventFileMsg(`Editing event ${k.eventId} from ${entry.mapName}`);
    setLoadedForkKeys((s.forks || []).map(fk => fk.key).filter(Boolean));
    setShowForks((s.forks || []).some(fk => fk.key));
    set("extraForkGroups", []);
  };

  const handleMergeUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseEventJson(ev.target.result);
        const data = parsed.data;
        if (!data.Changes) { setMergeMsg("Invalid file — no Changes array found."); return; }
        setMergeFile(data);
        setMergeFileName(file.name);
        setMergeMsg("Loaded " + file.name + (parsed.repaired ? " (cleaned up raw line breaks in a value)" : "") + " — ready to merge");
        setMergedOutput("");
      } catch (err) { setMergeMsg("Couldn't load file — " + describeJsonError(ev.target.result, err)); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleMerge = () => {
    if (!output) { setMergeMsg("Generate an event first."); return; }
    if (!mergeFile) { setMergeMsg("Upload a target JSON file first."); return; }
    try {
      const newBlock = JSON.parse(output);
      const base = JSON.parse(JSON.stringify(mergeFile)); // deep copy

      // Merge each change from new block into base
      for (const newChange of newBlock.Changes) {
        const target = newChange.Target;
        const existing = base.Changes.find(c => c.Target === target && c.Action === newChange.Action);
        if (existing) {
          // Merge entries into existing block
          existing.Entries = { ...existing.Entries, ...newChange.Entries };
        } else {
          // Add as new block
          base.Changes.push(newChange);
        }
      }

      setMergedOutput(JSON.stringify(base, null, 2));
      setMergeMsg("Merged successfully into " + mergeFileName);
    } catch (err) {
      setMergeMsg("Merge failed: " + err.message);
    }
  };

  const downloadMerged = () => {
    const blob = new Blob([mergedOutput], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = mergeFileName || "Events_merged.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const toggleDay = d => set("days", f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d]);
  const addEF = () => set("extraFriendship", [...f.extraFriendship, { npc: "", hearts: "" }]);
  const updateEF = (i, k, v) => { const ef = [...f.extraFriendship]; ef[i] = { ...ef[i], [k]: v }; set("extraFriendship", ef); };
  const addNPC = () => set("npcs", [...f.npcs, { name: "", x: "", y: "", dir: "0" }]);
  const updateNPC = (i, k, v) => { const n = [...f.npcs]; n[i] = { ...n[i], [k]: v }; set("npcs", n); };
  const removeNPC = i => set("npcs", f.npcs.filter((_, idx) => idx !== i));
  const addFork = () => set("forks", [...f.forks, { ...DEFAULT_FORK, key: `fork_${f.eventId || "evt"}_${f.forks.length}` }]);
  const updateFork = (i, k, v) => { const fk = [...f.forks]; fk[i] = { ...fk[i], [k]: v }; set("forks", fk); };
  const removeFork = i => set("forks", f.forks.filter((_, idx) => idx !== i));

  // ── Extra Fork Groups ──
  const addEFG = () => set("extraForkGroups", [
    ...(f.extraForkGroups || []),
    { ...DEFAULT_EXTRAFORKGROUP, label: `Fork Group ${(f.extraForkGroups || []).length + 2}` },
  ]);
  const updateEFG = (gi, k, v) => {
    const g = [...(f.extraForkGroups || [])]; g[gi] = { ...g[gi], [k]: v }; set("extraForkGroups", g);
  };
  const removeEFG = (gi) => set("extraForkGroups", (f.extraForkGroups || []).filter((_, i) => i !== gi));
  const addEFGFork = (gi) => {
    const g = [...(f.extraForkGroups || [])];
    const qid = g[gi].questionId || f.eventId || "evt";
    g[gi] = { ...g[gi], forks: [...(g[gi].forks || []), { ...DEFAULT_FORK, key: `fork_${qid}_${(g[gi].forks || []).length}` }] };
    set("extraForkGroups", g);
  };
  const updateEFGFork = (gi, fi, k, v) => {
    const g = [...(f.extraForkGroups || [])];
    g[gi] = { ...g[gi], forks: g[gi].forks.map((fk, i) => i === fi ? { ...fk, [k]: v } : fk) };
    set("extraForkGroups", g);
  };
  const removeEFGFork = (gi, fi) => {
    const g = [...(f.extraForkGroups || [])];
    g[gi] = { ...g[gi], forks: g[gi].forks.filter((_, i) => i !== fi) };
    set("extraForkGroups", g);
  };

  // Insert a %%FGN%% marker at the cursor in the scene commands.
  const insertForkGroupMarker = (index) => {
    const marker = `%%FG${index}%%`;
    const el = sceneRef.current;
    if (!el) {
      const base = f.sceneCommands ? f.sceneCommands.replace(/\n*$/, "") + "\n" : "";
      set("sceneCommands", base + marker);
      return;
    }
    const start = el.selectionStart, end = el.selectionEnd;
    const before = f.sceneCommands.substring(0, start);
    const after = f.sceneCommands.substring(end);
    const needNL = before.length > 0 && !before.endsWith("\n");
    const text = (needNL ? "\n" : "") + marker;
    set("sceneCommands", before + text + after);
    const caret = before.length + text.length;
    setTimeout(() => { el.focus(); el.setSelectionRange(caret, caret); }, 0);
  };

  const validate = () => {
    const errors = [], warnings = [];
    if (!f.eventId) errors.push("Event ID required.");
    if (!f.mapName) errors.push("Map name required.");
    if (f.timeEnd && parseInt(f.timeEnd) > 2400) errors.push("Time end cannot exceed 2400.");
    if (f.requireDating && f.requireMarriage) errors.push("Cannot require both Dating and Spouse.");
    if (f.eventId && VANILLA_EVENT_IDS.has(parseInt(f.eventId))) {
      errors.push(`Event ID ${f.eventId} is a vanilla Stardew Valley event ID. Using it will conflict with the base game. Choose a unique ID — custom NPC mods typically use IDs in the 9870000+ range.`);
    }
    f.forks.forEach((fk, i) => {
      if (fk.key && !forkDlgKey(fk)) warnings.push(`Fork ${i+1}: no usable dialogue key.`);
      if (forkDlgKey(fk) && fk.dlgAdvanced && !fk.dialogueContent) warnings.push(`Fork ${i+1}: blank dialogue content — ValleyTalk will default.`);
    });
    return { errors, warnings };
  };

  // One-click fix for the $-token-in-answer-label loop: strip tokens from the answer
  // labels in both the loaded scene text and any freshly-built forks. Leaves question
  // text and branch dialogue (where $ tokens are valid) untouched.
  const stripAnswerLabelTokens = () => {
    setF(x => ({
      ...x,
      sceneCommands: stripSceneAnswerTokens(x.sceneCommands || ""),
      forks: (x.forks || []).map(fk => fk.choiceLabel ? { ...fk, choiceLabel: stripAnswerTokens(fk.choiceLabel) } : fk),
    }));
  };

  const generate = () => {
    const v = validate();
    setValidation(v);
    if (v.errors.length > 0) return;

    const key = buildEventKey(f);
    const script = buildScript(f);
    const curEventId = String(f.eventId || "").trim();

    // Branch sibling keys (non-numeric) for the current event's forks.
    const forkEntries = {};
    f.forks.forEach(fk => { if (fk.key) forkEntries[fk.key] = buildForkScript(fk, f.hasValleyTalk); });
    // Extra fork groups' branch entries
    (f.extraForkGroups || []).forEach(eg => {
      (eg.forks || []).forEach(fk => { if (fk.key) forkEntries[fk.key] = buildForkScript(fk, eg.hasValleyTalk); });
    });

    // Current event's dialogue keys, GROUPED BY SPEAKING CHARACTER.
    // Each fork's $r key goes in the Dialogue block of whoever speaks it
    // (speakNPC), falling back to the question NPC. Blank content stays " "
    // (a valid ValleyTalk silent-reaction / portrait-only beat).
    const mainNPC = f.questionNPC || "NPC";
    const dialogueByChar = {}; // { charName: { key: content } }
    if (f.hasValleyTalk) {
      f.forks.forEach(fk => {
        if (!fk.key) return;
        const speaker = (fk.speakNPC && fk.speakNPC.trim()) || mainNPC;
        if (!dialogueByChar[speaker]) dialogueByChar[speaker] = {};
        dialogueByChar[speaker][forkDlgKey(fk)] = fk.dialogueContent ? fk.dialogueContent : " ";
      });
    }
    // Extra fork groups VT keys
    (f.extraForkGroups || []).forEach(eg => {
      if (!eg.hasValleyTalk) return;
      const egMainNPC = (eg.questionNPC && eg.questionNPC.trim()) || mainNPC;
      (eg.forks || []).forEach(fk => {
        if (!fk.key) return;
        const speaker = (fk.speakNPC && fk.speakNPC.trim()) || egMainNPC;
        if (!dialogueByChar[speaker]) dialogueByChar[speaker] = {};
        dialogueByChar[speaker][forkDlgKey(fk)] = fk.dialogueContent ? fk.dialogueContent : " ";
      });
    });
    const eventTarget = `Data/Events/${f.mapName}`;

    // ── SESSION MERGE ──
    // Build a patch array for this event's changes, then fold it into the
    // running session. The session seeds from the loaded file on the very first
    // Generate of a session so nothing in the file is dropped; after that it
    // accumulates independently — every subsequent Generate adds to the output
    // rather than replacing it. Clear Session resets back to null.

    // Data/Events patch for this event.
    const eventEntries = { [key]: script };
    Object.assign(eventEntries, forkEntries);
    const patch = [{ Action: "EditData", Target: eventTarget, Entries: orderEventEntries(eventEntries) }];

    // Dialogue patch — one block per speaking character (ValleyTalk only).
    for (const [charName, keys] of Object.entries(dialogueByChar)) {
      if (Object.keys(keys).length === 0) continue;
      patch.push({ Action: "EditData", Target: `Characters/Dialogue/${charName}`, Entries: { ...keys } });
    }

    // Branch keys to sweep before re-writing (covers removed / renamed forks).
    const keysToClean = new Set([
      ...loadedForkKeys,
      ...f.forks.map(fk => fk.key).filter(Boolean),
      ...(f.extraForkGroups || []).flatMap(eg => (eg.forks || []).map(fk => fk.key).filter(Boolean)),
    ]);

    // Seed from the loaded file on first Generate; accumulate from there on.
    const base = sessionChanges !== null
      ? JSON.parse(JSON.stringify(sessionChanges))
      : (eventFile && Array.isArray(eventFile.Changes)
          ? JSON.parse(JSON.stringify(eventFile.Changes))
          : []);

    for (const newChange of patch) {
      let block = base.find(c =>
        c.Action === newChange.Action && c.Target === newChange.Target && c.Entries != null
      );
      if (!block) {
        block = { Action: newChange.Action, Target: newChange.Target, Entries: {} };
        // Dialogue blocks front of the array (matches old mergeDialogue behaviour).
        newChange.Target.startsWith("Characters/Dialogue/") ? base.unshift(block) : base.push(block);
      }
      if (newChange.Target.startsWith("Data/Events/")) {
        // Remove old entry for this event ID (precondition string may have changed).
        for (const k of Object.keys(block.Entries)) {
          if (String(k).split("/")[0] === curEventId) delete block.Entries[k];
        }
        // Remove stale branch entries.
        for (const k of keysToClean) {
          if (block.Entries[k] !== undefined) delete block.Entries[k];
        }
        Object.assign(block.Entries, newChange.Entries);
        block.Entries = orderEventEntries(block.Entries);
      } else {
        Object.assign(block.Entries, newChange.Entries);
      }
    }

    setSessionChanges(base);
    setEventFileEntries(rebuildEventList(base));
    setOutput(JSON.stringify({ Changes: base }, null, 2));
    const sessionCount = countEvents(base);
    setMergeNote(`Session: ${sessionCount} event${sessionCount !== 1 ? "s" : ""} — "${curEventId}" updated.`);
    setTimeout(() => setMergeNote(""), 10000);
  };

  // Order a Data/Events block so numeric event keys come first and all branch
  // (fork_*) sibling keys sit at the bottom — keeps the output readable and stops
  // a lingering branch from floating above its event.
  function orderEventEntries(entries) {
    const events = {}, branches = {};
    for (const [k, v] of Object.entries(entries)) {
      if (/^\d+$/.test(String(k).split("/")[0])) events[k] = v; else branches[k] = v;
    }
    return { ...events, ...branches };
  }

  // Count numeric event keys across all Data/Events blocks for the merge note.
  function countEvents(changes) {
    let n = 0;
    for (const c of changes) {
      if (c.Target && c.Target.startsWith("Data/Events/") && c.Entries) {
        for (const k of Object.keys(c.Entries)) { if (/^\d+$/.test(String(k).split("/")[0])) n++; }
      }
    }
    return n;
  }

  // Re-derive the event list from any Changes array (session or loaded file) so
  // the list stays in sync after every Generate without requiring a file reload.
  function rebuildEventList(changes) {
    const dialogueIndex = {};
    const branchIndex = {};
    for (const c of changes) {
      if (c.Target?.startsWith("Characters/Dialogue/") && c.Entries) {
        for (const [k, v] of Object.entries(c.Entries)) dialogueIndex[k] = v;
      }
      if (c.Target?.startsWith("Data/Events/") && c.Entries) {
        for (const [k, v] of Object.entries(c.Entries)) {
          if (!/^\d+$/.test(String(k).split("/")[0])) branchIndex[k] = v;
        }
      }
    }
    const entries = [];
    for (const c of changes) {
      if (!c.Target?.startsWith("Data/Events/")) continue;
      const mapName = c.Target.replace("Data/Events/", "");
      for (const [key, script] of Object.entries(c.Entries || {})) {
        const eventId = key.split("/")[0];
        if (!/^\d+$/.test(eventId)) continue;
        try {
          const keyData = parseEventKey(key);
          const scriptData = parseEventScript(script, mapName);
          if (scriptData.forks) {
            scriptData.forks = scriptData.forks.map(fk => {
              const branchRaw = fk.key && branchIndex[fk.key] ? branchIndex[fk.key] : "";
              const fr = branchRaw.match(/friendship\s+(\S+)\s+(-?\d+)/);
              const em = branchRaw.match(/emote\s+(\S+)\s+(\d+)/);
              return {
                ...fk,
                dialogueContent: fk.dialogueKey && dialogueIndex[fk.dialogueKey]
                  ? dialogueIndex[fk.dialogueKey] : fk.dialogueContent || "",
                branchCommands: branchRaw
                  ? branchRaw.split("/").map(s => s.trim()).filter(Boolean).join("\n")
                  : fk.branchCommands || "",
                endNewDay: /(^|\/)end newDay(\/|$)/.test(branchRaw) || !!fk.endNewDay,
                friendshipNPC: fk.friendshipNPC || (fr ? fr[1] : ""),
                friendship:    fk.friendship    || (fr ? fr[2] : ""),
                emoteNPC:      fk.emoteNPC      || (em ? em[1] : ""),
                emote:         fk.emote         || (em ? em[2] : ""),
                dlgAdvanced: !!(fk.dialogueKey && fk.dialogueKey !== fk.key),
              };
            });
          }
          const entryWarnings = [
            ...(keyData.unknownFlags || []).map(fl => `key flag: ${fl}`),
            ...(scriptData.scriptWarnings || []),
          ];
          entries.push({ key, eventId, mapName, keyData, scriptData, raw: script, entryWarnings });
        } catch (err) {
          entries.push({ key, eventId: eventId, mapName, keyData: null, scriptData: null, raw: script, parseError: true });
        }
      }
    }
    return entries;
  }

  const copy = () => { copyText(output).then(ok => { if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); } }); };

  const [vtGutConfirm, setVtGutConfirm] = useState(false);

  // Strip every trace of ValleyTalk from the current session output:
  //   1. Drop all ValleyTalk/* Change blocks entirely.
  //   2. Collect every $r dialogue key referenced in event scripts, then remove
  //      those keys from any Characters/Dialogue blocks (they're only there for VT).
  //   3. Drop Characters/Dialogue blocks that end up empty.
  // Everything else — regular dialogue, event scripts, branch scenes — is untouched.
  const gutValleyTalk = () => {
    if (!sessionChanges) return;
    const changes = JSON.parse(JSON.stringify(sessionChanges));

    // Collect every $r response key from event scripts.
    const vtResponseKeys = new Set();
    for (const c of changes) {
      if (!c.Target?.startsWith("Data/Events/") || !c.Entries) continue;
      for (const script of Object.values(c.Entries)) {
        if (typeof script !== "string") continue;
        const re = /\$r\s+\S+\s+\S+\s+(\S+)#/g;
        let m;
        while ((m = re.exec(script)) !== null) vtResponseKeys.add(m[1]);
      }
    }

    // Drop ValleyTalk/* blocks; strip VT response keys from Dialogue blocks.
    const result = changes
      .filter(c => !c.Target?.startsWith("ValleyTalk/"))
      .map(c => {
        if (c.Target?.startsWith("Characters/Dialogue/") && c.Entries) {
          const entries = { ...c.Entries };
          for (const k of Object.keys(entries)) {
            if (vtResponseKeys.has(k)) delete entries[k];
          }
          return { ...c, Entries: entries };
        }
        return c;
      })
      // Drop dialogue blocks that are now empty.
      .filter(c => !(c.Target?.startsWith("Characters/Dialogue/") && c.Entries && Object.keys(c.Entries).length === 0));

    setSessionChanges(result);
    setEventFileEntries(rebuildEventList(result));
    setOutput(JSON.stringify({ Changes: result }, null, 2));
    setVtGutConfirm(false);
  };


  const addToCollection = () => {
    if (!output) { setCollectionMsg("Generate an event first."); return; }
    try {
      const parsed = JSON.parse(output);
      const newEntries = [];
      for (const change of (parsed.Changes || [])) {
        if (change.Target?.startsWith("Data/Events/")) {
          newEntries.push({ target: change.Target, entries: change.Entries, eventId: f.eventId });
        }
      }
      if (newEntries.length === 0) { setCollectionMsg("No event entries found."); return; }
      setEventCollection(prev => {
        const updated = [...prev];
        for (const ne of newEntries) {
          const existing = updated.find(e => e.target === ne.target);
          if (existing) { existing.entries = { ...existing.entries, ...ne.entries }; }
          else { updated.push({ ...ne }); }
        }
        return updated;
      });
      setCollectionMsg("Event " + f.eventId + " added to file");
    } catch { setCollectionMsg("Generate first."); }
  };

  const startNextEvent = () => {
    // Clears the generated output so the next event can be built into the same file.
    // Bumps the event ID by 1 if it's numeric, so it doesn't collide with the one just added.
    setOutput("");
    setCollectionMsg("");
    const cur = parseInt(f.eventId);
    if (!isNaN(cur)) set("eventId", String(cur + 1));
    set("extraForkGroups", []);
    setShowForks(false);
    setCollectionMsg("Ready for the next event — it'll stack into the same file.");
  };

  const downloadCollection = (filename) => {
    if (eventCollection.length === 0) { setCollectionMsg("No events added yet."); return; }
    const changes = eventCollection.map(e => ({ Action: "EditData", Target: e.target, Entries: e.entries }));
    const blob = new Blob([JSON.stringify({ Changes: changes }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "Regular_Events.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCollectionMsg("Downloaded " + (filename || "Regular_Events.json") + " with " + eventCollection.length + " target(s)");
  };

  const copyCollection = () => {
    if (eventCollection.length === 0) return;
    const changes = eventCollection.map(e => ({ Action: "EditData", Target: e.target, Entries: e.entries }));
    copyText(JSON.stringify({ Changes: changes }, null, 2)).then(ok => { if (ok) { setCollectionCopied(true); setTimeout(() => setCollectionCopied(false), 2000); } });
  };

  const removeFromCollection = (eventId) => {
    setEventCollection(prev => {
      const updated = [];
      for (const e of prev) {
        const filtered = Object.fromEntries(Object.entries(e.entries).filter(([k]) => k.split("/")[0] !== eventId));
        if (Object.keys(filtered).length > 0) updated.push({ ...e, entries: filtered });
      }
      return updated;
    });
    setCollectionMsg("Removed event " + eventId);
  };

  return (
    <div>
      <CoordWarning />

      {/* Event File Loader */}
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
          Load & Edit Existing Events
        </div>
        <input ref={eventFileRef} type="file" accept=".json" onChange={handleEventFileUpload} style={{ display: "none" }} />
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
          <Btn onClick={() => eventFileRef.current.click()}>📂 Locate Events JSON</Btn>
          <span style={{ color: "#333355", fontSize: 11 }}>Regular_Events.json or Marriage_Events.json — Assets/Date/</span>
          {eventFileEntries.length > 0 && (
            <Btn onClick={() => setShowEventList(s => !s)}>{showEventList ? "▲ Hide List" : "▼ Show Event List"}</Btn>
          )}
          {eventFileMsg && <span style={{ fontSize: 12, color: eventFileMsg.startsWith("Loaded") || eventFileMsg.startsWith("Editing") ? "#7b8cde" : "#cc4444" }}>{eventFileMsg}</span>}
        </div>

        {/* ValleyTalk question on load — a loaded file must declare whether its forks are ValleyTalk,
            so regeneration registers the $r keys in Characters/Dialogue. Inline, never a native dialog. */}
        {eventFile && eventFileEntries.length > 0 && fileUsesVT === null && (
          <div style={{ background: "#0a1420", border: "1px solid #244a6a", borderRadius: 6, padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ color: "#6aa8d8", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Does this file use ValleyTalk?</div>
            <div style={{ color: "#9aa0c0", fontSize: 11, lineHeight: 1.6, marginBottom: 8 }}>
              If yes, each fork's response key is registered in <code style={{ color: "#cc9944" }}>Characters/Dialogue/&lt;NPC&gt;</code>. Without it, ValleyTalk can't resolve the choice and crashes (KeyNotFound). {fileVTGuess ? "This file looks like it does — dialogue blocks or forks detected." : "No ValleyTalk markers detected in this file."}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => { setFileUsesVT(true); set("hasValleyTalk", true); }}>Yes — uses ValleyTalk</Btn>
              <Btn onClick={() => { setFileUsesVT(false); set("hasValleyTalk", false); }}>No — plain events</Btn>
            </div>
          </div>
        )}
        {eventFile && eventFileEntries.length > 0 && fileUsesVT !== null && (
          <div style={{ fontSize: 11, color: "#6a7a9a", marginBottom: 8 }}>
            ValleyTalk: <strong style={{ color: fileUsesVT ? "#7bcc8b" : "#9aa0c0" }}>{fileUsesVT ? "on" : "off"}</strong> for events from this file. <span onClick={() => setFileUsesVT(null)} style={{ color: "#6aa8d8", cursor: "pointer", textDecoration: "underline" }}>change</span>
          </div>
        )}

        {/* Warnings */}
        {eventFileWarnings.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {eventFileWarnings.map((w, i) => (
              <div key={i} style={{ background: "#1a120a", border: "1px solid #4a3a0a", borderRadius: 4, padding: "6px 10px", marginBottom: 4, color: "#cc9944", fontSize: 12 }}>⚠ {w}</div>
            ))}
          </div>
        )}

        {/* Event list */}
        {showEventList && eventFileEntries.length > 0 && (
          <div style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 6, maxHeight: 300, overflowY: "auto" }}>
            <div style={{ padding: "6px 12px", borderBottom: "1px solid #2a2a4e", color: "#555577", fontSize: 11 }}>
              Click an event to load it into the builder
            </div>
            {eventFileEntries.map((entry, i) => (
              <div key={i} onClick={() => !entry.parseError && loadEventIntoBuilder(entry)} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", borderBottom: "1px solid #1a1a2e",
                cursor: entry.parseError ? "not-allowed" : "pointer",
                background: entry.parseError ? "#1a0a0a" : "transparent",
                opacity: entry.parseError ? 0.6 : 1,
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <code style={{ color: entry.parseError ? "#cc4444" : "#7b8cde", fontSize: 12, fontWeight: 700 }}>{entry.eventId}</code>
                  <span style={{ color: "#9aa0c0", fontSize: 12 }}>{entry.mapName}</span>
                  {entry.keyData?.days?.length > 0 && <span style={{ color: "#555577", fontSize: 11 }}>{entry.keyData.days.join(" ")}</span>}
                  {entry.keyData?.heartsRequired && <span style={{ color: "#555577", fontSize: 11 }}>{entry.keyData.heartsRequired}♥</span>}
                  {entry.keyData?.requireDating && <span style={{ color: "#cc44cc", fontSize: 11 }}>Dating</span>}
                  {entry.keyData?.requireMarriage && <span style={{ color: "#cc44cc", fontSize: 11 }}>Married</span>}
                </div>
                {entry.parseError
                  ? <span style={{ color: "#cc4444", fontSize: 11 }}>⚠ parse error</span>
                  : entry.entryWarnings?.length > 0
                    ? <span style={{ color: "#cc9944", fontSize: 11 }} title={entry.entryWarnings.join("\n")}>⚠ {entry.entryWarnings.length} warning{entry.entryWarnings.length > 1 ? "s" : ""} — Load →</span>
                    : <span style={{ color: "#333355", fontSize: 11 }}>Load →</span>
                }
              </div>
            ))}
          </div>
        )}
      </div>

      <Section title="Trigger Conditions">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Event ID" hint="Unique number. Generate picks a free ID in the 9871000+ range.">
            <div style={{ display: "flex", gap: 6 }}>
              <input style={IS} value={f.eventId} onChange={e => set("eventId", e.target.value)} placeholder="9871031" />
              <Btn small onClick={generateEventId}>Generate</Btn>
            </div>
          </Field>
          <Field label="Prereq Event ID" hint="Optional — /e parameter. Pick a loaded event or type an ID.">
            <input style={IS} value={f.prereqId} onChange={e => set("prereqId", e.target.value)} placeholder="9871001" />
            {(() => {
              const seen = new Set();
              const opts = [];
              eventFileEntries.forEach(en => {
                if (en.eventId && !seen.has(en.eventId)) { seen.add(en.eventId); opts.push({ id: en.eventId, label: `${en.eventId}${en.mapName ? " · " + en.mapName : ""}` }); }
              });
              eventCollection.forEach(ev => Object.keys(ev.entries || {}).forEach(k => {
                const id = String(k).split("/")[0];
                if (id && !seen.has(id)) { seen.add(id); opts.push({ id, label: `${id} · this session` }); }
              }));
              if (opts.length === 0) return null;
              return (
                <select style={{ ...SS, marginTop: 6 }} value="" onChange={e => { if (e.target.value) set("prereqId", e.target.value); }}>
                  <option value="">— pick from {opts.length} loaded event{opts.length > 1 ? "s" : ""} —</option>
                  {opts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              );
            })()}
          </Field>
          <Field label="Map Name" hint={MAP_NAMES.find(m => m.value === f.mapName)?.desc || "Select the map this event takes place in"}>
            {(() => {
              const mapKnown = MAP_NAMES.some(m => m.value === f.mapName);
              const showCustom = customMap || (!!f.mapName && !mapKnown);
              return (
                <>
                  <select style={SS} value={showCustom ? "__custom__" : f.mapName} onChange={e => {
                    const v = e.target.value;
                    if (v === "__custom__") setCustomMap(true);
                    else { setCustomMap(false); set("mapName", v); }
                  }}>
                    <option value="">Select a map...</option>
                    {MAP_NAMES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    <option value="__custom__">Custom… (type a name)</option>
                  </select>
                  {showCustom && (
                    <>
                      <input style={{ ...IS, marginTop: 6 }} value={f.mapName} onChange={e => set("mapName", e.target.value)} placeholder="e.g. JoshHouse, BusStop, Saloon" />
                      <div style={{ color: "#cc8844", fontSize: 11, marginTop: 4 }}>Map names in files are often odd internal names — you may have to dig through the game files to find the exact one.</div>
                    </>
                  )}
                </>
              );
            })()}
          </Field>
          <Field label="Primary NPC"><NpcPicker compact value={f.npcName} onChange={val => set("npcName", val)} /></Field>
          <Field label="Hearts Required" hint="×250 = friendship points"><input style={IS} type="number" value={f.heartsRequired} onChange={e => set("heartsRequired", e.target.value)} placeholder="8" /></Field>
          <Field label="Time Window" hint="Max 2400">
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...IS, width: "50%" }} value={f.timeStart} onChange={e => set("timeStart", e.target.value)} placeholder="1800" />
              <input style={{ ...IS, width: "50%", borderColor: f.timeEnd && parseInt(f.timeEnd) > 2400 ? "#cc4444" : "#2a2a4e" }} value={f.timeEnd} onChange={e => set("timeEnd", e.target.value)} placeholder="2400" />
            </div>
          </Field>
        </div>
        {f.extraFriendship.map((ef, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8, background: "#0d0d1a", border: "1px solid #4a4a7e", borderRadius: 6, padding: "8px 10px" }}>
            <input style={{ ...IS, border: "1px solid #4a4a7e" }} value={ef.npc} onChange={e => updateEF(i, "npc", e.target.value)} placeholder="Harvey" />
            <input style={{ ...IS, border: "1px solid #4a4a7e" }} type="number" value={ef.hearts} onChange={e => updateEF(i, "hearts", e.target.value)} placeholder="Hearts" />
            <Btn danger small onClick={() => set("extraFriendship", f.extraFriendship.filter((_, idx) => idx !== i))}>×</Btn>
          </div>
        ))}
        <div style={{ marginBottom: 12 }}><Btn onClick={addEF}>+ Extra Friendship</Btn></div>
        <Field label="Day of Week">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DAYS.map(d => (
              <button key={d} onClick={() => toggleDay(d)} style={{
                padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600,
                background: f.days.includes(d) ? "#2a2a6e" : "#0d0d1a",
                color: f.days.includes(d) ? "#7b8cde" : "#555577",
                border: `1px solid ${f.days.includes(d) ? "#4a4a9e" : "#2a2a4e"}`,
              }}>{d}</button>
            ))}
          </div>
        </Field>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 8 }}>
          {[["requireDating", "Require Dating"], ["requireMarriage", "Require Marriage"]].map(([k, label]) => (
            <label key={k} style={{ color: "#9aa0c0", fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" style={{ marginRight: 6 }} checked={f[k]} onChange={e => set(k, e.target.checked)} />{label}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Scene Setup">
        <DirectionRef />
        <div style={{ marginBottom: 12 }}>
          <input ref={coordTxtRef} type="file" accept=".txt" onChange={importCoordTxt} style={{ display: "none" }} />
          <button onClick={() => coordTxtRef.current && coordTxtRef.current.click()} style={{
            background: "#1a2a1a", border: "1px solid #2a6a2a", color: "#44cc88",
            borderRadius: 4, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "monospace",
          }}>📂 Import .txt coordinates</button>
          <span style={{ color: "#555577", fontSize: 11, marginLeft: 10 }}>Loads saved tiles into the 📍 Saved pickers — no need to switch to the Coordinate Picker tab.</span>
          {coordImportMsg && <div style={{ marginTop: 6, fontSize: 12, color: coordImportMsg.startsWith("✓") ? "#44cc88" : "#cc9944" }}>{coordImportMsg}</div>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Music" hint={MUSIC_TRACKS.find(t => t.value === f.music)?.label || "Track played during this event"}>
            <select style={SS} value={f.music} onChange={e => set("music", e.target.value)}>
              {MUSIC_GROUPS.map(group => (
                <optgroup key={group} label={group}>
                  {MUSIC_TRACKS.filter(t => t.group === group).map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Viewport X" hint="Estimate OK, verify in-game"><input style={IS} value={f.viewportX} onChange={e => set("viewportX", e.target.value)} placeholder="14" /></Field>
          <Field label="Viewport Y">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input style={IS} value={f.viewportY} onChange={e => set("viewportY", e.target.value)} placeholder="20" />
              <CoordSelector folders={folders} label="Use saved coord for viewport" onSelect={c => { set("viewportX", String(c.x)); set("viewportY", String(c.y)); }} />
            </div>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
          <span style={{ color: "#9aa0c0", fontSize: 12 }}>Farmer — from coordinate finder</span>
          <CoordSelector folders={folders} label="Use saved coord for farmer" onSelect={c => { set("farmerX", String(c.x)); set("farmerY", String(c.y)); if (c.direction !== undefined) set("farmerDir", String(c.direction)); }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <input style={IS} value={f.farmerX} onChange={e => set("farmerX", e.target.value)} placeholder="X" />
          <input style={IS} value={f.farmerY} onChange={e => set("farmerY", e.target.value)} placeholder="Y" />
          <select style={SS} value={f.farmerDir} onChange={e => set("farmerDir", e.target.value)}>{DIRECTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
          <span style={{ color: "#9aa0c0", fontSize: 12 }}>NPCs — from coordinate finder</span>
        </div>
        {f.npcs.map((npc, i) => {
          const named = npc.name && npc.name.trim();
          const missingPos = named && (!npc.x || !npc.y);
          return (
          <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ marginBottom: 6 }}>
            <NpcPicker compact value={npc.name} onChange={val => updateNPC(i, "name", val)} placeholder="NPC Name" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto auto", gap: 8 }}>
            <input style={{ ...IS, ...(missingPos && !npc.x ? { borderColor: "#cc8844" } : {}) }} value={npc.x} onChange={e => updateNPC(i, "x", e.target.value)} placeholder="X" />
            <input style={{ ...IS, ...(missingPos && !npc.y ? { borderColor: "#cc8844" } : {}) }} value={npc.y} onChange={e => updateNPC(i, "y", e.target.value)} placeholder="Y" />
            <select style={SS} value={npc.dir} onChange={e => updateNPC(i, "dir", e.target.value)}>{DIRECTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select>
            <CoordSelector folders={folders} label={`Use saved coord for ${npc.name || "NPC"}`} onSelect={c => { updateNPC(i, "x", String(c.x)); updateNPC(i, "y", String(c.y)); if (c.direction !== undefined) updateNPC(i, "dir", String(c.direction)); }} />
            <Btn danger small onClick={() => removeNPC(i)}>×</Btn>
          </div>
          {missingPos && (
            <div style={{ color: "#cc8844", fontSize: 11, marginTop: 3 }}>
              ⚠ {npc.name.trim()} has no start position — won't be placed in the scene until X and Y are set.
            </div>
          )}
          </div>
          );
        })}
        <Btn onClick={addNPC}>+ Add NPC</Btn>
      </Section>

      <Section title="Scene Commands">
        <SceneCommandHelper onInsert={insertCommand} onBuild={openCmdBuilder} />
        {cmdBuilder && (
          <CommandBuilder
            form={cmdBuilder.form}
            initial={cmdBuilder.initial}
            editMode={!!editingLine}
            folders={folders}
            onInsert={(text) => { if (editingLine) overwriteLine(text); else insertToTarget(builderTarget, text); }}
            onClose={() => { setCmdBuilder(null); setEditingLine(null); }}
          />
        )}
        {moveBuilder && (
          <MoveBuilder
            coords={folders.flatMap(fo => (fo.coords || []).map(c => ({ ...c, folder: fo.name })))}
            defaultActor={f.questionNPC || (f.npcs[0] && f.npcs[0].name) || ""}
            initial={moveEditInitial}
            editMode={!!editingLine}
            onInsert={(text) => { if (editingLine) overwriteLine(text); else insertToTarget(builderTarget, text); }}
            onClose={() => { setMoveBuilder(false); setMoveEditInitial(null); setEditingLine(null); }}
          />
        )}

        <div style={{ display: "flex", gap: 0, marginBottom: 10, background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 6, padding: 3, width: "fit-content" }}>
          <button onClick={() => setSafeEditMode(true)} style={{ background: safeEditMode ? "#2a2a4e" : "transparent", color: safeEditMode ? "#e0e0f0" : "#7b8cde", border: "none", borderRadius: 4, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Safe Edit</button>
          <button onClick={() => setSafeEditMode(false)} style={{ background: !safeEditMode ? "#2a2a4e" : "transparent", color: !safeEditMode ? "#e0e0f0" : "#7b8cde", border: "none", borderRadius: 4, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Direct Syntax</button>
        </div>
        {overwriteMsg && (
          <div style={{ background: "#0d2a1a", border: "1px solid #2a6a2a", borderRadius: 6, padding: "8px 12px", marginBottom: 10, color: "#44cc88", fontSize: 12, fontWeight: 600 }}>
            ✓ {overwriteMsg}
          </div>
        )}
        {clipboardLine != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#0d1a2a", border: "1px solid #2a4a6a", borderRadius: 6, padding: "6px 12px", marginBottom: 10 }}>
            <span style={{ color: "#6aa8d8", fontSize: 12, whiteSpace: "nowrap" }}>⧉ Line copied — click a “paste here” gap (scene or any fork) to insert it.</span>
            <code style={{ color: "#9aa0c0", fontSize: 11, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clipboardLine}</code>
            <button onClick={() => setClipboardLine(null)} style={{ background: "transparent", border: "1px solid #2a4a6a", color: "#6aa8d8", borderRadius: 4, padding: "2px 10px", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>Clear</button>
          </div>
        )}

        {safeEditMode ? (
          <Field label="Scene Lines — click a line to edit it in a builder" hint="Each line opens its matching form pre-filled. Saving overwrites it in place.">
            <div style={{ background: "#0a0a14", border: "1px solid #2a2a4e", borderRadius: 6, padding: 8, minHeight: 120 }}>
              {renderSafeLines(f.sceneCommands, { type: "scene" })}
              {!(f.sceneCommands || "").trim() && <div style={{ color: "#555577", fontSize: 12, fontStyle: "italic" }}>No scene lines yet. Switch to Direct Syntax or use the command buttons above to add some.</div>}
            </div>
          </Field>
        ) : (
          <Field label="Raw Commands" hint="One per line. No / separators.">
            <textarea ref={sceneRef} style={{ ...IS, minHeight: 120, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
              value={f.sceneCommands} onChange={e => set("sceneCommands", e.target.value)}
              placeholder={"faceDirection Nicholas 3\npause 300\nspeak Nicholas \"Hello.$0\"\npause 400\nemote Nicholas 32"} />
          </Field>
        )}
      </Section>

      <Section title="Fork / Choice Block">
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#9aa0c0", fontSize: 13, cursor: "pointer", marginBottom: 10 }}>
          <input type="checkbox" checked={showForks} onChange={e => {
            setShowForks(e.target.checked);
            if (!e.target.checked) setF(x => ({ ...x, forks: [], extraForkGroups: [] }));
          }} />
          Using Forks
        </label>
        {showForks && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <Btn small onClick={() => insertForkGroupMarker(0)}>↓ Insert Fork Group 1 into Scene</Btn>
          </div>
        )}
        {showForks && (
          <>
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#9aa0c0", fontSize: 13, cursor: "pointer", marginBottom: 10 }}>
          <input type="checkbox" checked={f.hasValleyTalk} onChange={e => set("hasValleyTalk", e.target.checked)} />
          Using ValleyTalk
        </label>
        {f.hasValleyTalk && (
          <div style={{ background: "#1a120a", border: "1px solid #4a3a0a", borderRadius: 6, padding: "8px 12px", marginBottom: 10 }}>
            <div style={{ color: "#cc9944", fontSize: 12 }}>
              ✓ ValleyTalk enabled — every fork's $r key is registered in Characters/Dialogue/{f.questionNPC || "NPC"} (blank keys saved as " "). Required, or ValleyTalk crashes on the response.
            </div>
            {/* Registered-keys preview — grouped by speaking character, so you SEE the real structure */}
            {f.forks.some(fk => forkDlgKey(fk)) && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #3a2e0a" }}>
                {(() => {
                  const mainNPC = f.questionNPC || "NPC";
                  const byChar = {};
                  f.forks.forEach(fk => {
                    if (!forkDlgKey(fk)) return;
                    const sp = (fk.speakNPC && fk.speakNPC.trim()) || mainNPC;
                    if (!byChar[sp]) byChar[sp] = [];
                    byChar[sp].push(fk);
                  });
                  return Object.entries(byChar).map(([charName, fks]) => (
                    <div key={charName} style={{ marginBottom: 8 }}>
                      <div style={{ color: "#7b8cde", fontSize: 11, marginBottom: 4 }}>Characters/Dialogue/{charName}:</div>
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: "#9aa0c0", lineHeight: 1.6, paddingLeft: 8 }}>
                        {fks.map((fk, j) => (
                          <div key={j}>
                            <span style={{ color: "#cc9944" }}>{forkDlgKey(fk)}</span>
                            <span style={{ color: "#555577" }}>: </span>
                            <span style={{ color: fk.dialogueContent ? "#9aa0c0" : "#666688" }}>
                              {fk.dialogueContent ? `"${fk.dialogueContent.length > 40 ? fk.dialogueContent.slice(0,40)+"…" : fk.dialogueContent}"` : '" " (blank — silent reaction)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="Question NPC" hint="$r keys go in this NPC's dialogue file"><NpcPicker compact value={f.questionNPC} onChange={val => set("questionNPC", val)} /></Field>
          <Field label="Question Text"><input style={IS} value={f.questionText} onChange={e => set("questionText", e.target.value)} placeholder="What do you think?" /></Field>
        </div>
        {f.forks.map((fk, i) => (
          <div key={i} style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 6, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: "#7b8cde", fontSize: 12, fontWeight: 700 }}>Option {i+1}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#555577", fontSize: 11 }}>Response ID</span>
                <code title="Locked — derived from Event ID + option index. Used in both the $r choice and the fork command."
                  style={{ background: "#15152a", border: "1px solid #2a2a4e", borderRadius: 4, padding: "2px 8px", color: f.eventId ? "#9aa0c0" : "#cc8844", fontSize: 12 }}>
                  🔒 {f.eventId ? `${f.eventId}${i}` : "— set Event ID —"}
                </code>
                <Btn danger small onClick={() => removeFork(i)}>×</Btn>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Fork Key" hint="Unique — no shared prefix"><input style={IS} value={fk.key} onChange={e => updateFork(i, "key", e.target.value)} placeholder={`fork_${f.eventId || "evt"}_${i}`} /></Field>
              <Field label="Player Choice Option" hint="The text on the button the PLAYER picks (their reply). The NPC's question goes in Question Text above; the NPC's response to this choice goes in the branch below."><input style={IS} value={fk.choiceLabel} onChange={e => updateFork(i, "choiceLabel", e.target.value)} placeholder="Of course." /></Field>
              <Field label="Dialogue Key" hint={fk.dlgAdvanced ? "Custom $r link target — must exist in the speaking NPC's Characters/Dialogue file." : "Auto-filled from the Fork Key. Check Advanced to set a different key."}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    style={{ ...IS, flex: 1, ...(!fk.dlgAdvanced ? { background: "#15151f", color: "#9aa0c0", cursor: "not-allowed", borderColor: "#2a2a3e" } : { borderColor: "#cc8844" }) }}
                    value={fk.dlgAdvanced ? (fk.dialogueKey || "") : (fk.key || "")}
                    readOnly={!fk.dlgAdvanced}
                    onChange={e => { if (fk.dlgAdvanced) updateFork(i, "dialogueKey", e.target.value); }}
                    placeholder={fk.key || "fork key"}
                    title={!fk.dlgAdvanced ? "Auto from Fork Key — check Advanced to edit" : ""}
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: 4, color: fk.dlgAdvanced ? "#cc8844" : "#777799", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}
                    title="Off: the dialogue key auto-mirrors the Fork Key. On: set a different $r link target.">
                    <input type="checkbox" checked={!!fk.dlgAdvanced} onChange={e => updateFork(i, "dlgAdvanced", e.target.checked)} />
                    Advanced
                  </label>
                </div>
              </Field>
              <Field label="Speaking Character" hint="Whose Characters/Dialogue block this key goes in. Defaults to the Question NPC."><NpcPicker compact value={fk.speakNPC} onChange={val => updateFork(i, "speakNPC", val)} placeholder={f.questionNPC || "Nicholas"} /></Field>
              <Field label="Dialogue Content" hint={f.hasValleyTalk ? "ValleyTalk response. Leave blank for a silent portrait/mood reaction. #$b# for multi-box, $0 on each." : "NPC dialogue."}><input style={IS} value={fk.dialogueContent} onChange={e => updateFork(i, "dialogueContent", e.target.value)} placeholder="Of course.$0" /></Field>
              <Field label="Friendship NPC"><NpcPicker compact value={fk.friendshipNPC} onChange={val => updateFork(i, "friendshipNPC", val)} /></Field>
              <Field label="Friendship Amount"><input style={IS} type="number" value={fk.friendship} onChange={e => updateFork(i, "friendship", e.target.value)} placeholder="100" /></Field>
            </div>
            <div style={{ marginTop: 8 }}>
              <Field label="Branch Scene Commands" hint="The full mini-scene that runs when this option is chosen — one command per line, same as the main scene. When filled, this is the branch script and the emote/friendship helpers above aren't appended. The terminator is added automatically from the checkbox below — end, or end newDay — never both.">
                <div style={{ display: "flex", gap: 0, marginBottom: 8, background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 6, padding: 3, width: "fit-content" }}>
                  <button onClick={() => setForkSafeEditMode(true)} style={{ background: forkSafeEditMode ? "#2a2a4e" : "transparent", color: forkSafeEditMode ? "#e0e0f0" : "#7b8cde", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Safe Edit</button>
                  <button onClick={() => setForkSafeEditMode(false)} style={{ background: !forkSafeEditMode ? "#2a2a4e" : "transparent", color: !forkSafeEditMode ? "#e0e0f0" : "#7b8cde", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Direct Syntax</button>
                </div>
                <SceneCommandHelper onBuild={(cmd) => openCmdBuilder(cmd, { type: "fork", index: i })} />
                {forkSafeEditMode ? (
                  <div style={{ background: "#0a0a14", border: "1px solid #2a2a4e", borderRadius: 6, padding: 8, minHeight: 90 }}>
                    {renderSafeLines(fk.branchCommands, { type: "fork", index: i })}
                    {!(fk.branchCommands || "").trim() && <div style={{ color: "#555577", fontSize: 12, fontStyle: "italic" }}>No branch lines yet. Switch to Direct Syntax or use the command buttons above to add some.</div>}
                  </div>
                ) : (
                  <textarea ref={el => (forkRefs.current[i] = el)} style={{ ...IS, minHeight: 90, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
                    value={fk.branchCommands} onChange={e => updateFork(i, "branchCommands", e.target.value)}
                    placeholder={"fade\nspeak Evelyn \"Leave him be. He knows where he is.$0\"\npause 400\nemote Nicholas 24\nfriendship Nicholas 100\nfade"} />
                )}
              </Field>
              <label style={{ color: "#9aa0c0", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", marginTop: 8 }} title="A forked main event can't end the day — the day-end lives here on the branch. Ends with end newDay instead of end (one or the other, never both).">
                <input type="checkbox" style={{ marginRight: 6 }} checked={!!fk.endNewDay} onChange={e => updateFork(i, "endNewDay", e.target.checked)} />
                End this branch with <code style={{ color: "#cc9944", margin: "0 4px" }}>end newDay</code> <span style={{ fontSize: 11, color: "#7b8cde" }}>(rolls to next morning — otherwise ends with <code style={{ color: "#7b8cde" }}>end</code>)</span>
              </label>
            </div>
          </div>
        ))}
        <Btn onClick={addFork}>+ Add Fork Option</Btn>

        {/* ── Extra Fork Groups ── */}
        {(f.extraForkGroups || []).map((eg, gi) => (
          <div key={gi} style={{ background: "#0d0d14", border: "1px solid #4a3a0a", borderRadius: 8, padding: 14, marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#cc9944", fontWeight: 700, fontSize: 12 }}>Fork Group {gi + 2}</span>
                <input style={{ ...IS, width: 160, fontSize: 12 }} value={eg.label}
                  onChange={e => updateEFG(gi, "label", e.target.value)}
                  placeholder={`Fork Group ${gi + 2}`} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn small onClick={() => insertForkGroupMarker(gi + 1)}>↓ Insert into Scene</Btn>
                <Btn danger small onClick={() => removeEFG(gi)}>× Remove Group</Btn>
              </div>
            </div>

            {/* Question ID — required for a second $q in the same event */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              <Field label="Question ID" hint="The $q ID for this group — must differ from the Event ID if there's already a fork group above.">
                <input style={IS} value={eg.questionId} onChange={e => updateEFG(gi, "questionId", e.target.value)} placeholder="e.g. 98720102" />
              </Field>
              <Field label="Question NPC"><NpcPicker compact value={eg.questionNPC} onChange={val => updateEFG(gi, "questionNPC", val)} placeholder={f.questionNPC || "Nicholas"} /></Field>
              <Field label="Question Text"><input style={IS} value={eg.questionText} onChange={e => updateEFG(gi, "questionText", e.target.value)} placeholder="What do you think?" /></Field>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#9aa0c0", fontSize: 12, cursor: "pointer", marginBottom: 12 }}>
              <input type="checkbox" checked={!!eg.hasValleyTalk} onChange={e => updateEFG(gi, "hasValleyTalk", e.target.checked)} />
              Using ValleyTalk for this group
            </label>

            {(eg.forks || []).map((fk, fi) => (
              <div key={fi} style={{ background: "#13131f", border: "1px solid #2a2a4e", borderRadius: 6, padding: 10, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: "#7b8cde", fontSize: 11, fontWeight: 700 }}>Option {fi + 1}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <code style={{ background: "#15152a", border: "1px solid #2a2a4e", borderRadius: 4, padding: "2px 8px", color: eg.questionId ? "#9aa0c0" : "#cc8844", fontSize: 11 }}>
                      {"🔒 "}{eg.questionId || "(set Question ID)"}{"["}{fi}{"]*"}
                    </code>
                    <Btn danger small onClick={() => removeEFGFork(gi, fi)}>×</Btn>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="Fork Key"><input style={IS} value={fk.key} onChange={e => updateEFGFork(gi, fi, "key", e.target.value)} placeholder={`fork_${eg.questionId || "evt"}_${fi}`} /></Field>
                  <Field label="Player Choice Label"><input style={IS} value={fk.choiceLabel} onChange={e => updateEFGFork(gi, fi, "choiceLabel", e.target.value)} placeholder="Of course." /></Field>
                  {eg.hasValleyTalk && (
                    <Field label="Dialogue Content" hint="ValleyTalk response. Leave blank for silent reaction."><input style={IS} value={fk.dialogueContent} onChange={e => updateEFGFork(gi, fi, "dialogueContent", e.target.value)} placeholder="Sure.$0" /></Field>
                  )}
                </div>
                <Field label="Branch Scene Commands" hint="One command per line. Terminator added automatically.">
                  <textarea style={{ ...IS, minHeight: 70, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
                    value={fk.branchCommands} onChange={e => updateEFGFork(gi, fi, "branchCommands", e.target.value)}
                    placeholder={"pause 200\nfriendship Nicholas 150"} />
                </Field>
                <label style={{ color: "#9aa0c0", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", marginTop: 6 }}>
                  <input type="checkbox" style={{ marginRight: 6 }} checked={!!fk.endNewDay} onChange={e => updateEFGFork(gi, fi, "endNewDay", e.target.checked)} />
                  End with <code style={{ color: "#cc9944", margin: "0 4px" }}>end newDay</code>
                </label>
              </div>
            ))}
            <Btn small onClick={() => addEFGFork(gi)}>+ Add Option</Btn>
          </div>
        ))}

        <div style={{ marginTop: 14 }}>
          <Btn onClick={addEFG}>+ Add Fork Group</Btn>
          <span style={{ color: "#555577", fontSize: 11, marginLeft: 10 }}>Each group has its own $q question and branches. Use ↓ Insert to place it in the scene at the right point.</span>
        </div>
          </>
        )}
      </Section>

      {f.forks.length === 0 && (
        <Section title="Scene End">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Friendship Reward"><input style={IS} type="number" value={f.friendshipReward} onChange={e => set("friendshipReward", e.target.value)} placeholder="150" /></Field>
            <Field label="End type" hint="A scene ends with one or the other — never both.">
              <label style={{ color: "#9aa0c0", fontSize: 13, cursor: "pointer", display: "block", marginBottom: 6 }}>
                <input type="checkbox" style={{ marginRight: 6 }} checked={!f.endNewDay} onChange={() => set("endNewDay", false)} />end
              </label>
              <label style={{ color: "#9aa0c0", fontSize: 13, cursor: "pointer", display: "block" }} title="Rolls to the next morning.">
                <input type="checkbox" style={{ marginRight: 6 }} checked={f.endNewDay} onChange={() => set("endNewDay", true)} />end newDay <span style={{ fontSize: 11, color: "#7b8cde" }}>rolls to next morning</span>
              </label>
            </Field>
          </div>
        </Section>
      )}

      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div style={{ marginBottom: 16 }}>
          {validation.errors.map((e, i) => <div key={i} style={{ background: "#2a0a0a", border: "1px solid #4a1a1a", borderRadius: 4, padding: "8px 12px", marginBottom: 6, color: "#cc4444", fontSize: 13 }}>⚠ {e}</div>)}
          {validation.warnings.map((w, i) => <div key={i} style={{ background: "#1a1a0a", border: "1px solid #4a3a0a", borderRadius: 4, padding: "8px 12px", marginBottom: 6, color: "#cc9944", fontSize: 13 }}>• {w}</div>)}
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        {scanForkAnswerTokens(f).length > 0 && (
          <div style={{ marginBottom: 8, background: "#1a1405", border: "1px solid #6a4a0a", borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ color: "#e0b050", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              ⚠ {scanForkAnswerTokens(f).length} choice label{scanForkAnswerTokens(f).length > 1 ? "s" : ""} contain a $ token
            </div>
            <div style={{ color: "#9a8a60", fontSize: 12, marginBottom: 8, lineHeight: 1.5 }}>
              A $ in an answer label is read as a dialogue command, breaks the choice's binding to its response, and makes the question loop in-game with no error. Portraits belong in the question text and the branch — not the button. Stripping only touches the answer labels.
            </div>
            <button onClick={stripAnswerLabelTokens} style={{
              padding: "7px 14px", borderRadius: 6, cursor: "pointer",
              background: "#2a2208", border: "1px solid #6a4a0a", color: "#e0b050", fontSize: 13, fontWeight: 700,
            }}>✂ Strip $ tokens from answer labels</button>
          </div>
        )}
        <button onClick={() => { const issues = checkEventSyntax(f); setSyntaxIssues(issues); setSyntaxRan(true); }} style={{
          width: "100%", padding: "10px", borderRadius: 6, cursor: "pointer",
          background: "#1a2a1a", border: "2px solid #2a6a2a",
          color: "#44cc88", fontSize: 14, fontWeight: 700, letterSpacing: 1,
        }}>🔍 Check Syntax Before Generating</button>
        {syntaxRan && syntaxIssues !== null && <SyntaxPopup issues={syntaxIssues} onClose={() => setSyntaxRan(false)} />}
        {syntaxRan && (
          <div style={{ marginTop: 8, background: "#0d0d1a", border: `1px solid ${syntaxIssues.length === 0 ? "#2a6a2a" : syntaxIssues.some(i => i.level === "error") ? "#4a1a1a" : "#4a3a0a"}`, borderRadius: 8, padding: 14 }}>
            {syntaxIssues.length === 0 ? (
              <div style={{ color: "#44cc44", fontWeight: 700, fontSize: 13 }}>✓ No syntax issues found</div>
            ) : (
              <>
                <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                  {syntaxIssues.filter(i => i.level === "error").length} error{syntaxIssues.filter(i => i.level === "error").length !== 1 ? "s" : ""} • {syntaxIssues.filter(i => i.level === "warning").length} warning{syntaxIssues.filter(i => i.level === "warning").length !== 1 ? "s" : ""}
                </div>
                {syntaxIssues.map((issue, i) => (
                  <div key={i} style={{ background: issue.level === "error" ? "#2a0a0a" : "#1a1a0a", border: `1px solid ${issue.level === "error" ? "#4a1a1a" : "#4a3a0a"}`, borderRadius: 4, padding: "6px 10px", marginBottom: 5, color: issue.level === "error" ? "#cc4444" : "#cc9944", fontSize: 12 }}>
                    {issue.level === "error" ? "✖" : "⚠"} {issue.msg}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <div style={{ flex: 1 }}><Btn primary full onClick={generate}>Generate Event JSON</Btn></div>
        {sessionChanges !== null && (
          <Btn danger small onClick={() => { setSessionChanges(null); setOutput(""); setMergeNote(""); }}>
            ✕ Clear ({countEvents(sessionChanges)} event{countEvents(sessionChanges) !== 1 ? "s" : ""})
          </Btn>
        )}
      </div>
      {mergeNote && (
        <div style={{ marginTop: 10, background: "#0d2a1a", border: "1px solid #2a6a2a", borderRadius: 6, padding: "10px 12px", color: "#44cc88", fontSize: 12, fontWeight: 600, lineHeight: 1.5 }}>
          ✓ {mergeNote}
        </div>
      )}
      {output && (
        <div style={{ marginTop: 10, marginBottom: 10 }}>
          <Btn full onClick={addToCollection}>＋ Add this event to the file{eventCollection.length > 0 ? ` (${eventCollection.reduce((acc, e) => acc + Object.keys(e.entries).length, 0)} so far)` : ""}</Btn>
          {collectionMsg && <div style={{ color: "#44cc88", fontSize: 12, marginTop: 6 }}>{collectionMsg}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <Btn small onClick={startNextEvent}>↻ Start next event (keep file)</Btn>
            {sessionChanges?.some(c => c.Target?.startsWith("ValleyTalk/")) && (
              <Btn danger small onClick={() => setVtGutConfirm(v => !v)}>✂ Remove ValleyTalk</Btn>
            )}
          </div>
          {vtGutConfirm && (
            <div style={{ marginTop: 10, background: "#1a0a0a", border: "1px solid #4a1a1a", borderRadius: 6, padding: "10px 14px" }}>
              <div style={{ color: "#cc4444", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Remove all ValleyTalk from this output?</div>
              <div style={{ color: "#9a7070", fontSize: 11, lineHeight: 1.6, marginBottom: 10 }}>
                This strips every <code style={{ color: "#cc9944" }}>ValleyTalk/*</code> block and removes the <code style={{ color: "#cc9944" }}>$r</code> response keys from <code style={{ color: "#cc9944" }}>Characters/Dialogue</code>. Event scripts and branch scenes are untouched. Cannot be undone — copy your output first if you want a backup.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn danger onClick={gutValleyTalk}>Yes — remove ValleyTalk</Btn>
                <Btn onClick={() => setVtGutConfirm(false)}>Cancel</Btn>
              </div>
            </div>
          )}
          <div style={{ color: "#7b8cde", fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
            Build an event → add it → start the next → it stacks into the same file. Download when you've added them all.
          </div>
        </div>
      )}
      <OutputBlock output={output} onCopy={copy} copied={copied} />

      {/* Event Collection — always visible so the stacking workflow is discoverable from scratch */}
      <div style={{ marginTop: 16, background: "#1a1a2e", border: `1px solid ${eventCollection.length > 0 ? "#2a6a2a" : "#2a2a4e"}`, borderRadius: 8, padding: 16 }}>
        <div style={{ color: eventCollection.length > 0 ? "#44cc88" : "#7b8cde", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
          {eventCollection.length > 0
            ? `Events File — ${eventCollection.reduce((acc, e) => acc + Object.keys(e.entries).length, 0)} event(s) across ${eventCollection.length} map(s)`
            : "Events File — empty"}
        </div>
        {eventCollection.length === 0 ? (
          <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.6 }}>
            No events added yet. Build your first event above, hit <span style={{ color: "#44cc88" }}>＋ Add this event to the file</span>, then <span style={{ color: "#44cc88" }}>↻ Start next event</span> and build another. Each one you add stacks here into a single <code style={{ color: "#cc9944" }}>Regular_Events.json</code> or <code style={{ color: "#cc9944" }}>Marriage_Events.json</code> — no need to load an existing file first.
          </div>
        ) : (
          <>
          {eventCollection.map((e, i) => (
            <div key={i} style={{ marginBottom: 8, background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 4, padding: "8px 12px" }}>
              <div style={{ color: "#7b8cde", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{e.target}</div>
              {Object.keys(e.entries).map(k => {
                const evtId = k.split("/")[0];
                return (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0" }}>
                    <code style={{ color: "#9aa0c0", fontSize: 11 }}>{k.length > 60 ? k.slice(0,60) + "..." : k}</code>
                    <button onClick={() => removeFromCollection(evtId)} style={{ background: "none", border: "none", color: "#cc4444", cursor: "pointer", fontSize: 11 }}>remove</button>
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <Btn primary onClick={() => downloadCollection("Regular_Events.json")}>⬇ Regular_Events.json</Btn>
            <Btn onClick={() => downloadCollection("Marriage_Events.json")}>⬇ Marriage_Events.json</Btn>
            <Btn small onClick={copyCollection}>{collectionCopied ? "✓ Copied" : "Copy All"}</Btn>
            <Btn danger small onClick={() => { setEventCollection([]); setCollectionMsg("Collection cleared."); }}>Clear All</Btn>
          </div>
          </>
        )}
      </div>

      {output && (
        <div style={{ marginTop: 20, background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: 16 }}>
          <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
            Add Event to Existing JSON
          </div>
          <div style={{ color: "#9aa0c0", fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>
            Upload your <code style={{ color: "#cc9944" }}>Regular_Events.json</code> or <code style={{ color: "#cc9944" }}>Marriage_Events.json</code>.
            The new event will be merged into the correct target block — existing events are preserved.
            Same-target blocks are merged, new targets are appended.
          </div>
          <input ref={mergeRef} type="file" accept=".json" onChange={handleMergeUpload} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <Btn onClick={() => mergeRef.current.click()}>Upload Target JSON</Btn>
            {mergeFile && <Btn primary onClick={handleMerge}>Merge Event In</Btn>}
            {mergeMsg && (
              <span style={{ fontSize: 12, color: mergeMsg.startsWith("Merged") ? "#44cc44" : mergeMsg.startsWith("Loaded") ? "#7b8cde" : "#cc4444" }}>
                {mergeMsg}
              </span>
            )}
          </div>

          {mergedOutput && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#44cc44", fontSize: 13, fontWeight: 600 }}>✓ Merged — ready to download</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn small onClick={() => { copyText(mergedOutput).then(ok => { if (ok) { setMergedCopied(true); setTimeout(() => setMergedCopied(false), 2000); } }); }}>
                    {mergedCopied ? "✓ Copied" : "Copy"}
                  </Btn>
                  <Btn primary small onClick={downloadMerged}>Download {mergeFileName}</Btn>
                </div>
              </div>
              <pre style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 6, padding: 14, fontSize: 11, color: "#c0c8e0", overflow: "auto", maxHeight: 300, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {mergedOutput.substring(0, 1000)}{mergedOutput.length > 1000 ? "\n... (" + mergedOutput.length + " chars total)" : ""}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// GUIDE TAB
// ═══════════════════════════════════════════════
function Guide() {
  const [sub, setSub] = useState("overview");
  const [issueView, setIssueView] = useState("active");

  const GUIDE_TABS = [
    { id: "overview",   label: "Overview" },
    { id: "workflow",   label: "Workflow" },
    { id: "fields",     label: "Fields" },
    { id: "commands",   label: "Commands" },
    { id: "forks",      label: "Forks" },
    { id: "structure",  label: "File Structure" },
    { id: "tips",       label: "Tips" },
    { id: "issues",     label: "Known Issues" },
  ];

  const card  = { background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: 16, marginBottom: 20 };
  const secLbl = { color: "#7b8cde", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 };

  const ISSUES = [
    { sev: "softlock", title: "Missing fork → unbreakable dialogue loop",
      body: "If a $r response is selectable but the matching fork command for that branch isn't there, the game looks for a branch to run, finds nothing, and loops the dialogue. Warping to a new scene with debug does NOT clear it — the broken state carries over. The only way out is closing the game entirely.",
      fix: "Every branching $r response needs its matching fork <responseId> <branchKey> command, and that branch key must exist as an entry. Check that each fork line is present and spelled exactly." },
    { sev: "softlock", title: "$r key doesn't match a registered dialogue key",
      body: "The $r points at a dialogue key that doesn't exist in the speaking character's Characters/Dialogue block (typo, renamed, or never registered). The memory token can't resolve. Same result — loop, force-quit.",
      fix: "Every $r key must exist in the Dialogue block of the character who speaks it. The Event Builder locks these keys by default — only edit through the Advanced toggle, and update the matching $r if you do." },
    { sev: "wrong", title: "Fork doesn't follow parameter → defaults to first response",
      body: "If a fork exists but its parameters are malformed, it quietly defaults to the first working response. The player picks 'refuse' and gets the 'accept' branch. The game keeps running but the choice didn't matter.",
      fix: "Check fork parameter order and that the response ID matches the $r it belongs to." },
    { sev: "duplicate", title: "Line plays twice — branch speaks a line ValleyTalk already delivers (VT on only)",
      body: "With ValleyTalk ON, a fork's $r key does double duty: registered in Characters/Dialogue AND naming the branch scene. Picking that option makes VT speak the line, then the branch runs — if the branch also speaks that line, it plays twice. With VT OFF the branch speak is the only delivery.",
      fix: "When ValleyTalk is on, don't put a speak of the same line in the branch — VT delivers it from the $r key. Keep the branch's other actions (pause, friendship, emote, end) and drop the redundant speak." },
  ];

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 20, borderBottom: "1px solid #2a2a4e" }}>
        {GUIDE_TABS.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{
            background: sub === t.id ? "#1a1a3a" : "transparent",
            border: "1px solid", borderColor: sub === t.id ? "#4a4a9e" : "transparent",
            borderBottom: sub === t.id ? "1px solid #4a4a9e" : "1px solid transparent",
            color: sub === t.id ? "#e0e0ff" : "#7b8cde",
            padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: sub === t.id ? 700 : 400,
            borderRadius: "6px 6px 0 0", fontFamily: "inherit",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ─── OVERVIEW ─── */}
      {sub === "overview" && (
        <div>
          <div style={card}>
            <div style={secLbl}>What is the Scene Builder?</div>
            <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>
              The <strong style={{ color: "#7b8cde" }}>Scene Builder</strong> is a Content Patcher event generator for Stardew Valley NPC mods. It handles the full event structure — preconditions, scene setup, scene commands, dialogue forks, branch scenes, and ValleyTalk routing — and exports drop-in JSON. The Coordinate Picker is built into the same tool so tile positions flow directly into your scene setup with no copy-paste step.
            </div>
            <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8, marginTop: 10 }}>
              Events are generated into a running <strong style={{ color: "#e0e0f0" }}>session</strong>. Every Generate merges the current event into the accumulated output — switch events, generate again, and both appear in the output. Load a file first and the session seeds from it. <strong style={{ color: "#e0e0f0" }}>Clear Session</strong> (the red button next to Generate) resets everything.
            </div>
          </div>
          <div style={card}>
            <div style={secLbl}>The Godly Hand Suite</div>
            {[
              { name: "Scene Builder (this tool)", body: "Builds complete Content Patcher events — preconditions, scene commands, forks, branch scenes, ValleyTalk routing — and generates JSON you drop straight into your mod. The only event builder for Stardew Valley with real fork support." },
              { name: "Animation Builder", body: "Upload a spritesheet (64px wide, 16×32 frames, 4 per row numbered from 0). Click frames in play order, set speed and loop, preview at game speed, export Animations.json. Speed is in ticks — the game divides by 10 for ms/frame, so 1000 ticks = 100ms/frame." },
              { name: "Debug Commands", body: "Generate the exact 'patch reload <UniqueID>' SMAPI console line to hot-reload your mod. Search your event files by ID, map, or NPC and get the in-game debug command to trigger that event without grinding preconditions." },
              { name: "Coordinate Picker", body: "Load your .tbin or .tmx map plus its tilesheet PNGs. Hover to see live X/Y. Click to save a tile with a label, folder, and facing direction. Saved tiles appear in position pickers inside the Event Builder automatically — same session, no export." },
            ].map((t, i) => (
              <div key={i} style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{t.name}</div>
                <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>{t.body}</div>
              </div>
            ))}
            <div style={{ color: "#555577", fontSize: 11, marginTop: 6 }}>All tools run entirely in your browser. Nothing installs, nothing uploads, nothing leaves your device. Requires Content Patcher in-game to load the generated JSON.</div>
          </div>
        </div>
      )}

      {/* ─── WORKFLOW ─── */}
      {sub === "workflow" && (
        <div style={card}>
          <div style={secLbl}>Step-by-step</div>
          {[
            { n:"1", title:"Save your coordinates first",
              body:"Before building the event, go to the Coordinate Picker tab, load your map and its tilesheet PNGs, and click the tiles you need — viewport anchor, farmer start, NPC starts. Give each one a label and a facing direction. Saved tiles show up in the 📍 pickers inside the Event Builder automatically for the whole session." },
            { n:"2", title:"Set trigger conditions",
              body:"Fill in Event ID (or click Generate for a free ID in the 9871000+ band), Prereq Event ID if this event needs another to fire first, Map Name, friendship gates, day/time windows, and relationship flags. These become the slash-separated precondition key." },
            { n:"3", title:"Set up the scene",
              body:"Choose music (or none), set the viewport tile, and place the farmer and any NPCs with their starting positions and directions. Use the 📍 picker on each field to pull in a saved coordinate. If your scene should start on a black screen, set viewport to -1000 -1000 and reveal it mid-scene with a viewport command — see Tips." },
            { n:"4", title:"Write scene commands",
              body:"Add commands using the command palette buttons (speak, move, emote, animate, etc.). In Safe Edit mode each command appears as a clickable line — click to reopen its builder pre-filled, edit, and overwrite in place. Switch to Direct Syntax for raw text editing. One command per line, no / separators." },
            { n:"5", title:"Add forks if needed",
              body:"Check Using Forks to expand the fork section. Add at least two options — each needs a Fork Key (the branch scene name), a Choice Label (what the player sees on the button), and Branch Scene Commands (the mini-scene that runs for that choice). Check Using ValleyTalk if your NPC uses VT memory." },
            { n:"6", title:"Generate and accumulate",
              body:"Click Generate Event JSON. The output merges into the session — prior events stay. Switch to a different event and Generate again; both appear in the output. The green note shows the session count. Copy or download when done. Clear Session resets." },
            { n:"7", title:"Test in-game",
              body:"Use the Debug Commands tool to get the SMAPI console line to trigger your event directly without grinding. If something loops, flashes, or plays twice — check Known Issues and Tips." },
          ].map(step => (
            <div key={step.n} style={{ display: "flex", gap: 16, marginBottom: 14 }}>
              <div style={{ minWidth: 28, height: 28, borderRadius: "50%", background: "#1a1a3a", border: "1px solid #4a4a9e", color: "#7b8cde", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{step.n}</div>
              <div style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 8, padding: "12px 14px", flex: 1 }}>
                <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{step.title}</div>
                <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>{step.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── FIELDS ─── */}
      {sub === "fields" && (
        <div>
          {[
            { title: "Trigger Conditions", fields: [
              { label: "Event ID", body: "A unique number identifying this event. Click Generate to get a free ID in the 9871000+ band — the tool checks your loaded file, session, and all IDs generated this session and picks the next available. Never pick one by hand; vanilla IDs go into the tens of millions. The tool blocks vanilla ID conflicts on generate." },
              { label: "Prereq Event ID", body: "Optional /e precondition — this event only fires after the player has seen the event with this ID. Use the dropdown to pick from events in your loaded file. Leave blank for no prerequisite." },
              { label: "Map Name", body: "The location where the event triggers. Must match a Stardew Valley Data/Events/<Map> target exactly (e.g. Saloon, Mountain, Town, Hospital, Woods, Beach, FarmHouse, SeedShop, ScienceHouse, JoshHouse, BusStop, ManorHouse). Case-sensitive." },
              { label: "NPC Name", body: "The primary friendship NPC for the /f precondition. This NPC's heart count gates the event." },
              { label: "Hearts Required", body: "How many hearts with the NPC above are required. Converted at 250 points per heart (8 hearts = 2000 points). Becomes the /f <NPC> <points> value in the event key." },
              { label: "Extra Friendship", body: "Additional NPCs and heart requirements on the same /f segment. All friendship gates are space-separated on one /f — not split into multiple /f slashes." },
              { label: "Days of Week", body: "Mon Tue Wed Thu Fri Sat Sun checkboxes. The DayOfWeek precondition — only fires on checked days. Leave all unchecked for any day." },
              { label: "Time Start / End", body: "The /t window in 24-hour game time. 600 = 6am, 1800 = 6pm, 2400 = midnight (hard cap). Example: 2200 to 2400 = late night only." },
              { label: "Weather", body: "Optional /w filter. Sun = clear, Rain = any rain or thunderstorm, Wind = debris day." },
              { label: "Require Dating / Spouse", body: "Relationship flags. Dating fires only while dating the NPC; Spouse fires only after marriage. Mutually exclusive — checking both is a validation error." },
            ]},
            { title: "Scene Setup", fields: [
              { label: "Music", body: "Background track for the scene — the first positional segment of the event script. Use none for silence. Common tracks: playful, desolate, grandpas_theme, elliottPiano, Saloon1, MusicBoxSong. If omitted, every following segment shifts left and the engine misreads the camera as music — this slot is required even when silent." },
              { label: "Viewport X / Y", body: "The tile the camera centers on at scene start. Two integers directly after the music segment. Leave blank for follow (camera follows the farmer). Set to -1000 -1000 to start the scene with a black screen — the camera is in the void so nothing renders. Use a viewport [x] [y] command mid-scene to reveal it." },
              { label: "Farmer X / Y / Dir", body: "Farmer's starting tile and facing direction. Direction: 0 = up, 1 = right, 2 = down, 3 = left. Appears first in the positions segment." },
              { label: "NPC rows", body: "NPCs present at scene start. Name must match the NPC's internal ID exactly (Nicholas, Harvey, Robin, etc.). All actors go on one space-separated positions line in the engine. Order them here as needed — the tool assembles the line correctly." },
            ]},
            { title: "Scene Commands Area", fields: [
              { label: "Safe Edit mode", body: "Default. Each command appears as a clickable line. Click a line to reopen its builder pre-filled — edit the fields and click Overwrite to replace it in place. Use the ▲ ▼ arrows to reorder commands; they skip blank lines and grey out at the top/bottom. Click ⧉ to copy a line to the clipboard and paste it elsewhere with ⤵." },
              { label: "Direct Syntax mode", body: "Raw text box. One command per line, no / separators — the tool packs them on generate. Use this for pasting blocks of commands or for commands the builder forms don't support. Your text is preserved when switching back to Safe Edit." },
              { label: "Command palette", body: "Buttons for every supported command (speak, move, emote, animate, faceDirection, warp, pause, and more). Each opens a labeled fill-in form with a live preview. Position fields have a 📍 picker for saved coordinates. The animate form has a 🎞 frame picker — load the spritesheet, click frames in order, preview at speed." },
              { label: "Scene End section", body: "Only visible when Using Forks is unchecked. Choose end (day continues) or end newDay (rolls to next morning). Two words — not endNewDay." },
            ]},
            { title: "Fork / Choice Block", fields: [
              { label: "Using Forks (checkbox)", body: "Opens the entire fork section. When unchecked, forks are cleared and hidden — the Scene End section handles the terminator. Auto-checked when loading an event that already has forks." },
              { label: "Using ValleyTalk (checkbox)", body: "When on, each fork's response key is registered in the speaking character's Characters/Dialogue block. Required for NPC memory via ValleyTalk. Without it, VT crashes on the response (KeyNotFound). With it off, dialogue goes in the branch scene instead." },
              { label: "Question NPC", body: "The NPC who poses the $q question. Their dialogue file receives the VT response key registrations by default (each fork can override with Speaking Character)." },
              { label: "Question Text", body: "The text of the question shown before the player's options. No / or newlines inside — they break the $q command structure and corrupt the options after them." },
              { label: "Fork Key", body: "The branch scene key — the name of the sibling Data/Events entry that runs when the player picks this option. Named descriptively (e.g. nick_serenade_home). Must be unique. The Response ID shown next to it (locked) is the $r identifier the engine generates from your Event ID + option index." },
              { label: "Choice Label", body: "The text on the button the player sees. Keep it short. Never include $ tokens — a $ in an answer label is read as a dialogue command, breaks the choice binding, and makes the question loop forever with no error. See Known Issues." },
              { label: "Dialogue Key", body: "The $r link target. Auto-mirrors the Fork Key by default and is locked to prevent desync. Check Advanced to unlock for a custom key (e.g. pointing at an existing dialogue entry). If you unlock it, changing the Fork Key will NOT update this automatically — change both manually." },
              { label: "Speaking Character", body: "Which NPC's Characters/Dialogue block receives this fork's response key. Defaults to the Question NPC. Override here if a different character delivers this branch's line through VT." },
              { label: "Dialogue Content", body: "ValleyTalk ON: the NPC's spoken response for this branch, registered under the response key. Leave blank for a silent reaction — VT logs the choice but shows no text (valid, not a defect). ValleyTalk OFF: not used; put dialogue in Branch Scene Commands instead." },
              { label: "Friendship NPC / Amount", body: "Quick friendship shortcut for simple branches. Only used when Branch Scene Commands is empty — if you write branch commands, add friendship there instead. Positive = gain, negative = loss. 250 = 1 heart." },
              { label: "Branch Scene Commands", body: "The full mini-scene for this choice. Same format as the main scene — one command per line, no / separators. Takes over completely if anything is written here (helper fields above are ignored). The end terminator is added automatically — don't write it." },
              { label: "End newDay (per branch)", body: "When checked, this branch ends with end newDay (rolls to next morning) instead of end. In a forked event the main scene can't end the day — day-end lives here on the branch. Each branch has its own setting." },
            ]},
          ].map((section, si) => (
            <div key={si} style={card}>
              <div style={secLbl}>{section.title}</div>
              {section.fields.map((f, fi) => (
                <div key={fi} style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                  <div style={{ color: "#cc9944", fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{f.label}</div>
                  <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>{f.body}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ─── COMMANDS ─── */}
      {sub === "commands" && (
        <div style={card}>
          <div style={secLbl}>Scene Command Reference</div>
          <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8, marginBottom: 14 }}>
            One command per line. No <code style={{ color: "#cc9944" }}>/</code> separators — the tool packs them on generate. Directions: <code style={{ color: "#cc9944" }}>0</code> = up, <code style={{ color: "#cc9944" }}>1</code> = right, <code style={{ color: "#cc9944" }}>2</code> = down, <code style={{ color: "#cc9944" }}>3</code> = left. Actor is <code style={{ color: "#cc9944" }}>farmer</code> or the NPC's internal name.
          </div>
          {[
            { cmd: "pause [ms]", body: "Wait the given milliseconds before the next command. Used constantly to give scenes pacing and breathing room." },
            { cmd: 'speak [NPC] "[text]"', body: 'Dialogue box with the NPC\'s portrait. Text ends with a portrait token: $0 neutral, $1 happy, $2 sad, $3 angry/side-eye, $4 surprised, $5 shocked. Use #$b# to break into a second box. Example: speak Nicholas "I\'ll be back later.$1"' },
            { cmd: 'message "[text]"', body: "Black message box with no portrait — for narration and description. No NPC name needed. Example: message \"He fell asleep against the stone.\"" },
            { cmd: "faceDirection [actor] [dir]", body: "Turn the actor to face a direction without moving. Example: faceDirection Nicholas 2" },
            { cmd: "move [actor] [x] [y] [dir]", body: "Move the actor by a tile delta (not destination). Negative x = left, negative y = up. dir is the facing after the move. Add true as a fifth arg to run in parallel with the next command (async). Example: move farmer 0 -3 0 or move Nicholas 5 0 1 true" },
            { cmd: "emote [actor] [id]", body: "Emote bubble above the actor. Common IDs: 4 = exclamation, 8 = musical note, 16 = anger, 20 = heart, 24 = sleep/content, 28 = sadness, 32 = happiness, 40 = question, 56 = surprise, 60 = gift/laugh. Example: emote Nicholas 24" },
            { cmd: "animate [actor] [flip] [loop] [speed] [frames...]", body: "Play a frame sequence from the actor's spritesheet. flip = false/true (mirror), loop = false/true, speed in ms per frame. Frames are zero-indexed from the sheet. Runs until stopAnimation. Example: animate Nicholas false true 400 44 45 46 47" },
            { cmd: "stopAnimation [actor]", body: "Stop a running animate and return the actor to idle. Example: stopAnimation Nicholas" },
            { cmd: 'textAboveHead [actor] "[text]"', body: "Floating text above the actor's head — not a dialogue box, no portrait. Good for short muttered asides. Example: textAboveHead Nicholas \"...\"" },
            { cmd: "warp [actor] [x] [y]", body: "Teleport the actor to a tile instantly. Example: warp farmer 10 20" },
            { cmd: "fade", body: "Screen fade command. Behavior is still being documented — use in-game testing to verify results for your specific use case." },
            { cmd: "globalFade", body: "Screen fade command. Behavior is still being documented — use in-game testing to verify results for your specific use case." },
            { cmd: "viewport [x] [y]", body: "Move the camera to a new tile mid-scene. Use this to reveal a scene that started at -1000 -1000, or to pan to a different area. Example: viewport 46 87" },
            { cmd: "playSound [cue]", body: "Play a sound effect. Uses internal game cue names. Examples: playSound coin, playSound healSound, playSound hammer, playSound crickets, playSound waterSlosh, playSound fishSlap, playSound wind" },
            { cmd: "playMusic [track]", body: "Change background music mid-scene (different from the scene header's music slot). Example: playMusic grandpas_theme" },
            { cmd: "friendship [NPC] [amount]", body: "Add or subtract friendship points. 250 = 1 heart. Negative removes. Example: friendship Nicholas 250 or friendship Nicholas -250" },
            { cmd: "addTemporaryActor [id] [w] [h] [x] [y] [dir] [isMonster] [layer]", body: "Spawn an actor for the scene only — not from the positions header. For standard NPCs: width 16, height 32, isMonster false, layer Character. Example: addTemporaryActor Nicholas 16 32 22 19 0 false Character" },
            { cmd: "end", body: "End the scene and return the player to normal gameplay. Required on every scene and branch." },
            { cmd: "end newDay", body: "End the scene and roll to the next morning. Two words — not endNewDay. In a forked event this goes on each branch that needs it, not the main scene." },
          ].map((c, i) => (
            <div key={i} style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
              <code style={{ color: "#cc9944", fontWeight: 700, fontSize: 12, display: "block", marginBottom: 4 }}>{c.cmd}</code>
              <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>{c.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── FORKS ─── */}
      {sub === "forks" && (
        <div>
          <div style={card}>
            <div style={secLbl}>How forks work</div>
            <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8, marginBottom: 14 }}>
              A fork lets the player make a choice. The scene pauses at a <code style={{ color: "#cc9944" }}>$q</code> question, presents 2–4 options via <code style={{ color: "#cc9944" }}>$r</code> response lines, and the player picks one. A <code style={{ color: "#cc9944" }}>fork</code> command maps each response ID to a branch scene. The branch runs like a mini-scene and ends with its own terminator. The tool builds all of this from the Fork UI — you don't write $q/$r/fork by hand.
            </div>
            {[
              { title: "The $q command (built automatically)",
                code: 'speak NPC "$q <eventId> null #<question>$0#$r <id>0 0 <key>#<label>#$r <id>1 0 <key>#<label>"',
                body: "Embedded inside a speak command. The question ID is the event ID. Each $r block is one option. Portrait tokens ($0, $1…) are valid in the question text; never in the choice label." },
              { title: "The fork command (built automatically)",
                code: "fork <responseId> <branchKey>",
                body: "One fork line per option, written after the $q speak. The response ID is the event ID concatenated with the option index — event 9871001 option 0 → response ID 98710010. The branch key is the sibling Data/Events entry name that runs for that choice." },
              { title: "Branch scenes",
                body: "Each branch key is its own entry in Data/Events/<Map> — a sibling of the parent event at the same level, not nested inside it. Same command format as the main scene. Ends with end or end newDay. Generated automatically from the Branch Scene Commands field." },
              { title: "Minimum two options",
                body: "The game's question box requires at least two $r options to register a selection. With only one option, the player picks it but the game never sets the chosen-answer state — the fork never fires and the question loops silently. Always use at least two. The syntax checker blocks one-option questions." },
              { title: "Response IDs are locked",
                body: "The Response ID shown on each fork option (e.g. 98710010) is derived from your Event ID + option index and is locked in the UI. It's used in both the $r line and the fork command — they must match exactly. If you change the Event ID, regenerate from scratch rather than editing the response IDs by hand." },
            ].map((item, i) => (
              <div key={i} style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{item.title}</div>
                {item.code && <code style={{ color: "#cc9944", fontSize: 11, display: "block", marginBottom: 6, whiteSpace: "pre-wrap" }}>{item.code}</code>}
                <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>{item.body}</div>
              </div>
            ))}
          </div>
          <div style={card}>
            <div style={secLbl}>ValleyTalk routing</div>
            <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8, marginBottom: 14 }}>
              ValleyTalk gives your NPC AI memory of what happened. For forked events, the <code style={{ color: "#cc9944" }}>$r</code> dialogue key is the memory token — it records which branch the player took. This requires the key to exist in the NPC's <code style={{ color: "#cc9944" }}>Characters/Dialogue</code> block before the event fires.
            </div>
            {[
              { title: "ValleyTalk ON",
                body: "Each fork's $r key is written to the speaking character's Characters/Dialogue block. When the player picks that option, VT reads the key and speaks the registered dialogue (or does a silent portrait reaction if blank). The branch then runs. The keys preview in the fork section shows exactly what gets registered and for which character." },
              { title: "ValleyTalk OFF",
                body: "No Characters/Dialogue registration. The $r key still drives the fork, but VT won't read it. Dialogue goes in the Branch Scene Commands as a speak command — the branch is the only delivery." },
              { title: "Silent reactions (blank Dialogue Content)",
                body: "Leave Dialogue Content blank for a silent reaction — VT logs which branch ran, no text is shown. The engine writes a single-space value to Characters/Dialogue, which is valid. Portrait expressions and emotes still work in the branch scene." },
              { title: "Dialogue Key lock",
                body: "Locked by default so the $r key and the Characters/Dialogue registration always match. Check Advanced to unlock for a custom key (e.g. pointing at a pre-existing entry). If you unlock and change the Fork Key, the Dialogue Key does NOT follow — update both manually. A mismatch is a softlock." },
              { title: "Speaking Character per fork",
                body: "Each fork option can register its key in a different NPC's dialogue block. Set Speaking Character to override the Question NPC for that option — useful when different characters respond to different choices." },
            ].map((item, i) => (
              <div key={i} style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{item.title}</div>
                <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>{item.body}</div>
              </div>
            ))}
            <div style={{ marginTop: 10, background: "#1a120a", border: "1px solid #4a3a0a", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ color: "#cc9944", fontSize: 11, lineHeight: 1.7 }}>
                <strong>Removing ValleyTalk:</strong> Uncheck Using ValleyTalk and regenerate to ship without VT registration. To strip VT from an entire session output, use the <strong>✂ Remove ValleyTalk</strong> button in the output area — it drops all ValleyTalk/* blocks and removes $r response keys from Characters/Dialogue. Event scripts are untouched.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── FILE STRUCTURE ─── */}
      {sub === "structure" && (
        <div style={{ ...card, border: "1px solid #2a4a6a" }}>
          <div style={{ color: "#7bb0ee", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>How event files are structured</div>
          <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>
            Events are grouped by location. Each map gets one <code style={{ color: "#cc9944" }}>EditData</code> block targeting <code style={{ color: "#cc9944" }}>Data/Events/&lt;Map&gt;</code>. Every event and its fork branches for that map live inside the same Entries object. Branch scenes are siblings of the parent event — same level, not nested. Events can chain across locations with the <code style={{ color: "#cc9944" }}>e &lt;id&gt;</code> precondition. The tool preserves all of this when it merges — no keys are moved between blocks and no branch siblings are dropped.
          </div>

          <div style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 8, padding: "12px 14px", marginTop: 14 }}>
            <div style={{ color: "#7bb0ee", fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Event key — precondition format</div>
            <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>
              <code style={{ color: "#cc9944" }}>{"<id>/e <prereqId>/DayOfWeek Mon Wed/f <NPC> <pts> <NPC2> <pts2>/t <start> <end>/w <weather>/Dating <NPC>"}</code>
              <br /><br />
              All segments are optional except the ID. Multiple NPCs share one <code style={{ color: "#cc9944" }}>/f</code> — they are space-separated, not split into multiple /f slashes. Hearts convert to points at 250 each.
              <br /><br />
              <strong style={{ color: "#e0e0f0" }}>e</strong> — prerequisite event ID<br />
              <strong style={{ color: "#e0e0f0" }}>DayOfWeek</strong> — full day names (Mon Tue Wed Thu Fri Sat Sun)<br />
              <strong style={{ color: "#e0e0f0" }}>f</strong> — friendship gate; 1 heart = 250 pts, 8 hearts = 2000<br />
              <strong style={{ color: "#e0e0f0" }}>t</strong> — time window, 24-hr game time, hard cap 2400<br />
              <strong style={{ color: "#e0e0f0" }}>w</strong> — weather: Sun, Rain, Wind<br />
              <strong style={{ color: "#e0e0f0" }}>Dating / Spouse</strong> — relationship flags (not /h or /p)
            </div>
          </div>

          <div style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 8, padding: "12px 14px", marginTop: 12 }}>
            <div style={{ color: "#7bb0ee", fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Event script — fixed segment order</div>
            <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>
              <code style={{ color: "#cc9944" }}>{"<music>/<viewport x y>/<positions>/<commands...>/end"}</code>
              <br /><br />
              <strong style={{ color: "#e0e0f0" }}>music</strong> — track name or <code style={{ color: "#cc9944" }}>none</code>. Required positional slot even when silent — if omitted, everything after shifts left and the engine misreads the camera tile as music.<br />
              <strong style={{ color: "#e0e0f0" }}>viewport x y</strong> — the camera tile. Use <code style={{ color: "#cc9944" }}>follow</code> for farmer-following camera. Use <code style={{ color: "#cc9944" }}>-1000 -1000</code> to start black.<br />
              <strong style={{ color: "#e0e0f0" }}>positions</strong> — starts with an actor name, not a number: <code style={{ color: "#cc9944" }}>farmer X Y dir NPC X Y dir...</code>. One space-separated line. The most common hand-written mistake is starting with integers instead of a name.<br />
              <strong style={{ color: "#e0e0f0" }}>commands</strong> — slash-delimited actions.<br />
              <strong style={{ color: "#e0e0f0" }}>end</strong> — required. <code style={{ color: "#cc9944" }}>end newDay</code> (two words) rolls to morning. Forked events: end lives on each branch, not the main scene.
            </div>
          </div>

          <div style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 8, padding: "12px 14px", marginTop: 12 }}>
            <div style={{ color: "#7bb0ee", fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>ValleyTalk dialogue structure</div>
            <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>
              Fork response keys go in <code style={{ color: "#cc9944" }}>Characters/Dialogue/&lt;NPC&gt;</code> as EditData entries — one block per speaking character. A blank value <code style={{ color: "#cc9944" }}>" "</code> is a valid silent reaction, not an error. ValleyTalk/* blocks (bios, relationships, traits) are separate target paths entirely and have their own structure defined by the VT mod.
            </div>
          </div>

          <div style={{ background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 8, padding: "12px 14px", marginTop: 12 }}>
            <div style={{ color: "#7bb0ee", fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Coordinate .txt format</div>
            <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>
              The Coordinate Picker exports and re-imports saved tiles as plain text. Indentation is exact:
              <br /><br />
              <code style={{ color: "#cc9944", whiteSpace: "pre-wrap", display: "block", lineHeight: 1.5 }}>{"── TOWN ─────────────\n  Robin entrance\n    Map: Town   X: 23   Y: 49   Dir: 0"}</code>
              <br />
              Folder header starts with <code style={{ color: "#cc9944" }}>── </code>. Labels: 2-space indent. Detail lines: 4+ spaces. Dir is optional; missing or — reads as 0. Folders with matching names merge on import (case-insensitive).
            </div>
          </div>
        </div>
      )}

      {/* ─── TIPS ─── */}
      {sub === "tips" && (
        <div>
          {[
            { title: "⚠ Starting a scene black — the -1000 -1000 trick", warn: true,
              body: "Set the viewport to -1000 -1000 in the Scene Setup header to start a scene with a black screen. The camera sits in the void so nothing renders from the first frame. Use a viewport [x] [y] command mid-scene to snap the camera to where you need it.\n\nAlternatively, any sufficiently far-off-screen viewport position works the same way — -1000 -1000 is the clean convention for it." },
            { title: "Session workflow",
              body: "Every Generate merges into the session — it doesn't replace the previous output. Load a file first and the session seeds from it (all existing events preserved). Generate event A, then switch to event B and Generate again — both appear in the output. The green note shows the count. Clear Session (the red button next to Generate) wipes everything and resets to null." },
            { title: "Getting a free Event ID",
              body: "Click Generate next to the Event ID field. The tool scans your loaded file, the current session, and all IDs generated this session, then returns the next available ID in the 9871000+ band. Don't pick IDs by hand — vanilla event IDs cover a wide and non-contiguous range, and the tool checks against a known list." },
            { title: "Save coordinates before you start",
              body: "Open the Coordinate Picker tab, load your map and tilesheet PNGs, click the tiles you need, and save them with labels. The 📍 picker on every position field in the Event Builder shows your saved tiles grouped by folder — click one and X, Y, and Dir fill in. Saved tiles persist for the whole browser session." },
            { title: "Direction reference",
              body: "0 = up (north), 1 = right (east), 2 = down (south), 3 = left (west). Used in position headers, faceDirection, move, and warp." },
            { title: "The ## double-hash",
              body: '## inside a speak command is an implicit $b — it breaks into a second dialogue box. Equivalent to #$b# and is valid vanilla syntax. Example: speak Nicholas "I\'ll be back later.$1##And don\'t wait up.$0"' },
            { title: "Safe Edit for editing without breaking structure",
              body: "If a command line is highlighted in blue in Safe Edit, clicking it opens the builder pre-filled. Edit the fields and click Overwrite. The ▲ ▼ arrows reorder without cut-and-paste. Grey lines are non-editable in Safe Edit — switch to Direct Syntax to edit those by hand." },
            { title: "Syntax checker",
              body: "Click Check Syntax Before Generating to run the event through the checker. It catches: vanilla ID conflicts, missing end, end newDay on a forked main scene, duplicate fork keys, $ tokens in answer labels, one-option questions, slash or newline in question text. Errors block generation. Warnings are advisory." },
            { title: "Branch helper fields vs Branch Scene Commands",
              body: "Each fork has both helper fields (Dialogue Content, Friendship, Emote) and a Branch Scene Commands box. Branch Scene Commands takes over completely if anything is written there — the helper fields are ignored and the terminator is appended after your commands. Use helpers for simple branches; use Branch Scene Commands for anything that needs real scene work." },
            { title: "move: async parallel movement",
              body: "Add true as a fifth argument to move to run it in parallel with the next command. Example: move Nicholas 3 0 1 true — Nicholas walks right while the next command executes simultaneously. Without true, the scene waits for the move to finish before continuing." },
            { title: "addTemporaryActor for mid-scene spawns",
              body: "If an NPC needs to appear mid-scene rather than from the start, use addTemporaryActor instead of listing them in the positions header. Format: addTemporaryActor [id] [w] [h] [x] [y] [dir] [isMonster] [layer]. Standard NPCs: width 16, height 32, isMonster false, layer Character." },
          ].map((tip, i) => (
            <div key={i} style={{ background: "#1a1a2e", border: `1px solid ${tip.warn ? "#4a3a0a" : "#2a2a4e"}`, borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
              <div style={{ color: tip.warn ? "#cc9944" : "#e0e0f0", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{tip.title}</div>
              <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8, whiteSpace: "pre-line" }}>{tip.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── KNOWN ISSUES ─── */}
      {sub === "issues" && (
        <div style={{ ...card, border: "1px solid #2a2a4e" }}>
          <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Known Issues</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {[["active","Active","#ee6666","#6a2020","#2a1010"],["watching","Watching","#ccaa44","#6a5020","#2a2410"],["resolved","Resolved","#44cc88","#2a6a2a","#0d2a1a"],["reference","Reference","#6aa8d8","#244a6a","#0a1420"]].map(([id,lbl,fg,bd,bg]) => (
              <button key={id} onClick={() => setIssueView(id)} style={{ background: issueView === id ? bg : "transparent", color: issueView === id ? fg : "#8a8aa8", border: "1px solid " + (issueView === id ? bd : "#2a2a4e"), borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: 1 }}>{lbl}</button>
            ))}
          </div>

          {issueView === "active" && (<div>
          <div style={{ color: "#ee6666", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>ValleyTalk Forks</div>
          <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8, marginBottom: 14 }}>
            ValleyTalk reads your events to give its AI memory of what happened. A forked event has more than one possible outcome — the player chose one. The <code style={{ color: "#cc9944" }}>$r</code> dialogue key is the memory token: it records which branch the player actually took, so the character remembers the right version. Because of that, the fork structure is fragile. Here's what breaks it and what each failure looks like.
            <br /><br />
            <em style={{ color: "#cc9944" }}>ValleyTalk's exact behavior is still being learned through live testing — more is discovered every day. Treat this as the current understanding, not gospel: if the game does something different from what's written here, trust the game and report it.</em>
          </div>
          {ISSUES.map((iss, i) => (
            <div key={i} style={{ background: "#0d0d1a", border: "1px solid " + (iss.sev === "softlock" ? "#6a2020" : "#6a5020"), borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: iss.sev === "softlock" ? "#ee6666" : "#ccaa44", background: iss.sev === "softlock" ? "#2a1010" : "#2a2410", border: "1px solid " + (iss.sev === "softlock" ? "#6a2020" : "#6a5020"), borderRadius: 4, padding: "2px 7px" }}>
                  {iss.sev === "softlock" ? "Softlock — force-quit" : iss.sev === "duplicate" ? "Duplicate line — VT on only" : "Wrong branch — recoverable"}
                </span>
              </div>
              <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{iss.title}</div>
              <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8, marginBottom: 8 }}>{iss.body}</div>
              <div style={{ background: "#1a1a2e", borderLeft: "3px solid #44cc44", padding: "6px 10px", borderRadius: "0 4px 4px 0" }}>
                <span style={{ color: "#7bcc8b", fontSize: 11, lineHeight: 1.6 }}><strong>Fix:</strong> {iss.fix}</span>
              </div>
            </div>
          ))}
          <div style={{ color: "#555577", fontSize: 11, marginTop: 4, lineHeight: 1.7 }}>
            Note: not every $r needs a fork. A $r that continues the main script inline (no separate branch) is fine without a matching fork command — forks are only for responses that split into their own scene.
          </div>
          </div>)}

          {issueView === "reference" && (
          <div style={{ background: "#0a1420", border: "1px solid #244a6a", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ color: "#6aa8d8", fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Reference — two namespaces and memory keys</div>
            <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>
              A forked event touches two completely different data targets, and they do not share rules:
              <br /><br />
              <strong style={{ color: "#e0e0f0" }}>Data/Events/[Location]</strong> — the event scripts (speak, $q, $r, fork, end). Vanilla event-syntax checks apply here, and only here.
              <br /><br />
              <strong style={{ color: "#e0e0f0" }}>Characters/Dialogue/[NPC]</strong> — the fork dialogue keys. NOT event scripts. Two valid flavors:
              <br />• <strong style={{ color: "#7bcc8b" }}>Blank <code style={{ color: "#cc9944" }}>" "</code></strong> — pure memory registration. Game records which choice was taken; nothing shown. Blank is correct, not a defect.
              <br />• <strong style={{ color: "#7bcc8b" }}>Text + portrait</strong> (e.g. ending <code style={{ color: "#cc9944" }}>$0</code>) — actual NPC dialogue shown for that branch.
              <br /><br />
              A single fork uses <strong style={{ color: "#e0e0f0" }}>two keys</strong> in two places, linked by the response ID: <code style={{ color: "#cc9944" }}>$r &lt;id&gt; 0 &lt;dialogueKey&gt;</code> points at the memory key in Characters/Dialogue; <code style={{ color: "#cc9944" }}>fork &lt;id&gt; &lt;branchKey&gt;</code> points at the branch scene in Data/Events.
              <br /><br />
              <strong style={{ color: "#6aa8d8" }}>Checker rule:</strong> route by Target. Data/Events → full event pass. Characters/Dialogue → blanks are fine; meaningful checks are "is this key referenced by a $r?" and "duplicate key?". Running event rules across a whole file throws false positives on every memory key.
            </div>
          </div>
          )}

          {issueView === "watching" && (
          <div>
            <div style={{ color: "#ccaa44", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Watching</div>
            <div style={{ color: "#9aa0c0", fontSize: 11, lineHeight: 1.7, marginBottom: 10 }}>
              Fixed in generation but not yet re-confirmed in-game from a from-scratch build. Stays here until a clean test moves it to Resolved.
            </div>
            <div style={{ background: "#1a1608", border: "1px solid #6a5020", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#ccaa44", background: "#2a2410", border: "1px solid #6a5020", borderRadius: 4, padding: "2px 7px" }}>Watching — fixed, pending in-game test</span>
              </div>
              <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Blank fork dialogue key crashed the game on load</div>
              <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>
                With a fork's Dialogue Key left blank, generation emitted <code style={{ color: "#cc9944" }}>$r &lt;id&gt; 0 #&lt;label&gt;</code> — an empty key slot. The game's dialogue parser expects three tokens before the <code style={{ color: "#cc9944" }}>#</code> (id, friendship, key); with the key missing it read past the end of the array and threw <code style={{ color: "#cc9944" }}>IndexOutOfRangeException</code>, and the whole event failed to load.
              </div>
              <div style={{ marginTop: 8, background: "#1a1a2e", borderLeft: "3px solid #44cc44", padding: "6px 10px", borderRadius: "0 4px 4px 0" }}>
                <span style={{ color: "#7bcc8b", fontSize: 11 }}><strong>Fix:</strong> The tool now fills blank Dialogue Keys from the Fork Key before emitting the $r line. The repair function (repairBlankForkKeys) also runs on output as a safety net for loaded events that had this problem before the fix.</span>
              </div>
            </div>
          </div>
          )}

          {issueView === "resolved" && (
          <div>
            <div style={{ color: "#44cc88", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Resolved</div>
            {[
              { title: "Safe Edit didn't pre-fill faceDirection (and most other commands)",
                body: "Clicking a scene line to edit it opened the builder blank or with stale values for every command except move — faceDirection, emote, warp, pause and others couldn't be edited in place. Cause: the shared command builder read the line's values only once when it first appeared and ignored later edits. Fixed by forcing the builder to rebuild fresh for each line opened." },
              { title: "Overwrite button did nothing for non-move commands",
                body: "After opening a faceDirection (or emote, warp, pause, etc.) line in Safe Edit, clicking Overwrite did nothing — no error, no change. Move worked because it uses a separate builder. Fixed by rebuilding the shared builder's submit to match move exactly." },
              { title: "Overwrite did nothing — actual cause: blocked confirm() in sandbox",
                body: "The previous diagnosis was wrong. The real cause was that doSubmit gated the overwrite on window.confirm(), and a sandboxed iframe silently swallows confirm/alert/prompt. confirm() returns false when blocked, so the handler bailed with no insert and no error. Fixed by removing confirm() entirely and replacing every swallowed alert() with inline messages. Standing rule: no window.confirm / alert / prompt anywhere in the tool." },
              { title: "$ portrait token in an answer label looped the question silently",
                body: "A choice label containing a $ token (e.g. a trailing $0) made the question re-ask forever with no error. $ in an answer label is read as a dialogue command, breaking the answer's binding to its response id. Fixed by scanning every label for $ tokens (syntax-checker error) plus a one-click Strip button." },
              { title: "Single-option question looped silently",
                body: "A $q question with exactly one $r answer never advanced — picking the only choice re-opened the question. The game's question box needs at least two options to register a selection. Fixed by requiring a minimum of two options; the syntax checker blocks one-option questions." },
              { title: "Loaded question ignored the Fork UI — added options became orphans",
                body: "On a loaded forked event, adding an option in the Fork UI minted a branch entry but never wired it into the question. Fixed three ways: the loader pulls in orphaned fork branches; regeneration rebuilds the question's $r choices from the Fork UI while preserving wording; and the dialogue key auto-mirrors the fork key unless Advanced is checked." },
              { title: "Stray slash inside the question broke the second option",
                body: "A newline in a label or question text became a stray '/' inside the $q string, splitting the question mid-way and losing the second option's fork line. Fixed by scrubbing newlines and slashes before assembly; on load, slashes inside quotes are removed first so a corrupted file re-stitches; orphaned $r entries are rebuilt from the rMap so they come back instead of vanishing." },
              { title: "File wouldn't load — raw line breaks in a value",
                body: "A hand-edited file was rejected on load because a value (a fork written across several lines) contained raw line breaks inside the JSON string — illegal JSON. Fixed by healing the file on load: raw newlines and tabs inside a string value are removed before parsing so the file opens. A note tells you to re-save." },
              { title: "end newDay didn't fire from a forked event's main scene",
                body: "Setting end newDay on the main event after the fork lines did nothing — commands after the fork don't run on the main thread. Fixed by moving end newDay onto the branch: each fork has its own End newDay checkbox, the main Scene End is hidden once forks exist, and the branch builder appends exactly one terminator." },
            ].map((item, i) => (
              <div key={i} style={{ background: "#0d2a1a", border: "1px solid #2a6a2a", borderRadius: 8, padding: "12px 14px", marginTop: i === 0 ? 0 : 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#44cc88", background: "#0d2a1a", border: "1px solid #2a6a2a", borderRadius: 4, padding: "2px 7px" }}>Fixed</span>
                </div>
                <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{item.title}</div>
                <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>{item.body}</div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// CREDITS TAB
// ═══════════════════════════════════════════════
function Credits() {
  const Link = ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#7b8cde", textDecoration: "none" }}>{children} ↗</a>
  );
  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Authors</div>
        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #2a2a4e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13 }}>Aerishiph</span>
            <span style={{ color: "#555577", fontSize: 11 }}>Creator · Designer · Tester</span>
          </div>
          <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.7 }}>
            Conceived and built Godly Hand out of frustration with existing NPC modding workflows.
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13 }}>Claude</span>
            <span style={{ color: "#555577", fontSize: 11 }}>Development Assistant · by Anthropic</span>
          </div>
          <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.7 }}>
            Assisted with engineering throughout development.
          </div>
        </div>
      </div>
      <div style={{ background: "#0a1a0a", border: "1px solid #2a4a2a", borderRadius: 8, padding: 16 }}>
        <div style={{ color: "#44cc88", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Part of Godly Hand</div>
        <div style={{ color: "#4a8a4a", fontSize: 12, lineHeight: 1.7 }}>
          → <Link href="https://www.nexusmods.com/stardewvalley/mods/47493">Coordinate Picker</Link>
          {" · "}
          <Link href="https://www.nexusmods.com/stardewvalley/mods/47496">Animation Builder</Link>
          {" · "}
          <Link href="https://www.nexusmods.com/stardewvalley/mods/47582">Debug Commands</Link>
        </div>
      </div>
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: 16, marginTop: 20 }}>
        <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>References</div>
        <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.7 }}>
          Music previews linked in the Play Sound picker are from a Stardew Valley soundtrack playlist by <Link href="https://www.youtube.com/playlist?list=PLKDOdCjxOjzIFucHobwJpSK4-vAVXST90">Lewis G</Link>.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// APP SHELL — shared folders state
// ═══════════════════════════════════════════════
const TABS = [
  { id: "guide",   label: "Guide" },
  { id: "coords",  label: "Coordinate Picker" },
  { id: "events",  label: "Event Builder" },
  { id: "credits", label: "Credits" },
];

export default function App() {
  const [tab, setTab] = useState("guide");
  // Shared coordinate state — coords saved in picker are available in event builder
  const [folders, setFolders] = useState([{ name: "Default", coords: [] }]);
  const [eventDirty, setEventDirty] = useState(false);

  const coordCount = folders.reduce((a, f) => a + f.coords.length, 0);
  const hasUnsaved = coordCount > 0 || eventDirty;

  // Periodic "remember to save" nudge — nothing in this tool persists across a tab close.
  const SAVE_REMINDER_MS = 7 * 60 * 1000; // 7 minutes (within the 5–10 min window)
  const [saveReminder, setSaveReminder] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setSaveReminder(true), SAVE_REMINDER_MS);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!saveReminder) return;
    const t = setTimeout(() => setSaveReminder(false), 45000); // auto-hide after 45s if ignored
    return () => clearTimeout(t);
  }, [saveReminder]);

  // Warn before closing tab with unsaved work
  useEffect(() => {
    const handler = (e) => {
      if (hasUnsaved) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);

  // Quick export from status bar
  const quickExport = () => {
    const lines = ["GODLY HAND — COORDINATE REFERENCE", "Generated: " + new Date().toLocaleString(), ""];
    folders.forEach(folder => {
      if (folder.coords.length === 0) return;
      lines.push("── " + folder.name.toUpperCase() + " ─────────────────────────");
      folder.coords.forEach(c => {
        lines.push("  " + c.label);
        lines.push("    Map: " + c.map + "   X: " + c.x + "   Y: " + c.y + "   Dir: " + (c.direction !== undefined ? c.direction : "—"));
      });
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "coordinates.txt";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ background: "#0a0a14", minHeight: "100vh", color: "#e0e0f0", fontFamily: "'Segoe UI', sans-serif", paddingBottom: hasUnsaved ? 44 : 0 }}>
      {saveReminder && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 400,
          background: "#1a1a2e", border: "1px solid #cc9944", borderRadius: 8, padding: "10px 16px",
          display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.5)", fontFamily: "monospace",
        }}>
          <span style={{ color: "#cc9944", fontSize: 13 }}>⏱ Reminder — export your work. Nothing is saved if you close this tab.</span>
          <button onClick={() => setSaveReminder(false)} style={{
            background: "#2a1a0a", border: "1px solid #cc9944", color: "#cc9944",
            borderRadius: 4, padding: "3px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "monospace",
          }}>Dismiss</button>
        </div>
      )}
      <div style={{ background: "#13132a", borderBottom: "1px solid #2a2a4e", padding: "0 24px", display: "flex", alignItems: "center", gap: 0 }}>
        <span style={{ color: "#7b8cde", fontWeight: 700, fontSize: 14, padding: "12px 24px 12px 0", borderRight: "1px solid #2a2a4e", marginRight: 16, fontFamily: "monospace" }}>
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
        {coordCount > 0 && (
          <span style={{ marginLeft: 8, color: "#44cc44", fontSize: 10, border: "1px solid #2a6a2a", borderRadius: 4, padding: "2px 8px", fontFamily: "monospace" }}>
            📍 {coordCount} saved
          </span>
        )}
        <span style={{ marginLeft: "auto", color: "#333355", fontSize: 10, border: "1px solid #2a2a4e", borderRadius: 4, padding: "2px 8px", fontFamily: "monospace" }}>SNEAK PEEK</span>
      </div>
      <div style={{ padding: 20 }}>
        {tab === "guide"   && <Guide />}
        {tab === "coords"  && <CoordPicker folders={folders} setFolders={setFolders} />}
        {tab === "events"  && <EventBuilderTab folders={folders} setFolders={setFolders} onDirtyChange={setEventDirty} />}
        {tab === "credits" && <Credits />}
      </div>

      {/* Persistent save reminder bar */}
      {hasUnsaved && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300,
          background: "#1a1a0a", borderTop: "1px solid #4a3a0a",
          padding: "8px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
          fontFamily: "monospace",
        }}>
          <span style={{ color: "#cc9944", fontSize: 12 }}>
            ⚠ {[coordCount > 0 ? `${coordCount} coordinate${coordCount !== 1 ? "s" : ""}` : null, eventDirty ? "an unsaved event" : null].filter(Boolean).join(" and ")} — session data is lost if you close this tab
          </span>
          {coordCount > 0 && <button onClick={quickExport} style={{
            background: "#2a1a0a", border: "1px solid #cc9944", color: "#cc9944",
            borderRadius: 4, padding: "4px 16px", cursor: "pointer", fontSize: 12,
            fontWeight: 700, fontFamily: "monospace",
          }}>Export .txt</button>}
        </div>
      )}
    </div>
  );
}
