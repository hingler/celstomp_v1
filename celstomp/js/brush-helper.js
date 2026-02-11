let _brushPrevEl = null;
let _brushPrevCanvas = null;
let _brushPrevLastEvt = null;
let _brushPrevRAF = 0;
let _brushPrevLastXY = null;
let brushType = "circle";

let eraserSize = 100;
const DEFAULT_TOOL_BRUSH_SETTINGS = {
    shape: "circle",
    size: 3,
    opacity: 1,
    angle: 0
};
const DEFAULT_TOOL_ERASER_SETTINGS = {
    shape: "circle",
    size: 100,
    opacity: 1,
    angle: 0
};
let brushSettings = {
    ...DEFAULT_TOOL_BRUSH_SETTINGS
};
let eraserSettings = {
    ...DEFAULT_TOOL_ERASER_SETTINGS
};
brushType = brushSettings.shape;
brushSize = brushSettings.size;
eraserSize = eraserSettings.size;

let antiAlias = false;
let closeGapPx = 0;

function initBrushCursorPreview(inputCanvasEl) {
    _brushPrevCanvas = inputCanvasEl;
    _brushPrevEl = document.getElementById("brushCursorPreview");
    if (!_brushPrevCanvas || !_brushPrevEl) return;
    let hovering = false;
    let down = false;
    const show = () => {
        _brushPrevEl.style.display = "block";
    };
    const hide = () => {
        _brushPrevEl.style.display = "none";
    };
    _brushPrevCanvas.addEventListener("pointerenter", () => {
        hovering = true;
        show();
        scheduleBrushPreviewUpdate(true);
    });
    _brushPrevCanvas.addEventListener("pointerleave", () => {
        hovering = false;
        if (!down) hide();
    });
    _brushPrevCanvas.addEventListener("pointermove", e => {
        _brushPrevLastEvt = e;
        _brushPrevLastXY = {
            x: e.clientX,
            y: e.clientY
        };
        scheduleBrushPreviewUpdate();
    });
    _brushPrevCanvas.addEventListener("pointerdown", e => {
        down = true;
        _brushPrevLastEvt = e;
        _brushPrevLastXY = {
            x: e.clientX,
            y: e.clientY
        };
        show();
        scheduleBrushPreviewUpdate(true);
    });
    window.addEventListener("pointerup", () => {
        down = false;
        if (!hovering) hide();
        scheduleBrushPreviewUpdate(true);
    }, {
        passive: true
    });
    _brushPrevCanvas.addEventListener("wheel", () => {
        scheduleBrushPreviewUpdate(true);
    }, {
        passive: true
    });
    try {
        brushSizeInput?.addEventListener("input", () => scheduleBrushPreviewUpdate(true));
    } catch {}
    try {
        eraserSizeInput?.addEventListener("input", () => scheduleBrushPreviewUpdate(true));
    } catch {}
    document.addEventListener("change", e => {
        const t = e.target;
        if (!(t instanceof HTMLInputElement)) return;
        if (t.name === "brush" || t.name === "brushShape" || t.name === "tool") scheduleBrushPreviewUpdate(true);
    }, {
        passive: true
    });
    hide();
  }
  

function brushShapeForType(kind) {
    const t = String(kind || "circle");
    if (t === "circle" || t === "square" || t === "diamond" || t === "oval-h" || t === "oval-v" || t === "rect-h" || t === "rect-v" || t === "triangle") return t;
    return "circle";
}
function brushShapeDimensions(shape, size) {
    const s = Math.max(1, Math.round(size || 1));
    switch (brushShapeForType(shape)) {
        case "oval-h":
            return {
                w: s,
                h: Math.max(1, Math.round(s * 0.55))
            };
        case "oval-v":
            return {
                w: Math.max(1, Math.round(s * 0.55)),
                h: s
            };
        case "rect-h":
            return {
                w: s,
                h: Math.max(1, Math.round(s * 0.4))
            };
        case "rect-v":
            return {
                w: Math.max(1, Math.round(s * 0.4)),
                h: s
            };
        default:
            return {
                w: s,
                h: s
            };
    }
}
function clamp01(v) {
    return Math.max(0, Math.min(1, Number(v) || 0));
}
function mergeBrushSettings(base, patch) {
    const next = {
        ...base,
        ...patch
    };
    next.shape = brushShapeForType(next.shape);
    next.size = Math.max(1, Math.round(next.size || 1));
    next.opacity = clamp01(next.opacity);
    next.angle = Math.max(-90, Math.min(90, Math.round(Number(next.angle) || 0)));
    return next;
}

function stampLine(ctx, x0, y0, x1, y1, sourceSettings, color, alpha = 1, composite = "source-over") {
    const settings = normalizedBrushRenderSettings(sourceSettings);
    const stamp = getBrushStamp(settings, color);
    const dx = x1 - x0, dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const step = Math.max(1, settings.size * .5);
    const n = Math.max(1, Math.ceil(dist / step));
    const nx = dx / n, ny = dy / n;
    ctx.save();
    ctx.globalCompositeOperation = composite;
    ctx.globalAlpha = clamp01(alpha) * clamp01(settings.opacity);
    ctx.fillStyle = color;
    for (let i = 0; i <= n; i++) {
        const px = Math.round(x0 + nx * i - stamp.ox);
        const py = Math.round(y0 + ny * i - stamp.oy);
        ctx.drawImage(stamp.canvas, px, py);
    }
    try {
        markGlobalHistoryDirty();
    } catch {}
    ctx.restore();
}

function normalizedBrushRenderSettings(source) {
    return mergeBrushSettings(DEFAULT_TOOL_BRUSH_SETTINGS, source || {});
}

const _brushMaskCache = new Map();
const _brushStampCache = new Map();
function brushMaskCacheKey(settings) {
    return `${settings.shape}|${settings.size}|${settings.angle}`;
}
function brushStampCacheKey(settings, color) {
    return `${brushMaskCacheKey(settings)}|${color}`;
}

function getBrushMask(sourceSettings) {
    const settings = normalizedBrushRenderSettings(sourceSettings);
    const key = brushMaskCacheKey(settings);
    const cached = _brushMaskCache.get(key);
    if (cached) return cached;

    const dim = brushShapeDimensions(settings.shape, settings.size);
    const w = dim.w;
    const h = dim.h;
    const cx = w / 2;
    const cy = h / 2;
    const rx = Math.max(0.5, w / 2);
    const ry = Math.max(0.5, h / 2);
    const shape = settings.shape;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", {
        willReadFrequently: true
    });

    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const px = x + 0.5;
            const py = y + 0.5;
            let inside = false;
            if (shape === "circle" || shape === "oval-h" || shape === "oval-v") {
                const nx = (px - cx) / rx;
                const ny = (py - cy) / ry;
                inside = nx * nx + ny * ny <= 1;
            } else if (shape === "square" || shape === "rect-h" || shape === "rect-v") {
                inside = true;
            } else if (shape === "diamond") {
                const nx = Math.abs((px - cx) / rx);
                const ny = Math.abs((py - cy) / ry);
                inside = nx + ny <= 1;
            } else if (shape === "triangle") {
                const tx = (px - cx) / rx;
                const ty = (py - cy) / ry;
                inside = ty <= 1 && ty >= -1 && Math.abs(tx) <= (1 - (ty + 1) / 2);
            }
            if (!inside) continue;
            const i = (y * w + x) * 4;
            d[i + 0] = 255;
            d[i + 1] = 255;
            d[i + 2] = 255;
            d[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);

    const angle = Number(settings.angle || 0);
    let outCanvas = canvas;
    if (angle !== 0) {
        const rad = angle * Math.PI / 180;
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));
        const rw = Math.max(1, Math.ceil(w * cos + h * sin));
        const rh = Math.max(1, Math.ceil(w * sin + h * cos));
        const rc = document.createElement("canvas");
        rc.width = rw;
        rc.height = rh;
        const rctx = rc.getContext("2d");
        rctx.imageSmoothingEnabled = false;
        rctx.translate(rw / 2, rh / 2);
        rctx.rotate(rad);
        rctx.drawImage(canvas, -w / 2, -h / 2);
        outCanvas = rc;
    }

    const out = {
        canvas: outCanvas,
        w: outCanvas.width,
        h: outCanvas.height,
        ox: Math.floor(outCanvas.width / 2),
        oy: Math.floor(outCanvas.height / 2)
    };
    _brushMaskCache.set(key, out);
    return out;
}
function getBrushStamp(sourceSettings, colorRaw) {
    const settings = normalizedBrushRenderSettings(sourceSettings);
    const color = colorToHex(colorRaw || "#000000");
    const key = brushStampCacheKey(settings, color);
    const cached = _brushStampCache.get(key);
    if (cached) return cached;

    const mask = getBrushMask(settings);
    const canvas = document.createElement("canvas");
    canvas.width = mask.w;
    canvas.height = mask.h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, mask.w, mask.h);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mask.canvas, 0, 0);
    ctx.globalCompositeOperation = "source-over";

    const out = {
        canvas: canvas,
        w: mask.w,
        h: mask.h,
        ox: mask.ox,
        oy: mask.oy
    };
    _brushStampCache.set(key, out);
    return out;
}

function scheduleBrushPreviewUpdate(force = false) {
    if (!_brushPrevEl || !_brushPrevCanvas) return;
    if (_brushPrevRAF && !force) return;
    _brushPrevRAF = requestAnimationFrame(() => {
        _brushPrevRAF = 0;
        updateBrushPreview();
    });
}
function getActiveToolKindForPreview() {
    return String(typeof tool !== "undefined" && tool ? tool : "");
}
function getBrushSizeForPreview(toolKind) {
    if (toolKind === "eraser") return Number(eraserSettings?.size ?? eraserSize ?? 8);
    return Number(brushSettings?.size ?? brushSize ?? 6);
}
function updateBrushPreview() {
    if (!_brushPrevEl || !_brushPrevCanvas) return;
    const toolKind = getActiveToolKindForPreview();
    const isBrush = toolKind === "brush";
    const isEraser = toolKind === "eraser";
    if (!isBrush && !isEraser) {
        _brushPrevEl.style.display = "none";
        return;
    }
    const pt = _brushPrevLastXY;
    if (!pt) return;
    const cx = pt.x;
    const cy = pt.y;
    const z = typeof getZoom() === "number" && isFinite(getZoom()) ? getZoom() : 1;
    const settings = isEraser ? eraserSettings : brushSettings;
    const renderSettings = normalizedBrushRenderSettings(settings);
    const shape = brushShapeForType(renderSettings.shape || "circle");
    const sizeContentPx = Math.max(1, renderSettings.size || getBrushSizeForPreview(isEraser ? "eraser" : "brush"));
    const dim = brushShapeDimensions(shape, sizeContentPx);
    const widthCssPx = Math.max(2, dim.w * z);
    const heightCssPx = Math.max(2, dim.h * z);
    _brushPrevEl.classList.remove("simple");
    _brushPrevEl.classList.toggle("eraser", !!isEraser);
    _brushPrevEl.style.border = "1px solid rgba(255,255,255,.95)";
    _brushPrevEl.style.boxShadow = "0 0 0 1px rgba(0,0,0,.78)";
    _brushPrevEl.style.borderStyle = isEraser ? "dashed" : "solid";
    _brushPrevEl.style.left = `${cx}px`;
    _brushPrevEl.style.top = `${cy}px`;
    _brushPrevEl.style.width = `${widthCssPx}px`;
    _brushPrevEl.style.height = `${heightCssPx}px`;
    _brushPrevEl.style.borderRadius = "0";
    _brushPrevEl.style.clipPath = "none";
    let shapeRotation = 0;
    if (shape === "circle" || shape === "oval-h" || shape === "oval-v") {
        _brushPrevEl.style.borderRadius = "999px";
    } else if (shape === "diamond") {
        shapeRotation = 45;
    } else if (shape === "triangle") {
        _brushPrevEl.style.clipPath = "polygon(50% 0%, 100% 100%, 0% 100%)";
    }
    _brushPrevEl.style.transform = `translate(-50%, -50%) rotate(${shapeRotation + (renderSettings.angle || 0)}deg)`;
    _brushPrevEl.style.display = "block";
}