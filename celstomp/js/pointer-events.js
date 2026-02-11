window.__celstompPinching = true;

const pressureCache = new Map;
const tiltCache = new Map;
const activePointers = new Map;

let usePressureSize = true;
let usePressureOpacity = false;
let usePressureTilt = false;

let brushSize = 3;
let autofill = false;

function pressure(e) {
    const pid = Number.isFinite(e?.pointerId) ? e.pointerId : -1;
    const isPen = e?.pointerType === "pen";
    const raw = typeof e?.pressure === "number" && e.pressure > 0 ? e.pressure : isPen ? .35 : 1;
    const prev = pressureCache.has(pid) ? pressureCache.get(pid) : raw;
    const smoothed = prev + (raw - prev) * pressureSmooth;
    const out = Math.max(PRESSURE_MIN, Math.min(1, smoothed));
    pressureCache.set(pid, out);
    return out;
}
function tiltAmount(e) {
    const pid = Number.isFinite(e?.pointerId) ? e.pointerId : -1;
    if (e?.pointerType !== "pen") {
        tiltCache.set(pid, 0);
        return 0;
    }
    const tx = Number.isFinite(e?.tiltX) ? e.tiltX : 0;
    const ty = Number.isFinite(e?.tiltY) ? e.tiltY : 0;
    const raw = Math.max(0, Math.min(1, Math.hypot(tx, ty) / 90));
    const prev = tiltCache.has(pid) ? tiltCache.get(pid) : raw;
    const smoothed = prev + (raw - prev) * .35;
    const out = Math.max(0, Math.min(1, smoothed));
    tiltCache.set(pid, out);
    return out;
}

function handlePointerDown(e) {
  if (e.pointerType === "touch" && window.__celstompPinching) return;
  if ((e.ctrlKey || e.metaKey) && e.pointerType !== "touch") {
      if (beginCtrlMove(e)) {
          e.preventDefault();
          return;
      }
  }
  try {
      drawCanvas.setPointerCapture(e.pointerId);
  } catch {}
  activePointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      type: e.pointerType
  });
  if (e.pointerType === "pen") {
      startStroke(e);
      return;
  }
  if (e.pointerType === "touch") {
      if (window.__celstompPinching) {
          e.preventDefault();
          return;
      }
      if (tool === "hand") startPan(e); else startStroke(e);
      e.preventDefault();
      return;
  }
  if (e.button === 2 || tool === "hand") startPan(e); else startStroke(e);
}

function handlePointerMove(e) {
  if (e.pointerType === "touch") e.preventDefault();
  if (e.pointerType === "touch" && window.__celstompPinching) return;
  if (e.pointerType === "touch") {
      if (window.__celstompPinching && activePointers.size < 2) {
          window.__celstompPinching = false;
      }
  }
  if (e.pointerType === "touch" && window.__celstompPinching) return;
  if (_ctrlMove.active && e.pointerId === _ctrlMove.pointerId) {
      updateCtrlMove(e);
      e.preventDefault();
      return;
  }
  if (isPanning) {
      continuePan(e);
      return;
  }
  if (isDrawing) {
      continueStroke(e);
      return;
  }
}

function handlePointerUp(e) {
  if (e.pointerType === "touch") e.preventDefault();
  if (_ctrlMove.active && e.pointerId === _ctrlMove.pointerId) {
      endCtrlMove(e);
      e.preventDefault();
      return;
  }
  try {
      drawCanvas.releasePointerCapture(e.pointerId);
  } catch {}
  pressureCache.delete(e.pointerId);
  tiltCache.delete(e.pointerId);
  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) window.__celstompPinching = false;
  if (isDrawing) endStroke();
  if (isPanning) endPan();
}

// pen config
const PRESSURE_MIN = .05;
let penDetected = false;
let stabilizationLevel = 5;
let pressureSmooth = .45;
let strokeSmooth = .6;



function pressureSmoothFromLevel(level) {
    const lv = Math.max(0, Math.min(10, Number(level) || 0));
    return Math.max(.2, Math.min(1, 1 - lv * .08));
}
function strokeSmoothFromLevel(level) {
    const lv = Math.max(0, Math.min(10, Number(level) || 0));
    return Math.max(.2, Math.min(1, 1 - lv * .08));
}

function notePenDetected(e) {
  if (!e || e.pointerType !== "pen") return;
  if (penDetected) return;
  penDetected = true;
  setPenControlsVisible(true);
}
function shouldStabilizeTool(name) {
  return name === "brush" || name === "eraser" || name === "fill-brush" || name === "fill-eraser";
}
function stabilizePoint(e, x, y) {
  if (!shouldStabilizeTool(tool)) return {
      x: x,
      y: y
  };
  const pt = {
      x: x,
      y: y
  };
  if (!stabilizedPt) {
      stabilizedPt = pt;
      return pt;
  }
  stabilizedPt = {
      x: stabilizedPt.x + (pt.x - stabilizedPt.x) * strokeSmooth,
      y: stabilizedPt.y + (pt.y - stabilizedPt.y) * strokeSmooth
  };
  return stabilizedPt;
}

// stroke events

let lastPt = null;
let stabilizedPt = null;
let strokeHex = null;
let _fillEraseAllLayers = false;

function getPixelHexAtContentPoint(cx, cy) {
    const x = Math.max(0, Math.min(contentW - 1, Math.round(cx)));
    const y = Math.max(0, Math.min(contentH - 1, Math.round(cy)));
    const tmp = document.createElement("canvas");
    tmp.width = contentW;
    tmp.height = contentH;
    const tctx = tmp.getContext("2d", {
        willReadFrequently: true
    });
    if (!tctx) return null;
    drawCompositeAt(tctx, currentFrame, true, true, transparencyHoldEnabled ? .25 : 1);
    let d;
    try {
        d = tctx.getImageData(x, y, 1, 1).data;
    } catch {
        return null;
    }
    return rgbToHex(d[0], d[1], d[2]);
}
function pickCanvasColorAtEvent(e) {
    const pos = getCanvasPointer(e);
    const pt = screenToContent(pos.x, pos.y);
    const picked = getPixelHexAtContentPoint(pt.x, pt.y);
    if (!picked) return;
    setCurrentColorHex(picked);
    addCurrentColorToPalette();
}

function startStroke(e) {
  const pos = getCanvasPointer(e);
  let {x: x, y: y} = screenToContent(pos.x, pos.y);
  notePenDetected(e);
  stabilizedPt = null;
  const startPt = stabilizePoint(e, x, y);
  x = startPt.x;
  y = startPt.y;
  if (x < 0 || y < 0 || x > contentW || y > contentH) return;
  if (e.button === 2) {
      startPan(e);
      return;
  }
  if (tool === "eyedropper") {
      pickCanvasColorAtEvent(e);
      return;
  }
  if (tool === "rect-select") {
      isDrawing = true;
      beginRectSelect(e);
      return;
  }
  if (tool === "lasso-fill") {
      lassoActive = true;
      isDrawing = true;
      lassoPts = [];
      addLassoPoint({
          x: x,
          y: y
      });
      drawLassoPreview();
      return;
  }
  try {
      const k = tool === "eraser" ? resolveKeyFor(activeLayer, activeSubColor?.[activeLayer] ?? currentColor) : resolveKeyFor(activeLayer, currentColor);
      beginGlobalHistoryStep(activeLayer, currentFrame, k);
  } catch {}
  if (tool === "lasso-erase") {
      if (activeLayer === PAPER_LAYER) return;
      lassoActive = true;
      isDrawing = true;
      lassoPts = [];
      addLassoPoint({
          x: x,
          y: y
      });
      drawLassoPreview("erase");
      return;
  }
  if (tool === "fill-eraser" || tool === "fill-brush") {
      if (activeLayer === PAPER_LAYER) return;
      if (tool === "fill-eraser" && activeLayer !== LAYER.FILL) {
          if (Array.isArray(activeSubColor) && !activeSubColor[activeLayer]) {
              const lay = layers?.[activeLayer];
              const fallback = lay?.suborder?.slice().reverse().find(k => lay?.sublayers?.has?.(k)) || lay?.suborder?.[0] || null;
              if (fallback) activeSubColor[activeLayer] = fallback;
          }
      }
      let key = fillKeyForTool(activeLayer, tool);
      if (tool === "fill-brush" && key) key = swatchColorKey(key);
      if (tool === "fill-brush" && activeLayer === LAYER.FILL) {
          activeSubColor[LAYER.FILL] = key;
          ensureSublayer(LAYER.FILL, key);
          try {
              renderLayerSwatches(LAYER.FILL);
          } catch {}
      }
      if (tool === "fill-brush" && !key) return;
      if (tool === "fill-eraser") key = key || null;
      if (tool === "fill-brush") ensureActiveSwatchForColorLayer(activeLayer, key);
      if (tool === "fill-brush") pushUndo(activeLayer, currentFrame, key);
      isDrawing = true;
      if (tool === "fill-eraser") _fillEraseAllLayers = !!e.shiftKey;
      lastPt = {
          x: x,
          y: y
      };
      trailPoints = [ {
          x: x,
          y: y
      } ];
      fxTransform();
      fxStamp1px(x, y, x + .01, y + .01);
      return;
  }
  if (tool === "hand") {
      startPan(e);
      return;
  }
  if (activeLayer === PAPER_LAYER) {
      return;
  }
  isDrawing = true;
  const hex = tool === "eraser" ? activeSubColor?.[activeLayer] || colorToHex(currentColor) : colorToHex(currentColor);
  strokeHex = activeLayer === LAYER.FILL ? fillWhite : hex;
  activeSubColor[activeLayer] = strokeHex;
  ensureSublayer(activeLayer, strokeHex);
  renderLayerSwatches(activeLayer);
  beginGlobalHistoryStep(activeLayer, currentFrame, strokeHex);
  pushUndo(activeLayer, currentFrame, strokeHex);
  lastPt = {
      x: x,
      y: y
  };
  const off = getFrameCanvas(activeLayer, currentFrame, strokeHex);
  const ctx = off.getContext("2d");
  const p = pressure(e);
  const t = usePressureTilt ? tiltAmount(e) : 0;
  markGlobalHistoryDirty();
  markGlobalHistoryDirty();
  if (tool === "brush") {
      const pressureSize = usePressureSize ? brushSize * p : brushSize;
      const size = e?.pointerType === "pen" && usePressureTilt ? pressureSize * (1 + t * .75) : pressureSize;
      const alpha = usePressureOpacity ? p : 1;
      const brushRenderSettings = mergeBrushSettings(brushSettings, {
          size: size
      });
      stampLine(ctx, x, y, x + .01, y + .01, brushRenderSettings, currentColor, alpha, "source-over");
  } else if (tool === "eraser") {
      const eraserTilt = e?.pointerType === "pen" && usePressureTilt ? 1 + t * .75 : 1;
      const eraserRenderSettings = mergeBrushSettings(eraserSettings, {
          size: eraserSize * eraserTilt
      });
      stampLine(ctx, x, y, x + .01, y + .01, eraserRenderSettings, "#ffffff", 1, "destination-out");
  }
  markFrameHasContent(activeLayer, currentFrame, strokeHex || hex);
  queueRenderAll();
  updateTimelineHasContent(currentFrame);
}

function markFrameHasContent(L, F, colorStr) {
    const c = getFrameCanvas(L, F, colorStr);
    if (c) c._hasContent = true;
}

function continueStroke(e) {
  if (!isDrawing) return;
  const pos = getCanvasPointer(e);
  let {x: x, y: y} = screenToContent(pos.x, pos.y);
  notePenDetected(e);
  const movePt = stabilizePoint(e, x, y);
  x = movePt.x;
  y = movePt.y;
  if (!lastPt) lastPt = {
      x: x,
      y: y
  };
  if (tool === "rect-select") {
      updateRectSelect(e);
      lastPt = {
          x: x,
          y: y
      };
      return;
  }
  if (tool === "fill-eraser" || tool === "fill-brush") {
      fxTransform();
      fxStamp1px(lastPt.x, lastPt.y, x, y);
      if (!trailPoints.length || Math.hypot(x - lastPt.x, y - lastPt.y) > 4) trailPoints.push({
          x: x,
          y: y
      });
      lastPt = {
          x: x,
          y: y
      };
      return;
  }
  if ((tool === "lasso-fill" || tool === "lasso-erase") && lassoActive) {
      addLassoPoint({
          x: x,
          y: y
      });
      drawLassoPreview(tool === "lasso-erase" ? "erase" : "fill");
      lastPt = {
          x: x,
          y: y
      };
      return;
  }
  
  const hex = strokeHex || (activeSubColor?.[activeLayer] ?? colorToHex(currentColor));
  const off = getFrameCanvas(activeLayer, currentFrame, hex);
  const ctx = off.getContext("2d");
  const p = pressure(e);
  const t = usePressureTilt ? tiltAmount(e) : 0;
  markGlobalHistoryDirty();
  if (tool === "brush") {
      const pressureSize = usePressureSize ? brushSize * p : brushSize;
      const size = e?.pointerType === "pen" && usePressureTilt ? pressureSize * (1 + t * .75) : pressureSize;
      const alpha = usePressureOpacity ? p : 1;
      const brushRenderSettings = mergeBrushSettings(brushSettings, {
          size: size
      });
      stampLine(ctx, lastPt.x, lastPt.y, x, y, brushRenderSettings, currentColor, alpha, "source-over");
  } else if (tool === "eraser") {
      const eraserTilt = e?.pointerType === "pen" && usePressureTilt ? 1 + t * .75 : 1;
      const eraserRenderSettings = mergeBrushSettings(eraserSettings, {
          size: eraserSize * eraserTilt
      });
      stampLine(ctx, lastPt.x, lastPt.y, x, y, eraserRenderSettings, "#ffffff", 1, "destination-out");
  }
  lastPt = {
      x: x,
      y: y
  };
  markFrameHasContent(activeLayer, currentFrame, strokeHex || hex);
  queueRenderAll();
  updateTimelineHasContent(currentFrame);
}

function endStroke() {
  if (!isDrawing) return;
  isDrawing = false;
  commitGlobalHistoryStep();
  const endKey = strokeHex;
  strokeHex = null;
  queueRenderAll();
  updateTimelineHasContent(currentFrame);
  if (tool === "rect-select") {
      endRectSelect();
      lastPt = null;
      stabilizedPt = null;
      return;
  }
  if (tool === "lasso-erase" && lassoActive) {
      lassoActive = false;
      applyLassoErase();
      cancelLasso();
      lastPt = null;
      stabilizedPt = null;
      return;
  }
  try {
      commitGlobalHistoryStep();
  } catch {}
  if (tool === "lasso-fill" && lassoActive) {
      lassoActive = false;
      applyLassoFill();
      cancelLasso();
      lastPt = null;
      stabilizedPt = null;
      return;
  }
  if (tool === "eraser" && activeLayer !== PAPER_LAYER) {
      recomputeHasContent(activeLayer, currentFrame, endKey || activeSubColor?.[activeLayer] || currentColor);
      if (tool === "eraser" && activeLayer !== PAPER_LAYER) {
          recomputeHasContent(activeLayer, currentFrame, endKey || activeSubColor?.[activeLayer] || currentColor);
          updateTimelineHasContent(currentFrame);
          pruneUnusedSublayers(activeLayer);
      }
      updateTimelineHasContent(currentFrame);
  }
  if (tool === "fill-brush") {
      const seeds = trailPoints.length ? trailPoints : lastPt ? [ lastPt ] : [];
      if (seeds.length) applyFillRegionsFromSeeds(currentFrame, seeds, activeLayer);
      onClearFx();
      trailPoints = [];
      lastPt = null;
      stabilizedPt = null;
      return;
  }
  if (tool === "fill-eraser") {
      if (activeLayer === PAPER_LAYER) {
          onClearFx();
          trailPoints = [];
          lastPt = null;
          stabilizedPt = null;
          return;
      }
      const strokePts = trailPoints.length ? trailPoints : lastPt ? [ lastPt ] : [];
      if (strokePts.length) eraseFillRegionsFromSeeds(activeLayer, currentFrame, strokePts);
      onClearFx();
      trailPoints = [];
      lastPt = null;
      stabilizedPt = null;
      return;
  }
  if (autofill && activeLayer === LAYER.LINE && tool === "brush") {
      pushUndo(LAYER.FILL, currentFrame);
      beginGlobalHistoryStep(LAYER.FILL, currentFrame, fillWhite);
      const filled = fillFromLineart(currentFrame);
      if (filled) markGlobalHistoryDirty();
      commitGlobalHistoryStep();
  }
  lastPt = null;
  stabilizedPt = null;
}

function endStrokeMobileSafe(e) {
  if (typeof _touchGestureActive !== "undefined" && _touchGestureActive) {
      try {
          cancelLasso?.();
      } catch {}
      try {
          onClearFx?.();
      } catch {}
      try {
          isDrawing = false;
      } catch {}
      try {
          lastPt = null;
      } catch {}
      try {
          stabilizedPt = null;
      } catch {}
      try {
          trailPoints = [];
      } catch {}
      try {
          _fillEraseAllLayers = false;
      } catch {}
      return;
  }
  const F = typeof currentFrame === "number" ? currentFrame : 0;
  try {
      if (typeof isPanning !== "undefined" && isPanning) endPan();
  } catch {}
  if ((tool === "lasso-fill" || tool === "lasso-erase") && typeof lassoActive !== "undefined" && lassoActive) {
      try {
          if (tool === "lasso-fill") applyLassoFill(); else applyLassoErase();
      } catch (err) {
          console.warn("[celstomp] lasso commit failed", err);
      }
      try {
          cancelLasso();
      } catch {}
      try {
          isDrawing = false;
      } catch {}
      try {
          lastPt = null;
      } catch {}
      try {
          stabilizedPt = null;
      } catch {}
      return;
  }
  if (tool === "rect-select") {
      try {
          endRectSelect();
      } catch {}
      try {
          isDrawing = false;
      } catch {}
      try {
          lastPt = null;
      } catch {}
      try {
          stabilizedPt = null;
      } catch {}
      return;
  }
  if (tool === "fill-brush" || tool === "fill-eraser") {
      const seeds = Array.isArray(trailPoints) && trailPoints.length ? trailPoints : lastPt ? [ lastPt ] : [];
      if (seeds.length) {
          try {
              if (tool === "fill-brush") {
                  applyFillRegionsFromSeeds(F, seeds, activeLayer);
              } else {
                  const L = _fillEraseAllLayers ? -1 : activeLayer;
                  eraseFillRegionsFromSeeds(L, F, seeds, seeds);
              }
          } catch (err) {
              console.warn("[celstomp] fill commit failed", err);
          }
      }
      try {
          onClearFx();
      } catch {}
      trailPoints = [];
      lastPt = null;
      stabilizedPt = null;
      _fillEraseAllLayers = false;
      isDrawing = false;
      try {
          endGlobalHistoryStep?.();
      } catch {}
      return;
  }
  try {
      isDrawing = false;
  } catch {}
  try {
      lastPt = null;
  } catch {}
  try {
      stabilizedPt = null;
  } catch {}
  try {
      trailPoints = [];
  } catch {}
  try {
      _fillEraseAllLayers = false;
  } catch {}
  try {
      onClearFx?.();
  } catch {}
  try {
      endGlobalHistoryStep?.();
  } catch {}
}

// pan events

let isDrawing = false;

let isPanning = false;
let panStart = {
    x: 0,
    y: 0,
    ox: 0,
    oy: 0
};

function startPan(e) {
  isPanning = true;
  const pos = getCanvasPointer(e);
  panStart = {
      x: pos.x * dpr,
      y: pos.y * dpr,
      ox: getOffsetX(),
      oy: getOffsetY()
  };
}
function continuePan(e) {
  if (!isPanning) return;
  const pos = getCanvasPointer(e);
  const dx = pos.x * dpr - panStart.x;
  const dy = pos.y * dpr - panStart.y;
  setOffsetX(panStart.ox + dx);
  setOffsetY(panStart.oy + dy);
  queueRenderAll();
  queueUpdateHud();
  updatePlayheadMarker();
  updateClipMarkers();
  onClearFx();
}
function endPan() {
  isPanning = false;
}

// ctrl move

const _ctrlMove = {
  active: false,
  pointerId: null,
  startCX: 0,
  startCY: 0,
  dx: 0,
  dy: 0,
  L: 0,
  F: 0,
  key: "#000000",
  canvas: null,
  ctx: null,
  snap: null,
  w: 0,
  h: 0
};

let rectSelection = {
    active: false,
    moving: false,
    L: null,
    F: null,
    key: null,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
    moveDx: 0,
    moveDy: 0,
    fullSnap: null,
    selSnap: null,
    pointerId: null
};

function beginCtrlMove(e) {
  if (activeLayer === PAPER_LAYER) return false;
  const leftDown = e.button === 0 || e.buttons === 1;
  if (!leftDown) return false;
  const picked = getActiveCelCanvasForMove();
  if (!picked.canvas) return false;
  const ctx = picked.canvas.getContext("2d", {
      willReadFrequently: true
  });
  if (!ctx) return false;
  const pos = getCanvasPointer(e);
  const cpt = screenToContent(pos.x, pos.y);
  _ctrlMove.active = true;
  _ctrlMove.pointerId = e.pointerId;
  _ctrlMove.startCX = cpt.x;
  _ctrlMove.startCY = cpt.y;
  _ctrlMove.dx = 0;
  _ctrlMove.dy = 0;
  _ctrlMove.L = picked.L;
  _ctrlMove.F = picked.F;
  _ctrlMove.key = picked.key;
  _ctrlMove.canvas = picked.canvas;
  _ctrlMove.ctx = ctx;
  _ctrlMove.w = picked.canvas.width | 0;
  _ctrlMove.h = picked.canvas.height | 0;
  try {
      _ctrlMove.snap = ctx.getImageData(0, 0, _ctrlMove.w, _ctrlMove.h);
  } catch {
      _ctrlMove.active = false;
      return false;
  }
  try {
      beginGlobalHistoryStep(_ctrlMove.L, _ctrlMove.F, _ctrlMove.key);
  } catch {}
  try {
      drawCanvas.setPointerCapture(e.pointerId);
  } catch {}
  return true;
}
function updateCtrlMove(e) {
  if (!_ctrlMove.active) return;
  const pos = getCanvasPointer(e);
  const cpt = screenToContent(pos.x, pos.y);
  const dx = Math.round(cpt.x - _ctrlMove.startCX);
  const dy = Math.round(cpt.y - _ctrlMove.startCY);
  if (dx === _ctrlMove.dx && dy === _ctrlMove.dy) return;
  _ctrlMove.dx = dx;
  _ctrlMove.dy = dy;
  const ctx = _ctrlMove.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, _ctrlMove.w, _ctrlMove.h);
  try {
      markGlobalHistoryDirty();
  } catch {}
  ctx.putImageData(_ctrlMove.snap, dx, dy);
  _ctrlMove.canvas._hasContent = true;
  if (typeof queueRenderAll === "function") queueRenderAll();
  if (typeof updateTimelineHasContent === "function") updateTimelineHasContent(_ctrlMove.F);
}
function endCtrlMove(e) {
  if (!_ctrlMove.active) return;
  try {
      const data = _ctrlMove.ctx.getImageData(0, 0, _ctrlMove.w, _ctrlMove.h).data;
      let any = false;
      for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 0) {
              any = true;
              break;
          }
      }
      _ctrlMove.canvas._hasContent = any;
  } catch {}
  _ctrlMove.active = false;
  try {
      drawCanvas.releasePointerCapture(_ctrlMove.pointerId);
  } catch {}
  if (typeof queueRenderAll === "function") queueRenderAll();
  if (typeof updateTimelineHasContent === "function") updateTimelineHasContent(_ctrlMove.F);
  try {
      commitGlobalHistoryStep();
  } catch {}
  _ctrlMove.pointerId = null;
  _ctrlMove.canvas = null;
  _ctrlMove.ctx = null;
  _ctrlMove.snap = null;
}

function clearRectSelection() {
    rectSelection.active = false;
    rectSelection.moving = false;
    rectSelection.fullSnap = null;
    rectSelection.selSnap = null;
    rectSelection.pointerId = null;
    rectSelection.moveDx = 0;
    rectSelection.moveDy = 0;
    queueRenderAll();
}
function drawRectSelectionOverlay(ctx) {
    if (!rectSelection.active) return;
    ctx.save();
    ctx.lineWidth = Math.max(1 / Math.max(getZoom(), 1), .75);
    ctx.setLineDash([ 6 / Math.max(getZoom(), 1), 4 / Math.max(getZoom(), 1) ]);
    ctx.strokeStyle = "#00e5ff";
    ctx.fillStyle = "rgba(0, 229, 255, 0.12)";
    ctx.fillRect(rectSelection.x, rectSelection.y, rectSelection.w, rectSelection.h);
    ctx.strokeRect(rectSelection.x, rectSelection.y, rectSelection.w, rectSelection.h);
    ctx.restore();
}
function beginRectSelect(e) {
    if (activeLayer === PAPER_LAYER) return;
    const pos = getCanvasPointer(e);
    const pt = screenToContent(pos.x, pos.y);
    const key = resolveKeyFor(activeLayer, activeSubColor?.[activeLayer] ?? currentColor);
    if (!key) return;
    if (rectSelection.active) {
        const inX = pt.x >= rectSelection.x && pt.x <= rectSelection.x + rectSelection.w;
        const inY = pt.y >= rectSelection.y && pt.y <= rectSelection.y + rectSelection.h;
        const sameTarget = rectSelection.L === activeLayer && rectSelection.F === currentFrame && rectSelection.key === key;
        if (inX && inY && sameTarget) {
            const c = getFrameCanvas(activeLayer, currentFrame, key);
            const ctx = c.getContext("2d", {
                willReadFrequently: true
            });
            if (!ctx) return;
            try {
                rectSelection.fullSnap = ctx.getImageData(0, 0, contentW, contentH);
                rectSelection.selSnap = ctx.getImageData(rectSelection.x, rectSelection.y, rectSelection.w, rectSelection.h);
            } catch {
                clearRectSelection();
                return;
            }
            rectSelection.moving = true;
            rectSelection.baseX = rectSelection.x;
            rectSelection.baseY = rectSelection.y;
            rectSelection.startX = pt.x;
            rectSelection.startY = pt.y;
            rectSelection.pointerId = e.pointerId ?? null;
            beginGlobalHistoryStep(activeLayer, currentFrame, key);
            return;
        }
    }
    rectSelection.active = true;
    rectSelection.moving = false;
    rectSelection.L = activeLayer;
    rectSelection.F = currentFrame;
    rectSelection.key = key;
    rectSelection.startX = pt.x;
    rectSelection.startY = pt.y;
    rectSelection.x = Math.floor(pt.x);
    rectSelection.y = Math.floor(pt.y);
    rectSelection.w = 1;
    rectSelection.h = 1;
    rectSelection.pointerId = e.pointerId ?? null;
    queueRenderAll();
}
function updateRectSelect(e) {
    if (!rectSelection.active) return;
    const pos = getCanvasPointer(e);
    const pt = screenToContent(pos.x, pos.y);
    if (rectSelection.moving) {
        const dx = Math.round(pt.x - rectSelection.startX);
        const dy = Math.round(pt.y - rectSelection.startY);
        if (dx === rectSelection.moveDx && dy === rectSelection.moveDy) return;
        rectSelection.moveDx = dx;
        rectSelection.moveDy = dy;
        rectSelection.x = Math.max(0, Math.min(contentW - rectSelection.w, rectSelection.baseX + dx));
        rectSelection.y = Math.max(0, Math.min(contentH - rectSelection.h, rectSelection.baseY + dy));
        const c = getFrameCanvas(rectSelection.L, rectSelection.F, rectSelection.key);
        const ctx = c.getContext("2d", {
            willReadFrequently: true
        });
        if (!ctx || !rectSelection.fullSnap || !rectSelection.selSnap) return;
        ctx.putImageData(rectSelection.fullSnap, 0, 0);
        ctx.clearRect(rectSelection.baseX, rectSelection.baseY, rectSelection.w, rectSelection.h);
        ctx.putImageData(rectSelection.selSnap, rectSelection.x, rectSelection.y);
        markGlobalHistoryDirty();
        c._hasContent = true;
        queueRenderAll();
        updateTimelineHasContent(rectSelection.F);
        return;
    }
    const x0 = rectSelection.startX;
    const y0 = rectSelection.startY;
    const x1 = pt.x;
    const y1 = pt.y;
    rectSelection.x = Math.max(0, Math.floor(Math.min(x0, x1)));
    rectSelection.y = Math.max(0, Math.floor(Math.min(y0, y1)));
    rectSelection.w = Math.max(1, Math.ceil(Math.abs(x1 - x0)));
    rectSelection.h = Math.max(1, Math.ceil(Math.abs(y1 - y0)));
    rectSelection.w = Math.min(rectSelection.w, contentW - rectSelection.x);
    rectSelection.h = Math.min(rectSelection.h, contentH - rectSelection.y);
    queueRenderAll();
}
function endRectSelect() {
    if (!rectSelection.active) return;
    if (rectSelection.moving) {
        rectSelection.moving = false;
        rectSelection.baseX = rectSelection.x;
        rectSelection.baseY = rectSelection.y;
        rectSelection.fullSnap = null;
        rectSelection.selSnap = null;
        commitGlobalHistoryStep();
        queueRenderAll();
        return;
    }
    const c = getFrameCanvas(rectSelection.L, rectSelection.F, rectSelection.key);
    const ctx = c.getContext("2d", {
        willReadFrequently: true
    });
    if (!ctx) {
        clearRectSelection();
        return;
    }
    let img;
    try {
        img = ctx.getImageData(rectSelection.x, rectSelection.y, rectSelection.w, rectSelection.h);
    } catch {
        clearRectSelection();
        return;
    }
    let hasAlpha = false;
    for (let i = 3; i < img.data.length; i += 4) {
        if (img.data[i] > 0) {
            hasAlpha = true;
            break;
        }
    }
    if (!hasAlpha) {
        clearRectSelection();
        return;
    }
    queueRenderAll();
}