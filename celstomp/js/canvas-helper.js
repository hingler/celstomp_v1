const CANVAS_TYPE = {
  boundsCanvas: 0,
  drawCanvas: 1,
  fxCanvas: 2
}

function getCanvas(t) {
  switch(t) {
    case CANVAS_TYPE.boundsCanvas:
      return $("boundsCanvas");
    case CANVAS_TYPE.drawCanvas:
      return $("drawCanvas");
    case CANVAS_TYPE.fxCanvas:
      return $("fxCanvas");
    default:
      return null;
  }
}

function getCanvasPointer(e) {
  const drawCanvas = $("drawCanvas");
  const rect = drawCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return {
      x: x,
      y: y
  };
}

function screenToContent(sx, sy) {
  const dpr = window.devicePixelRatio || 1;
  const devX = sx * dpr;
  const devY = sy * dpr;
  const cx = (devX - getOffsetX()) / (getZoom() * dpr);
  const cy = (devY - getOffsetY()) / (getZoom() * dpr);
  return {
      x: cx,
      y: cy
  };
}

function resizeCanvases() {
  const stageEl = $("stage");

  dpr = window.devicePixelRatio || 1;
  const cw = stageEl.clientWidth || stageEl.getBoundingClientRect().width || window.innerWidth;
  const ch = stageEl.clientHeight || stageEl.getBoundingClientRect().height || window.innerHeight;
  if (cw < 10 || ch < 10) {
      console.warn("[celstomp] stage has no size yet:", {
          cw: cw,
          ch: ch,
          stage: stageEl
      });
      requestAnimationFrame(resizeCanvases);
      return;
  }

  // back
  const boundsCanvas = $("boundsCanvas");
        
  // mid
  const drawCanvas = $("drawCanvas");

  // front
  const fxCanvas = $("fxCanvas");


  for (const c of [ boundsCanvas, drawCanvas, fxCanvas ]) {
      c.style.width = cw + "px";
      c.style.height = ch + "px";
      c.width = Math.max(1, Math.floor(cw * dpr));
      c.height = Math.max(1, Math.floor(ch * dpr));
  }
  queueRenderAll();
  queueClearFx();
  initBrushCursorPreview(drawCanvas);
}

function setTransform(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(getZoom() * dpr, 0, 0, getZoom() * dpr, getOffsetX(), getOffsetY());
}

function centerView() {
  const drawCanvas = getCanvas(CANVAS_TYPE.drawCanvas);
  const cw = drawCanvas.width;
  const ch = drawCanvas.height;
  setOffsetX((cw - contentW * getZoom() * dpr) / 2);
  setOffsetY((ch - contentH * getZoom() * dpr) / 2);
  updateHUD();
  renderAll();
  updatePlayheadMarker();
  updateClipMarkers();
}
function resetCenter() {
  setZoom(1);
  centerView();
}