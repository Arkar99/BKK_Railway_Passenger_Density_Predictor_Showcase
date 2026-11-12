/* ==========================================================================
   Chart types for the Cleaning and Explore pages (D3):
   waterfall, flagMap, heatmap (+ gradient legend), divBars, timeline.
   ========================================================================== */
(function () {
  const RB = window.RB, T = RB.theme, F = RB.fmt;
  const INK = "#06121c";
  const SANS = () => getComputedStyle(document.body).fontFamily;
  const parse = d3.utcParse("%Y-%m-%d");

  const svgIn = (host, w, h, label) => {
    host.innerHTML = "";
    return d3.select(host).append("svg").attr("width", w).attr("height", h)
      .attr("role", "img").attr("aria-label", label || "");
  };
  const styleAxis = (g) => {
    g.selectAll("text").attr("fill", T.muted).style("font", "11px " + T.mono);
    g.selectAll("line").attr("stroke", T.grid);
    g.select(".domain").attr("stroke", T.border);
  };
  const clip = (s, px) => {
    const max = Math.max(3, Math.floor(px / 5.9));
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  };
  const hover = (sel, html) =>
    sel.on("mousemove", (ev, d) => RB.tooltip.show(html(d), ev)).on("mouseleave", () => RB.tooltip.hide());

  RB.heat = ["#2f6fd6", "#18222e", "#f2b84b"];          // below / middle / above

  /* ---------- waterfall: rows kept and removed at each step ---------- */
  // rows = [{label, remaining, removed?, color?, dim?, note?}]
  RB.waterfall = (host, rows, o = {}) => {
    const rowH = o.rowH || 46;
    RB.responsive(host, (w) => {
      const m = { t: 4, r: o.valueW || 124, b: 4, l: 2 };
      const svg = svgIn(host, w, rows.length * rowH + m.t + m.b, o.label);
      const max = o.max || d3.max(rows, (d) => d.remaining + (d.removed || 0));
      const x = d3.scaleLinear().domain([0, max]).range([0, Math.max(30, w - m.l - m.r)]);
      rows.forEach((d, i) => {
        const y = m.t + i * rowH, by = y + 21, bh = 14;
        svg.append("text").attr("x", m.l).attr("y", y + 14).attr("fill", d.dim ? T.muted : T.text)
          .style("font", "12.5px " + SANS()).text(d.label);
        const kept = svg.append("rect").attr("x", m.l).attr("y", by).attr("height", bh).attr("rx", 4)
          .attr("width", Math.max(2, x(d.remaining))).attr("fill", d.color || T.accent).attr("opacity", d.dim ? 0.45 : 1).datum(d);
        hover(kept, (q) => `<span class="m">${RB.esc(q.label)}</span><br>Rows left: <b>${F.int(q.remaining)}</b>` + (q.note ? `<br><span class="m">${RB.esc(q.note)}</span>` : ""));
        if (d.removed > 0) {
          const gone = svg.append("rect").attr("x", m.l + x(d.remaining)).attr("y", by).attr("height", bh).attr("rx", 4)
            .attr("width", Math.max(3, x(d.removed))).attr("fill", RB.levelColors.High).attr("opacity", 0.9).datum(d);
          hover(gone, (q) => `<span class="m">${RB.esc(q.label)}</span><br>Rows removed: <b>${F.int(q.removed)}</b>` + (q.note ? `<br><span class="m">${RB.esc(q.note)}</span>` : ""));
        }
        const t = svg.append("text").attr("x", w - m.r + 12).attr("y", by + bh / 2).attr("dy", "0.35em");
        t.append("tspan").attr("fill", T.text).style("font", "700 13px " + T.mono).text(F.int(d.remaining));
        if (d.removed != null) {
          t.append("tspan").attr("dx", 8).attr("fill", d.removed > 0 ? RB.levelColors.High : T.faint)
            .style("font", "600 11.5px " + T.mono).text(d.removed > 0 ? "−" + F.int(d.removed) : "0");
        }
      });
    });
  };

  /* ---------- flag map: where the problems sit in time ---------- */
  // rows = [{label, segs:[{from,to,color,tip}], pts:[{date,color,tip}]}]
  // o = {domain:[iso,iso], bands:[{from,to,color,tip}], markers:[{date,label}], span:{label:[iso,iso]}}
  RB.flagMap = (host, rows, o) => {
    const rowH = 28;
    RB.responsive(host, (w) => {
      const m = { t: 26, r: 18, b: 26, l: Math.min(o.labelW || 124, w * 0.36) };
      const h = rows.length * rowH + m.t + m.b;
      const svg = svgIn(host, w, h, o.label);
      const x = d3.scaleUtc().domain(o.domain.map(parse)).range([m.l, w - m.r]);
      const plotH = h - m.t - m.b;

      const xAxis = svg.append("g").attr("transform", `translate(0,${h - m.b + 4})`)
        .call(d3.axisBottom(x).ticks(d3.utcYear.every(1)).tickFormat(d3.utcFormat("%Y")));
      styleAxis(xAxis);

      (o.markers || []).forEach((mk) => {
        const mx = x(parse(mk.date));
        svg.append("line").attr("x1", mx).attr("x2", mx).attr("y1", m.t - 4).attr("y2", h - m.b + 4)
          .attr("stroke", T.text).attr("stroke-dasharray", "3 3").attr("opacity", 0.5);
        svg.append("text").attr("x", mx + 5).attr("y", m.t - 10).attr("fill", T.muted).style("font", "600 10.5px " + T.mono).text(mk.label);
      });

      rows.forEach((r, i) => {
        const y = m.t + i * rowH;
        svg.append("text").attr("x", m.l - 10).attr("y", y + rowH / 2).attr("dy", "0.35em").attr("text-anchor", "end")
          .attr("fill", T.text).style("font", "12px " + SANS()).text(clip(r.label, m.l - 14));
        const span = (o.span || {})[r.label] || o.domain;
        svg.append("rect").attr("x", x(parse(span[0]))).attr("width", Math.max(2, x(parse(span[1])) - x(parse(span[0]))))
          .attr("y", y + rowH / 2 - 2).attr("height", 4).attr("rx", 2).attr("fill", RB.colorOf(r.label)).attr("opacity", 0.35);
        (r.segs || []).forEach((s) => {
          const sx = x(parse(s.from)), ex = x(parse(s.to));
          const seg = svg.append("rect").attr("x", sx).attr("width", Math.max(6, ex - sx)).attr("y", y + 6).attr("height", rowH - 12)
            .attr("rx", 3).attr("fill", s.color).datum(s);
          hover(seg, (q) => q.tip);
        });
      });

      (o.bands || []).forEach((b) => {                    // vertical bands drawn over the rows
        const x0 = x(parse(b.from)), x1 = x(parse(b.to)), wd = Math.max(3, x1 - x0);
        svg.append("rect").attr("x", x0 - (wd - (x1 - x0)) / 2).attr("width", wd).attr("y", m.t - 4).attr("height", plotH + 8)
          .attr("fill", b.color).attr("opacity", 0.45).style("pointer-events", "none");
        const hit = svg.append("rect").attr("x", x0 - 6).attr("width", Math.max(12, x1 - x0 + 12)).attr("y", m.t - 4).attr("height", plotH + 8)
          .attr("fill", "transparent").datum(b);
        hover(hit, (q) => q.tip);
      });

      rows.forEach((r, i) => {
        const y = m.t + i * rowH;
        (r.pts || []).forEach((p) => {
          const dot = svg.append("circle").attr("cx", x(parse(p.date))).attr("cy", y + rowH / 2).attr("r", 5.5)
            .attr("fill", p.color).attr("stroke", "#0a0e13").attr("stroke-width", 1.8).datum(p);
          hover(dot, (q) => q.tip);
        });
      });
    });
  };

  /* ---------- heatmap ---------- */
  // o = {rows[], cols[], colShort[]?, values[r][c], domain:[lo,mid,hi], format, cellH, labelW, minText, tip(r,c,v), label}
  RB.heatmap = (host, o) => {
    const cellH = o.cellH || 30, colors = o.colors || RB.heat, fmt = o.format || ((v) => v.toFixed(0));
    RB.responsive(host, (w) => {
      const m = { t: 24, r: 2, b: 2, l: Math.min(o.labelW || 124, w * 0.34) };
      const cw = (w - m.l - m.r) / o.cols.length;
      const svg = svgIn(host, w, m.t + o.rows.length * cellH + m.b, o.label);
      const scale = d3.scaleDiverging().domain(o.domain).clamp(true).interpolator(d3.interpolateRgbBasis(colors));
      const short = cw < (o.shortBelow || 34) && o.colShort;
      o.cols.forEach((c, ci) => {
        svg.append("text").attr("x", m.l + ci * cw + cw / 2).attr("y", m.t - 8).attr("text-anchor", "middle")
          .attr("fill", T.muted).style("font", "11px " + T.mono).text(short ? o.colShort[ci] : c);
      });
      o.rows.forEach((r, ri) => {
        const y = m.t + ri * cellH;
        svg.append("text").attr("x", m.l - 10).attr("y", y + cellH / 2).attr("dy", "0.35em").attr("text-anchor", "end")
          .attr("fill", T.text).style("font", "12px " + SANS()).text(clip(r, m.l - 14));
        o.cols.forEach((c, ci) => {
          const v = o.values[ri][ci];
          const fill = v == null ? T.surface : scale(v);
          const cell = svg.append("rect").attr("x", m.l + ci * cw + 1).attr("y", y + 1).attr("width", Math.max(2, cw - 2))
            .attr("height", cellH - 2).attr("rx", 4).attr("fill", fill).datum({ r, c, v });
          hover(cell, (q) => o.tip ? o.tip(q.r, q.c, q.v) : `<span class="m">${RB.esc(q.r)} · ${RB.esc(q.c)}</span><br><b>${q.v == null ? "n/a" : fmt(q.v)}</b>`);
          if (v != null && cw >= (o.minText || 30)) {
            svg.append("text").attr("x", m.l + ci * cw + cw / 2).attr("y", y + cellH / 2).attr("dy", "0.35em").attr("text-anchor", "middle")
              .attr("fill", d3.lab(fill).l > 58 ? INK : "#e7edf3").style("font", "600 11px " + T.mono).style("pointer-events", "none").text(fmt(v));
          }
        });
      });
    });
  };

  // Gradient key under a heatmap: {left, mid, right}
  RB.gradLegend = (host, o) => {
    const c = o.colors || RB.heat;
    host.innerHTML = `<div class="grad" style="background:linear-gradient(90deg,${c[0]},${c[1]},${c[2]})"></div>
      <div class="grad-labels"><span>${RB.esc(o.left)}</span><span>${RB.esc(o.mid)}</span><span>${RB.esc(o.right)}</span></div>`;
  };

  /* ---------- diverging bars around zero ---------- */
  // items = [{label, value}], o = {format, labelW, rowH, max}
  RB.divBars = (host, items, o = {}) => {
    const rowH = o.rowH || 28, fmt = o.format || ((v) => (v > 0 ? "+" : "") + v.toFixed(0) + "%");
    RB.responsive(host, (w) => {
      const labelW = Math.min(o.labelW || 124, w * 0.36), pad = 46;
      const svg = svgIn(host, w, items.length * rowH + 8, o.label);
      const maxAbs = o.max || d3.max(items, (d) => Math.abs(d.value)) * 1.0;
      const x = d3.scaleLinear().domain([-maxAbs, maxAbs]).range([labelW + pad, w - pad]);
      svg.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", 2).attr("y2", items.length * rowH + 6).attr("stroke", T.border);
      items.forEach((d, i) => {
        const y = 4 + i * rowH, neg = d.value < 0;
        svg.append("text").attr("x", labelW - 4).attr("y", y + rowH / 2).attr("dy", "0.35em").attr("text-anchor", "end")
          .attr("fill", T.text).style("font", "12px " + SANS()).text(clip(d.label, labelW - 8));
        const bar = svg.append("rect").attr("x", Math.min(x(0), x(d.value))).attr("width", Math.max(2, Math.abs(x(d.value) - x(0))))
          .attr("y", y + 5).attr("height", rowH - 10).attr("rx", 3).attr("fill", neg ? T.accent : T.board).datum(d);
        hover(bar, (q) => `<span class="m">${RB.esc(q.label)}</span><br><b>${fmt(q.value)}</b>`);
        svg.append("text").attr("x", x(d.value) + (neg ? -6 : 6)).attr("y", y + rowH / 2).attr("dy", "0.35em")
          .attr("text-anchor", neg ? "end" : "start").attr("fill", T.text).style("font", "600 11.5px " + T.mono).text(fmt(d.value));
      });
    });
  };

  /* ---------- time series with bands, markers and a hover read-out ---------- */
  // points = [{date, v}], o = {color, height, bands:[{from,to,label,color}], markers:[{date,tip}], unit, label}
  RB.timeline = (host, points, o = {}) => {
    const H = o.height || 260, color = o.color || T.accent, gid = "t" + Math.random().toString(36).slice(2, 8);
    const pts = points.map((p) => ({ ...p, t: parse(p.date) }));
    RB.responsive(host, (w) => {
      const m = { t: 26, r: 14, b: 28, l: 50 };
      const svg = svgIn(host, w, H, o.label);
      const x = d3.scaleUtc().domain([pts[0].t, pts[pts.length - 1].t]).range([m.l, w - m.r]);
      const y = d3.scaleLinear().domain([0, d3.max(pts, (p) => p.v) * 1.08]).nice().range([H - m.b, m.t]);

      const yAxis = svg.append("g").attr("transform", `translate(${m.l},0)`)
        .call(d3.axisLeft(y).ticks(4).tickSize(-(w - m.l - m.r)).tickFormat(F.compact));
      styleAxis(yAxis); yAxis.select(".domain").remove(); yAxis.selectAll("line").attr("stroke-dasharray", "2 4");
      const xAxis = svg.append("g").attr("transform", `translate(0,${H - m.b})`)
        .call(d3.axisBottom(x).ticks(d3.utcYear.every(1)).tickFormat(d3.utcFormat("%Y")));
      styleAxis(xAxis);

      (o.bands || []).forEach((b) => {
        const x0 = Math.max(m.l, x(parse(b.from))), x1 = Math.min(w - m.r, x(parse(b.to)));
        if (x1 <= x0) return;
        svg.append("rect").attr("x", x0).attr("width", x1 - x0).attr("y", m.t).attr("height", H - m.b - m.t).attr("fill", b.color).attr("opacity", 0.1);
        svg.append("text").attr("x", x0 + 6).attr("y", m.t - 9).attr("fill", b.color).style("font", "600 10.5px " + T.mono).text(b.label);
      });

      const defs = svg.append("defs");
      const g = defs.append("linearGradient").attr("id", gid).attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);
      g.append("stop").attr("offset", "0%").attr("stop-color", color).attr("stop-opacity", 0.28);
      g.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", 0);
      svg.append("path").datum(pts).attr("fill", `url(#${gid})`)
        .attr("d", d3.area().x((p) => x(p.t)).y0(y(0)).y1((p) => y(p.v)).curve(d3.curveMonotoneX));
      svg.append("path").datum(pts).attr("fill", "none").attr("stroke", color).attr("stroke-width", 1.8).attr("stroke-linejoin", "round")
        .attr("d", d3.line().x((p) => x(p.t)).y((p) => y(p.v)).curve(d3.curveMonotoneX));

      (o.markers || []).forEach((mk) => {
        const mx = x(parse(mk.date));
        svg.append("line").attr("x1", mx).attr("x2", mx).attr("y1", m.t).attr("y2", H - m.b).attr("stroke", T.text).attr("stroke-dasharray", "3 3").attr("opacity", 0.55);
      });

      const cross = svg.append("g").style("display", "none");
      cross.append("line").attr("y1", m.t).attr("y2", H - m.b).attr("stroke", T.faint).attr("stroke-dasharray", "2 3");
      const dot = cross.append("circle").attr("r", 4.5).attr("fill", T.surface).attr("stroke", color).attr("stroke-width", 2);
      const bis = d3.bisector((p) => p.t).center;
      const pick = (ev) => {
        const [mx] = d3.pointer(ev, svg.node());
        const p = pts[Math.max(0, Math.min(pts.length - 1, bis(pts, x.invert(mx))))];
        cross.style("display", null);
        cross.select("line").attr("x1", x(p.t)).attr("x2", x(p.t));
        dot.attr("cx", x(p.t)).attr("cy", y(p.v));
        RB.tooltip.show(`<span class="m">Week of ${F.date(p.date)}</span><br><b>${F.int(p.v)}</b> <span class="m">${o.unit || "passengers / day"}</span>`, ev);
      };
      svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", w - m.l - m.r).attr("height", H - m.t - m.b).attr("fill", "transparent")
        .on("mousemove", pick).on("touchmove", pick).on("mouseleave", () => { cross.style("display", "none"); RB.tooltip.hide(); });
    });
  };
})();
