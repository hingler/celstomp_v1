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