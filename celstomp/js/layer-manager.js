

const LAYER = {
  FILL: 0,
  COLOR: 1,
  SHADE: 2,
  LINE: 3,
  SKETCH: 4
};

const MAIN_LAYERS = [ LAYER.FILL, LAYER.COLOR, LAYER.SHADE, LAYER.LINE, LAYER.SKETCH ];
const DEFAULT_MAIN_LAYER_ORDER = [ LAYER.FILL, LAYER.COLOR, LAYER.SHADE, LAYER.LINE, LAYER.SKETCH ];
const LAYERS_COUNT = 5;

let layers = new Array(LAYERS_COUNT).fill(0).map(() => ({
  name: "",
  opacity: 1,
  prevOpacity: 1,
  frames: new Array(totalFrames).fill(null),
  sublayers: new Map,
  suborder: []
}));

layers[LAYER.LINE].name = "LINE";
layers[LAYER.SHADE].name = "SHADE";
layers[LAYER.COLOR].name = "COLOR";
layers[LAYER.SKETCH].name = "SKETCH";
layers[LAYER.FILL].name = "FILL";
let activeLayer = LAYER.LINE;

let activeSubColor = new Array(LAYERS_COUNT).fill("#000000");
let layerColorMem = new Array(LAYERS_COUNT).fill("#000000");
layerColorMem[LAYER.FILL] = fillWhite;

const PAPER_LAYER = -1;
let mainLayerOrder = DEFAULT_MAIN_LAYER_ORDER.slice();

function normalizeMainLayerOrder(order) {
    if (!Array.isArray(order)) return DEFAULT_MAIN_LAYER_ORDER.slice();
    const seen = new Set;
    const out = [];
    for (const raw of order) {
        const n = Number(raw);
        if (!Number.isFinite(n)) continue;
        if (!MAIN_LAYERS.includes(n)) continue;
        if (seen.has(n)) continue;
        seen.add(n);
        out.push(n);
    }
    for (const L of DEFAULT_MAIN_LAYER_ORDER) {
        if (!seen.has(L)) out.push(L);
    }
    return out;
}
function mainLayersTopToBottom() {
    return mainLayerOrder.slice().reverse();
}

function rememberedColorForLayer(L) {
  if (L === LAYER.FILL) return fillWhite;
  return layerColorMem[L] || "#000000";
}

function rememberCurrentColorForLayer(L = activeLayer) {
  if (L === LAYER.FILL) return;
  layerColorMem[L] = currentColor;
}

function applyRememberedColorForLayer(L = activeLayer) {
  currentColor = rememberedColorForLayer(L);
  setColorSwatch();
}

function setColorSwatch() {
  const brushSwatch = $("brushSwatch");
  const brushHexEl = $("brushHex");
  if (!brushSwatch || !brushHexEl) return;
  brushSwatch.style.background = currentColor;
  brushHexEl.textContent = currentColor.toUpperCase();
}

function _ctrlMovePickKeyForLayer(L) {
  if (L === LAYER.FILL) {
      // what
      return activeSubColor?.[LAYER.FILL] || fillWhite || "#ffffff";
  }
  return activeSubColor?.[L] ?? (typeof currentColor === "string" ? currentColor : "#000000");
}

function getActiveCelCanvasForMove() {
  const L = activeLayer;
  const F = currentFrame;

  const key = colorToHex(_ctrlMovePickKeyForLayer(L));
  const c = getFrameCanvas(L, F, key);
  return {
      canvas: c,
      L: L,
      F: F,
      key: key
  };
}

function getFrameCanvas(L, F, colorStr) {
  const key = colorToHex(colorStr || activeSubColor?.[L] || currentColor || "#000");
  const sub = ensureSublayer(L, key);
  if (!sub) return null;
  if (!sub.frames[F]) {
      const off = document.createElement("canvas");
      // lololol

      // TODO: this is broken. figure out how to store/reload layer state efficiently
      off.width = 960;
      off.height = 540;
      off._hasContent = false;
      sub.frames[F] = off;
  }
  return sub.frames[F];
}

function ensureSublayer(L, colorStr) {
  const hex = swatchColorKey(colorStr);
  const layer = layers[L];
  if (!layer) return null;
  if (!layer.sublayers) layer.sublayers = new Map;
  if (!layer.suborder) layer.suborder = [];
  let sub = layer.sublayers.get(hex);
  if (!sub) {
      sub = {
          color: hex,
          frames: new Array(totalFrames).fill(null)
      };
      layer.sublayers.set(hex, sub);
      if (!layer.suborder.includes(hex)) layer.suborder.push(hex);
      if (layer.suborder.length > 1) {
          const seen = new Set;
          layer.suborder = layer.suborder.filter(k => {
              if (seen.has(k)) return false;
              seen.add(k);
              return true;
          });
      }
      if (Array.isArray(activeSubColor)) activeSubColor[L] = activeSubColor[L] || hex;
      try {
          normalizeLayerSwatchKeys(layer);
      } catch {}
      try {
          renderLayerSwatches(L);
      } catch {}
  } else {
      if (sub.frames.length < totalFrames) {
          const oldLen = sub.frames.length;
          sub.frames.length = totalFrames;
          for (let i = oldLen; i < totalFrames; i++) sub.frames[i] = null;
      }
      if (layer.suborder.includes(hex)) {
          const seen = new Set;
          layer.suborder = layer.suborder.filter(k => {
              if (seen.has(k)) return false;
              seen.add(k);
              return true;
          });
      } else {
          layer.suborder.push(hex);
      }
      if (!layer.sublayers.has(hex)) {
          for (const [k, sw] of Array.from(layer.sublayers.entries())) {
              const ck = swatchColorKey(k);
              if (ck === hex && k !== hex) {
                  layer.sublayers.delete(k);
                  layer.sublayers.set(hex, sw);
                  break;
              }
          }
      }
  }
  return sub;
}

function renderPaperSwatch() {
  const host = document.getElementById("swatches-paper");
  if (!host) return;
  host.innerHTML = "";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "layerSwatchBtn" + (activeLayer === PAPER_LAYER ? " active" : "");
  btn.style.background = canvasBgColor;
  btn.title = `PAPER: ${String(canvasBgColor || "").toUpperCase()}`;
  btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      e.stopPropagation();
  }, {
      passive: false
  });
  btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      const startHex = normalizeToHex(canvasBgColor);
      requestAnimationFrame(() => {
          openColorPickerAtElement(btn, startHex, hex => {
              setCanvasBgColor(hex);
          });
      });
  });
  host.appendChild(btn);
}

function renderLayerSwatches(onlyLayer = null) {
  renderPaperSwatch();
  if (onlyLayer != null) {
      const n = Number(onlyLayer);
      if (Number.isFinite(n)) onlyLayer = n;
  }
  const todo = onlyLayer === null ? mainLayerOrder.slice() : [ onlyLayer ];
  for (const L of todo) {
      const host = document.getElementById(swatchContainerIdForLayer(L));
      if (!host) continue;
      host.innerHTML = "";
      const layer = layers[L];
      if (!layer) continue;
      if (!layer.sublayers) layer.sublayers = new Map;
      if (!layer.suborder) layer.suborder = [];
      normalizeLayerSwatchKeys(layer);
      const getSw = k => layer.sublayers.get(k) || null;
      const hasKids = sw => !!(sw && Array.isArray(sw.children) && sw.children.length);
      function makeBtn(key, depth, hiddenByFolder) {
          const swObj = getSw(key);
          const btn = document.createElement("button");
          btn.type = "button";
          const isSelected = activeSubColor?.[L] === key;
          btn.className = "layerSwatchBtn" + (isSelected ? " active" : "");
          if (isSelected && activeLayer === L) btn.classList.add("activeOnActiveLayer");
          if (depth > 0) btn.classList.add("isChild");
          if (hiddenByFolder) btn.classList.add("hiddenByFolder");
          if (hasKids(swObj)) btn.classList.add("hasKids");
          btn.style.background = key;
          if (depth > 0) btn.style.marginLeft = `${depth * 14}px`;
          btn.draggable = false;
          btn.dataset.layerId = String(L);
          btn.dataset.swatchKey = String(key);
          btn.dataset.key = String(key);
          const pKey = swObj?.parentKey;
          btn.title = depth > 0 && pKey ? `${key} (paired under ${pKey})` : key;
          if (hasKids(swObj)) {
              const caret = document.createElement("span");
              caret.className = "swatchCaret";
              caret.textContent = swObj.collapsed ? "▸" : "▾";
              caret.addEventListener("click", e => {
                  e.preventDefault();
                  e.stopPropagation();
                  swObj.collapsed = !swObj.collapsed;
                  renderLayerSwatches(L);
              });
              btn.appendChild(caret);
          }
          const readKey = () => swatchColorKey(String(btn.dataset.key || btn.dataset.swatchKey || key || ""));
          btn.addEventListener("click", e => {
              if (btn._skipClickOnce) {
                  btn._skipClickOnce = false;
                  return;
              }
              e.preventDefault();
              e.stopPropagation();
              const k = swatchColorKey(readKey());
              activeLayer = L;
              if (Array.isArray(activeSubColor)) activeSubColor[L] = k;
              currentColor = k;
              try {
                  setColorSwatch?.();
              } catch {}
              try {
                  setHSVPreviewBox?.();
              } catch {}
              setLayerRadioChecked(L);
              try {
                  queueUpdateHud?.();
              } catch {}
              renderLayerSwatches();
          });
          btn.addEventListener("contextmenu", e => {
              e.preventDefault();
              e.stopPropagation();
              openSwatchContextMenu(L, readKey(), e);
          }, {
              passive: false
          });
          host.appendChild(btn);
          return btn;
      }
      function renderTree(key, depth, ancestorCollapsed) {
          const swObj = getSw(key);
          if (!swObj) return;
          const hiddenByFolder = !!ancestorCollapsed;
          makeBtn(key, depth, hiddenByFolder);
          const kids = Array.isArray(swObj.children) ? swObj.children : [];
          const nextAncestorCollapsed = ancestorCollapsed || !!swObj.collapsed;
          for (const ck of kids) {
              if (!getSw(ck)) continue;
              renderTree(ck, depth + 1, nextAncestorCollapsed);
          }
      }
      for (const key of layer.suborder) {
          const swObj = getSw(key);
          if (!swObj) continue;
          if (swObj.parentKey) continue;
          renderTree(key, 0, false);
      }
      wireSwatchPointerDnD(host);
  }
}

function setCanvasBgColor(next) {
  canvasBgColor = normalizeToHex(next || canvasBgColor || "#bfbfbf");
  if (bgColorInput) bgColorInput.value = canvasBgColor;
  renderPaperSwatch();
}


// lookup funcs

function swatchContainerIdForLayer(L) {
  if (L === PAPER_LAYER) return "swatches-paper";
  if (L === LAYER.SKETCH) return "swatches-sketch";
  if (L === LAYER.LINE) return "swatches-line";
  if (L === LAYER.SHADE) return "swatches-shade";
  if (L === LAYER.COLOR) return "swatches-color";
  return "swatches-fill";
}
function layerRadioIdForLayer(L) {
  if (L === PAPER_LAYER) return "bt-paper";
  if (L === LAYER.SKETCH) return "bt-sketch-layer";
  if (L === LAYER.LINE) return "bt-line";
  if (L === LAYER.SHADE) return "bt-color";
  if (L === LAYER.COLOR) return "bt-sketch";
  return "bt-fill";
}

function layerFromValue(val) {
  if (val === "paper") return PAPER_LAYER;
  if (val === "sketch") return LAYER.SKETCH;
  if (val === "line") return LAYER.LINE;
  if (val === "shade") return LAYER.SHADE;
  if (val === "color") return LAYER.COLOR;
  if (val === "fill") return LAYER.FILL;
  return LAYER.LINE;
}

function setLayerRadioChecked(L) {
  const id = layerRadioIdForLayer(L);
  const r = document.getElementById(id);
  if (r) r.checked = true;
}

function mainLayerHasContent(L, F) {
    const layer = layers[L];
    if (!layer || !layer.suborder || !layer.sublayers) return false;
    for (const key of layer.suborder) {
        const sub = layer.sublayers.get(key);
        const off = sub?.frames?.[F];
        if (off && off._hasContent) return true;
    }
    return false;
}