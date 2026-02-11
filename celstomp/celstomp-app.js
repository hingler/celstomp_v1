



(() => {
    "use strict";

    
    

    // shorthand funcs (more of)

    // -- above this point: looks like helper functions

    function ready(fn) {
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {
            once: true
        }); else fn();
    }
    
    ready(() => {
        let contentW = 960;
        let contentH = 540;
        
        const stageEl = $("stage");

        function ensureChild(parent, el) {
            if (!parent || !el) return false;
            if (el.parentElement !== parent) {
                parent.appendChild(el);
            }

            return true;
        }

        // back
        const boundsCanvas = getCanvas(CANVAS_TYPE.boundsCanvas);
        
        // mid
        const drawCanvas = getCanvas(CANVAS_TYPE.drawCanvas);

        // front
        const fxCanvas = getCanvas(CANVAS_TYPE.fxCanvas);

        // mostly sanity checks
        if (!stageEl || !boundsCanvas || !getCanvas(CANVAS_TYPE.drawCanvas) || !fxCanvas) {
            console.warn("[celstomp] Missing required DOM: #stage/#boundsCanvas/#drawCanvas/#fxCanvas");
            return;
        }

        ensureChild(stageEl, boundsCanvas);
        ensureChild(stageEl, getCanvas(CANVAS_TYPE.drawCanvas));
        ensureChild(stageEl, fxCanvas);

        const bctx = boundsCanvas.getContext("2d");
        const dctx = getCanvas(CANVAS_TYPE.drawCanvas).getContext("2d", {
            desynchronized: true
        }) || getCanvas(CANVAS_TYPE.drawCanvas).getContext("2d");
        const fxctx = fxCanvas.getContext("2d");
        if (!(boundsCanvas instanceof HTMLCanvasElement) || !(getCanvas(CANVAS_TYPE.drawCanvas) instanceof HTMLCanvasElement) || !(fxCanvas instanceof HTMLCanvasElement) || !bctx || !dctx || !fxctx) {
            console.warn("[celstomp] Canvas/context init failed:", {
                boundsCanvas: boundsCanvas,
                drawCanvas: drawCanvas,
                fxCanvas: fxCanvas,
                bctx: bctx,
                dctx: dctx,
                fxctx: fxctx
            });
            return;
        }

        const loopToggle = $("loopToggle");
        const snapValue = $("snapValue");
        const bgColorInput = $("bgColor");
        const aaToggle = $("aaToggle");
        const toggleOnionBtn = $("toggleOnion");
        const toggleTransparencyBtn = $("toggleTransparency");

        const onionPrevColorInput = $("onionPrevColor");
        const onionNextColorInput = $("onionNextColor");
        const onionAlphaInput = $("onionAlpha");
        const onionAlphaVal = $("onionAlphaVal");
        const playSnappedChk = $("playSnapped");

        const dupCelBtn = $("dupCelBtn");
        const tlPrevCelBtn = $("tlPrevCel");
        const tlNextCelBtn = $("tlNextCel");
        const tlPlayBtn = $("tlPlay");
        const tlPauseBtn = $("tlPause");
        const tlStopBtn = $("tlStop");
        const tlDupBtn = $("tlDupCel");

        const keepOnionPlayingChk = $("keepOnionPlaying");
        const keepTransPlayingChk = $("keepTransPlaying");

        const gapPxInput = $("gapPx");
        const autofillToggle = $("autofillToggle");
        const fillCurrentBtn = $("fillCurrent");
        const fillAllBtn = $("fillAll");
        const chooseFillEraserBtn = $("chooseFillEraser");
        const chooseFillBrushBtn = $("chooseFillBrush");
        const chooseLassoFillBtn = $("chooseLassoFill");
        const addPaletteColorBtn = $("addPaletteColor");
        const clearAllBtn = $("clearAllBtn");

        const defLInput = $("defL");
        const defCInput = $("defC");
        const defHInput = $("defH");
        const saveOklchDefaultBtn = $("saveOklchDefault");
        const oklchDefaultStatus = $("oklchDefaultStatus");

        const toolSeg = $("toolSeg");
        const brushShapeSeg = $("brushShapeSeg");
        const toolSettingsSection = $("toolSettingsSection");
        const toolSettingsTitle = $("toolSettingsTitle");
        const toolFoldBrushesBtn = $("toolFoldBrushesBtn");
        const toolFoldBrushesBody = $("toolFoldBrushesBody");
        const toolFoldSettingsBtn = $("toolFoldSettingsBtn");
        const toolFoldSettingsBody = $("toolFoldSettingsBody");
        const brushShapeTooltip = $("brushShapeTooltip");
        const eraserOptionsPopup = $("eraserOptionsPopup");


        // v different syntax for doing the same thing
        toolSeg.addEventListener("contextmenu", e => {
            const lab = e.target.closest("label[data-tool]");
            if (!lab) return;
            const tool = lab.dataset.tool;
            if (tool !== "eraser" && tool !== "fill-eraser") return;
            e.preventDefault();
            const inputId = lab.getAttribute("for");
            const input = inputId ? $(inputId) : null;
            if (input) input.checked = true;
            openPopupAt(eraserOptionsPopup, e.clientX + 6, e.clientY + 6);
        });
        document.addEventListener("mousedown", e => {
            if (!eraserOptionsPopup) return;
            if (!eraserOptionsPopup.contains(e.target)) closePopup(eraserOptionsPopup);
        });
        document.addEventListener("keydown", e => {
            if (e.key === "Escape") closePopup(eraserOptionsPopup);
        });


        const brushSizeInput = $("brushSize") || $("brushSizeRange");
        const brushSizeNumInput = $("brushSizeNum");
        const eraserSizeInput = $("eraserSize");
        const toolOpacityRange = $("toolOpacityRange");
        const toolAngleRange = $("toolAngleRange");
        const eraserVal = $("eraserVal");
        const exportMP4Btn = $("exportMP4");
        const toggleAutosaveBtn = $("toggleAutosaveBtn");
        const autosaveIntervalBtn = $("autosaveIntervalBtn");
        const exportImgSeqBtn = $("exportImgSeqBtn") || $("exportImgSeq");
        const clearAllModal = $("clearAllModal");
        const clearAllModalBackdrop = $("clearAllModalBackdrop");
        const clearAllConfirmBtn = $("clearAllConfirmBtn");
        const clearAllCancelBtn = $("clearAllCancelBtn");
        const exportGIFBtn = $("exportGIFBtn");

        const stabilizationSelect = $("stabilizationLevel");
        const pressureSizeToggle = $("pressureSize") || $("usePressureSize");
        const pressureOpacityToggle = $("pressureOpacity") || $("usePressureOpacity");
        const pressureTiltToggle = $("pressureTilt") || $("usePressureTilt");

        const fitViewBtn = $("fitView");
        const jumpStartBtn = $("jumpStart");
        const jumpEndBtn = $("jumpEnd");
        const prevFrameBtn = $("prevFrame");
        const nextFrameBtn = $("nextFrame");
        let dpr = window.devicePixelRatio || 1;

        // listeners for event hooks
        onRenderAll(renderAll);
        onUpdateHud(updateHUD);
        onClearFx(clearFx);
        
        function setActiveToolSettings(nextSettings) {
            if (tool === "eraser") {
                eraserSettings = mergeBrushSettings(eraserSettings, nextSettings);
                eraserSize = eraserSettings.size;
            } else {
                brushSettings = mergeBrushSettings(brushSettings, nextSettings);
                brushType = brushSettings.shape;
                brushSize = brushSettings.size;
            }
        }
        function refreshToolSettingsUI() {
            const isBrush = tool === "brush";
            const isEraser = tool === "eraser";
            if (toolSettingsSection) toolSettingsSection.hidden = !(isBrush || isEraser);
            if (!isBrush && !isEraser) return;
            const s = isEraser ? eraserSettings : brushSettings;
            if (toolSettingsTitle) toolSettingsTitle.textContent = isEraser ? "Eraser" : "Brushes";
            safeSetValue(brushSizeInput, s.size);
            safeSetValue(brushSizeNumInput, s.size);
            safeSetValue(toolOpacityRange, Math.round(s.opacity * 100));
            safeSetValue(toolAngleRange, s.angle);
            const activeShape = document.querySelector('input[name="brushShape"][value="' + s.shape + '"]');
            if (activeShape) activeShape.checked = true;
        }
        function setFoldExpanded(btn, body, open) {
            if (!btn || !body) return;
            btn.setAttribute("aria-expanded", open ? "true" : "false");
            body.hidden = !open;
        }
        function wireToolSettingsFolds() {
            if (toolFoldBrushesBtn && toolFoldBrushesBody && !toolFoldBrushesBtn.dataset.wired) {
                toolFoldBrushesBtn.dataset.wired = "1";
                setFoldExpanded(toolFoldBrushesBtn, toolFoldBrushesBody, true);
                toolFoldBrushesBtn.addEventListener("click", () => {
                    const open = toolFoldBrushesBtn.getAttribute("aria-expanded") === "true";
                    setFoldExpanded(toolFoldBrushesBtn, toolFoldBrushesBody, !open);
                });
            }
            if (toolFoldSettingsBtn && toolFoldSettingsBody && !toolFoldSettingsBtn.dataset.wired) {
                toolFoldSettingsBtn.dataset.wired = "1";
                setFoldExpanded(toolFoldSettingsBtn, toolFoldSettingsBody, true);
                toolFoldSettingsBtn.addEventListener("click", () => {
                    const open = toolFoldSettingsBtn.getAttribute("aria-expanded") === "true";
                    setFoldExpanded(toolFoldSettingsBtn, toolFoldSettingsBody, !open);
                });
            }
        }
        function wireBrushShapeTooltips() {
            if (!brushShapeSeg || !brushShapeTooltip || brushShapeSeg.dataset.tooltipWired === "1") return;
            brushShapeSeg.dataset.tooltipWired = "1";
            let pressTimer = 0;
            let activeTip = null;
            const GAP = 8;
            const isHoverCapable = () => window.matchMedia("(hover: hover)").matches;
            const hideTip = () => {
                activeTip = null;
                brushShapeTooltip.hidden = true;
                brushShapeTooltip.textContent = "";
            };
            const getBasePoint = state => {
                const r = state.label.getBoundingClientRect();
                if (state.mode === "press") {
                    return {
                        x: r.right,
                        y: r.top + r.height / 2,
                        rect: r
                    };
                }
                const x = Number.isFinite(state.clientX) ? state.clientX : r.left + r.width / 2;
                const y = Number.isFinite(state.clientY) ? state.clientY : r.top + r.height / 2;
                return {
                    x: x,
                    y: y,
                    rect: r
                };
            };
            const positionTip = state => {
                if (!state || brushShapeTooltip.hidden) return;
                const vw = window.innerWidth || document.documentElement.clientWidth || 0;
                const vh = window.innerHeight || document.documentElement.clientHeight || 0;
                const base = getBasePoint(state);
                const r = base.rect;
                const tipRect = brushShapeTooltip.getBoundingClientRect();
                let left = base.x + GAP;
                let top = base.y + GAP;
                const canRight = left + tipRect.width <= vw - GAP;
                const canBottom = top + tipRect.height <= vh - GAP;
                if (!canRight) left = base.x - tipRect.width - GAP;
                if (!canBottom) top = base.y - tipRect.height - GAP;
                if (left < GAP) {
                    left = r.left + (r.width - tipRect.width) / 2;
                }
                if (top < GAP) {
                    top = r.bottom + GAP;
                }
                if (top + tipRect.height > vh - GAP) {
                    top = r.top - tipRect.height - GAP;
                }
                brushShapeTooltip.style.left = `${Math.round(clamp(left, GAP, Math.max(GAP, vw - tipRect.width - GAP)))}px`;
                brushShapeTooltip.style.top = `${Math.round(clamp(top, GAP, Math.max(GAP, vh - tipRect.height - GAP)))}px`;
            };
            const showTip = (label, x, y, mode = "hover") => {
                const text = label?.title || "";
                if (!text) return;
                activeTip = {
                    label: label,
                    clientX: x,
                    clientY: y,
                    mode: mode
                };
                brushShapeTooltip.textContent = text;
                brushShapeTooltip.hidden = false;
                positionTip(activeTip);
            };
            brushShapeSeg.addEventListener("pointerdown", e => {
                const label = e.target?.closest?.("label[data-brush-shape]");
                if (!label) return;
                clearTimeout(pressTimer);
                pressTimer = window.setTimeout(() => showTip(label, e.clientX, e.clientY, "press"), 500);
            });
            ["pointerup", "pointercancel", "pointerleave", "pointermove"].forEach(evt => {
                brushShapeSeg.addEventListener(evt, e => {
                    clearTimeout(pressTimer);
                    if (evt === "pointermove" && activeTip && activeTip.mode === "hover") {
                        const label = e.target?.closest?.("label[data-brush-shape]");
                        if (!label) return;
                        activeTip.label = label;
                        activeTip.clientX = e.clientX;
                        activeTip.clientY = e.clientY;
                        positionTip(activeTip);
                        return;
                    }
                    if (evt !== "pointermove") hideTip();
                }, {
                    passive: true
                });
            });
            brushShapeSeg.addEventListener("mouseover", e => {
                if (!isHoverCapable()) return;
                const label = e.target?.closest?.("label[data-brush-shape]");
                if (!label) return;
                showTip(label, e.clientX, e.clientY, "hover");
            });
            brushShapeSeg.addEventListener("mouseout", hideTip);
            const onViewportMove = () => {
                if (!activeTip || brushShapeTooltip.hidden) return;
                positionTip(activeTip);
            };
            window.addEventListener("scroll", onViewportMove, true);
            window.addEventListener("resize", onViewportMove, {
                passive: true
            });
        }

        // updates text on page
        function updateHUD() {
            const hudFps = $("hudFps");
            const zoomInfo = $("zoomInfo");
            const frameInfo = $("frameInfo");
            const hudTime = $("hudTime");
            const timeCounter = $("timeCounter");
            const toolName = $("toolName");
            const fpsLabel = $("fpsLabel");
            const secLabel = $("secLabel");

            safeText(hudFps, String(fps));
            safeText(frameInfo, `${currentFrame + 1} / ${totalFrames}`);
            safeText(hudTime, sfString(currentFrame));
            safeText(timeCounter, sfString(currentFrame));
            safeText(zoomInfo, `${Math.round(getZoom() * 100)}%`);
            safeText(toolName, tool.replace("-", " ").replace(/\b\w/g, m => m.toUpperCase()));
            safeText(fpsLabel, String(fps));
            safeText(secLabel, String(seconds));

            highlightTimelineCell();
            refreshToolSettingsUI();
        }
    
        function colorToHex(c) {
            const ctx = _colorCtx;
            if (!ctx) return String(c || "#000").trim();
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = String(c || "#000");
            ctx.fillRect(0, 0, 1, 1);
            const d = ctx.getImageData(0, 0, 1, 1).data;
            const r = d[0] | 0, g = d[1] | 0, b = d[2] | 0;
            return "#" + [ r, g, b ].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
        }
        
        
        let timelineFrameWidth = 30;
        let soloLayer = null;

        let straightLineMode = false;
        let straightLineStart = null;
        let temporaryEyedropper = false;
        let previousTool = null;
        
        
        function renderBounds() {
            setTransform(bctx);
            bctx.fillStyle = "#2a2f38";
            bctx.strokeStyle = "#3b4759";
            bctx.lineWidth = 2 / Math.max(getZoom(), 1);
            bctx.fillRect(0, 0, contentW, contentH);
            bctx.strokeRect(0, 0, contentW, contentH);
            drawRectSelectionOverlay(bctx);
        }
        function drawCompositeAt(ctx, F, withBg = true, holdPrevWhenEmpty = true, holdPrevAlpha = 1) {
            ctx.save();
            ctx.clearRect(0, 0, contentW, contentH);
            ctx.imageSmoothingEnabled = !!antiAlias;
            if (withBg) {
                ctx.fillStyle = canvasBgColor;
                ctx.fillRect(0, 0, contentW, contentH);
            }
            if (hasCel(F)) {
                drawExactCel(ctx, F);
            } else if (holdPrevWhenEmpty) {
                const prevIdx = nearestPrevCelIndex(F);
                if (prevIdx >= 0) {
                    const a = Math.max(0, Math.min(1, Number(holdPrevAlpha ?? 1)));
                    ctx.save();
                    ctx.globalAlpha *= a;
                    drawExactCel(ctx, prevIdx);
                    ctx.restore();
                }
            }
            ctx.restore();
        }
        function drawOnion(ctx) {
            if (!onionEnabled) return;
            const prevIdx = nearestPrevCelIndex(currentFrame);
            const nextIdx = nearestNextCelIndex(currentFrame);
            function tintCel(index, color, alpha) {
                if (index < 0) return;
                const off = document.createElement("canvas");
                off.width = contentW;
                off.height = contentH;
                const octx = off.getContext("2d");
                drawExactCel(octx, index);
                octx.globalCompositeOperation = "source-in";
                octx.globalAlpha = alpha;
                octx.fillStyle = color;
                octx.fillRect(0, 0, contentW, contentH);
                ctx.drawImage(off, 0, 0);
            }
            if (prevIdx >= 0) tintCel(prevIdx, onionPrevTint, onionAlpha);
            if (nextIdx >= 0) tintCel(nextIdx, onionNextTint, onionAlpha);
        }
        function renderFrame() {
            setTransform(dctx);
            const holdAlpha = transparencyHoldEnabled ? .25 : 1;
            drawCompositeAt(dctx, currentFrame, true, true, holdAlpha);
            drawOnion(dctx);
        }
        function renderAll() {
            renderBounds();
            renderFrame();
            highlightTimelineCell();
        }
        function clearFx() {
            fxctx.setTransform(1, 0, 0, 1, 0, 0);
            fxctx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
        }

        function wireBrushButtonRightClick() {
            if (document._brushCtxWired) return;
            document._brushCtxWired = true;
            const brushSelectors = [ "#toolBrush", '[data-tool="brush"]', '[data-toolid="brush"]', '[data-toolname="brush"]', 'button[value="brush"]', 'input[value="brush"]' ].join(",");
            document.addEventListener("contextmenu", e => {
                const t = e.target;
                if (!t) return;
                const brushEl = t.closest?.(brushSelectors);
                if (!brushEl) return;
                e.preventDefault();
                e.stopPropagation();
                openBrushCtxMenu(e, brushEl);
            }, {
                capture: true
            });
            try {
                getCanvas(CANVAS_TYPE.drawCanvas)?.addEventListener("pointerdown", () => closeBrushCtxMenu(), {
                    passive: true
                });
            } catch {}
        }
        let _eraserCtxMenu = null;
        let _eraserCtxState = null;
        function ensureEraserCtxMenu() {
            if (_eraserCtxMenu) return _eraserCtxMenu;
            const m = document.createElement("div");
            m.id = "eraserCtxMenu";
            m.hidden = true;
            Object.assign(m.style, {
                position: "fixed",
                zIndex: "10000",
                minWidth: "220px",
                padding: "10px",
                borderRadius: "12px",
                background: "rgba(18,18,20,0.96)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
                color: "rgba(255,255,255,0.92)",
                fontFamily: "var(--font), system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
                fontSize: "13px",
                backdropFilter: "blur(8px)"
            });
            m.innerHTML = `\n        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px;">\n          <div style="font-weight:700; letter-spacing:.2px;">Eraser options</div>\n        </div>\n\n        <div style="display:flex; align-items:center; gap:10px; margin:8px 0;">\n          <div style="width:52px; opacity:.85;">Size</div>\n          <input id="ecmSize" type="range" min="1" max="400" step="1" value="24" style="flex:1;">\n          <div id="ecmSizeVal" style="width:34px; text-align:right; font-variant-numeric:tabular-nums;">24</div>\n        </div>\n      `;
            const $m = sel => m.querySelector(sel);
            const sizeEl = $m("#ecmSize");
            const sizeVal = $m("#ecmSizeVal");
            function syncRangeLimitsFromMainUI() {
                if (typeof eraserSizeInput !== "undefined" && eraserSizeInput) {
                    if (eraserSizeInput.min) sizeEl.min = eraserSizeInput.min;
                    if (eraserSizeInput.max) sizeEl.max = eraserSizeInput.max;
                    if (eraserSizeInput.step) sizeEl.step = eraserSizeInput.step;
                }
            }
            function syncMenuFromState() {
                syncRangeLimitsFromMainUI();
                const v = Math.round(Number(eraserSize) || 1);
                sizeEl.value = String(v);
                sizeVal.textContent = String(v);
            }
            function syncMainUIFromState() {
                if (typeof eraserSizeInput !== "undefined" && eraserSizeInput) {
                    eraserSizeInput.value = String(Math.round(Number(eraserSize) || 1));
                }
                if (typeof eraserVal !== "undefined" && eraserVal) {
                    eraserVal.textContent = String(Math.round(Number(eraserSize) || 1));
                }
            }
            function applyEraserSizeFromMenu() {
                const v = Math.round(Number(sizeEl.value) || 1);
                eraserSize = clamp(v, 1, 999);
                sizeVal.textContent = String(eraserSize);
                syncMainUIFromState();
            }
            sizeEl.addEventListener("input", applyEraserSizeFromMenu);
            sizeEl.addEventListener("change", applyEraserSizeFromMenu);
            document.addEventListener("mousedown", e => {
                if (m.hidden) return;
                if (e.target === m || m.contains(e.target)) return;
                closeEraserCtxMenu();
            }, true);
            document.addEventListener("keydown", e => {
                if (m.hidden) return;
                if (e.key === "Escape") closeEraserCtxMenu();
            });
            window.addEventListener("blur", () => closeEraserCtxMenu());
            document.body.appendChild(m);
            m._syncFromState = syncMenuFromState;
            _eraserCtxMenu = m;
            return m;
        }
        function openEraserCtxMenu(ev, anchorEl) {
            try {
                closeBrushCtxMenu?.();
            } catch {}
            const m = ensureEraserCtxMenu();
            _eraserCtxState = {
                anchorEl: anchorEl || null
            };
            try {
                m._syncFromState?.();
            } catch {}
            m.hidden = false;
            m.style.left = "0px";
            m.style.top = "0px";
            const pad = 6;
            const vw = window.innerWidth, vh = window.innerHeight;
            const r = m.getBoundingClientRect();
            let x = (ev?.clientX ?? 0) + 8;
            let y = (ev?.clientY ?? 0) + 8;
            if (x + r.width + pad > vw) x = Math.max(pad, vw - r.width - pad);
            if (y + r.height + pad > vh) y = Math.max(pad, vh - r.height - pad);
            m.style.left = `${x}px`;
            m.style.top = `${y}px`;
            try {
                m.querySelector("#ecmSize")?.focus({
                    preventScroll: true
                });
            } catch {}
        }
        function closeEraserCtxMenu() {
            if (_eraserCtxMenu) _eraserCtxMenu.hidden = true;
            _eraserCtxState = null;
        }
        function wireEraserButtonRightClick() {
            if (document._eraserCtxWired) return;
            document._eraserCtxWired = true;
            const eraserSelectors = [ "#toolEraser", '[data-tool="eraser"]', '[data-tool="fill-eraser"]', '[data-toolid="eraser"]', '[data-toolid="fill-eraser"]', '[data-toolname="eraser"]', '[data-toolname="fill-eraser"]', 'button[value="eraser"]', 'button[value="fill-eraser"]', 'input[value="eraser"]', 'input[value="fill-eraser"]' ].join(",");
            document.addEventListener("contextmenu", e => {
                const t = e.target;
                if (!t) return;
                const eraserEl = t.closest?.(eraserSelectors);
                if (!eraserEl) return;
                e.preventDefault();
                e.stopPropagation();
                openEraserCtxMenu(e, eraserEl);
            }, {
                capture: true
            });
            try {
                getCanvas(CANVAS_TYPE.drawCanvas)?.addEventListener("pointerdown", () => closeEraserCtxMenu(), {
                    passive: true
                });
            } catch {}
        }

        
        function askClearAllConfirmation() {
            return new Promise(resolve => {
                if (!clearAllModal || !clearAllModalBackdrop || !clearAllConfirmBtn || !clearAllCancelBtn) {
                    resolve(window.confirm("Clear ALL frames and layers?\n\nThis will reset undo history and cannot be undone."));
                    return;
                }
                clearAllModal.hidden = false;
                clearAllModalBackdrop.hidden = false;
                const cleanup = ok => {
                    clearAllModal.hidden = true;
                    clearAllModalBackdrop.hidden = true;
                    clearAllConfirmBtn.removeEventListener("click", onConfirm);
                    clearAllCancelBtn.removeEventListener("click", onCancel);
                    clearAllModalBackdrop.removeEventListener("click", onCancel);
                    document.removeEventListener("keydown", onEsc);
                    resolve(ok);
                };
                const onConfirm = () => cleanup(true);
                const onCancel = () => cleanup(false);
                const onEsc = e => {
                    if (e.key === "Escape") cleanup(false);
                };
                clearAllConfirmBtn.addEventListener("click", onConfirm);
                clearAllCancelBtn.addEventListener("click", onCancel);
                clearAllModalBackdrop.addEventListener("click", onCancel);
                document.addEventListener("keydown", onEsc);
            });
        }
    
        async function clearAllProjectState() {
            const ok = await askClearAllConfirmation();
            if (!ok) return;
            try {
                stopPlayback?.();
            } catch {}
            try {
                clearFx?.();
            } catch {}
            try {
                clearRectSelection?.();
            } catch {}
            try {
                clearCelSelection?.();
            } catch {}
            try {
                clearGhostTargets?.();
            } catch {}
            try {
                cancelLasso?.();
            } catch {}
            for (let f = 0; f < totalFrames; f++) {
                clearFrameAllLayers(f);
            }
            for (let L = 0; L < LAYERS_COUNT; L++) {
                try {
                    pruneUnusedSublayers(L);
                } catch {}
            }
            currentFrame = 0;
            
            globalHistory.undo.length = 0;
            globalHistory.redo.length = 0;
            historyMap.clear();
            _pendingGlobalStep = null;
            _globalStepDirty = false;
            if (hasTimeline) buildTimeline();
            try {
                gotoFrame?.(0);
            } catch {}
            try {
                renderAll?.();
            } catch {}
            try {
                updateHUD?.();
            } catch {}
            try {
                markProjectDirty?.();
            } catch {}
        }
        
        function setPenControlsVisible(visible) {
            if (!$("penControls")) return;
            $("penControls").hidden = !visible;
        }
          
        
        
    
        
        function deleteActiveColorAtCurrentFrame() {
            if (activeLayer === PAPER_LAYER) return false;
            const L = activeLayer;
            const layer = layers[L];
            if (!layer?.sublayers || !Array.isArray(layer.suborder)) return false;
            const key = resolveKeyFor(L, activeSubColor?.[L] ?? currentColor);
            if (!key) return false;
            const sub = layer.sublayers.get(key);
            const c = sub?.frames?.[currentFrame];
            if (!c) return false;
            try {
                pushUndo(L, currentFrame, key);
            } catch {}
            try {
                const ctx = c.getContext("2d", {
                    willReadFrequently: true
                });
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, contentW, contentH);
            } catch {}
            sub.frames[currentFrame] = null;
            queueRenderAll();
            updateTimelineHasContent(currentFrame);
            pruneUnusedSublayers(L);
            return true;
        }
        
        function initStagePinchCameraZoom(stageViewport) {
            if (!stageViewport || stageViewport._pinchCamWired) return;
            stageViewport._pinchCamWired = true;
            try {
                stageViewport.style.touchAction = "none";
            } catch {}
            const touches = new Map;
            let pinch = null;
            const VIEW_MIN = .05;
            const VIEW_MAX = 16;
            const clampNum = (v, a, b) => Math.max(a, Math.min(b, v));
            function clientToCanvasLocal(clientX, clientY) {
                const rect = getCanvas(CANVAS_TYPE.drawCanvas).getBoundingClientRect();
                return {
                    x: clientX - rect.left,
                    y: clientY - rect.top
                };
            }
            function beginPinchIfReady() {
                if (touches.size !== 2) return;
                try {
                    if (isDrawing) endStroke();
                } catch {}
                try {
                    if (isPanning) endPan();
                } catch {}
                const pts = Array.from(touches.values());
                const a = pts[0], b = pts[1];
                const mid = {
                    x: (a.x + b.x) / 2,
                    y: (a.y + b.y) / 2
                };
                const midLocal = clientToCanvasLocal(mid.x, mid.y);
                const before = screenToContent(midLocal.x, midLocal.y);
                const startDist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
                pinch = {
                    startZoom: getZoom(),
                    startOffsetX: getOffsetX(),
                    startOffsetY: getOffsetY(),
                    startDist: startDist,
                    anchorContent: before
                };
                
                for (const pid of touches.keys()) {
                    try {
                        stageViewport.setPointerCapture(pid);
                    } catch {}
                }
            }
            function updatePinch() {
                if (!pinch || touches.size < 2) return;
                const pts = Array.from(touches.values());
                const a = pts[0], b = pts[1];
                const curDist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
                const factor = curDist / (pinch.startDist || 1);
                const mid = {
                    x: (a.x + b.x) / 2,
                    y: (a.y + b.y) / 2
                };
                const midLocal = clientToCanvasLocal(mid.x, mid.y);
                const zl = clampNum(pinch.startZoom * factor, VIEW_MIN, VIEW_MAX);
                setZoom(zl)
                const after = screenToContent(midLocal.x, midLocal.y);
                setOffsetX(pinch.startOffsetX + (after.x - pinch.anchorContent.x) * (getZoom() * dpr));
                setOffsetY(pinch.startOffsetY + (after.y - pinch.anchorContent.y) * (getZoom() * dpr));
                renderAll();
                updateHUD();
                updatePlayheadMarker();
                updateClipMarkers();
                clearFx();
            }
            stageViewport.addEventListener("pointerdown", e => {
                if (e.pointerType !== "touch") return;
                touches.set(e.pointerId, {
                    x: e.clientX,
                    y: e.clientY
                });
                if (touches.size === 2) {
                    e.preventDefault();
                    beginPinchIfReady();
                    updatePinch();
                }
            }, {
                capture: true,
                passive: false
            });
            stageViewport.addEventListener("pointermove", e => {
                if (e.pointerType !== "touch") return;
                if (!touches.has(e.pointerId)) return;
                touches.set(e.pointerId, {
                    x: e.clientX,
                    y: e.clientY
                });
                if (pinch) {
                    e.preventDefault();
                    updatePinch();
                }
            }, {
                capture: true,
                passive: false
            });
            function end(e) {
                if (e.pointerType !== "touch") return;
                touches.delete(e.pointerId);
                try {
                    stageViewport.releasePointerCapture(e.pointerId);
                } catch {}
                if (touches.size < 2) {
                    pinch = null;
                    window.__celstompPinching = false;
                }
                if (touches.size === 0) {
                    pinch = null;
                    window.__celstompPinching = false;
                }
            }
            stageViewport.addEventListener("pointerup", end, {
                capture: true,
                passive: false
            });
            stageViewport.addEventListener("pointercancel", end, {
                capture: true,
                passive: false
            });
        }
        
        let pinch = null;
        drawCanvas.addEventListener("wheel", e => {
            e.preventDefault();
            const factor = Math.exp(-e.deltaY * .0015);
            const pos = getCanvasPointer(e);
            const before = screenToContent(pos.x, pos.y);
            setZoom(clamp(getZoom() * factor, .05, 16));
            const after = screenToContent(pos.x, pos.y);
            setOffsetX(getOffsetX() + (after.x - before.x) * (getZoom() * dpr));
            setOffsetY(getOffsetY() + (after.y - before.y) * (getZoom() * dpr));
            queueRenderAll();
            queueUpdateHud();
            updatePlayheadMarker();
            updateClipMarkers();
            queueClearFx();
        }, {
            passive: false
        });
        initStagePinchCameraZoom($("stageViewport") || $("stage") || stageEl || drawCanvas);
        if (!drawCanvas._ptrWired) {
            drawCanvas._ptrWired = true;
            try {
                drawCanvas.style.touchAction = "none";
            } catch {}

            drawCanvas.addEventListener("pointerdown", handlePointerDown, {
                passive: false
            });
            drawCanvas.addEventListener("pointermove", handlePointerMove, {
                passive: false
            });
            drawCanvas.addEventListener("pointerup", handlePointerUp, {
                passive: false
            });
            drawCanvas.addEventListener("pointercancel", handlePointerUp, {
                passive: false
            });
            drawCanvas.addEventListener("contextmenu", e => e.preventDefault());
        }
        const hardResetPinch = () => {
            try {
                touches.clear();
            } catch {}
            pinch = null;
            window.__celstompPinching = false;
            pressureCache.clear();
            tiltCache.clear();
        };
        window.addEventListener("blur", hardResetPinch, true);
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) hardResetPinch();
        }, true);
        if (lassoActive && isDrawing && (tool === "lasso-fill" || tool === "lasso-erase")) {
            addLassoPoint({
                x: x,
                y: y
            });
            drawLassoPreview(tool === "lasso-erase" ? "erase" : "fill");
            e.preventDefault();
            return;
        }
        if (lassoActive && (tool === "lasso-fill" || tool === "lasso-erase")) {
            const k = resolveKeyFor(activeLayer, tool === "lasso-erase" ? activeSubColor?.[activeLayer] ?? currentColor : currentColor);
            try {
                beginGlobalHistoryStep(activeLayer, currentFrame, k);
            } catch {}
            const ok = tool === "lasso-erase" ? applyLassoErase() : applyLassoFill();
            if (ok) {
                try {
                    markGlobalHistoryDirty();
                } catch {}
            }
            try {
                commitGlobalHistoryStep();
            } catch {}
            cancelLasso();
            isDrawing = false;
            e?.preventDefault?.();
            return;
        }
        
        
        function mountIslandSlots() {
            const island = $("floatingIsland");
            const wheelSlot = $("islandWheelSlot");
            const brushesSlot = $("islandBrushesSlot");
            const toolsSlot = $("islandToolsSlot");
            const layersSlot = $("islandLayersSlot");
            if (!island || !wheelSlot || !toolsSlot || !layersSlot) return;
            const wheelWrap = $("hsvWheelWrap");
            if (wheelWrap && wheelWrap.parentElement !== wheelSlot) {
                wheelSlot.appendChild(wheelWrap);
            }
            const toolSeg = $("toolSeg");
            if (toolSeg && toolSeg.parentElement !== toolsSlot) {
                toolsSlot.appendChild(toolSeg);
            }
            const mainBrushSizeGroup = $("mainBrushSizeGroup");
            if (mainBrushSizeGroup && mainBrushSizeGroup.parentElement !== toolsSlot) {
                toolsSlot.appendChild(mainBrushSizeGroup);
            }
            const brushSeg = $("brushSeg");
            if (brushSeg && brushSeg.parentElement !== brushesSlot) {
                brushesSlot.appendChild(brushSeg);
            }
            const layerSeg = $("layerSeg");
            if (layerSeg && layerSeg.parentElement !== layersSlot) {
                layersSlot.appendChild(layerSeg);
            }
            try {
                drawHSVWheel?.();
            } catch {}
            try {
                requestAnimationFrame(() => {
                    try {
                        drawHSVWheel?.();
                    } catch {}
                });
            } catch {}
        }
        mountIslandSlots();
        
        function initIslandMinimizeTab() {
            const island = $("floatingIsland");
            const collapseBtn = $("islandCollapseBtn");
            const tabBtn = $("islandTab");
            if (!island || !collapseBtn || !tabBtn) return;
            const LS_KEY = "celstomp_island_collapsed";
            const stop = e => {
                e.stopPropagation();
            };
            [ "pointerdown", "mousedown", "touchstart" ].forEach(evt => {
                collapseBtn.addEventListener(evt, stop, {
                    passive: true
                });
                tabBtn.addEventListener(evt, stop, {
                    passive: true
                });
            });
            if (island._minWired) return;
            island._minWired = true;
            function setCollapsed(v) {
                const yes = !!v;
                island.classList.toggle("collapsed", yes);
                try {
                    localStorage.setItem(LS_KEY, yes ? "1" : "0");
                } catch {}
            }
            function toggleCollapsed() {
                setCollapsed(!island.classList.contains("collapsed"));
            }
            try {
                const saved = localStorage.getItem(LS_KEY);
                if (saved === "1") island.classList.add("collapsed");
            } catch {}
            collapseBtn.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                toggleCollapsed();
            }, {
                passive: false
            });
            tabBtn.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                setCollapsed(false);
            }, {
                passive: false
            });
            const header = $("floatingIslandHeader");
            if (header) {
                header.addEventListener("dblclick", e => {
                    if (e.target && e.target.closest("button")) return;
                    e.preventDefault();
                    toggleCollapsed();
                }, {
                    passive: false
                });
            }
        }
        (() => {
            function tryInit() {
                try {
                    initIslandMinimizeTab();
                } catch (e) {
                    console.warn("[island] minimize init failed", e);
                }
                try {
                    initIslandSidePanel();
                } catch (e) {
                    console.warn("[island] side panel init failed", e);
                }
                const island = $("floatingIsland");
                const dock = island?.closest(".islandDock") || island;
                const sideBtn = dock?.querySelector("#islandSideBtn") || $("islandSideBtn");
                const sidePanel = dock?.querySelector("#islandSidePanel") || $("islandSidePanel");
                const collapseBtn = $("islandCollapseBtn");
                const tabBtn = $("islandTab");
                return !!(island && dock && sideBtn && sidePanel && collapseBtn && tabBtn);
            }
            function boot() {
                if (tryInit()) return;
                const mo = new MutationObserver(() => {
                    if (tryInit()) mo.disconnect();
                });
                mo.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
            if (document.readyState === "loading") {
                window.addEventListener("DOMContentLoaded", boot, {
                    once: true
                });
            } else {
                boot();
            }
        })();
        (() => {
            const btn = $("infoBtn");
            const panel = $("infoPanel");
            const back = $("infoBackdrop");
            const close = $("infoCloseBtn");
            if (!btn || !panel || !back) return;
            function openInfo() {
                btn.setAttribute("aria-expanded", "true");
                panel.setAttribute("aria-hidden", "false");
                panel.classList.add("isOpen");
                back.classList.add("isOpen");
                try {
                    panel.focus({
                        preventScroll: true
                    });
                } catch {}
            }
            function closeInfo() {
                btn.setAttribute("aria-expanded", "false");
                panel.setAttribute("aria-hidden", "true");
                panel.classList.remove("isOpen");
                back.classList.remove("isOpen");
            }
            function toggleInfo() {
                const open = panel.classList.contains("isOpen");
                open ? closeInfo() : openInfo();
            }
            btn.addEventListener("click", toggleInfo);
            close?.addEventListener("click", closeInfo);
            back.addEventListener("click", closeInfo);
            window.addEventListener("keydown", e => {
                if (e.key === "Escape" && panel.classList.contains("isOpen")) closeInfo();
            });
        })();
        function initIslandSidePanel() {
            const island = $("floatingIsland");
            if (!island) return;
            const dock = island.closest(".islandDock") || island;
            const sideBtn = dock.querySelector("#islandSideBtn") || $("islandSideBtn");
            const sidePanel = dock.querySelector("#islandSidePanel") || $("islandSidePanel");
            if (!sideBtn || !sidePanel) return;
            if (sidePanel.parentElement !== dock) dock.appendChild(sidePanel);
            const LS_KEY = "celstomp_island_side_open";
            if (dock._sideWired) return;
            dock._sideWired = true;
            const stopProp = e => {
                e.stopPropagation();
            };
            let _lastToggleAt = 0;
            function toggleOpenOnce() {
                const t = performance.now();
                if (t - _lastToggleAt < 280) return;
                _lastToggleAt = t;
                toggleOpen();
            }
            function setOpen(v) {
                const yes = !!v;
                dock.classList.toggle("side-open", yes);
                island.classList.toggle("side-open", yes);
                sidePanel.setAttribute("aria-hidden", yes ? "false" : "true");
                sideBtn.textContent = yes ? "<" : ">";
                sidePanel.hidden = !yes;
                try {
                    localStorage.setItem(LS_KEY, yes ? "1" : "0");
                } catch {}
            }
            function toggleOpen() {
                setOpen(!dock.classList.contains("side-open"));
            }
            [ "touchstart", "pointerdown", "mousedown" ].forEach(evt => {
                sideBtn.addEventListener(evt, stopProp, {
                    capture: true,
                    passive: true
                });
            });
            sideBtn.addEventListener("pointerdown", e => {
                e.preventDefault();
                e.stopPropagation();
                toggleOpenOnce();
            }, {
                capture: true,
                passive: false
            });
            sideBtn.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                toggleOpenOnce();
            }, {
                capture: true,
                passive: false
            });
            try {
                const saved = localStorage.getItem(LS_KEY);
                if (saved === "1") setOpen(true);
            } catch {}
            const mo = new MutationObserver(() => {
                if (island.classList.contains("collapsed") || dock.classList.contains("collapsed")) setOpen(false);
            });
            mo.observe(island, {
                attributes: true,
                attributeFilter: [ "class" ]
            });
        }

        (() => {
            function boot() {
                const tl = $("timeline");
                const header = $("timelineHeader");
                const leftBtn = $("tlMobLeftBtn");
                const rightBtn = $("tlMobRightBtn");
                if (!tl || !header || !leftBtn || !rightBtn) return;
                if (tl._mobDrawerWired) return;
                tl._mobDrawerWired = true;
                const mq = window.matchMedia("(max-width: 720px)");
                const isMobile = () => mq.matches;
                try {
                    leftBtn.style.touchAction = "manipulation";
                } catch {}
                try {
                    rightBtn.style.touchAction = "manipulation";
                } catch {}
                let lastToggleAt = 0;
                const toggleOnce = fn => {
                    const t = performance.now();
                    if (t - lastToggleAt < 250) return;
                    lastToggleAt = t;
                    fn();
                };
                const syncAria = () => {
                    leftBtn.setAttribute("aria-expanded", tl.classList.contains("mob-left-open") ? "true" : "false");
                    rightBtn.setAttribute("aria-expanded", tl.classList.contains("mob-right-open") ? "true" : "false");
                };
                const closeAll = () => {
                    tl.classList.remove("mob-left-open", "mob-right-open");
                    syncAria();
                };
                function openLeft() {
                    if (!isMobile()) return;
                    tl.classList.toggle("mob-left-open", !tl.classList.contains("mob-left-open"));
                    tl.classList.remove("mob-right-open");
                    syncAria();
                }
                function openRight() {
                    if (!isMobile()) return;
                    tl.classList.toggle("mob-right-open", !tl.classList.contains("mob-right-open"));
                    tl.classList.remove("mob-left-open");
                    syncAria();
                }
                function wireBtn(btn, fn) {
                    const fire = e => {
                        if (!isMobile()) return;
                        e.preventDefault();
                        e.stopPropagation();
                        toggleOnce(fn);
                    };
                    btn.addEventListener("pointerdown", fire, {
                        capture: true,
                        passive: false
                    });
                    btn.addEventListener("touchstart", fire, {
                        capture: true,
                        passive: false
                    });
                    btn.addEventListener("click", e => {
                        if (!isMobile()) return;
                        e.preventDefault();
                        e.stopPropagation();
                        toggleOnce(fn);
                    }, {
                        passive: false
                    });
                }
                wireBtn(leftBtn, openLeft);
                wireBtn(rightBtn, openRight);
                const outsideClose = e => {
                    if (!isMobile()) return;
                    const t = e.target;
                    if (tl.contains(t) || header.contains(t) || leftBtn.contains(t) || rightBtn.contains(t)) return;
                    closeAll();
                };
                document.addEventListener("pointerdown", outsideClose, {
                    capture: true,
                    passive: true
                });
                document.addEventListener("touchstart", outsideClose, {
                    capture: true,
                    passive: true
                });
                const onMqChange = () => closeAll();
                if (mq.addEventListener) mq.addEventListener("change", onMqChange); else if (mq.addListener) mq.addListener(onMqChange);
                syncAria();
            }
            if (document.readyState === "loading") {
                window.addEventListener("DOMContentLoaded", boot, {
                    once: true
                });
            } else {
                boot();
            }
        })();
        (() => {
            const btn = $("mobileIslandToggle");
            const app = document.querySelector(".app");
            if (!btn || !app) return;
            function toggleIsland() {
                app.classList.toggle("rightbar-open");
            }
            btn.addEventListener("pointerdown", e => {
                e.preventDefault();
                e.stopPropagation();
                toggleIsland();
            }, {
                passive: false
            });
            const obs = new MutationObserver(() => {
                btn.textContent = app.classList.contains("rightbar-open") ? "✕" : "☰";
            });
            obs.observe(app, {
                attributes: true,
                attributeFilter: [ "class" ]
            });
        })();
        function initTimelineOnionContextMenu() {
            const onionBtn = $("tlOnion");
            const menu = $("onionCtxMenu");
            const block = $("onionOptionsBlock");
            if (!onionBtn || !menu || !block) return;
            if (menu._wired) return;
            menu._wired = true;
            const homeParent = block.parentNode;
            const homeNext = block.nextSibling;
            function placeMenu(x, y) {
                menu.style.left = x + "px";
                menu.style.top = y + "px";
                const r = menu.getBoundingClientRect();
                const pad = 8;
                let nx = x, ny = y;
                if (r.right > window.innerWidth - pad) nx -= r.right - (window.innerWidth - pad);
                if (r.bottom > window.innerHeight - pad) ny -= r.bottom - (window.innerHeight - pad);
                if (nx < pad) nx = pad;
                if (ny < pad) ny = pad;
                menu.style.left = nx + "px";
                menu.style.top = ny + "px";
            }
            function openAt(x, y) {
                menu.innerHTML = "";
                menu.appendChild(block);
                menu.classList.add("open");
                menu.setAttribute("aria-hidden", "false");
                placeMenu(x, y);
            }
            function close() {
                if (!menu.classList.contains("open")) return;
                if (homeParent) {
                    if (homeNext && homeNext.parentNode === homeParent) homeParent.insertBefore(block, homeNext); else homeParent.appendChild(block);
                }
                menu.classList.remove("open");
                menu.setAttribute("aria-hidden", "true");
                menu.style.left = "";
                menu.style.top = "";
            }
            onionBtn.addEventListener("contextmenu", e => {
                e.preventDefault();
                e.stopPropagation();
                openAt(e.clientX, e.clientY);
            }, {
                passive: false
            });
            window.addEventListener("pointerdown", e => {
                if (!menu.classList.contains("open")) return;
                if (e.target === menu || menu.contains(e.target)) return;
                close();
            }, {
                passive: true
            });
            window.addEventListener("keydown", e => {
                if (e.key === "Escape") close();
            });
            window.addEventListener("resize", close, {
                passive: true
            });
            window.addEventListener("scroll", close, {
                passive: true,
                capture: true
            });
        }
        function initMobileTimelineScrub() {
            const row = $("tlPlayheadRow") || document.querySelector(".playheadRow") || document.querySelector("[data-playhead-row]");
            if (!row || row._mobileScrubWired) return;
            row._mobileScrubWired = true;
            function findScroller(el) {
                const cand = el.closest("#timelineViewport") || el.closest("#timelineScroll") || el.closest(".timelineViewport") || el.closest(".timelineScroll") || el.closest(".tlViewport") || el.closest(".tlScroll");
                if (cand) return cand;
                let p = el.parentElement;
                while (p && p !== document.body) {
                    const cs = getComputedStyle(p);
                    if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && p.scrollWidth > p.clientWidth) return p;
                    p = p.parentElement;
                }
                return null;
            }
            const scroller = findScroller(row);
            function getFrameW() {
                const v = parseFloat(getComputedStyle(row).getPropertyValue("--tl-frame-w"));
                if (Number.isFinite(v) && v > 0) return v;
                const cell = row.querySelector(".frameCell, .tlCell, [data-frame-cell]");
                if (cell) {
                    const r = cell.getBoundingClientRect();
                    if (r.width > 0) return r.width;
                }
                return 16;
            }
            function applyScrubFrame(frame) {
                frame = Math.max(0, frame | 0);
                if (typeof window.gotoFrame === "function") {
                    window.gotoFrame(frame);
                    return;
                }
                if (window.state && typeof window.state === "object") {
                    if ("frame" in window.state) window.state.frame = frame; else if ("playhead" in window.state) window.state.playhead = frame; else if ("curFrame" in window.state) window.state.curFrame = frame;
                }
                if (typeof window.renderAll === "function") window.renderAll(); else if (typeof window.renderTimeline === "function") window.renderTimeline();
            }
            function scrubAtClientX(clientX) {
                const r = row.getBoundingClientRect();
                const frameW = getFrameW();
                let x = clientX - r.left;
                const scrollX = scroller ? scroller.scrollLeft : 0;
                const xInContent = x + scrollX;
                const frame = Math.floor(xInContent / frameW);
                applyScrubFrame(frame);
            }
            let active = false;
            let activeId = -1;
            row.addEventListener("pointerdown", e => {
                if (e.pointerType !== "touch") return;
                if (!e.isPrimary) return;
                active = true;
                activeId = e.pointerId;
                e.preventDefault();
                e.stopPropagation();
                try {
                    row.setPointerCapture(activeId);
                } catch {}
                scrubAtClientX(e.clientX);
            }, {
                passive: false
            });
            row.addEventListener("pointermove", e => {
                if (!active || e.pointerId !== activeId) return;
                e.preventDefault();
                e.stopPropagation();
                scrubAtClientX(e.clientX);
            }, {
                passive: false
            });
            function end(e) {
                if (!active || e.pointerId !== activeId) return;
                e.preventDefault();
                e.stopPropagation();
                active = false;
                activeId = -1;
            }
            row.addEventListener("pointerup", end, {
                passive: false
            });
            row.addEventListener("pointercancel", end, {
                passive: false
            });
        }
        try {
            initMobileTimelineScrub();
        } catch {}
        function initTimelineToggleBridge() {
            const tlOnion = $("tlOnion");
            const btnOnion = $("toggleOnion");
            if (!tlOnion) return;
            const btnIsOn = btn => {
                if (!btn) return null;
                const t = (btn.textContent || "").toLowerCase();
                if (t.includes("off")) return false;
                if (t.includes("on")) return true;
                return null;
            };
            function syncOnionFromButton() {
                const s = btnIsOn(btnOnion);
                if (s === null) return;
                tlOnion.checked = s;
            }
            tlOnion.addEventListener("change", () => {
                if (!btnOnion) return;
                const cur = btnIsOn(btnOnion);
                const want = !!tlOnion.checked;
                if (cur === null || cur !== want) btnOnion.click();
                syncOnionFromButton();
            });
            if (btnOnion) {
                btnOnion.addEventListener("click", () => {
                    setTimeout(syncOnionFromButton, 0);
                });
                syncOnionFromButton();
            }
        }
        (() => {
            const boot = () => {
                try {
                    initTimelineOnionContextMenu();
                } catch {}
            };
            if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", boot, {
                once: true
            }); else boot();
            initTimelineToggleBridge();
            if (document.readyState === "loading") {
                window.addEventListener("DOMContentLoaded", initTransparencyControls, {
                    once: true
                });
            } else {
                initTransparencyControls();
            }
        })();
        function wirePointerDrawingOnCanvas(drawCanvas) {
            if (!drawCanvas) return;
            if (window.__CELSTOMP_PTR_DRAW_WIRED__) return;
            window.__CELSTOMP_PTR_DRAW_WIRED__ = true;
            const stageViewport = $("stageViewport") || $("stage") || drawCanvas;
            try {
                stageViewport.style.touchAction = "none";
            } catch {}
            try {
                drawCanvas.style.touchAction = "none";
            } catch {}
            drawCanvas.addEventListener("contextmenu", e => e.preventDefault());
            const isCanvasDownTarget = t => !!(t && (t.tagName === "CANVAS" || t.closest?.("canvas")));
            const getToolName = () => String(typeof tool !== "undefined" && tool ? tool : "");
            function dispatchMouseOn(target, type, x, y, buttons) {
                try {
                    target.dispatchEvent(new MouseEvent(type, {
                        bubbles: true,
                        cancelable: true,
                        clientX: x,
                        clientY: y,
                        buttons: buttons || 0,
                        button: 0
                    }));
                } catch {}
            }
            function mouseDown(x, y) {
                dispatchMouseOn(drawCanvas, "mousedown", x, y, 1);
            }
            function mouseMove(x, y) {
                dispatchMouseOn(drawCanvas, "mousemove", x, y, 1);
                dispatchMouseOn(window, "mousemove", x, y, 1);
            }
            function mouseUp(x, y) {
                dispatchMouseOn(drawCanvas, "mouseup", x, y, 0);
                dispatchMouseOn(window, "mouseup", x, y, 0);
            }
            let activeDrawPid = null;
            function startDraw(pid, x, y) {
                if (activeDrawPid != null) return;
                activeDrawPid = pid;
                mouseDown(x, y);
            }
            function moveDraw(pid, x, y) {
                if (activeDrawPid !== pid) return;
                mouseMove(x, y);
            }
            function endDraw(pid, x, y) {
                if (activeDrawPid !== pid) return;
                mouseUp(x, y);
                activeDrawPid = null;
            }
            const touches = new Map;
            let pinch = null;
            let lockUntilAllUp = false;
            let pending = null;
            const START_DELAY_MS = 70;
            const START_MOVE_PX = 4;
            const IMMEDIATE_TOOLS = new Set([ "fill-brush", "fill-eraser", "lasso-fill", "lasso-erase" ]);
            const VIEW_MIN = .05;
            const VIEW_MAX = 16;
            const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
            function clientToCanvasLocal(clientX, clientY) {
                const rect = drawCanvas.getBoundingClientRect();
                return {
                    x: clientX - rect.left,
                    y: clientY - rect.top
                };
            }
            function cancelPending() {
                if (!pending) return;
                clearTimeout(pending.tmr);
                pending = null;
            }
            function stopStrokeNow(x, y) {
                cancelPending();
                if (activeDrawPid != null) endDraw(activeDrawPid, x ?? 0, y ?? 0);
            }
            function beginPinch() {
                if (touches.size < 2) return;
                stopStrokeNow();
                const ids = Array.from(touches.keys()).slice(0, 2);
                const a = touches.get(ids[0]);
                const b = touches.get(ids[1]);
                if (!a || !b) return;
                const startDist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
                const mid = {
                    x: (a.x + b.x) / 2,
                    y: (a.y + b.y) / 2
                };
                const midLocal = clientToCanvasLocal(mid.x, mid.y);
                const anchorContent = screenToContent(midLocal.x, midLocal.y);
                pinch = {
                    ids: ids,
                    startDist: startDist,
                    startZoom: getZoom(),
                    anchorContent: anchorContent
                };
                window.__celstompPinching = true;
            }
            function updatePinch() {
                if (!pinch) return;
                const a = touches.get(pinch.ids[0]);
                const b = touches.get(pinch.ids[1]);
                if (!a || !b) return;
                const curDist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
                const ratio = curDist / (pinch.startDist || 1);
                const nextZoom = clamp(pinch.startZoom * ratio, VIEW_MIN, VIEW_MAX);
                const mid = {
                    x: (a.x + b.x) / 2,
                    y: (a.y + b.y) / 2
                };
                const midLocal = clientToCanvasLocal(mid.x, mid.y);
                setZoom(nextZoom);
                const devX = midLocal.x * dpr;
                const devY = midLocal.y * dpr;

                setOffsetX(devX - pinch.anchorContent.x * (getZoom() * dpr));
                setOffsetY(devY - pinch.anchorContent.y * (getZoom() * dpr));

                renderAll();
                updateHUD();
                updatePlayheadMarker();
                updateClipMarkers();
                clearFx();
            }
            stageViewport.addEventListener("pointerdown", e => {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                if (!isCanvasDownTarget(e.target)) return;
                if (e.pointerType === "touch") {
                    touches.set(e.pointerId, {
                        x: e.clientX,
                        y: e.clientY
                    });
                    if (touches.size >= 2) {
                        lockUntilAllUp = true;
                        stopStrokeNow(e.clientX, e.clientY);
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                            stageViewport.setPointerCapture(e.pointerId);
                        } catch {}
                        beginPinch();
                        updatePinch();
                        return;
                    }
                    if (lockUntilAllUp) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const pid = e.pointerId;
                    try {
                        stageViewport.setPointerCapture(pid);
                    } catch {}
                    const tTool = String(typeof tool !== "undefined" && tool ? tool : "");
                    if (IMMEDIATE_TOOLS.has(tTool)) {
                        e.preventDefault();
                        if (activeDrawPid == null) {
                            startDraw(e.pointerId, e.clientX, e.clientY);
                            if (tapTrack && tapTrack.pid === e.pointerId) tapTrack.startedStroke = true;
                        }
                        moveDraw(e.pointerId, e.clientX, e.clientY);
                        return;
                    }
                    const x0 = e.clientX, y0 = e.clientY;
                    pending = {
                        pid: pid,
                        x0: x0,
                        y0: y0,
                        tmr: setTimeout(() => {
                            if (!pending) return;
                            if (touches.size === 1 && touches.has(pid) && !lockUntilAllUp) {
                                startDraw(pid, x0, y0);
                            }
                            pending = null;
                        }, START_DELAY_MS)
                    };
                    return;
                }
                e.preventDefault();
                startDraw(e.pointerId, e.clientX, e.clientY);
            }, {
                capture: true,
                passive: false
            });
            stageViewport.addEventListener("pointermove", e => {
                if (e.pointerType === "touch") {
                    if (touches.has(e.pointerId)) {
                        touches.set(e.pointerId, {
                            x: e.clientX,
                            y: e.clientY
                        });
                    }
                    if (pinch && touches.size >= 2) {
                        e.preventDefault();
                        e.stopPropagation();
                        updatePinch();
                        return;
                    }
                    if (lockUntilAllUp) return;
                    const tTool = getToolName();
                    if (pending && e.pointerId === pending.pid && touches.size === 1) {
                        const dx = e.clientX - pending.x0;
                        const dy = e.clientY - pending.y0;
                        if (Math.hypot(dx, dy) >= START_MOVE_PX) {
                            clearTimeout(pending.tmr);
                            const pid = pending.pid;
                            const sx = pending.x0, sy = pending.y0;
                            pending = null;
                            startDraw(pid, sx, sy);
                        }
                    }
                    if (activeDrawPid == null && IMMEDIATE_TOOLS.has(tTool) && touches.size === 1) {
                        startDraw(e.pointerId, e.clientX, e.clientY);
                    }
                    moveDraw(e.pointerId, e.clientX, e.clientY);
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                    if (pending && e.pointerId === pending.pid && touches.size === 1) {
                        const dx = e.clientX - pending.x0;
                        const dy = e.clientY - pending.y0;
                        if (Math.hypot(dx, dy) >= START_MOVE_PX) {
                            clearTimeout(pending.tmr);
                            const pid = pending.pid;
                            const sx = pending.x0, sy = pending.y0;
                            pending = null;
                            startDraw(pid, sx, sy);
                        }
                    }
                    moveDraw(e.pointerId, e.clientX, e.clientY);
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                moveDraw(e.pointerId, e.clientX, e.clientY);
            }, {
                capture: true,
                passive: false
            });
            function endPointer(e) {
                if (e.pointerType === "touch") {
                    touches.delete(e.pointerId);
                    pressureCache.delete(e.pointerId);
                    tiltCache.delete(e.pointerId);
                    if (pending && pending.pid === e.pointerId) cancelPending();
                    if (activeDrawPid === e.pointerId) endDraw(e.pointerId, e.clientX, e.clientY);
                    if (touches.size < 2) pinch = null;
                    if (touches.size === 0) {
                        lockUntilAllUp = false;
                        pinch = null;
                        window.__celstompPinching = false;
                    }
                    try {
                        stageViewport.releasePointerCapture(e.pointerId);
                    } catch {}
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                if (activeDrawPid === e.pointerId) {
                    e.preventDefault();
                    endDraw(e.pointerId, e.clientX, e.clientY);
                }
                pressureCache.delete(e.pointerId);
                tiltCache.delete(e.pointerId);
            }
            stageViewport.addEventListener("pointerup", endPointer, {
                capture: true,
                passive: false
            });
            stageViewport.addEventListener("pointercancel", endPointer, {
                capture: true,
                passive: false
            });
        }
        function wireTimelineHeaderControls() {
            if (!$("timelineHeader")) return;
            const prevF = $("tlPrevFrame");
            const nextF = $("tlNextFrame");
            const prevC = $("tlPrevCel");
            const nextC = $("tlNextCel");
            const toggle = $("tlPlayToggle");
            const onion = $("tlOnion");
            const dup = $("tlDupCel");
            const snap = $("tlSnap");
            const secs = $("tlSeconds");
            const fpsInp = $("tlFps");
            const psnap = $("tlPlaySnapped");
            safeSetValue(snap, snapFrames);
            safeSetValue(secs, seconds);
            safeSetValue(fpsInp, fps);
            safeSetChecked(onion, onionEnabled);
            safeSetChecked(psnap, playSnapped);
            toggle?.addEventListener("click", () => {
                if (isPlaying) pausePlayback(); else startPlayback();
            });
            prevF?.addEventListener("click", () => gotoFrame(stepBySnap(-1)));
            nextF?.addEventListener("click", () => gotoFrame(stepBySnap(1)));
            prevC?.addEventListener("click", gotoPrevCel);
            nextC?.addEventListener("click", gotoNextCel);
            onion?.addEventListener("change", e => {
                const now = !!e.target.checked;
                if (now !== onionEnabled) $("toggleOnion")?.click();
            });
            dup?.addEventListener("click", onDuplicateCel);
            snap?.addEventListener("input", e => {
                const v = Math.max(1, parseInt(e.target.value || 1, 10) || 1);
                snapFrames = v;
                safeSetValue(snapValue, v);
                updateHUD();
            });
            function rebuildTimelineKeepFrame() {
                const cur = currentFrame;
                buildTimeline();
                gotoFrame(Math.min(cur, totalFrames - 1));
                updateHUD();
                updateClipMarkers();
            }
            secs?.addEventListener("change", e => {
                seconds = Math.max(1, parseInt(e.target.value || 1, 10) || 1);
                totalFrames = fps * seconds;
                safeText(secLabel, String(seconds));
                rebuildTimelineKeepFrame();
            });
            fpsInp?.addEventListener("change", e => {
                fps = Math.max(1, parseInt(e.target.value || 1, 10) || 1);
                totalFrames = fps * seconds;
                safeText(fpsLabel, String(fps));
                rebuildTimelineKeepFrame();
            });
            psnap?.addEventListener("change", e => {
                playSnapped = !!e.target.checked;
                safeSetChecked(playSnappedChk, playSnapped);
            });
        }
        function dockDrag() {
            const dockToggle = $("dockToggleBtn");
            const dock = $("colorDock");
            const head = $("colorDockHeader");
            const btn = $("dockMinBtn");
            const body = $("colorDockBody");
            if (!dock || !head) return;
            function clampDockIntoView() {
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const timelineH = nowCSSVarPx("--timeline-h", 190);
                const headerH = document.querySelector("header.top")?.offsetHeight || 48;
                const rect = dock.getBoundingClientRect();
                let nx = rect.left;
                let ny = rect.top;
                const minLeft = 0;
                const maxLeft = Math.max(0, vw - rect.width);
                const minTop = headerH + 8;
                const maxTop = Math.max(minTop, vh - timelineH - rect.height - 8);
                nx = clamp(nx, minLeft, maxLeft);
                ny = clamp(ny, minTop, maxTop);
                dock.style.left = nx + "px";
                dock.style.top = ny + "px";
                dock.style.right = "auto";
                dock.style.bottom = "auto";
            }
            function setDockedRight(on) {
                if (on) {
                    dock.classList.add("docked-right");
                    const headerH = document.querySelector("header.top")?.offsetHeight || 48;
                    dock.style.top = headerH + 8 + "px";
                    dock.style.right = "14px";
                    dock.style.left = "auto";
                    dock.style.bottom = "calc(var(--timeline-h) + 4px)";
                } else {
                    dock.classList.remove("docked-right");
                    clampDockIntoView();
                }
            }
            dockToggle?.addEventListener("click", () => {
                const on = !dock.classList.contains("docked-right");
                setDockedRight(on);
            });
            let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
            head.addEventListener("mousedown", e => {
                if (dock.classList.contains("docked-right")) return;
                dragging = true;
                sx = e.clientX;
                sy = e.clientY;
                const r = dock.getBoundingClientRect();
                ox = r.left;
                oy = r.top;
                e.preventDefault();
            });
            window.addEventListener("mousemove", e => {
                if (!dragging) return;
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const timelineH = nowCSSVarPx("--timeline-h", 190);
                const headerH = document.querySelector("header.top")?.offsetHeight || 48;
                let nx = ox + e.clientX - sx;
                let ny = oy + e.clientY - sy;
                const minLeft = 0;
                const maxLeft = Math.max(0, vw - dock.offsetWidth);
                const minTop = headerH + 8;
                const maxTop = Math.max(minTop, vh - timelineH - dock.offsetHeight - 8);
                nx = clamp(nx, minLeft, maxLeft);
                ny = clamp(ny, minTop, maxTop);
                dock.style.left = nx + "px";
                dock.style.top = ny + "px";
                dock.style.right = "auto";
                dock.style.bottom = "auto";
            });
            window.addEventListener("mouseup", () => {
                dragging = false;
            });
            btn?.addEventListener("click", () => {
                if (!body) return;
                body.style.display = body.style.display === "none" ? "" : "none";
            });
            window.addEventListener("resize", () => clampDockIntoView());
        }
        function wirePanelToggles() {
            const app = document.querySelector(".app");
            if (!app) return;
            const hideLeft = $("hideLeftPanelBtn");
            const hideRight = $("hideRightPanelBtn");
            const hideTl = $("hideTimelineBtn");
            const showLeft = $("showLeftEdge");
            const showRight = $("showRightEdge");
            const showTl = $("showTimelineEdge");
            const tLeft = $("toggleSidebarBtn");
            const tRight = $("toggleRightbarBtn");
            function applyLayoutChange() {
                setTimeout(() => {
                    resizeCanvases();
                    updatePlayheadMarker();
                    updateClipMarkers();
                    centerView();
                }, 120);
            }
            function setLeftOpen(open) {
                app.classList.toggle("sidebar-collapsed", !open);
                applyLayoutChange();
            }
            function setRightOpen(open) {
                app.classList.toggle("rightbar-collapsed", !open);
                app.classList.toggle("rightbar-open", open);
                applyLayoutChange();
            }
            function setTimelineOpen(open) {
                app.classList.toggle("tl-collapsed", !open);
                applyLayoutChange();
            }
            setLeftOpen(true);
            setRightOpen(true);
            setTimelineOpen(true);
            hideLeft?.addEventListener("click", () => setLeftOpen(false));
            hideRight?.addEventListener("click", () => setRightOpen(false));
            hideTl?.addEventListener("click", () => setTimelineOpen(false));
            showLeft?.addEventListener("click", () => setLeftOpen(true));
            showRight?.addEventListener("click", () => setRightOpen(true));
            showTl?.addEventListener("click", () => setTimelineOpen(true));
            tLeft?.addEventListener("click", () => setLeftOpen(app.classList.contains("sidebar-collapsed")));
            tRight?.addEventListener("click", () => setRightOpen(app.classList.contains("rightbar-collapsed")));
        }
        
        function wireIslandResize() {
            const dock = document.querySelector(".islandDock") || $("floatingIsland");
            if (!dock || dock._islandResizeWired) return;
            dock._islandResizeWired = true;
            let handle = dock.querySelector(".islandResizeHandle");
            if (!handle) {
                handle = document.createElement("div");
                handle.className = "islandResizeHandle";
                handle.title = "Resize";
                dock.appendChild(handle);
            }
            const KEY = "celstomp_island_rect_v1";
            const minW = 240;
            const minH = 300;
            const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
            try {
                const saved = JSON.parse(localStorage.getItem(KEY) || "null");
                if (saved && Number.isFinite(saved.w) && Number.isFinite(saved.h)) {
                    dock.style.width = saved.w + "px";
                    dock.style.height = saved.h + "px";
                }
                if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
                    dock.style.left = saved.x + "px";
                    dock.style.top = saved.y + "px";
                }
            } catch {}
            let start = null;
            handle.addEventListener("pointerdown", e => {
                e.preventDefault();
                e.stopPropagation();
                const r = dock.getBoundingClientRect();
                start = {
                    id: e.pointerId,
                    x: e.clientX,
                    y: e.clientY,
                    w: r.width,
                    h: r.height,
                    left: r.left,
                    top: r.top
                };
                dock.classList.add("resizing");
                try {
                    handle.setPointerCapture(e.pointerId);
                } catch {}
            }, {
                passive: false
            });
            handle.addEventListener("pointermove", e => {
                if (!start || e.pointerId !== start.id) return;
                const maxW = window.innerWidth - start.left - 8;
                const maxH = window.innerHeight - start.top - 8;
                const w = clamp(start.w + (e.clientX - start.x), minW, Math.max(minW, maxW));
                const h = clamp(start.h + (e.clientY - start.y), minH, Math.max(minH, maxH));
                dock.style.width = w + "px";
                dock.style.height = h + "px";
            });
            const end = e => {
                if (!start || e.pointerId !== start.id) return;
                try {
                    handle.releasePointerCapture(start.id);
                } catch {}
                dock.classList.remove("resizing");
                try {
                    const r = dock.getBoundingClientRect();
                    localStorage.setItem(KEY, JSON.stringify({
                        x: Math.round(r.left),
                        y: Math.round(r.top),
                        w: Math.round(r.width),
                        h: Math.round(r.height)
                    }));
                } catch {}
                start = null;
            };
            handle.addEventListener("pointerup", end);
            handle.addEventListener("pointercancel", end);
        }

        wireIslandResize();

        // factored
        wireTopMenus();
        const layerSeg = $("layerSeg");
        layerSeg?.addEventListener("change", () => {
            wireLayerVisButtons();
            if (activeLayer !== PAPER_LAYER) rememberCurrentColorForLayer(activeLayer);
            const val = document.querySelector('input[name="btype"]:checked')?.value || "line";
            if (val === "paper") {
                activeLayer = PAPER_LAYER;
                renderLayerSwatches();
                queueUpdateHud();
                return;
            }
            activeLayer = layerFromValue(val);
            const hex = activeSubColor[activeLayer] || "#000000";
            currentColor = hex;
            try {
                setColorSwatch?.();
            } catch {}
            renderLayerSwatches();
            applyRememberedColorForLayer(activeLayer);
            try {
                const c = getRememberedColorForLayer?.(activeLayer) || currentColor || "#000000";
                setCurrentColorHex(c, {
                    remember: false
                });
            } catch {
                drawHSVWheel();
            }
        });
        saveOklchDefaultBtn?.addEventListener("click", () => {
            const L = clamp(parseFloat(defLInput?.value) || 0, 0, 100);
            const C = clamp(parseFloat(defCInput?.value) || 0, 0, 1);
            const H = clamp(parseFloat(defHInput?.value) || 0, 0, 360);
            oklchDefault = {
                L: L,
                C: C,
                H: H
            };
            applyOklchDefaultToPicker();
            if (oklchDefaultStatus) {
                oklchDefaultStatus.style.display = "inline-block";
                setTimeout(() => oklchDefaultStatus.style.display = "none", 1200);
            }
        });
        toolSeg?.addEventListener("change", () => {
            tool = document.querySelector('input[name="tool"]:checked')?.value || "brush";
            if (tool !== "rect-select" && rectSelection.active && !rectSelection.moving) {
                clearRectSelection();
            }
            refreshToolSettingsUI();
            scheduleBrushPreviewUpdate(true);
            updateHUD();
            clearFx();
        });
        brushShapeSeg?.addEventListener("change", () => {
            const selectedShape = document.querySelector('input[name="brushShape"]:checked')?.value || "circle";
            if (tool === "eraser") {
                eraserSettings = mergeBrushSettings(eraserSettings, {
                    shape: selectedShape
                });
                eraserSize = eraserSettings.size;
            } else {
                brushSettings = mergeBrushSettings(brushSettings, {
                    shape: selectedShape
                });
                brushType = brushSettings.shape;
                brushSize = brushSettings.size;
            }
            refreshToolSettingsUI();
            scheduleBrushPreviewUpdate(true);
            updateHUD();
            clearFx();
        });
        addPaletteColorBtn?.addEventListener("click", () => {
            addCurrentColorToPalette();
        });
        chooseFillEraserBtn?.addEventListener("click", () => {
            const r = $("tool-filleraser");
            if (r) r.checked = true;
            tool = "fill-eraser";
            updateHUD();
            clearFx();
        });
        chooseFillBrushBtn?.addEventListener("click", () => {
            const r = $("tool-fillbrush");
            if (r) r.checked = true;
            tool = "fill-brush";
            updateHUD();
            clearFx();
        });
        chooseLassoFillBtn?.addEventListener("click", () => {
            const r = $("tool-lassoFill");
            if (r) r.checked = true;
            tool = "lasso-fill";
            updateHUD();
            clearFx();
        });
        bgColorInput?.addEventListener("input", e => {
            setCanvasBgColor(e.target.value);
            renderAll();
        });
        bgColorInput?.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            openColorPickerAtCursor(e, canvasBgColor, hex => {
                canvasBgColor = hex;
                try {
                    bgColorInput.value = hex;
                } catch {}
                renderAll();
            });
        }, {
            passive: false
        });
        aaToggle?.addEventListener("change", e => {
            antiAlias = e.target.checked;
            queueRenderAll();
        });
        const applyStabilizationLevel = v => {
            stabilizationLevel = Math.max(0, Math.min(10, parseInt(v, 10) || 0));
            pressureSmooth = pressureSmoothFromLevel(stabilizationLevel);
            strokeSmooth = strokeSmoothFromLevel(stabilizationLevel);
            safeSetValue(stabilizationSelect, stabilizationLevel);
        };
        setPenControlsVisible(false);
        safeSetChecked(pressureSizeToggle, usePressureSize);
        safeSetChecked(pressureOpacityToggle, usePressureOpacity);
        safeSetChecked(pressureTiltToggle, usePressureTilt);
        applyStabilizationLevel(stabilizationLevel);
        stabilizationSelect?.addEventListener("change", e => {
            applyStabilizationLevel(e.target.value);
        });
        const clampBrushSizeUiValue = raw => {
            const n = parseInt(raw, 10);
            const min = parseInt(brushSizeInput?.min || brushSizeNumInput?.min || "1", 10) || 1;
            const max = parseInt(brushSizeInput?.max || brushSizeNumInput?.max || "999", 10) || 999;
            return Math.max(min, Math.min(max, Number.isFinite(n) ? n : brushSize));
        };
        const applyBrushSizeUi = v => {
            const nextSize = clampBrushSizeUiValue(v);
            if (tool === "eraser") {
                eraserSettings = mergeBrushSettings(eraserSettings, {
                    size: nextSize
                });
                eraserSize = eraserSettings.size;
            } else {
                brushSettings = mergeBrushSettings(brushSettings, {
                    size: nextSize
                });
                brushType = brushSettings.shape;
                brushSize = brushSettings.size;
            }
            refreshToolSettingsUI();
            try {
                scheduleBrushPreviewUpdate?.(true);
            } catch {}
        };
        brushSizeInput?.addEventListener("input", e => {
            applyBrushSizeUi(e.target.value);
        });
        brushSizeNumInput?.addEventListener("input", e => {
            applyBrushSizeUi(e.target.value);
        });
        eraserSizeInput?.addEventListener("input", e => {
            eraserSize = parseInt(e.target.value, 10);
            eraserSettings = mergeBrushSettings(eraserSettings, {
                size: eraserSize
            });
            safeText(eraserVal, String(eraserSize));
            refreshToolSettingsUI();
        });
        toolOpacityRange?.addEventListener("input", e => {
            const v = clamp01((parseInt(e.target.value, 10) || 100) / 100);
            setActiveToolSettings({
                opacity: v
            });
            _brushStampCache.clear();
            scheduleBrushPreviewUpdate(true);
            refreshToolSettingsUI();
        });
        toolAngleRange?.addEventListener("input", e => {
            const v = Math.max(-90, Math.min(90, parseInt(e.target.value, 10) || 0));
            setActiveToolSettings({
                angle: v
            });
            _brushMaskCache.clear();
            _brushStampCache.clear();
            scheduleBrushPreviewUpdate(true);
            refreshToolSettingsUI();
        });
        wireToolSettingsFolds();
        wireBrushShapeTooltips();
        refreshToolSettingsUI();
        pressureSizeToggle?.addEventListener("change", e => usePressureSize = e.target.checked);
        pressureOpacityToggle?.addEventListener("change", e => usePressureOpacity = e.target.checked);
        pressureTiltToggle?.addEventListener("change", e => usePressureTilt = e.target.checked);
        $("toggleOnion")?.addEventListener("click", () => {
            onionEnabled = !onionEnabled;
            $("toggleOnion").textContent = `Onion: ${onionEnabled ? "On" : "Off"}`;
            renderAll();
        });
        function setTransparencyEnabled(on) {
            transparencyHoldEnabled = !!on;
            const btn = $("toggleTransparency");
            if (btn) btn.textContent = `Transparency: ${transparencyHoldEnabled ? "On" : "Off"}`;
            const chk = $("tlTransparency");
            if (chk) chk.checked = transparencyHoldEnabled;
            try {
                renderAll();
            } catch {}
        }
        function initTransparencyControls() {
            const btn = $("toggleTransparency");
            const chk = $("tlTransparency");
            if (btn && !btn._wiredTransparency) {
                btn._wiredTransparency = true;
                btn.addEventListener("click", () => setTransparencyEnabled(!transparencyHoldEnabled));
            }
            if (chk && !chk._wiredTransparency) {
                chk._wiredTransparency = true;
                chk.addEventListener("change", () => setTransparencyEnabled(chk.checked));
            }
            setTransparencyEnabled(!!transparencyHoldEnabled);
        }
        onionPrevColorInput?.addEventListener("input", e => {
            onionPrevTint = e.target.value || "#4080ff";
            renderAll();
        });
        onionNextColorInput?.addEventListener("input", e => {
            onionNextTint = e.target.value || "#40ff78";
            renderAll();
        });
        onionAlphaInput?.addEventListener("input", e => {
            const v = parseInt(e.target.value, 10) || 20;
            onionAlpha = clamp(v / 100, .05, .8);
            safeText(onionAlphaVal, String(v));
            renderAll();
        });
        playSnappedChk?.addEventListener("change", e => playSnapped = e.target.checked);
        keepOnionPlayingChk?.addEventListener("change", e => keepOnionWhilePlaying = e.target.checked);
        keepTransPlayingChk?.addEventListener("change", e => keepTransWhilePlaying = e.target.checked);
        gapPxInput?.addEventListener("input", () => {
            closeGapPx = clamp(parseInt(gapPxInput.value, 10) || 0, 0, 200);
        });
        autofillToggle?.addEventListener("change", () => {
            autofill = autofillToggle.checked;
        });
        fillCurrentBtn?.addEventListener("click", () => {
            pushUndo(LAYER.FILL, currentFrame);
            fillFromLineart(currentFrame);
        });
        fillAllBtn?.addEventListener("click", async () => {
            for (let i = 0; i < totalFrames; i++) {
                if (mainLayerHasContent(LAYER.LINE, i)) {
                    pushUndo(LAYER.FILL, i);
                    fillFromLineart(i);
                }
                if (i % 10 === 0) await sleep(0);
            }
        });
        clearAllBtn?.addEventListener("click", clearAllProjectState);
        dupCelBtn?.addEventListener("click", onDuplicateCel);
        tlDupBtn?.addEventListener("click", onDuplicateCel);
        tlPrevCelBtn?.addEventListener("click", gotoPrevCel);
        tlNextCelBtn?.addEventListener("click", gotoNextCel);
        fitViewBtn?.addEventListener("click", resetCenter);
        jumpStartBtn?.addEventListener("click", () => gotoFrame(clipStart));
        jumpEndBtn?.addEventListener("click", () => gotoFrame(clipEnd));
        prevFrameBtn?.addEventListener("click", () => gotoFrame(stepBySnap(-1)));
        nextFrameBtn?.addEventListener("click", () => gotoFrame(stepBySnap(1)));

        $("playBtn")?.addEventListener("click", startPlayback);
        $("pauseBtn")?.addEventListener("click", pausePlayback);
        $("stopBtn")?.addEventListener("click", stopAndRewind);
        loopToggle?.addEventListener("change", () => loopPlayback = loopToggle.checked);
        tlPlayBtn?.addEventListener("click", () => $("playBtn")?.click());
        tlPauseBtn?.addEventListener("click", () => $("pauseBtn")?.click());
        tlStopBtn?.addEventListener("click", () => $("stopBtn")?.click());

        exportMP4Btn?.addEventListener("click", async () => {
            const mime = pickMP4Mime();
            if (!mime) {
                alert("MP4 export is not supported in this browser. Try Safari or export WebM.");
                return;
            }
            await exportClip(mime, "mp4");
        });
        exportImgSeqBtn?.addEventListener("click", async e => {
            e.preventDefault();
            e.stopPropagation();
            if (!imgSeqExporter?.handleClick) {
                alert("IMG sequence exporter is unavailable.");
                return;
            }
            const options = await askImgSeqExportOptions();
            if (!options) return;
            await imgSeqExporter.handleClick({
                preventDefault: () => {},
                stopPropagation: () => {},
                altKey: !!options.transparent,
                shiftKey: false
            }, exportImgSeqBtn);
        });
        exportGIFBtn?.addEventListener("click", async e => {
            e.preventDefault();
            e.stopPropagation();
            const options = await askGifExportOptions();
            if (!options) return;
            const oldTxt = exportGIFBtn.textContent;
            exportGIFBtn.disabled = true;
            exportGIFBtn.textContent = "Exporting...";
            try {
                await exportGif(options);
            } catch (err) {
                alert("GIF export failed: " + (err?.message || err));
            } finally {
                exportGIFBtn.disabled = false;
                exportGIFBtn.textContent = oldTxt;
            }
        });
        toggleAutosaveBtn?.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            autosaveEnabled = !autosaveEnabled;
            autosaveController?.setEnabled?.(autosaveEnabled);
            if (autosaveEnabled) {
                autosaveController?.markClean?.("Autosave On");
            }
            syncAutosaveUiState();
            updateRestoreAutosaveButton();
        });
        autosaveIntervalBtn?.addEventListener("click", async e => {
            e.preventDefault();
            e.stopPropagation();
            const minutes = await askAutosaveIntervalOptions();
            if (!minutes) return;
            autosaveIntervalMinutes = clamp(Number(minutes) || autosaveIntervalMinutes || 1, 1, 120);
            autosaveController?.setIntervalMs?.(autosaveIntervalMinutes * 60000);
            syncAutosaveUiState();
        });
        function initSaveLoadWiring() {
            if (window.__CELSTOMP_SAVELOAD_WIRED__) return;
            window.__CELSTOMP_SAVELOAD_WIRED__ = true;
            const saveProjBtn = $("saveProj");
            const loadProjBtn = $("loadProj");
            const loadFileInp = $("loadFileInp");
            const restoreAutosaveBtn = $("restoreAutosave");
            if (!saveProjBtn || !loadProjBtn || !loadFileInp) return;
            saveProjBtn.addEventListener("click", async () => {
                try {
                    if (saveProjBtn.disabled) return;
                    saveProjBtn.disabled = true;
                    await saveProject();
                } catch (err) {
                    alert("Failed to save project: " + (err?.message || err));
                } finally {
                    saveProjBtn.disabled = false;
                }
            });
            loadProjBtn.addEventListener("click", () => {
                loadFileInp.value = "";
                loadFileInp.click();
            });
            restoreAutosaveBtn?.addEventListener("click", () => {
                const restored = autosaveController?.restoreLatest("autosave-button");
                if (!restored) updateRestoreAutosaveButton();
            });
            loadFileInp.addEventListener("change", e => {
                const f = e.currentTarget.files?.[0] || null;
                e.currentTarget.value = "";
                if (f) loadProject(f, {
                    source: "file"
                });
            });
            if (autosaveEnabled) setSaveStateBadge("Saved");
            wireAutosaveDirtyTracking();
            updateRestoreAutosaveButton();
            if (autosaveEnabled) window.setTimeout(maybePromptAutosaveRecovery, 0);
            syncAutosaveUiState();
        }
        if (document.readyState === "loading") {
            window.addEventListener("DOMContentLoaded", initSaveLoadWiring, {
                once: true
            });
        } else {
            initSaveLoadWiring();
        }
        if (document.readyState === "loading") {
            window.addEventListener("DOMContentLoaded", () => {
                wireBrushButtonRightClick();
                wireEraserButtonRightClick();
            }, {
                once: true
            });
        } else {
            wireBrushButtonRightClick();
            wireEraserButtonRightClick();
        }
        function recalcSnap() {
            const val = parseInt(snapValue?.value, 10);
            snapFrames = Number.isFinite(val) ? Math.max(1, val) : 1;
        }
        snapValue?.addEventListener("input", recalcSnap);
        window.addEventListener("keydown", e => {
            const ctrl = e.ctrlKey || e.metaKey;
            {
                const tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : "";
                const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target && e.target.isContentEditable;
                if (!typing && !ctrl && !e.altKey) {
                    const k = (e.key || "").toLowerCase();
                    if (k === "e") {
                        e.preventDefault();
                        gotoFrame(stepBySnap(-1));
                        return;
                    }
                    if (k === "r") {
                        e.preventDefault();
                        gotoFrame(stepBySnap(1));
                        return;
                    }
                    if (k === "q") {
                        e.preventDefault();
                        gotoPrevCel();
                        return;
                    }
                    if (k === "w") {
                        e.preventDefault();
                        gotoNextCel();
                        return;
                    }
                }
            }
            {
                const tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : "";
                const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target && e.target.isContentEditable;
                if (!typing && !ctrl && !e.altKey) {
                    const isDigit = n => e.code === `Digit${n}` || e.code === `Numpad${n}` || e.key === String(n);
                    const pickTool = ({id: id, value: value, altIds: altIds = []}) => {
                        let inp = id && $(id) || null;
                        if (!inp) {
                            for (const a of altIds) {
                                inp = $(a);
                                if (inp) break;
                            }
                        }
                        if (!inp && value) {
                            inp = document.querySelector(`input[name="tool"][value="${value}"]`);
                        }
                        if (!inp) return false;
                        inp.checked = true;
                        inp.dispatchEvent(new Event("change", {
                            bubbles: true
                        }));
                        return true;
                    };
                    if (!e.shiftKey) {
                        if (isDigit(1)) {
                            e.preventDefault();
                            pickTool({
                                id: "tool-brush",
                                value: "brush"
                            });
                        }
                        if (isDigit(2)) {
                            e.preventDefault();
                            pickTool({
                                id: "tool-eraser",
                                value: "eraser"
                            });
                        }
                        if (isDigit(3)) {
                            e.preventDefault();
                            pickTool({
                                id: "tool-fillbrush",
                                value: "fill-brush"
                            });
                        }
                        if (isDigit(4)) {
                            e.preventDefault();
                            pickTool({
                                id: "tool-filleraser",
                                value: "fill-eraser"
                            });
                        }
                        if (isDigit(5)) {
                            e.preventDefault();
                            pickTool({
                                id: "tool-lassoFill",
                                value: "lasso-fill"
                            });
                        }
                        if (isDigit(6)) {
                            e.preventDefault();
                            pickTool({
                                id: "tool-lassoErase",
                                altIds: [ "tool-lassoerase", "tool-lasso-erase" ],
                                value: "lasso-erase"
                            });
                        }
                        if (isDigit(7)) {
                            e.preventDefault();
                            pickTool({
                                id: "tool-rectSelect",
                                value: "rect-select"
                            });
                        }
                        if (isDigit(8)) {
                            e.preventDefault();
                            pickTool({
                                id: "tool-eyedropper",
                                value: "eyedropper"
                            });
                        }
                    }
                }
            }
            if (e.key === "Escape") {
                if (tool === "lasso-fill" && lassoActive) {
                    e.preventDefault();
                    cancelLasso();
                    isDrawing = false;
                    lastPt = null;
                    return;
                }
                if (rectSelection.active) {
                    e.preventDefault();
                    clearRectSelection();
                    return;
                }
            }
            if ((e.key === "Delete" || e.key === "Backspace") && rectSelection.active) {
                const tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : "";
                if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
                    const c = getFrameCanvas(rectSelection.L, rectSelection.F, rectSelection.key);
                    const ctx = c.getContext("2d", {
                        willReadFrequently: true
                    });
                    if (ctx) {
                        beginGlobalHistoryStep(rectSelection.L, rectSelection.F, rectSelection.key);
                        ctx.clearRect(rectSelection.x, rectSelection.y, rectSelection.w, rectSelection.h);
                        markGlobalHistoryDirty();
                        recomputeHasContent(rectSelection.L, rectSelection.F, rectSelection.key);
                        commitGlobalHistoryStep();
                        updateTimelineHasContent(rectSelection.F);
                        renderAll();
                    }
                    clearRectSelection();
                    e.preventDefault();
                    return;
                }
            }
            if ((e.key === "Delete" || e.key === "Backspace") && selectedCels.size) {
                const tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : "";
                if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
                    e.preventDefault();
                    deleteSelectedCels();
                    return;
                }
            }
            if ((e.key === "Delete" || e.key === "Backspace") && !selectedCels.size) {
                const tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : "";
                if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
                    const did = deleteActiveColorAtCurrentFrame();
                    if (did) {
                        e.preventDefault();
                        return;
                    }
                }
            }
            if (ctrl && e.key.toLowerCase() === "z" && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if (ctrl && e.key.toLowerCase() === "z" && e.shiftKey) {
                e.preventDefault();
                redo();
            } else if (e.key === " ") {
                e.preventDefault();
                if (isPlaying) pausePlayback(); else startPlayback();
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                gotoNextCel();
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                gotoPrevCel();
            } else if (e.key === "ArrowLeft") {
                gotoFrame(stepBySnap(-1));
            } else if (e.key === "ArrowRight") {
                gotoFrame(stepBySnap(1));
            }
        });
        function wireFloatingIslandDrag() {
            const dock = $("floatingIsland") || document.querySelector(".islandDock");
            if (!dock) return;
            const head = dock.querySelector(".islandHeader");
            if (!head) return;
            if (dock._dragWired) return;
            dock._dragWired = true;
            let dragging = false;
            let pid = null;
            let offX = 0;
            let offY = 0;
            let cachedHeaderH = 48;
            let cachedVW = window.innerWidth;
            let cachedVH = window.innerHeight;
            let cachedW = 0;
            let cachedH = 0;
            const pad = 8;
            const updateCache = () => {
                cachedHeaderH = typeof nowCSSVarPx === "function" ? nowCSSVarPx("--header-h", 48) : 48;
                cachedVW = window.innerWidth;
                cachedVH = window.innerHeight;
                const r = dock.getBoundingClientRect();
                cachedW = r.width;
                cachedH = r.height;
            };
            const clampPos = (x, y) => {
                // O(1) calculation using cached values to prevent Layout Thrashing
                x = Math.max(pad, Math.min(cachedVW - cachedW - pad, x));
                y = Math.max(cachedHeaderH + pad, Math.min(cachedVH - cachedH - pad, y));
                return { x, y };
            };
            head.addEventListener("pointerdown", e => {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                if (e.target.closest(".islandBtn, .islandBtns, .islandResizeHandle")) return;
                
                updateCache();
                
                const r = dock.getBoundingClientRect();
                offX = e.clientX - r.left;
                offY = e.clientY - r.top;
                dragging = true;
                pid = e.pointerId;
                dock.classList.add("dragging");
                try {
                    head.setPointerCapture(pid);
                } catch {}
                e.preventDefault();
            }, {
                passive: false
            });
            window.addEventListener("pointermove", e => {
                if (!dragging || e.pointerId !== pid) return;
                const pos = clampPos(e.clientX - offX, e.clientY - offY);
                dock.style.left = pos.x + "px";
                dock.style.top = pos.y + "px";
                e.preventDefault();
            }, {
                passive: false
            });
            const end = e => {
                if (!dragging || pid != null && e.pointerId !== pid) return;
                dragging = false;
                dock.classList.remove("dragging");
                try {
                    head.releasePointerCapture(pid);
                } catch {}
                pid = null;
            };

            window.addEventListener("pointerup", end, {
                passive: true
            });
            window.addEventListener("pointercancel", end, {
                passive: true
            });
        }
        wireFloatingIslandDrag();
        let _islandLayerAutoFit = null;
        
        function initIslandLayerAutoFit() {
            if (_islandLayerAutoFit) return;
            const st = {
                raf: 0,
                lastScale: 1,
                ro: null,
                mo: null,
                docMo: null
            };
            function schedule() {
                if (st.raf) return;
                st.raf = requestAnimationFrame(() => {
                    st.raf = 0;
                    apply();
                });
            }
            function apply() {
                const slot = $("islandLayersSlot");
                const seg = $("layerSeg");
                if (!slot || !seg) return;
                if (!slot.contains(seg)) {
                    if (st.lastScale !== 1) {
                        seg.style.transform = "";
                        seg.style.transformOrigin = "";
                        seg.style.willChange = "";
                        st.lastScale = 1;
                    }
                    return;
                }
                const cs = getComputedStyle(slot);
                const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
                const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
                const availH = Math.max(10, slot.clientHeight - padY);
                const availW = Math.max(10, slot.clientWidth - padX);
                const naturalH = Math.max(1, seg.scrollHeight);
                const naturalW = Math.max(1, seg.scrollWidth);
                let s = Math.min(1, availH / naturalH, availW / naturalW);
                s = Math.max(.25, s);
                s = Math.round(s * 100) / 100;
                if (Math.abs(s - st.lastScale) < .01) return;
                st.lastScale = s;
                seg.style.transformOrigin = "top left";
                seg.style.transform = `scale(${s})`;
                seg.style.willChange = "transform";
            }
            function startObservers() {
                const slot = $("islandLayersSlot");
                const seg = $("layerSeg");
                if (!slot || !seg) return;
                st.ro = new ResizeObserver(schedule);
                st.ro.observe(slot);
                st.mo = new MutationObserver(schedule);
                st.mo.observe(seg, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    characterData: true
                });
                st.mo.observe(slot, {
                    childList: true,
                    subtree: true
                });
                window.addEventListener("resize", schedule, {
                    passive: true
                });
                apply();
            }
            st.docMo = new MutationObserver(() => {
                schedule();
                const slot = $("islandLayersSlot");
                const seg = $("layerSeg");
                if (slot && seg && slot.contains(seg)) {
                    if (!st.ro) startObservers();
                }
            });
            st.docMo.observe(document.body, {
                childList: true,
                subtree: true
            });
            schedule();
            _islandLayerAutoFit = st;
        }
        initIslandLayerAutoFit();

        function buildAndInit() {
            buildTimeline();
            resizeCanvases();
            resetCenter();
            updateHUD();
            initHSVWheelPicker();
            setPickerDefaultBlack();
            setColorSwatch();
            loadPalette();
            renderPalette();
            if (bgColorInput) bgColorInput.value = canvasBgColor;
            renderLayerSwatches();
            wireLayerVisButtons();
            wireKeyboardShortcuts();
            wireQoLFeatures();
            setHSVPreviewBox();
            if (toggleOnionBtn) toggleOnionBtn.textContent = "Onion: Off";
            if (toggleTransparencyBtn) toggleTransparencyBtn.textContent = "Transparency: Off";
        }
        const ro = new ResizeObserver(resizeCanvases);
        ro.observe(stageEl);
        window.addEventListener("resize", () => {
            resizeCanvases();
        });
        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", () => {
                resizeCanvases();
            }, {
                passive: true
            });
        }


        initMobileNativeZoomGuard();
        mountIslandDock();

        wireTimelineHeaderControls();
        dockDrag();
        wirePanelToggles();
        wireBrushButtonRightClick();
        wireEraserButtonRightClick();
        wirePointerDrawingOnCanvas($("drawCanvas"));

        // initialization flow (ie: calling predefined funcs)
        buildAndInit();
    });
})();
