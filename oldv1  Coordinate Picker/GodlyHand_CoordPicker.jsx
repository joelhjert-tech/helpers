import React, { useState, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════
// GODLY HAND — Coordinate Picker
// A sneak peek at the Godly Hand NPC Creator
// by [your name] — coming to Nexus Mods
// ═══════════════════════════════════════════════

const IS = {
  background: "#0d0d1a", border: "1px solid #2a2a4e", borderRadius: 4,
  color: "#e0e0f0", padding: "6px 10px", fontSize: 13, width: "100%", boxSizing: "border-box",
};
const SS = { ...IS, cursor: "pointer" };


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


function CoordPicker() {
  const [mapData, setMapData] = useState(null);
  const [mapName, setMapName] = useState("");
  const [loadMsg, setLoadMsg] = useState("");
  const [zoom, setZoom] = useState(2);
  const [folders, setFolders] = useState([{ name: "Default", coords: [] }]);
  const [activeFolder, setActiveFolder] = useState(0);
  const [newFolderName, setNewFolderName] = useState("");
  const [hoveredTile, setHoveredTile] = useState(null);
  const [labelInput, setLabelInput] = useState("");
  const [pendingTile, setPendingTile] = useState(null);
  const [openFolders, setOpenFolders] = useState({ 0: true });
  const [tilesheetImgs, setTilesheetImgs] = useState({});
  const [renderReady, setRenderReady] = useState(false);
  const [parseError, setParseError] = useState(null);
  const fileRef = useRef(null);
  const tsFileRef = useRef(null);
  const canvasRef = useRef(null);

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

  const addCoord = (x, y, label) => {
    const coord = { x, y, label: label || `${x},${y}`, map: mapName, id: Date.now() };
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
        lines.push(`    Map: ${c.map}   X: ${c.x}   Y: ${c.y}`);
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
          {allCoordCount > 0 && (
            <button onClick={exportTxt} style={{
              background: "#1a2a1a", border: "1px solid #2a6a2a", color: "#44cc44",
              borderRadius: 4, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700,
            }}>📄 Export .txt</button>
          )}
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
                      <div style={{ color: "#555577", fontSize: 11 }}>{coord.map} X:{coord.x} Y:{coord.y}</div>
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
              onKeyDown={e => { if (e.key === "Enter") addCoord(pendingTile.x, pendingTile.y, labelInput); }}
              autoFocus />
            <select style={{ ...SS }} value={activeFolder} onChange={e => setActiveFolder(Number(e.target.value))}>
              {folders.map((f, i) => <option key={i} value={i}>{f.name}</option>)}
            </select>
            <button onClick={() => addCoord(pendingTile.x, pendingTile.y, labelInput)} style={{
              background: "#0a2a0a", border: "1px solid #2a6a2a", color: "#44cc44",
              borderRadius: 4, padding: "6px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700,
            }}>Save</button>
            <button onClick={() => { setPendingTile(null); setLabelInput(""); }} style={{
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

function Credits() {
  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>GODLY HAND — Coordinate Picker</div>
        <div style={{ color: "#555577", fontSize: 12, lineHeight: 1.7 }}>
          A sneak peek at the Godly Hand NPC Creator — a full all-in-one tool for creating custom Stardew Valley NPCs.
          This standalone release is the coordinate picker component, released for early community testing.
        </div>
      </div>

      {/* Cross-mod testing */}
      <div style={{ color: "#9aa0c0", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
        Cross-Mod Testing
      </div>
      <div style={{ color: "#555577", fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
        The coordinate picker was tested against the following modded maps to confirm compatibility beyond vanilla.
      </div>

      {[
        {
          name: "Tiny Garden Farm",
          author: "DaisyNiko",
          url: "https://www.nexusmods.com/stardewvalley/mods/4635",
          desc: "A small, cozy custom farm map. Used to test coordinate picking on a modded farm tbin.",
        },
        {
          name: "DaisyNiko's Tilesheets",
          author: "DaisyNiko",
          url: "https://www.nexusmods.com/stardewvalley/mods/4736",
          desc: "Custom tilesheet resource used by Tiny Garden Farm. Confirmed tilesheet PNG persistence works correctly across maps sharing sheets.",
        },
        {
          name: "Saloon Second Story",
          author: "LemurKat",
          url: "https://www.nexusmods.com/stardewvalley/mods/30194",
          desc: "Adds a second floor to the Saloon. Used to confirm the coord picker renders and picks correctly on interior modded maps.",
        },
        {
          name: "Ridgeside Village",
          author: "Rafseazz and mamaesh",
          url: "https://www.nexusmods.com/stardewvalley/mods/7286",
          desc: "One of the largest Stardew Valley expansion mods — 50+ NPCs, new location, custom maps. RSV map files were used to confirm the coord picker handles large-scale, complex modded maps with custom tilesheets and base64+zlib TMX encoding.",
        },
      ].map(mod => (
        <div key={mod.name} style={{
          background: "#1a1a2e", border: "1px solid #2a2a4e", borderLeft: "3px solid #7b8cde",
          borderRadius: 8, padding: 14, marginBottom: 10,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
            <a href={mod.url} target="_blank" rel="noreferrer" style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              {mod.name}
            </a>
            <span style={{ color: "#555577", fontSize: 11 }}>by {mod.author}</span>
            <a href={mod.url} target="_blank" rel="noreferrer" style={{ color: "#7b8cde", fontSize: 10, marginLeft: "auto" }}>
              Nexus ↗
            </a>
          </div>
          <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.6 }}>{mod.desc}</div>
        </div>
      ))}

      {/* Tools */}
      <div style={{ color: "#9aa0c0", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, marginTop: 24 }}>
        Tools Referenced
      </div>
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderLeft: "3px solid #cc9944", borderRadius: 8, padding: 14, marginBottom: 10 }}>
        <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>xnbcli</div>
        <div style={{ color: "#555577", fontSize: 11, marginBottom: 4 }}>by LeonBlade</div>
        <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.6 }}>
          Required to unpack Stardew Valley's XNB files into tbin and PNG format for use with this tool.
        </div>
        <a href="https://github.com/LeonBlade/xnbcli" target="_blank" rel="noreferrer" style={{ color: "#cc9944", fontSize: 11, marginTop: 6, display: "inline-block" }}>
          github.com/LeonBlade/xnbcli ↗
        </a>
      </div>

      {/* Made by */}
      <div style={{ color: "#9aa0c0", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, marginTop: 24 }}>
        Made By
      </div>

      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderLeft: "3px solid #44cc44", borderRadius: 8, padding: 14, marginBottom: 10 }}>
        <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Aerishiph</div>
        <div style={{ color: "#44cc44", fontSize: 11, marginBottom: 6 }}>Author · Engine Designer · Tester</div>
        <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.6 }}>
          Creator of Godly Hand. Conceived and designed the tool out of frustration with existing coordinate workflows while building a custom NPC mod.
          Responsible for the full engine design, feature direction, and all in-game testing.
        </div>
      </div>

      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderLeft: "3px solid #7b8cde", borderRadius: 8, padding: 14, marginBottom: 10 }}>
        <div style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Claude</div>
        <div style={{ color: "#7b8cde", fontSize: 11, marginBottom: 6 }}>Development Assistant · by Anthropic</div>
        <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.6 }}>
          Assisted with engineering throughout development. Reverse-engineered the tbin binary format from hex analysis of Town.tbin,
          diagnosed and fixed the DataView bounds error caused by an undocumented blendMode byte in the S tile token,
          and built the TMX parser, coordinate picker UI, folder system, and tilesheet persistence logic.
        </div>
      </div>

      {/* Note */}
      <div style={{ background: "#120a0a", border: "1px solid #4a2a2a", borderRadius: 8, padding: 14, marginTop: 24 }}>
        <div style={{ color: "#cc4444", fontWeight: 700, fontSize: 11, marginBottom: 6 }}>Asset Notice</div>
        <div style={{ color: "#9a6060", fontSize: 12, lineHeight: 1.7 }}>
          This tool does not redistribute any game assets. Tilesheet PNGs are loaded locally by the user from their own
          unpacked game files. Stardew Valley assets belong to ConcernedApe.
          Modded tilesheet assets belong to their respective authors — credit them if you use their mods.
        </div>
      </div>
    </div>
  );
}

const BUGS = [
  {
    id: "BUG-001",
    title: "Double .png extension in tilesheet img field (tbin + TMX)",
    status: "FIXED",
    desc: "Some tbin and TMX files store the tilesheet image path with a .png extension already embedded in the img field (e.g. spring_town.png instead of spring_town). This produced double-extension names like spring_town.png.png when the parser appended or displayed the extension, causing tilesheets to show as unloaded even when the correct PNG was uploaded. Confirmed in Farm_WaterfallMFS.tbin and Farm_Waterfall.tbin — the img field literally contains spring_extrasTileSheet.png rather than spring_extrasTileSheet.",
    fix: "Fixed — all trailing .png occurrences are now stripped with a greedy regex in both the tbin and TMX parsers before the name is stored. Confirmed working — Farm_WaterfallMFS.tbin and Farm_Waterfall.tbin both load and render correctly after fix.",
  },
  {
    id: "BUG-002",
    title: "TMX base64+zlib compressed layers not rendering",
    status: "FIXED",
    desc: "TMX files exported from Tiled with base64+zlib compression (the Tiled default) failed to render any tiles. The parser only handled base64 uncompressed and silently skipped compressed layers. farm.tmx from Tiny Garden Farm by DaisyNiko uses base64+zlib on all 5 layers, causing a completely blank map.",
    fix: "Fixed — added zlib and gzip decompression using the native browser DecompressionStream API. parseTmx is now async to support it. Confirmed working with farm.tmx (Tiny Garden Farm).",
  },
  {
    id: "BUG-003",
    title: "TMX zlib decompression failing — wrong deflate format",
    status: "FIXED",
    desc: "TMX base64+zlib layers failed to decompress even after the async DecompressionStream fix from BUG-002. Root cause: zlib format wraps raw deflate with a 2-byte header (0x78 0x9C) and 4-byte checksum. DecompressionStream('deflate') expects raw deflate with no wrapper — it cannot read zlib-wrapped data and throws silently. Confirmed by inspecting the first bytes of farm.tmx layer data: 0x78 0x9C = standard zlib header.",
    fix: "Fixed — implemented a pure-JS zlib inflate (zlibInflate + rawInflate) with no external dependencies. Handles all three deflate block types (uncompressed, fixed Huffman, dynamic Huffman). Strips the 2-byte zlib header before decompressing raw deflate data. Synchronous, no library required. Confirmed working with farm.tmx (Tiny Garden Farm by DaisyNiko).",
  },
];

const BUG_COLORS = { FIXED: "#44cc44", OPEN: "#cc4444", INVESTIGATING: "#cc9944" };

function Bugs() {
  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ background: "#1a120a", border: "1px solid #4a3a0a", borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <div style={{ color: "#cc9944", fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Known Bugs</div>
        <div style={{ color: "#9a8060", fontSize: 12, lineHeight: 1.6 }}>
          Bugs found during testing of the Godly Hand Coordinate Picker. Fixed issues are kept here for transparency.
        </div>
      </div>

      {BUGS.map(bug => (
        <div key={bug.id} style={{
          background: "#1a1a2e",
          border: "1px solid #2a2a4e",
          borderLeft: `3px solid ${BUG_COLORS[bug.status] || "#555577"}`,
          borderRadius: 8, padding: 16, marginBottom: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <code style={{ color: "#555577", fontSize: 11 }}>{bug.id}</code>
            <span style={{ color: "#e0e0f0", fontWeight: 700, fontSize: 13 }}>{bug.title}</span>
            <span style={{
              marginLeft: "auto", fontSize: 10, fontWeight: 700,
              border: `1px solid ${BUG_COLORS[bug.status] || "#555577"}`,
              color: BUG_COLORS[bug.status] || "#555577",
              borderRadius: 4, padding: "2px 10px",
            }}>{bug.status}</span>
          </div>
          <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.7, marginBottom: bug.fix ? 10 : 0 }}>{bug.desc}</div>
          {bug.fix && (
            <div style={{ background: "#0a140a", border: "1px solid #2a4a2a", borderRadius: 4, padding: "6px 10px" }}>
              <span style={{ color: "#44cc44", fontSize: 11, fontWeight: 700 }}>Fix: </span>
              <span style={{ color: "#9aa0c0", fontSize: 11 }}>{bug.fix}</span>
            </div>
          )}
        </div>
      ))}

      {BUGS.length === 0 && (
        <div style={{ color: "#333355", fontSize: 12, textAlign: "center", padding: 40 }}>No known bugs.</div>
      )}
    </div>
  );
}

function Guide() {
  return (
    <div style={{ padding: "4px 0", maxWidth: 820 }}>

      {/* Intro */}
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ color: "#7b8cde", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>What is this?</div>
        <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>
          Godly Hand Coordinate Picker lets you load a Stardew Valley map file, see it rendered,
          and click any tile to record its coordinates. Built for custom NPC modders who are tired of
          counting tiles manually.
        </div>
      </div>

      {/* What you need */}
      <div style={{ color: "#9aa0c0", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
        What You Need
      </div>
      <div style={{ background: "#1a120a", border: "1px solid #4a3a0a", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ color: "#cc9944", fontWeight: 700, fontSize: 12, marginBottom: 10 }}>
          ⚠ The tool cannot display a map without both a map file AND tilesheet PNGs.
        </div>
        <div style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.8 }}>
          Stardew Valley stores its maps and graphics in packed <code style={{ color: "#cc9944" }}>.xnb</code> files.
          You need to unpack them first using <strong style={{ color: "#e0e0f0" }}>xnbcli</strong> by LeonBlade.
          Unpacking gives you the map file and the tilesheet images separately — you need both.
        </div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { file: ".tbin", color: "#7b8cde", desc: "Binary map format used by Stardew Valley. Unpacked from Maps/*.xnb using xnbcli." },
            { file: ".tmx", color: "#7b8cde", desc: "XML map format exported from Tiled. Used by some mods. Supports CSV and base64+zlib encoding." },
            { file: ".png (tilesheets)", color: "#44cc44", desc: "The actual graphics the map tiles are drawn from. Each map references one or more tilesheet PNGs. Without these the tool cannot render tiles — you will see a blank map." },
          ].map(item => (
            <div key={item.file} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "#0d0d1a", borderRadius: 6, padding: "10px 12px" }}>
              <code style={{ color: item.color, fontSize: 12, minWidth: 160, paddingTop: 1 }}>{item.file}</code>
              <span style={{ color: "#9aa0c0", fontSize: 12, lineHeight: 1.7 }}>{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step by step */}
      <div style={{ color: "#9aa0c0", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
        Step by Step
      </div>
      {[
        {
          n: "1",
          title: "Unpack your map files",
          body: "Download xnbcli from github.com/LeonBlade/xnbcli. Run it against your Stardew Valley Content/Maps folder. This produces .tbin files and all the tilesheet .png files side by side. If you are using a modded map in .tmx format you may already have the file — check the mod folder.",
          note: null,
        },
        {
          n: "2",
          title: "Load the map file",
          body: "Click Load Map File and select your .tbin or .tmx. The tool will parse it and tell you which tilesheet PNGs it needs to render. If it cannot find anything it will show a parse error — check the Bugs tab for known issues.",
          note: "The map file on its own is enough to enable coordinate picking. You do not need the tilesheets just to click tiles — but you will be clicking blind without them.",
        },
        {
          n: "3",
          title: "Upload the tilesheet PNGs",
          body: "Click Upload Tilesheet PNG(s) and select all the PNG files the tool listed as needed. You can select multiple files at once. The status panel will tick each one green as it loads. Once all are loaded the map renders automatically.",
          note: "Tilesheet PNGs stay in memory when you switch maps. If your next map shares sheets with the current one they are already loaded.",
        },
        {
          n: "4",
          title: "Click a tile to save a coordinate",
          body: "Hover over the map to see the live X Y coordinate in the tooltip at the bottom of the screen. Click any tile to open the save prompt. Type a label — something descriptive like 'Nicholas morning position' — choose a folder and hit Save or press Enter.",
          note: null,
        },
        {
          n: "5",
          title: "Organise with folders",
          body: "Create folders to keep coordinates grouped — one per NPC, one per schedule route, or however works for you. Click a folder header to expand it and see saved coords. Click it again to set it as the active save target.",
          note: null,
        },
        {
          n: "6",
          title: "Export when done",
          body: "Click Export .txt at the top of the Saved Coordinates panel. This downloads a plain text file with all your folders and coordinates laid out cleanly. Keep it open in Notepad while writing your schedule or event files.",
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
                <span style={{ color: "#7b8cde", fontSize: 11 }}>{step.note}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Vanilla zip note */}
      <div style={{ background: "#0a2a0a", border: "1px solid #2a6a2a", borderRadius: 8, padding: 14, marginTop: 8 }}>
        <div style={{ color: "#44cc44", fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Vanilla Tilesheet ZIP</div>
        <div style={{ color: "#4a8a4a", fontSize: 12, lineHeight: 1.8 }}>
          A ZIP of the unpacked vanilla Stardew Valley tilesheet PNGs is available alongside this tool for convenience.
          Download it, unzip it, and use Upload Tilesheet PNG(s) to select all files at once.
          These are ConcernedApe's assets — credit them accordingly and do not redistribute them separately.
        </div>
      </div>

    </div>
  );
}

export default function App() {
  const [tab, setTab] = React.useState("picker");
  const TABS = [
    { id: "picker", label: "Coord Picker" },
    { id: "guide", label: "Guide" },
    { id: "bugs", label: `Bugs (${BUGS.length})` },
    { id: "credits", label: "Credits" },
  ];
  return (
    <div style={{ background: "#0d0d1a", minHeight: "100vh", fontFamily: "monospace", color: "#e0e0f0" }}>
      {/* Top bar */}
      <div style={{ background: "#13132a", borderBottom: "1px solid #2a2a4e", padding: "0 24px", display: "flex", alignItems: "center", gap: 0 }}>
        <span style={{ color: "#7b8cde", fontWeight: 700, fontSize: 14, paddingRight: 24, borderRight: "1px solid #2a2a4e", marginRight: 16, padding: "12px 24px 12px 0" }}>
          GODLY HAND
        </span>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? "#7b8cde" : "transparent"}`,
            color: tab === t.id ? "#e0e0ff" : "#555577",
            padding: "12px 16px", cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 700 : 400,
            transition: "color 0.1s",
          }}>{t.label}</button>
        ))}
        <span style={{ marginLeft: "auto", color: "#333355", fontSize: 10, border: "1px solid #2a2a4e", borderRadius: 4, padding: "2px 8px" }}>SNEAK PEEK</span>
      </div>

      {/* Content */}
      <div style={{ padding: 24 }}>
        {tab === "picker" && <CoordPicker />}
        {tab === "guide" && <Guide />}
        {tab === "bugs" && <Bugs />}
        {tab === "credits" && <Credits />}
      </div>
    </div>
  );
}
