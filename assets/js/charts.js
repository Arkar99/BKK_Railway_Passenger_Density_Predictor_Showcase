/* ==========================================================================
   Shared chart toolkit (D3). Every page uses these helpers so all charts
   share one look: colours, fonts, tooltip, number formats.
   ========================================================================== */
(function () {
  const RB = (window.RB = window.RB || {});

  /* ---------- colours ---------- */
  RB.lineColors = {
    "BTS Green Line": "#3ddc84",
    "BTS Gold Line": "#c9a24a",
    "MRT Blue Line": "#3d8bff",
    "MRT Purple Line": "#b07cff",
    "MRT Yellow Line": "#ffd23f",
    "MRT Pink Line": "#ff6fb1",
    "ARL": "#ff8a3d",
    "SRT": "#8aa0b8",
    "Red Line": "#ff4d5e"
  };
  RB.levelColors = { Low: "#3ecf8e", Medium: "#f5b942", High: "#ff6b6b" };
  RB.levels = ["Low", "Medium", "High"];
  RB.colorOf = (line) => RB.lineColors[line] || "#4da3ff";

  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  RB.theme = {
    get text() { return css("--text"); },
    get muted() { return css("--muted"); },
    get faint() { return css("--faint"); },
    get grid() { return css("--border-soft"); },
    get border() { return css("--border"); },
    get surface() { return css("--surface"); },
    get board() { return css("--board"); },
    get accent() { return css("--accent"); },
    mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
  };

  /* ---------- number / date formats ---------- */
  RB.fmt = {
    int: (v) => (v == null || !isFinite(v) ? "n/a" : Math.round(v).toLocaleString("en-US")),
    compact: (v) => {
      if (v == null || !isFinite(v)) return "n/a";
      const a = Math.abs(v);
      if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
      if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, "") + "k";
      return String(Math.round(v));
    },
    pct: (v, d = 1) => (v == null || !isFinite(v) ? "n/a" : (v * 100).toFixed(d) + "%"),
    dec: (v, d = 3) => (v == null || !isFinite(v) ? "n/a" : Number(v).toFixed(d)),
    date: (iso) => {
      const d = new Date(iso + "T00:00:00Z");
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    }
  };

  /* ---------- dates ---------- */
  RB.addDays = (iso, n) => {
    const d = new Date(iso + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  /* ---------- tooltip (one shared element) ---------- */
  let tipEl;
  const tip = () => {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "rb-tip";
      tipEl.setAttribute("role", "status");
      document.body.appendChild(tipEl);
    }
    return tipEl;
  };
  RB.tooltip = {
    show(html, ev) {
      const t = tip();
      t.innerHTML = html;
      t.classList.add("on");
      RB.tooltip.move(ev);
    },
    move(ev) {
      const t = tip();
      const pad = 14, w = t.offsetWidth, h = t.offsetHeight;
      let x = ev.clientX + pad, y = ev.clientY + pad;
      if (x + w > window.innerWidth - 8) x = ev.clientX - w - pad;
      if (y + h > window.innerHeight - 8) y = ev.clientY - h - pad;
      t.style.left = Math.max(8, x) + "px";
      t.style.top = Math.max(8, y) + "px";
    },
    hide() { tip().classList.remove("on"); }
  };

  /* ---------- re-draw a chart when its container width changes ---------- */
  RB.responsive = (host, draw) => {
    let last = 0, raf;
    const run = () => {
      const w = Math.round(host.clientWidth);
      if (!w || w === last) return;
      last = w;
      draw(w);
    };
    run();
    if ("ResizeObserver" in window) {
      new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(run); }).observe(host);
    } else {
      window.addEventListener("resize", run);
    }
  };

  /* ---------- weekly averages from a daily series ---------- */
  // series = { start: "YYYY-MM-DD", values: [number|null, ...] }
  RB.weekly = (series) => {
    const out = [];
    const v = series.values;
    for (let i = 0; i < v.length; i += 7) {
      let s = 0, n = 0;
      for (let j = i; j < Math.min(i + 7, v.length); j++) if (v[j] != null) { s += v[j]; n++; }
      if (n) out.push({ date: RB.addDays(series.start, i), v: s / n });
    }
    return out;
  };
  RB.lastAvg = (series, days = 30) => {
    const v = series.values.slice(-days).filter((x) => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  /* ---------- axis styling shared by all D3 charts ---------- */
  RB.styleAxis = (g) => {
    g.attr("class", "axis");
    g.selectAll("text").attr("fill", RB.theme.faint);
    g.selectAll("path,line").attr("stroke", RB.theme.border);
    return g;
  };
  RB.utc = (iso) => new Date(iso + "T00:00:00Z");

  /* ---------- sparkline with hover read-out ---------- */
  // points = [{date, v}], opts = {color, height, label, unit}
  RB.sparkline = (host, points, opts = {}) => {
    const color = opts.color || RB.theme.accent;
    const height = opts.height || 56;
    const gid = "g" + Math.random().toString(36).slice(2, 8);

    RB.responsive(host, (w) => {
      host.innerHTML = "";
      const m = { t: 6, r: 8, b: 4, l: 2 };
      const x = d3.scaleLinear().domain([0, points.length - 1]).range([m.l, w - m.r]);
      const ext = d3.extent(points, (p) => p.v);
      const pad = (ext[1] - ext[0]) * 0.12 || 1;
      const y = d3.scaleLinear().domain([Math.max(0, ext[0] - pad), ext[1] + pad]).range([height - m.b, m.t]);

      const svg = d3.select(host).append("svg")
        .attr("width", w).attr("height", height)
        .attr("role", "img").attr("aria-label", opts.label || "Ridership trend");

      const defs = svg.append("defs");
      const grad = defs.append("linearGradient").attr("id", gid).attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);
      grad.append("stop").attr("offset", "0%").attr("stop-color", color).attr("stop-opacity", 0.32);
      grad.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", 0);

      const area = d3.area().x((p, i) => x(i)).y0(height - m.b).y1((p) => y(p.v)).curve(d3.curveMonotoneX);
      const line = d3.line().x((p, i) => x(i)).y((p) => y(p.v)).curve(d3.curveMonotoneX);
      svg.append("path").datum(points).attr("d", area).attr("fill", `url(#${gid})`);
      svg.append("path").datum(points).attr("d", line).attr("fill", "none").attr("stroke", color).attr("stroke-width", 1.75);

      const last = points[points.length - 1];
      svg.append("circle").attr("cx", x(points.length - 1)).attr("cy", y(last.v)).attr("r", 3).attr("fill", color);

      const cross = svg.append("g").style("display", "none");
      cross.append("line").attr("y1", m.t).attr("y2", height - m.b).attr("stroke", RB.theme.faint).attr("stroke-dasharray", "2 3");
      const dot = cross.append("circle").attr("r", 4).attr("fill", RB.theme.surface).attr("stroke", color).attr("stroke-width", 2);

      const pick = (ev) => {
        const [mx] = d3.pointer(ev, svg.node());
        const i = Math.max(0, Math.min(points.length - 1, Math.round(x.invert(mx))));
        const p = points[i];
        cross.style("display", null);
        cross.select("line").attr("x1", x(i)).attr("x2", x(i));
        dot.attr("cx", x(i)).attr("cy", y(p.v));
        RB.tooltip.show(
          `<span class="m">Week of ${RB.fmt.date(p.date)}</span><br><b>${RB.fmt.int(p.v)}</b> <span class="m">${opts.unit || "passengers / day"}</span>`, ev);
      };
      svg.append("rect").attr("width", w).attr("height", height).attr("fill", "transparent")
        .on("mousemove", pick).on("touchmove", pick)
        .on("mouseleave", () => { cross.style("display", "none"); RB.tooltip.hide(); });
    });
  };
})();
