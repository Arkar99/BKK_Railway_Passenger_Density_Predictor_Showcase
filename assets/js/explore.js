(function () {
  const RB = window.RB, D = RB.data, E = D.eda, M = D.meta, S = D.series, F = RB.fmt, $ = (id) => document.getElementById(id);
  const lines = M.line_order, A = M.annotations;
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const idx = (arr) => { const m = d3.mean(arr); return arr.map((v) => (v / m) * 100); };
  const pct = (v) => (v > 0 ? "+" : "") + v.toFixed(0) + "%";
  const key = (id) => RB.gradLegend($(id), { left: "below average", mid: "average (100)", right: "above average" });

  /* timeline */
  const weeklyPts = (line) => {
    const s = S[line], vals = s.values.map((v, i) => ({ date: RB.addDays(s.start, i), v }));
    return RB.weekly ? RB.weekly(s) : vals;
  };
  const pick = $("line-pick");
  let cur = lines[0];
  const drawTL = () => {
    const pts = weeklyPts(cur), st = E.stats[cur];
    RB.timeline($("timeline"), pts, {
      color: RB.colorOf(cur), label: cur + " weekly average passengers per day",
      bands: [{ from: "2025-01-01", to: M.train_period[1], label: "Train", color: "#4da3ff" }, { from: M.test_period[0], to: M.test_period[1], label: "Test", color: "#ffc861" }],
      markers: [{ date: A.earthquake[0] }],
    });
    $("tl-finding").innerHTML = `<b>${cur}</b>: median <b>${F.int(st.median)}</b> riders a day, from ${F.int(st.min)} to ${F.int(st.max)}. Dashed line = earthquake, 28 Mar 2025.`;
  };
  lines.forEach((l) => {
    const b = document.createElement("button");
    b.type = "button"; b.style.setProperty("--c", RB.colorOf(l)); b.innerHTML = `<i></i>${RB.esc(l)}`;
    b.setAttribute("aria-pressed", l === cur); b.onclick = () => { cur = l; [...pick.children].forEach((x) => x.setAttribute("aria-pressed", x === b)); drawTL(); };
    pick.appendChild(b);
  });
  drawTL();

  /* weekday */
  const wd = lines.map((l) => idx(E.weekday_avg[l]));
  RB.heatmap($("wd-heat"), { rows: lines, cols: DAYS, values: wd, domain: [80, 100, 120], format: (v) => v.toFixed(0), label: "Weekday index heatmap per line",
    tip: (r, c, v) => `<span class="m">${r} · ${c}</span><br><b>${v.toFixed(0)}</b> <span class="m">(100 = average)</span>` });
  key("wd-key");
  const we = lines.map((l) => ({ label: l, value: (E.daytype_avg[l].Weekend / E.daytype_avg[l].Weekday - 1) * 100 }));
  RB.divBars($("we-bars"), we, { labelW: 110, format: pct, label: "Weekend change versus weekday" });
  const lowerWE = we.filter((d) => d.value < 0).length, upWE = we.filter((d) => d.value > 0).map((d) => d.label);
  $("wd-finding").innerHTML = `Weekends are <b>lower on ${lowerWE} of ${lines.length} lines</b>. ${upWE.join(" and ")} run <b>higher</b> at weekends.`;

  /* month + holiday */
  const mo = lines.map((l) => idx(E.month_avg[l]));
  RB.heatmap($("mo-heat"), { rows: lines, cols: MON, colShort: MON.map((m) => m[0]), values: mo, domain: [80, 100, 120], minText: 38, shortBelow: 40, cellH: 28,
    format: (v) => v.toFixed(0), label: "Month index heatmap per line",
    tip: (r, c, v) => `<span class="m">${r} · ${c}</span><br><b>${v.toFixed(0)}</b> <span class="m">(100 = average)</span>` });
  key("mo-key");
  const hol = lines.map((l) => ({ label: l, value: E.holiday_avg[l].change_pct }));
  RB.divBars($("hol-bars"), hol, { labelW: 110, format: pct, label: "Public holiday change versus normal day" });
  const lowH = hol.filter((d) => d.value < 0).length, upH = hol.filter((d) => d.value > 0);
  const quiet = MON.map((m, i) => ({ m, n: lines.filter((l, li) => mo[li][i] === d3.min(mo[li])).length })).sort((a, b) => b.n - a.n)[0];
  $("mo-finding").innerHTML = `Public holidays are <b>lower on ${lowH} lines</b> and higher on ${upH.map((d) => `${d.label} (${pct(d.value)})`).join(" and ")}. <b>${quiet.m}</b> is the quietest month for ${quiet.n} lines.`;

  /* yearly */
  const years = ["2022", "2023", "2024", "2025", "2026"];
  const yr = lines.map((l) => years.map((y) => { const v = E.yearly_avg[l][y]; return v == null ? null : (v / E.yearly_avg[l]["2025"]) * 100; }));
  RB.heatmap($("yr-heat"), { rows: lines, cols: years, values: yr, domain: [70, 100, 130], format: (v) => v.toFixed(0), label: "Yearly index heatmap, 2025 = 100",
    tip: (r, c, v) => `<span class="m">${r} · ${c}</span><br><b>${v.toFixed(0)}</b> <span class="m">(2025 = 100)</span>` });
  key("yr-key");

  /* correlation */
  const cl = E.correlation.lines, cm = E.correlation.matrix;
  RB.heatmap($("corr"), { rows: cl, cols: cl, colShort: cl.map((l) => l === "Red Line" ? "Red" : l.length <= 3 ? l : l.replace(" Line", "").replace(/^(BTS|MRT) (..).*/, "$1 $2")), shortBelow: 110, values: cm,
    domain: [-1, 0, 1], format: (v) => v.toFixed(2), minText: 62, cellH: 30, label: "Correlation between lines",
    tip: (r, c, v) => `<span class="m">${r} × ${c}</span><br>r = <b>${v.toFixed(2)}</b>` });
  RB.gradLegend($("corr-key"), { left: "−1 move opposite", mid: "0 unrelated", right: "+1 move together" });

  /* takeaways */
  $("takeaways").innerHTML = [
    ["Weekday matters", "Most lines have a clear weekday pattern, so weekday is a model input.", `${lowerWE} of ${lines.length} lines lower at weekends`],
    ["Holidays matter", "Holidays change counts, in opposite directions for commuter and leisure lines.", `${lowH} lines lower, ${upH.length} higher`],
    ["Each line differs", "Sizes and patterns differ widely, so labels are set per line, from training rows only.", "9 lines, 9 thresholds"],
  ].map(([t, p, e]) => `<div class="panel"><b>${t}</b><p>${p}</p><div class="ev">${e}</div></div>`).join("");
})();
