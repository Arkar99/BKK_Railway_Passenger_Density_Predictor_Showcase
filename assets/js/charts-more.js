/* ==========================================================================
   More chart types (D3): horizontal bars, grouped bars, timeline coverage,
   histogram with thresholds, 100% stacked share bars, legend.
   Same look and behaviour everywhere: dark, mono labels, hover tooltips.
   ========================================================================== */
(function () {
  const RB = window.RB, T = RB.theme, F = RB.fmt;
  const INK = "#06121c";                                   // dark text on bright bars
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
  const clip = (s, px) => {                                 // crude ellipsis for SVG labels
    const max = Math.max(3, Math.floor(px / 5.9));
    return s.length > max ? s.slice(0, max - 1) + "…" : s;
  };
  const hover = (sel, html) =>
    sel.on("mousemove", (ev, d) => RB.tooltip.show(html(d), ev)).on("mouseleave", () => RB.tooltip.hide());

  /* ---------- legend ---------- */
  // items = [{name, color}]
  RB.legend = (host, items) => {
    host.classList.add("legend");
    host.innerHTML = items.map((i) =>
      `<span><i style="background:${i.color}"></i>${RB.esc(i.name)}</span>`).join("");
  };

  /* ---------- horizontal bars ---------- */
  // items = [{label, value, color, tip?, dim?}]   opts = {format, labelW, valueW, rowH, max, label}
  RB.hbar = (host, items, o = {}) => {
    const rowH = o.rowH || 30, fmt = o.format || F.int;
    RB.responsive(host, (w) => {
      const m = { t: 4, r: o.valueW || 64, b: 4, l: Math.min(o.labelW || 150, w * 0.4) };
      const h = items.length * rowH + m.t + m.b;
      const svg = svgIn(host, w, h, o.label);
      const x = d3.scaleLinear().domain([0, o.max || d3.max(items, (d) => d.value)]).range([0, Math.max(20, w - m.l - m.r)]);
      items.forEach((d, i) => {
        const y = m.t + i * rowH;
        svg.append("text").attr("x", m.l - 10).attr("y", y + rowH / 2).attr("dy", "0.35em").attr("text-anchor", "end")
          .attr("fill", d.dim ? T.muted : T.text).style("font", "12px " + SANS()).text(clip(d.label, m.l - 14));
        const bar = svg.append("rect").attr("x", m.l).attr("y", y + 5).attr("height", rowH - 10).attr("rx", 4)
          .attr("width", Math.max(2, x(d.value))).attr("fill", d.color || T.accent).attr("opacity", d.dim ? 0.55 : 1).datum(d);
        hover(bar, (q) => q.tip || `<span class="m">${RB.esc(q.label)}</span><br><b>${fmt(q.value)}</b>`);
        svg.append("text").attr("x", m.l + x(d.value) + 8).attr("y", y + rowH / 2).attr("dy", "0.35em")
          .attr("fill", T.text).style("font", "600 12px " + T.mono).text(fmt(d.value));
      });
    });
  };

  /* ---------- grouped (or single-series) vertical bars ---------- */
  // o = {categories[], series:[{name,color,values[]}], format, yMax, height, ref:{value,label}, pointColors[], label, yFormat}
  RB.groupedBars = (host, o) => {
    const fmt = o.format || F.int, H = o.height || 230;
    RB.responsive(host, (w) => {
      const m = { t: 16, r: 8, b: 30, l: o.yFormat === null ? 8 : 40 };
      const svg = svgIn(host, w, H, o.label);
      const x0 = d3.scaleBand().domain(o.categories).range([m.l, w - m.r]).paddingInner(0.22).paddingOuter(0.08);
      const x1 = d3.scaleBand().domain(o.series.map((s) => s.name)).range([0, x0.bandwidth()]).padding(0.1);
      const yMax = o.yMax || d3.max(o.series, (s) => d3.max(s.values)) * 1.1;
      const y = d3.scaleLinear().domain([0, yMax]).range([H - m.b, m.t]);
      const yAxis = svg.append("g").attr("transform", `translate(${m.l},0)`)
        .call(d3.axisLeft(y).ticks(4).tickSize(-(w - m.l - m.r)).tickFormat(o.yFormat === null ? () => "" : (o.yFormat || fmt)));
      styleAxis(yAxis); yAxis.select(".domain").remove(); yAxis.selectAll("line").attr("stroke-dasharray", "2 4");
      const xAxis = svg.append("g").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x0).tickSize(0));
      styleAxis(xAxis); xAxis.selectAll("text").attr("dy", "1.1em").attr("fill", T.text).style("font", "11px " + SANS());

      o.categories.forEach((cat, ci) => {
        o.series.forEach((s) => {
          const v = s.values[ci];
          if (v == null) return;
          const bx = x0(cat) + x1(s.name), bw = x1.bandwidth();
          const col = (o.pointColors && o.series.length === 1 && o.pointColors[ci]) || s.color;
          const bar = svg.append("rect").attr("x", bx).attr("width", bw).attr("y", y(v)).attr("height", Math.max(1, y(0) - y(v)))
            .attr("rx", 3).attr("fill", col).datum({ cat, s: s.name, v });
          hover(bar, (q) => `<span class="m">${RB.esc(q.cat)}${o.series.length > 1 ? " · " + RB.esc(q.s) : ""}</span><br><b>${fmt(q.v)}</b>`);
          if (bw >= 26) svg.append("text").attr("x", bx + bw / 2).attr("y", y(v) - 5).attr("text-anchor", "middle")
            .attr("fill", T.text).style("font", "600 10.5px " + T.mono).text(fmt(v));
        });
      });
      if (o.ref) {
        svg.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y(o.ref.value)).attr("y2", y(o.ref.value))
          .attr("stroke", T.board).attr("stroke-dasharray", "4 4").attr("opacity", 0.8);
        svg.append("text").attr("x", w - m.r).attr("y", y(o.ref.value) - 5).attr("text-anchor", "end")
          .attr("fill", T.board).style("font", "10.5px " + T.mono).text(o.ref.label);
      }
    });
  };

  /* ---------- timeline coverage (one bar per row, shaded bands) ---------- */
  // items = [{label,start,end,color,tip}], o = {domain:[iso,iso], bands:[{from,to,label,color}], markers:[{date,tip}]}
  RB.coverage = (host, items, o) => {
    const rowH = 26;
    RB.responsive(host, (w) => {
      const m = { t: 26, r: 34, b: 26, l: Math.min(o.labelW || 124, w * 0.36) };
      const h = items.length * rowH + m.t + m.b;
      const svg = svgIn(host, w, h, o.label);
      const x = d3.scaleUtc().domain(o.domain.map(parse)).range([m.l, w - m.r]);
      (o.bands || []).forEach((b) => {
        const x0 = x(parse(b.from)), x1 = x(parse(b.to));
        svg.append("rect").attr("x", x0).attr("width", Math.max(1, x1 - x0)).attr("y", m.t - 4).attr("height", h - m.t - m.b + 8)
          .attr("fill", b.color).attr("opacity", 0.12);
        svg.append("text").attr("x", x0 + 6).attr("y", m.t - 10).attr("fill", b.color).style("font", "600 10.5px " + T.mono).text(b.label);
      });
      const xAxis = svg.append("g").attr("transform", `translate(0,${h - m.b + 4})`)
        .call(d3.axisBottom(x).ticks(d3.utcYear.every(1)).tickFormat(d3.utcFormat("%Y")));
      styleAxis(xAxis);
      items.forEach((d, i) => {
        const y = m.t + i * rowH;
        svg.append("text").attr("x", m.l - 10).attr("y", y + rowH / 2).attr("dy", "0.35em").attr("text-anchor", "end")
          .attr("fill", T.text).style("font", "12px " + SANS()).text(clip(d.label, m.l - 14));
        svg.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y + rowH / 2).attr("y2", y + rowH / 2).attr("stroke", T.grid);
        const bar = svg.append("rect").attr("x", x(parse(d.start))).attr("y", y + 6)
          .attr("width", Math.max(3, x(parse(d.end)) - x(parse(d.start)))).attr("height", rowH - 12).attr("rx", 4)
          .attr("fill", d.color).datum(d);
        hover(bar, (q) => q.tip || `<span class="m">${RB.esc(q.label)}</span><br>${F.date(q.start)} to ${F.date(q.end)}`);
      });
      (o.markers || []).forEach((mk) => {
        const mx = x(parse(mk.date));
        svg.append("line").attr("x1", mx).attr("x2", mx).attr("y1", m.t - 4).attr("y2", h - m.b + 4)
          .attr("stroke", T.text).attr("stroke-dasharray", "3 3").attr("opacity", 0.55);
        const hit = svg.append("rect").attr("x", mx - 5).attr("width", 10).attr("y", m.t - 4).attr("height", h - m.t - m.b + 8)
          .attr("fill", "transparent").datum(mk);
        hover(hit, (q) => q.tip);
      });
    });
  };

  /* ---------- histogram coloured by crowd level ---------- */
  // values = [numbers], o = {thresholds:[lo,hi], overlay:[numbers], bins, height, label, overlayName}
  RB.histogram = (host, values, o) => {
    const H = o.height || 230, [lo, hi] = o.thresholds;
    RB.responsive(host, (w) => {
      const m = { t: 22, r: 12, b: 32, l: 40 };
      const svg = svgIn(host, w, H, o.label);
      const all = values.concat(o.overlay || []);
      const x = d3.scaleLinear().domain(d3.extent(all)).nice().range([m.l, w - m.r]);
      const bin = d3.bin().domain(x.domain()).thresholds(o.bins || 28);
      const bars = bin(values), over = o.overlay ? bin(o.overlay) : null;
      const share = (b, n) => b.length / n;
      const yMax = d3.max(bars, (b) => share(b, values.length)) * 1.12;
      const yTop = over ? Math.max(yMax, d3.max(over, (b) => share(b, o.overlay.length)) * 1.12) : yMax;
      const y = d3.scaleLinear().domain([0, yTop]).range([H - m.b, m.t]);

      const yAxis = svg.append("g").attr("transform", `translate(${m.l},0)`)
        .call(d3.axisLeft(y).ticks(4).tickSize(-(w - m.l - m.r)).tickFormat(d3.format(".0%")));
      styleAxis(yAxis); yAxis.select(".domain").remove(); yAxis.selectAll("line").attr("stroke-dasharray", "2 4");
      const xAxis = svg.append("g").attr("transform", `translate(0,${H - m.b})`)
        .call(d3.axisBottom(x).ticks(Math.max(3, Math.floor(w / 90))).tickFormat(F.compact));
      styleAxis(xAxis);

      const level = (mid) => (mid <= lo ? "Low" : mid > hi ? "High" : "Medium");
      const rects = svg.selectAll("rect.b").data(bars).enter().append("rect").attr("class", "b")
        .attr("x", (b) => x(b.x0) + 1).attr("width", (b) => Math.max(1, x(b.x1) - x(b.x0) - 2))
        .attr("y", (b) => y(share(b, values.length))).attr("height", (b) => y(0) - y(share(b, values.length)))
        .attr("rx", 2).attr("fill", (b) => RB.levelColors[level((b.x0 + b.x1) / 2)]).attr("opacity", 0.9);
      hover(rects, (b) => `<span class="m">${F.compact(b.x0)} to ${F.compact(b.x1)} passengers</span><br><b>${b.length}</b> days (${F.pct(share(b, values.length), 1)})`);

      if (over) {
        const pts = over.map((b) => ({ x: (x(b.x0) + x(b.x1)) / 2, y: y(share(b, o.overlay.length)) }));
        svg.append("path").datum(pts).attr("fill", "none").attr("stroke", T.text).attr("stroke-width", 1.6)
          .attr("stroke-linejoin", "round").attr("d", d3.line().x((p) => p.x).y((p) => p.y).curve(d3.curveMonotoneX));
      }
      [[lo, "Low ≤ " + F.compact(lo), "end"], [hi, "High > " + F.compact(hi), "start"]].forEach(([v, txt, anchor]) => {
        svg.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", m.t - 6).attr("y2", H - m.b)
          .attr("stroke", T.text).attr("stroke-dasharray", "4 3").attr("opacity", 0.8);
        svg.append("text").attr("x", x(v) + (anchor === "end" ? -5 : 5)).attr("y", m.t - 9).attr("text-anchor", anchor)
          .attr("fill", T.text).style("font", "600 10.5px " + T.mono).text(txt);
      });
    });
  };

  /* ---------- 100% stacked share bars (Low / Medium / High) ---------- */
  // rows = [{label, parts:{Low,Medium,High}}]
  RB.shareBars = (host, rows, o = {}) => {
    const rowH = o.rowH || 26;
    RB.responsive(host, (w) => {
      const m = { t: 2, r: 4, b: 2, l: Math.min(o.labelW || 118, w * 0.38) };
      const svg = svgIn(host, w, rows.length * rowH + m.t + m.b, o.label);
      const x = d3.scaleLinear().domain([0, 1]).range([m.l, w - m.r]);
      rows.forEach((r, i) => {
        const y = m.t + i * rowH;
        svg.append("text").attr("x", m.l - 8).attr("y", y + rowH / 2).attr("dy", "0.35em").attr("text-anchor", "end")
          .attr("fill", T.text).style("font", "12px " + SANS()).text(clip(r.label, m.l - 12));
        let acc = 0;
        RB.levels.forEach((lv) => {
          const v = r.parts[lv] || 0, x0 = x(acc), wd = x(acc + v) - x0;
          const seg = svg.append("rect").attr("x", x0).attr("y", y + 4).attr("width", Math.max(0, wd - 1)).attr("height", rowH - 8)
            .attr("fill", RB.levelColors[lv]).datum({ r, lv, v });
          hover(seg, (q) => `<span class="m">${RB.esc(q.r.label)}</span><br>${q.lv}: <b>${F.pct(q.v, 0)}</b>`);
          if (wd > 30) svg.append("text").attr("x", x0 + wd / 2).attr("y", y + rowH / 2).attr("dy", "0.35em").attr("text-anchor", "middle")
            .attr("fill", INK).style("font", "600 10.5px " + T.mono).style("pointer-events", "none").text(Math.round(v * 100) + "%");
          acc += v;
        });
      });
    });
  };
})();
