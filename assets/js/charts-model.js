/* Chart types for the Models and Results pages: folds strip, tree, ROC, confusion matrix. */
(function () {
  const RB = window.RB, T = RB.theme, F = RB.fmt;
  const SANS = () => getComputedStyle(document.body).fontFamily;
  const parse = d3.utcParse("%Y-%m-%d");
  RB.modelColors = { "Baseline: Majority class": "#667585", "Baseline: Line + weekday": "#a78bfa", "Decision Tree": "#ffc861", "Random Forest": "#4da3ff" };
  RB.modelShort = { "Baseline: Majority class": "Majority", "Baseline: Line + weekday": "Line + weekday", "Decision Tree": "Decision Tree", "Random Forest": "Random Forest" };
  const svgIn = (host, w, h, label) => { host.innerHTML = ""; return d3.select(host).append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", label || ""); };
  const styleAxis = (g) => { g.selectAll("text").attr("fill", T.muted).style("font", "11px " + T.mono); g.selectAll("line").attr("stroke", T.grid); g.select(".domain").attr("stroke", T.border); };
  const tip = (sel, html) => sel.on("mousemove", (ev, d) => RB.tooltip.show(html(d), ev)).on("mouseleave", () => RB.tooltip.hide());

  /* ---------- time-ordered folds: train bar then validation bar ---------- */
  // rows = [{label, train:[a,b], val:[a,b], valLabel}], o = {domain:[a,b]}
  RB.foldStrip = (host, rows, o) => {
    const rowH = 30;
    RB.responsive(host, (w) => {
      const m = { t: 6, r: 12, b: 26, l: Math.min(96, w * 0.24) };
      const svg = svgIn(host, w, rows.length * rowH + m.t + m.b, o.label);
      const x = d3.scaleUtc().domain(o.domain.map(parse)).range([m.l, w - m.r]);
      styleAxis(svg.append("g").attr("transform", `translate(0,${rows.length * rowH + m.t})`).call(d3.axisBottom(x).ticks(d3.utcMonth.every(w < 560 ? 6 : 3)).tickFormat(d3.utcFormat("%b %y"))));
      rows.forEach((r, i) => {
        const y = m.t + i * rowH;
        svg.append("text").attr("x", m.l - 10).attr("y", y + rowH / 2).attr("dy", "0.35em").attr("text-anchor", "end").attr("fill", r.final ? T.text : T.muted).style("font", (r.final ? "600 " : "") + "12px " + SANS()).text(r.label);
        [[r.train, RB.levelColors.Low, "Train", 0.85], [r.val, r.final ? "#ffc861" : "#4da3ff", r.final ? "Test" : "Validate", 1]].forEach(([p, c, n, op]) => {
          const b = svg.append("rect").attr("x", x(parse(p[0]))).attr("width", Math.max(3, x(parse(p[1])) - x(parse(p[0])))).attr("y", y + 6).attr("height", rowH - 12).attr("rx", 3).attr("fill", c).attr("opacity", op).datum(p);
          tip(b, (q) => `<b>${r.label}: ${n}</b><br><span class="m">${F.date(q[0])} to ${F.date(q[1])}</span>`);
        });
      });
    });
  };

  /* ---------- small decision tree (left to right) ---------- */
  // root = nested {samples,dist,pred,feature,threshold,left,right}, o = {classNames, nice(feature,threshold)}
  RB.tree = (host, root, o) => {
    const h = d3.hierarchy(root, (d) => (d.left ? [d.left, d.right] : null));
    const leaves = h.leaves().length, H = leaves * 44 + 20;
    host.innerHTML = ""; host.style.overflowX = "auto";
    const W = Math.max(host.clientWidth, 640);
    const svg = d3.select(host).append("svg").attr("width", W).attr("height", H).attr("role", "img").attr("aria-label", o.label || "");
    const nw = 128, nh = 34, gx = (W - nw - 8) / h.height;
    d3.tree().size([H - 20, 1]).separation(() => 1)(h);
    h.each((n) => { n.px = 4 + n.depth * gx; n.py = n.x + 10; });
    svg.selectAll("path.l").data(h.links()).join("path").attr("fill", "none").attr("stroke", T.border).attr("stroke-width", 1.5)
      .attr("d", (l) => `M${l.source.px + nw},${l.source.py}C${(l.source.px + nw + l.target.px) / 2},${l.source.py} ${(l.source.px + nw + l.target.px) / 2},${l.target.py} ${l.target.px},${l.target.py}`);
    svg.selectAll("text.yn").data(h.links()).join("text").attr("class", "yn").attr("x", (l) => l.target.px - 6).attr("y", (l) => l.target.py - 5).attr("text-anchor", "end").attr("fill", T.faint).style("font", "10px " + T.mono).text((l) => (l.target === l.source.children[0] ? "yes" : "no"));
    const g = svg.selectAll("g.n").data(h.descendants()).join("g").attr("transform", (n) => `translate(${n.px},${n.py - nh / 2})`);
    g.append("rect").attr("width", nw).attr("height", nh).attr("rx", 6).attr("fill", T.surface).attr("stroke", (n) => (n.children ? T.border : RB.levelColors[o.classNames[n.data.pred]])).attr("stroke-width", (n) => (n.children ? 1 : 2));
    g.each(function (n) {   // class mix bar along the bottom
      let acc = 0;
      n.data.dist.forEach((p, i) => { d3.select(this).append("rect").attr("x", 6 + acc * (nw - 12)).attr("y", nh - 7).attr("width", Math.max(0, p * (nw - 12))).attr("height", 3).attr("fill", RB.levelColors[o.classNames[i]]); acc += p; });
    });
    g.append("text").attr("x", nw / 2).attr("y", 14).attr("text-anchor", "middle").attr("fill", T.text).style("font", "600 11px " + T.mono)
      .text((n) => (n.children ? o.nice(n.data.feature, n.data.threshold) : o.classNames[n.data.pred]));
    g.append("title").text((n) => `${F.int(n.data.samples)} rows · ` + n.data.dist.map((p, i) => `${o.classNames[i]} ${(p * 100).toFixed(0)}%`).join(" · "));
  };

  /* ---------- ROC curves ---------- */
  // curves = {model:{tpr[],auc}}, grid = fpr[]
  RB.roc = (host, grid, curves, o = {}) => {
    RB.responsive(host, (w) => {
      const S = Math.min(w, o.max || 420), m = { t: 8, r: 10, b: 36, l: 40 };
      const svg = svgIn(host, w, S, o.label);
      const x = d3.scaleLinear().domain([0, 1]).range([m.l, S - m.r]), y = d3.scaleLinear().domain([0, 1]).range([S - m.b, m.t]);
      const gx = svg.append("g").attr("transform", `translate(0,${S - m.b})`).call(d3.axisBottom(x).ticks(5).tickSize(-(S - m.t - m.b)));
      const gy = svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(S - m.l - m.r)));
      [gx, gy].forEach((a) => { styleAxis(a); a.selectAll("line").attr("stroke-dasharray", "2 4"); });
      svg.append("text").attr("x", (m.l + S - m.r) / 2).attr("y", S - 6).attr("text-anchor", "middle").attr("fill", T.faint).style("font", "10.5px " + T.mono).text("False positive rate");
      svg.append("text").attr("transform", `translate(11,${(m.t + S - m.b) / 2}) rotate(-90)`).attr("text-anchor", "middle").attr("fill", T.faint).style("font", "10.5px " + T.mono).text("True positive rate");
      svg.append("line").attr("x1", x(0)).attr("y1", y(0)).attr("x2", x(1)).attr("y2", y(1)).attr("stroke", T.faint).attr("stroke-dasharray", "4 4");
      Object.entries(curves).forEach(([name, c]) => {
        const pts = grid.map((f, i) => [f, c.tpr[i]]), col = RB.modelColors[name];
        svg.append("path").datum(pts).attr("fill", "none").attr("stroke", col).attr("stroke-width", name === o.best ? 2.8 : 1.8)
          .attr("opacity", name === o.best ? 1 : 0.8).attr("d", d3.line().x((p) => x(p[0])).y((p) => y(p[1])));
      });
    });
  };

  /* ---------- confusion matrix (counts, row % as shading) ---------- */
  // m = 3x3 counts [true][pred]
  RB.confusion = (host, m, names, o = {}) => {
    RB.responsive(host, (w) => {
      const pad = { t: 34, l: 76, r: 4, b: 4 }, cw = Math.min(110, (w - pad.l - pad.r) / 3), ch = Math.min(70, cw * 0.72);
      const svg = svgIn(host, w, pad.t + ch * 3 + pad.b, o.label);
      svg.append("text").attr("x", pad.l + cw * 1.5).attr("y", 10).attr("text-anchor", "middle").attr("fill", T.faint).style("font", "10.5px " + T.mono).text("PREDICTED");
      names.forEach((n, i) => {
        svg.append("text").attr("x", pad.l + i * cw + cw / 2).attr("y", pad.t - 8).attr("text-anchor", "middle").attr("fill", RB.levelColors[n]).style("font", "600 11.5px " + T.mono).text(n);
        svg.append("text").attr("x", pad.l - 8).attr("y", pad.t + i * ch + ch / 2).attr("dy", "0.35em").attr("text-anchor", "end").attr("fill", RB.levelColors[n]).style("font", "600 11.5px " + T.mono).text(n);
      });
      svg.append("text").attr("transform", `translate(9,${pad.t + ch * 1.5}) rotate(-90)`).attr("text-anchor", "middle").attr("fill", T.faint).style("font", "10.5px " + T.mono).text("ACTUAL");
      m.forEach((row, ri) => { const tot = d3.sum(row); row.forEach((v, ci) => {
        const p = tot ? v / tot : 0, ok = ri === ci;
        const base = ok ? "#4da3ff" : "#ff6b6b";
        const r = svg.append("rect").attr("x", pad.l + ci * cw + 2).attr("y", pad.t + ri * ch + 2).attr("width", cw - 4).attr("height", ch - 4).attr("rx", 6)
          .attr("fill", d3.interpolateRgb("#141c26", base)(Math.min(1, p * (ok ? 1.15 : 1.6)))).datum({ v, p });
        tip(r, (q) => `Actual <b>${names[ri]}</b>, predicted <b>${names[ci]}</b><br><b>${F.int(q.v)}</b> days · ${(q.p * 100).toFixed(0)}% of actual ${names[ri]}`);
        svg.append("text").attr("x", pad.l + ci * cw + cw / 2).attr("y", pad.t + ri * ch + ch / 2 - 4).attr("text-anchor", "middle").attr("fill", "#e7edf3").style("font", "700 14px " + T.mono).style("pointer-events", "none").text(F.int(v));
        svg.append("text").attr("x", pad.l + ci * cw + cw / 2).attr("y", pad.t + ri * ch + ch / 2 + 12).attr("text-anchor", "middle").attr("fill", "#e7edf3").attr("opacity", 0.7).style("font", "11px " + T.mono).style("pointer-events", "none").text((p * 100).toFixed(0) + "%");
      }); });
    });
  };
})();
