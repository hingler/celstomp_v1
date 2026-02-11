clipStart = 0;
clipEnd = Math.max(0, Math.min(totalFrames - 1, fps * 2 - 1));

let isPlaying = false;
let playTimer = null;
let loopPlayback = true;
let playSnapped = false;

function buildTimeline() {
  totalFrames = fps * seconds;
  for (const layer of layers) {
      if (!layer?.sublayers || !layer?.suborder) continue;
      for (const key of layer.suborder) {
          const sub = layer.sublayers.get(key);
          if (!sub) continue;
          const old = sub.frames || [];
          const n = new Array(totalFrames).fill(null);
          const copy = Math.min(old.length, n.length);
          for (let i = 0; i < copy; i++) n[i] = old[i];
          sub.frames = n;
      }
  }
  layers.forEach(l => {
      const old = l.frames;
      const n = new Array(totalFrames).fill(null);
      const copy = Math.min(old.length, n.length);
      for (let i = 0; i < copy; i++) n[i] = old[i];
      l.frames = n;
  });
  clipStart = clamp(clipStart, 0, totalFrames - 1);
  clipEnd = clamp(clipEnd, clipStart, totalFrames - 1);
  $("timelineTable").innerHTML = "";
  const playRow = document.createElement("tr");
  playRow.className = "playhead-row";
  const phTh = document.createElement("th");
  phTh.className = "sticky";
  phTh.id = "playheadSticky";
  phTh.textContent = "Playhead";
  playRow.appendChild(phTh);
  for (let i = 0; i < totalFrames; i++) {
      const td = document.createElement("td");
      td.dataset.index = String(i);
      if (i % fps === 0) td.textContent = `${i / fps}s`;
      playRow.appendChild(td);
  }
  $("timelineTable").appendChild(playRow);
  const tr = document.createElement("tr");
  tr.className = "anim-row";
  const th = document.createElement("th");
  th.className = "sticky";
  th.textContent = "Animation";
  tr.appendChild(th);
  for (let i = 0; i < totalFrames; i++) {
      const td = document.createElement("td");
      td.dataset.index = String(i);
      if (i % fps === 0) td.classList.add("secondTick");
      if (hasCel(i)) td.classList.add("hasContent");
      tr.appendChild(td);
  }
  $("timelineTable").appendChild(tr);
  currentFrame = clamp(currentFrame, 0, totalFrames - 1);
  pruneSelection();
  highlightTimelineCell();
  updatePlayheadMarker();
  updateClipMarkers();
}
function highlightTimelineCell() {
  const tr = $("timelineTable").querySelector("tr.anim-row");
  if (!tr) return;
  [ ...tr.children ].forEach((cell, idx) => {
      if (idx === 0) return;
      const f = idx - 1;
      cell.classList.toggle("active", f === currentFrame);
      cell.classList.toggle("hasContent", hasCel(f));
      cell.classList.toggle("selected", selectedCels.has(f));
      cell.classList.toggle("ghostTarget", ghostTargets.has(f));
  });
  const ph = $("playheadSticky");
  if (ph) ph.textContent = `Playhead — ${sfString(currentFrame)}`;
}

function sfString(f) {
  const o = framesToSF(f);
  return `${o.s}s+${o.f}f`;
}

function framesToSF(f) {
  return {
      s: Math.floor(f / fps),
      f: f % fps
  };
}

function updateTimelineHasContent(F) {
  const tr = $("timelineTable").querySelector("tr.anim-row");
  if (!tr) return;
  const td = tr.children[F + 1];
  if (!td) return;
  td.classList.toggle("hasContent", hasCel(F));
}
function refreshTimelineRowHasContentAll() {
  const tr = $("timelineTable").querySelector("tr.anim-row");
  if (!tr) return;
  for (let F = 0; F < totalFrames; F++) {
      const td = tr.children[F + 1];
      if (td) td.classList.toggle("hasContent", hasCel(F));
  }
  try {
      highlightTimelineCell?.();
  } catch {}
}
function fallbackSwatchKeyForLayer(L) {
  if (L == null || L === PAPER_LAYER) return null;
  const layer = layers?.[L];
  const ord = layer?.suborder || [];
  const map = layer?.sublayers;
  for (const k of ord) {
      if (k && map?.get?.(k)) return k;
  }
  if (L === LAYER.FILL) return fillWhite || "#FFFFFF";
  try {
      return rememberedColorForLayer?.(L) ?? "#000000";
  } catch {}
  return "#000000";
}
function migrateHistoryForSwatchMove(srcL, dstL, key) {
  if (!historyMap || srcL == null || dstL == null) return;
  const srcK = typeof resolveKeyFor === "function" ? resolveKeyFor(srcL, key) : key;
  const dstK = typeof resolveKeyFor === "function" ? resolveKeyFor(dstL, key) : key;
  for (let F = 0; F < totalFrames; F++) {
      const from = historyKey(srcL, F, srcK);
      const to = historyKey(dstL, F, dstK);
      const srcHist = historyMap.get(from);
      if (!srcHist) continue;
      const dstHist = historyMap.get(to);
      if (!dstHist) {
          historyMap.set(to, srcHist);
      } else {
          dstHist.undo = [ ...dstHist.undo, ...srcHist.undo ].slice(-historyLimit);
          dstHist.redo = [ ...dstHist.redo, ...srcHist.redo ].slice(-historyLimit);
      }
      historyMap.delete(from);
  }
}
function updatePlayheadMarker() {
  const playRow = $("timelineTable").querySelector("tr.playhead-row");
  if (!playRow) return;
  const targetCell = playRow.children[currentFrame + 1];
  if (!targetCell) return;
  const cellRect = targetCell.getBoundingClientRect();
  const scrollRect = $("timelineScroll").getBoundingClientRect();
  const leftInScroll = cellRect.left - scrollRect.left + $("timelineScroll").scrollLeft;
  $("playheadMarker").style.left = Math.round(leftInScroll) + "px";
}
function edgeLeftPxOfFrame(frameIndex) {
  const playRow = $("timelineTable").querySelector("tr.playhead-row");
  const cell = playRow?.children[frameIndex + 1];
  if (!cell) return 0;
  const cellRect = cell.getBoundingClientRect();
  const scrollRect = $("timelineScroll").getBoundingClientRect();
  return cellRect.left - scrollRect.left + $("timelineScroll").scrollLeft;
}
function updateClipMarkers() {
  $("clipStartMarker").style.left = Math.round(edgeLeftPxOfFrame(clipStart)) + "px";
  $("clipEndMarker").style.left = Math.round(edgeLeftPxOfFrame(clipEnd)) + "px";
}
function applySnapFrom(start, i) {
  if (snapFrames > 0) {
      const delta = i - start;
      return clamp(start + Math.round(delta / snapFrames) * snapFrames, 0, totalFrames - 1);
  }
  return clamp(i, 0, totalFrames - 1);
}
function stepBySnap(delta) {
  if (snapFrames > 0) return clamp(currentFrame + delta * snapFrames, 0, totalFrames - 1);
  return clamp(currentFrame + delta, 0, totalFrames - 1);
}
function gotoFrame(i) {
  currentFrame = clamp(i, 0, totalFrames - 1);
  queueUpdateHud();
  queueRenderAll();
  updatePlayheadMarker();
  const playRow = $("timelineTable").querySelector("tr.playhead-row");
  const cell = playRow?.children[currentFrame + 1];
  if (!cell) return;
  const r = cell.getBoundingClientRect();
  const sr = $("timelineScroll").getBoundingClientRect();
  const left = r.left - sr.left + $("timelineScroll").scrollLeft;
  const right = left + r.width;
  if (left < $("timelineScroll").scrollLeft) $("timelineScroll").scrollLeft = left - 20; else if (right > $("timelineScroll").scrollLeft + $("timelineScroll").clientWidth) {
    $("timelineScroll").scrollLeft = right - $("timelineScroll").clientWidth + 20;
  }
}

function captureFrameBundle(F) {
  const bundle = new Array(LAYERS_COUNT);
  for (let L = 0; L < LAYERS_COUNT; L++) {
      const layer = layers[L];
      const m = new Map;
      if (layer?.sublayers && layer?.suborder) {
          for (const key of layer.suborder) {
              const sub = layer.sublayers.get(key);
              const c = sub?.frames?.[F];
              if (c && c._hasContent) m.set(key, c);
          }
      }
      bundle[L] = m;
  }
  return bundle;
}

function cloneCanvasDeep(src) {
  if (!src) return null;
  const c = document.createElement("canvas");
  c.width = src.width || contentW;
  c.height = src.height || contentH;
  const ctx = c.getContext("2d");
  ctx.drawImage(src, 0, 0);
  c._hasContent = !!src._hasContent;
  return c;
}

function cloneFrameBundleDeep(bundle) {
  const out = new Array(LAYERS_COUNT);
  for (let L = 0; L < LAYERS_COUNT; L++) {
      const src = bundle[L];
      const dst = new Map;
      if (src && src.size) {
          for (const [key, c] of src) dst.set(key, cloneCanvasDeep(c));
      }
      out[L] = dst;
  }
  return out;
}
function pasteFrameBundle(F, bundle) {
  clearFrameAllLayers(F);
  for (let L = 0; L < LAYERS_COUNT; L++) {
      const m = bundle[L];
      if (!m || !m.size) continue;
      for (const [key, c] of m) {
          const sub = ensureSublayer(L, key);
          sub.frames[F] = c;
      }
  }
}
function moveFrameAllLayers(fromF, toF) {
  if (fromF === toF) return;
  clearFrameAllLayers(toF);
  for (let L = 0; L < LAYERS_COUNT; L++) {
      const layer = layers[L];
      if (!layer?.sublayers || !layer?.suborder) continue;
      for (const key of layer.suborder) {
          const sub = layer.sublayers.get(key);
          if (!sub?.frames) continue;
          const c = sub.frames[fromF];
          if (c) sub.frames[toF] = c;
          sub.frames[fromF] = null;
      }
  }
}
function duplicateCelFrames(srcF, dstF) {
  if (srcF < 0 || dstF < 0 || srcF === dstF) return false;
  if (!hasCel(srcF)) return false;
  const srcBundle = captureFrameBundle(srcF);
  const copy = cloneFrameBundleDeep(srcBundle);
  pasteFrameBundle(dstF, copy);
  queueRenderAll();
  buildTimeline();
  gotoFrame(dstF);
  try {
      setSingleSelection(dstF);
  } catch {}
  return true;
}
function onDuplicateCel() {
  const F = currentFrame;
  if (hasCel(F)) {
      const nextIdx = nearestNextCelIndex(F);
      if (nextIdx === F + 1) return;
      const prevIdx = nearestPrevCelIndex(F);
      const step = prevIdx >= 0 ? Math.max(1, F - prevIdx) : Math.max(1, snapFrames);
      let dst = F + step;
      if (dst >= totalFrames) dst = totalFrames - 1;
      if (hasCel(dst)) return;
      duplicateCelFrames(F, dst);
  } else {
      const left = nearestPrevCelIndex(F);
      if (left < 0) return;
      if (hasCel(F)) return;
      duplicateCelFrames(left, F);
  }
}
function gotoPrevCel() {
  const p = nearestPrevCelIndex(currentFrame > 0 ? currentFrame : 0);
  if (p >= 0) gotoFrame(p);
}
function gotoNextCel() {
  const n = nearestNextCelIndex(currentFrame);
  if (n >= 0) gotoFrame(n);
}
let selectedCels = new Set;
let selectingCels = false;
let selAnchor = -1;
let selLast = -1;
let ghostTargets = new Set;
function clearGhostTargets() {
  if (!ghostTargets.size) return;
  ghostTargets.clear();
  highlightTimelineCell();
}
function computeGhostDestsForStart(startFrame) {
  const frames = selectedSorted();
  if (!frames.length) return [];
  const base = frames[0];
  let shift = startFrame - base;
  const minDest = frames[0] + shift;
  const maxDest = frames[frames.length - 1] + shift;
  if (minDest < 0) shift += -minDest;
  if (maxDest > totalFrames - 1) shift -= maxDest - (totalFrames - 1);
  return frames.map(f => f + shift);
}
function setGhostTargetsForStart(startFrame) {
  const dests = computeGhostDestsForStart(startFrame);
  ghostTargets = new Set(dests);
  highlightTimelineCell();
}
function setGhostTargetSingle(frame) {
  ghostTargets = new Set([ frame ]);
  highlightTimelineCell();
}
let groupDragActive = false;
let groupDropStart = -1;
function selectedSorted() {
  return Array.from(selectedCels).sort((a, b) => a - b);
}
function pruneSelection() {
  if (!selectedCels.size) return;
  const next = new Set;
  for (const f of selectedCels) {
      if (f >= 0 && f < totalFrames && hasCel(f)) next.add(f);
  }
  selectedCels = next;
}
function clearCelSelection() {
  selectedCels.clear();
  selAnchor = -1;
  selLast = -1;
  highlightTimelineCell();
}
function setSingleSelection(f) {
  selectedCels = new Set(hasCel(f) ? [ f ] : []);
  selAnchor = f;
  selLast = f;
  highlightTimelineCell();
}
function setSelectionRange(a, b) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const next = new Set;
  for (let i = lo; i <= hi; i++) {
      if (hasCel(i)) next.add(i);
  }
  selectedCels = next;
  highlightTimelineCell();
}
function clearFrameAllLayers(F) {
  for (let L = 0; L < LAYERS_COUNT; L++) {
      const layer = layers[L];
      if (!layer) continue;
      if (!layer.sublayers) layer.sublayers = new Map;
      if (!layer.suborder) layer.suborder = [];
      for (const key of layer.suborder) {
          const sub = layer.sublayers.get(key);
          if (sub?.frames) sub.frames[F] = null;
      }
  }
}
function getCelBundle(F) {
  const bundle = new Array(LAYERS_COUNT);
  for (let L = 0; L < LAYERS_COUNT; L++) {
      const layer = layers[L];
      const entries = [];
      if (layer?.sublayers && layer?.suborder) {
          for (const key of layer.suborder) {
              const sub = layer.sublayers.get(key);
              const c = sub?.frames?.[F];
              if (c && c._hasContent) entries.push([ key, c ]);
          }
      }
      bundle[L] = entries;
  }
  return bundle;
}
function setCelBundle(F, bundle) {
  clearFrameAllLayers(F);
  for (let L = 0; L < LAYERS_COUNT; L++) {
      const entries = bundle[L] || [];
      for (const [key, canvas] of entries) {
          if (!canvas) continue;
          const sub = ensureSublayer(L, key);
          sub.frames[F] = canvas;
      }
  }
}
function moveCelBundle(fromF, toF) {
  if (fromF === toF) return;
  const b = getCelBundle(fromF);
  setCelBundle(toF, b);
  clearFrameAllLayers(fromF);
}

function hasCel(F) {
  return MAIN_LAYERS.some(L => mainLayerHasContent(L, F));
}