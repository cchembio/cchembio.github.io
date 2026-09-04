// Minimal canvas plotting for the NQE apps. No charting library.
// Ops are queued, then rendered by draw(); that keeps redraw cheap and lets
// the caller rebuild the whole scene each frame.

const AXIS = '#8b949e';
const GRID = '#21262d';
const TEXT = '#c9d1d9';
const FONT = "15px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
const FONT_LABEL = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";

export function createPlot(canvas, opts = {}) {
  const ctx = canvas.getContext('2d');
  const state = {
    xlabel: opts.xlabel || '',
    ylabel: opts.ylabel || '',
    xlim: opts.xlim || [0, 1],
    ylim: opts.ylim || [0, 1],
    pad: Object.assign({ l: 68, r: 18, t: 16, b: 46 }, opts.pad),
    ops: [],
    w: 0,
    h: 0,
  };

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    state.w = Math.max(1, r.width);
    state.h = Math.max(1, r.height);
    const cw = Math.round(state.w * dpr), ch = Math.round(state.h * dpr);
    // Assigning canvas.width reallocates the backing store and is by far the
    // most expensive thing here, so only do it when the size really changed.
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  const px = (x) => {
    const [a, b] = state.xlim;
    return state.pad.l + ((x - a) / (b - a)) * (state.w - state.pad.l - state.pad.r);
  };
  const py = (y) => {
    const [a, b] = state.ylim;
    return state.h - state.pad.b - ((y - a) / (b - a)) * (state.h - state.pad.t - state.pad.b);
  };

  /** Nice tick positions: 1/2/5 x 10^k, aiming for ~5 ticks. */
  function ticks([a, b], target = 5) {
    const raw = (b - a) / target;
    if (!isFinite(raw) || raw <= 0) return [a];
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].find((m) => m * mag >= raw) * mag;
    const out = [];
    for (let t = Math.ceil(a / step) * step; t <= b + step * 1e-9; t += step) out.push(t);
    return out;
  }

  const fmt = (v) => {
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e4 || a < 1e-3) return v.toExponential(0).replace('e+', 'e');
    if (a >= 100) return v.toFixed(0);
    if (a >= 10) return v.toFixed(1);
    if (a >= 1) return v.toFixed(2);
    return v.toFixed(3);
  };

  const api = {
    setLimits(xlim, ylim) {
      if (xlim) state.xlim = xlim;
      if (ylim) state.ylim = ylim;
      return api;
    },
    setLabels(xlabel, ylabel) {
      if (xlabel != null) state.xlabel = xlabel;
      if (ylabel != null) state.ylabel = ylabel;
      return api;
    },
    clear() { state.ops.length = 0; return api; },
    line(xs, ys, o = {}) { state.ops.push({ k: 'line', xs, ys, o }); return api; },
    fillBetween(xs, y1, y2, o = {}) { state.ops.push({ k: 'fill', xs, y1, y2, o }); return api; },
    /** Horizontal level lines inside a potential. */
    levels(energies, o = {}) { state.ops.push({ k: 'levels', energies, o }); return api; },
    vline(x, o = {}) { state.ops.push({ k: 'vline', x, o }); return api; },
    marker(x, y, o = {}) { state.ops.push({ k: 'marker', x, y, o }); return api; },
    text(x, y, s, o = {}) { state.ops.push({ k: 'text', x, y, s, o }); return api; },
    toPixel: (x, y) => [px(x), py(y)],
    fromPixel: (cx, cy) => {
      const [xa, xb] = state.xlim, [ya, yb] = state.ylim;
      return [
        xa + ((cx - state.pad.l) / (state.w - state.pad.l - state.pad.r)) * (xb - xa),
        ya + ((state.h - state.pad.b - cy) / (state.h - state.pad.t - state.pad.b)) * (yb - ya),
      ];
    },

    draw() {
      resize();
      const { w, h, pad } = state;
      ctx.clearRect(0, 0, w, h);

      // grid + ticks
      ctx.font = FONT;
      ctx.lineWidth = 1;
      ctx.strokeStyle = GRID;
      ctx.fillStyle = AXIS;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const t of ticks(state.xlim)) {
        const X = px(t);
        if (X < pad.l - 0.5 || X > w - pad.r + 0.5) continue;
        ctx.beginPath();
        ctx.moveTo(X, pad.t);
        ctx.lineTo(X, h - pad.b);
        ctx.stroke();
        ctx.fillText(fmt(t), X, h - pad.b + 8);
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (const t of ticks(state.ylim)) {
        const Y = py(t);
        if (Y < pad.t - 0.5 || Y > h - pad.b + 0.5) continue;
        ctx.beginPath();
        ctx.moveTo(pad.l, Y);
        ctx.lineTo(w - pad.r, Y);
        ctx.stroke();
        ctx.fillText(fmt(t), pad.l - 9, Y);
      }

      // frame
      ctx.strokeStyle = AXIS;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);

      // content, clipped to the frame
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b);
      ctx.clip();
      for (const op of state.ops) drawOp(op);
      ctx.restore();

      // axis labels
      ctx.fillStyle = TEXT;
      ctx.font = FONT_LABEL;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      if (state.xlabel) ctx.fillText(state.xlabel, pad.l + (w - pad.l - pad.r) / 2, h - 6);
      if (state.ylabel) {
        ctx.save();
        ctx.translate(14, pad.t + (h - pad.t - pad.b) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textBaseline = 'top';
        ctx.fillText(state.ylabel, 0, 0);
        ctx.restore();
      }
      return api;
    },
  };

  function drawOp(op) {
    ctx.setLineDash(op.o.dash || []);
    ctx.lineWidth = op.o.width || 2.5;      // no hairlines: projector legibility
    ctx.strokeStyle = op.o.color || TEXT;
    ctx.fillStyle = op.o.color || TEXT;

    if (op.k === 'line') {
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < op.xs.length; i++) {
        const y = op.ys[i];
        if (!isFinite(y)) { pen = false; continue; }
        const X = px(op.xs[i]), Y = py(y);
        if (!pen) { ctx.moveTo(X, Y); pen = true; } else ctx.lineTo(X, Y);
      }
      ctx.stroke();
    } else if (op.k === 'fill') {
      ctx.globalAlpha = op.o.alpha ?? 0.3;
      ctx.beginPath();
      for (let i = 0; i < op.xs.length; i++) {
        const X = px(op.xs[i]), Y = py(op.y1[i]);
        i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
      }
      for (let i = op.xs.length - 1; i >= 0; i--) {
        ctx.lineTo(px(op.xs[i]), py(typeof op.y2 === 'number' ? op.y2 : op.y2[i]));
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (op.k === 'levels') {
      const [x0, x1] = op.o.xrange || state.xlim;
      for (const E of op.energies) {
        ctx.beginPath();
        ctx.moveTo(px(x0), py(E));
        ctx.lineTo(px(x1), py(E));
        ctx.stroke();
      }
    } else if (op.k === 'vline') {
      ctx.beginPath();
      ctx.moveTo(px(op.x), py(state.ylim[0]));
      ctx.lineTo(px(op.x), py(state.ylim[1]));
      ctx.stroke();
      if (op.o.label) {
        ctx.setLineDash([]);
        ctx.font = FONT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(op.o.label, px(op.x) + 6, state.pad.t + 4);
      }
    } else if (op.k === 'marker') {
      const X = px(op.x), Y = py(op.y), r = op.o.r || 7;
      ctx.setLineDash([]);
      ctx.beginPath();
      if (op.o.shape === 'square') ctx.rect(X - r, Y - r, 2 * r, 2 * r);
      else ctx.arc(X, Y, r, 0, 2 * Math.PI);
      if (op.o.hollow) { ctx.lineWidth = 3; ctx.stroke(); } else ctx.fill();
    } else if (op.k === 'text') {
      ctx.setLineDash([]);
      ctx.font = op.o.font || FONT;
      ctx.textAlign = op.o.align || 'left';
      ctx.textBaseline = op.o.baseline || 'bottom';
      ctx.fillText(op.s, px(op.x), py(op.y));
    }
    ctx.setLineDash([]);
  }

  return api;
}
