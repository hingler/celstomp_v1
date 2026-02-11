let timelineFrameWidth = 30;
let soloLayer = null;

let straightLineMode = false;
let straightLineStart = null;
let temporaryEyedropper = false;
let previousTool = null;

function wireQoLFeatures() {
  if (document._celstompQoLWired) return;
  document._celstompQoLWired = true;

  _wireShortcutsModal();
  _wireUnsavedChangesGuard();
  _wireTimelineEnhancements();
  _wireLayerQoL();
  _wirePaletteQoL();
  _wireExtraKeyboardShortcuts();
}

// IMPL funcs
function _wireShortcutsModal() {
  const modal = $("shortcutsModal");
  const backdrop = $("shortcutsModalBackdrop");
  const closeBtn = $("shortcutsCloseBtn");
  if (!modal || !backdrop || !closeBtn) return;

  const toggleModal = show => {
      if (show) {
          modal.hidden = false;
          backdrop.hidden = false;
      } else {
          modal.hidden = true;
          backdrop.hidden = true;
      }
  };

  closeBtn.addEventListener("click", () => toggleModal(false));
  backdrop.addEventListener("click", () => toggleModal(false));

  document.addEventListener("keydown", e => {
      if (e.key === "?" && !isTyping(e.currentTarget.activeElement)) {
          e.preventDefault();
          toggleModal(!modal.hidden);
      }
  }, {
      passive: false
  });
}
function isTyping(el) {
  if (!el) return false;
  const tag = (el.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || el.isContentEditable;
}
function _wireUnsavedChangesGuard() {
  window.addEventListener("beforeunload", e => {
      if (markProjectDirty && document.querySelector("#saveStateBadge")?.textContent !== "Saved") {
          e.preventDefault();
          e.returnValue = "";
          return "";
      }
  });
}
function _wireTimelineEnhancements() {
  const insertBtn = $("insertFrameBtn");
  const deleteBtn = $("deleteFrameBtn");
  const gotoInput = $("gotoFrameInput");
  const gotoBtn = $("gotoFrameBtn");
  const zoomIn = $("zoomTimelineIn");
  const zoomOut = $("zoomTimelineOut");

  if (insertBtn) {
      insertBtn.addEventListener("click", () => insertFrame(currentFrame));
  }
  if (deleteBtn) {
      deleteBtn.addEventListener("click", () => deleteFrame(currentFrame));
  }
  if (gotoBtn && gotoInput) {
      gotoBtn.addEventListener("click", () => {
          const frame = parseInt(gotoInput.value, 10);
          if (Number.isFinite(frame) && frame >= 1 && frame <= totalFrames) {
              gotoFrame(frame - 1);
              gotoInput.value = "";
          }
      });
      gotoInput.addEventListener("keydown", e => {
          if (e.key === "Enter") {
              gotoBtn.click();
          }
      });
  }
  if (zoomIn) {
      zoomIn.addEventListener("click", () => {
          timelineFrameWidth = Math.min(100, timelineFrameWidth + 5);
          renderTimeline();
      });
  }
  if (zoomOut) {
      zoomOut.addEventListener("click", () => {
          timelineFrameWidth = Math.max(15, timelineFrameWidth - 5);
          renderTimeline();
      });
  }
}
function insertFrame(frameIndex) {
  beginGlobalHistoryStep();
  for (let i = totalFrames - 1; i >= frameIndex; i--) {
      const src = getFrameCanvas(LAYER.LINE, i, null);
      if (src) {
          const ctx = getFrameCanvas(LAYER.LINE, i + 1, null);
          if (ctx) {
              ctx.clearRect(0, 0, contentW, contentH);
              ctx.drawImage(src, 0, 0);
          }
      }
  }
  totalFrames++;
  markProjectDirty();
  renderTimeline();
  commitGlobalHistoryStep();
}
function deleteFrame(frameIndex) {
  if (totalFrames <= 1) {
      alert("Cannot delete the last frame");
      return;
  }
  beginGlobalHistoryStep();
  for (let i = frameIndex; i < totalFrames - 1; i++) {
      const src = getFrameCanvas(LAYER.LINE, i + 1, null);
      if (src) {
          const ctx = getFrameCanvas(LAYER.LINE, i, null);
          if (ctx) {
              ctx.clearRect(0, 0, contentW, contentH);
              ctx.drawImage(src, 0, 0);
          }
      }
  }
  const last = getFrameCanvas(LAYER.LINE, totalFrames - 1, null);
  if (last) {
      const ctx = last.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, contentW, contentH);
  }
  totalFrames--;
  if (currentFrame >= totalFrames) currentFrame = totalFrames - 1;
  markProjectDirty();
  renderTimeline();
  commitGlobalHistoryStep();
}
function _wireLayerQoL() {
  const soloBtn = $("soloLayerBtn");
  const showAllBtn = $("showAllLayersBtn");
  if (soloBtn) {
      soloBtn.addEventListener("click", () => {
          if (soloLayer === activeLayer) {
              soloLayer = null;
              soloBtn.textContent = "Solo";
              soloBtn.style.background = "";
          } else {
              soloLayer = activeLayer;
              soloBtn.textContent = `Solo ${getLayerName(activeLayer)}`;
              soloBtn.style.background = "rgba(255,215,0,0.3)";
          }
          renderAll();
      });
  }
  if (showAllBtn) {
      showAllBtn.addEventListener("click", () => {
          soloLayer = null;
          layerVisibility = {};
          layerLocks = {};
          if (soloBtn) {
              soloBtn.textContent = "Solo";
              soloBtn.style.background = "";
          }
          renderAll();
      });
  }
}

function _wirePaletteQoL() {
  const newBtn = $("newPaletteBtn");
  const exportBtn = $("exportPaletteBtn");
  const importBtn = $("importPaletteBtn");
  const loadFileInp = document.createElement("input");
  loadFileInp.type = "file";
  loadFileInp.accept = ".json,application/json";
  loadFileInp.style.display = "none";
  document.body.appendChild(loadFileInp);

  if (newBtn) {
      newBtn.addEventListener("click", () => {
          colorPalette = [];
          renderPalette();
          markProjectDirty();
      });
  }
  if (exportBtn) {
      exportBtn.addEventListener("click", () => {
          const data = JSON.stringify({
              palette: colorPalette,
              version: 1
          }, null, 2);
          const blob = new Blob([data], {
              type: "application/json"
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "celstomp-palette.json";
          a.click();
          URL.revokeObjectURL(url);
      });
  }
  if (importBtn) {
      importBtn.addEventListener("click", () => loadFileInp.click());
      loadFileInp.addEventListener("change", e => {
          const file = e.target.files?.[0];
          if (file) {
              const reader = new FileReader;
              reader.onload = ev => {
                  try {
                      const data = JSON.parse(ev.target.result);
                      if (data.palette && Array.isArray(data.palette)) {
                          colorPalette = data.palette;
                          renderPalette();
                          markProjectDirty();
                      }
                  } catch (err) {
                      alert("Failed to import palette: " + err.message);
                  }
              };
              reader.readAsText(file);
          }
          loadFileInp.value = "";
      });
  }
}
function _wireExtraKeyboardShortcuts() {
  document.addEventListener("keydown", e => {
      if (e.defaultPrevented) return;
      if (isTyping(document.activeElement)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const k = (e.key || "").toLowerCase();

      if (k === "?" && !e.shiftKey) {
          e.preventDefault();
          const modal = $("shortcutsModal");
          const backdrop = $("shortcutsModalBackdrop");
          if (modal && backdrop) {
              modal.hidden = !modal.hidden;
              backdrop.hidden = !backdrop.hidden;
          }
          return;
      }

      if (ctrl && k === "y") {
          e.preventDefault();
          redo();
          return;
      }

      if (k === "o") {
          e.preventDefault();
          const onionBtn = $("tlOnion");
          if (onionBtn) {
              onionBtn.checked = !onionBtn.checked;
              onionBtn.dispatchEvent(new Event("change"));
          }
          return;
      }

      if (k === "f") {
          e.preventDefault();
          pushUndo(LAYER.FILL, currentFrame);
          fillFromLineart(currentFrame);
          return;
      }

      if (k === "[") {
          e.preventDefault();
          brushSize = Math.max(1, brushSize - 5);
          applyBrushSizeUi(brushSize);
          return;
      }

      if (k === "]") {
          e.preventDefault();
          brushSize = Math.min(400, brushSize + 5);
          applyBrushSizeUi(brushSize);
          return;
      }

      if (k === "alt") {
          if (!temporaryEyedropper) {
              temporaryEyedropper = true;
              previousTool = tool;
              tool = "eyedropper";
              updateHUD();
          }
          return;
      }

      if (e.key === "Shift" && !straightLineMode) {
          straightLineMode = true;
          return;
      }
  }, {
      passive: false
  });

  document.addEventListener("keyup", e => {
      if (e.key === "Alt" && temporaryEyedropper) {
          temporaryEyedropper = false;
          if (previousTool) {
              tool = previousTool;
              previousTool = null;
              updateHUD();
          }
      }
      if (e.key === "Shift") {
          straightLineMode = false;
          straightLineStart = null;
      }
  });

  const originalPointerDown = window._pointerDownHandler;
  if (originalPointerDown) {
      window.addEventListener("pointerdown", e => {
          if (e.shiftKey && (tool === "brush" || tool === "fill-brush")) {
              straightLineStart = {
                  x: e.offsetX,
                  y: e.offsetY
              };
          }
          if (originalPointerDown) {
              originalPointerDown(e);
          }
      }, true);
  }

  const originalPointerMove = window._pointerMoveHandler;
  if (originalPointerMove) {
      window.addEventListener("pointermove", e => {
          if (straightLineMode && straightLineStart && (tool === "brush" || tool === "fill-brush")) {
              if (drawCanvas) {
                  const ctx = drawCanvas.getContext("2d");
                  const rect = drawCanvas.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  ctx.save();
                  ctx.setTransform(dctx.getTransform());
                  ctx.beginPath();
                  ctx.moveTo(straightLineStart.x, straightLineStart.y);
                  ctx.lineTo(x, y);
                  ctx.strokeStyle = currentColor;
                  ctx.lineWidth = brushSize;
                  ctx.lineCap = "round";
                  ctx.stroke();
                  ctx.restore();
              }
          }
          if (originalPointerMove) {
              originalPointerMove(e);
          }
      }, true);
  }
}
function wireKeyboardShortcuts() {
  if (document._celstompKeysWired) return;
  document._celstompKeysWired = true;
  const isTyping = el => {
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || el.isContentEditable;
  };
  const setTool = t => {
      tool = t;
      try {
          updateHUD?.();
      } catch {}
      try {
          scheduleBrushPreviewUpdate?.(true);
      } catch {}
  };
  const toolByKey = {
      1: "brush",
      2: "eraser",
      3: "fill-brush",
      4: "fill-eraser",
      5: "lasso-fill",
      6: "lasso-erase",
      7: "rect-select",
      8: "eyedropper"
  };
  document.addEventListener("keydown", e => {
      if (e.defaultPrevented) return;
      if (isTyping(document.activeElement)) return;
      const k = (e.key || "").toLowerCase();
      if (toolByKey[k]) {
          setTool(toolByKey[k]);
          e.preventDefault();
          return;
      }
  }, {
      passive: false
  });
}