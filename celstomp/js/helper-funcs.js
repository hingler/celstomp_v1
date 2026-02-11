const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = (ms = 0) => new Promise(r => setTimeout(r, ms));
function safeText(el, txt) {
    if (el) el.textContent = txt;
}
function safeSetValue(el, v) {
    if (!el) return;
    el.value = String(v);
}
function safeSetChecked(el, v) {
    if (!el) return;
    el.checked = !!v;
}
function nowCSSVarPx(name, fallback) {
    try {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : fallback;
    } catch {
        return fallback;
    }
}