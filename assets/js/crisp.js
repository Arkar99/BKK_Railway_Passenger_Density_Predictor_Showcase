/* CRISP-DM page: interactive cycle, phase details, loop-backs. All numbers come from the data bundle. */
(function () {
  const RB = window.RB, D = RB.data, CFG = RB.config;
  const raw = D.cleaning.raw_facts, M = D.meta, R = D.results;
  const best = R.best_model, bs = R.test_scores[best];
  const usable = M.rows.train + M.rows.test;

  const colorVars = ["--l-bts-green", "--l-mrt-blue", "--l-mrt-purple", "--l-mrt-pink", "--l-arl", "--l-mrt-yellow"];
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const colors = colorVars.map(css);

  const phases = [
    { short: "Business", name: "Business understanding", lab: ["Business", "understanding"],
      is: "Define the goal and what success means.",
      did: "Goal: tell travellers how crowded a line will be on a chosen day. Target: Low, Medium or High per line. Success: beat simple baselines on future days.",
      why: "A clear target keeps every later choice (labels, split, metrics) honest.",
      fig: "3 levels × 9 lines", cap: "The target", href: "problem.html", go: "Problem & data" },
    { short: "Data", name: "Data understanding", lab: ["Data", "understanding"],
      is: "Look at the data before touching it.",
      did: `Explored ${RB.fmt.int(raw.rows)} daily rows: weekday and holiday effects, yearly growth, and oddities such as launch-period spikes (${raw.launch_period_rows_before_window} rows, likely free trials) and the March 2025 earthquake (${raw.earthquake_rows_all_lines} rows).`,
      why: "Spotting level shifts and special days early stops the model from learning them as normal behaviour.",
      fig: `${RB.fmt.int(raw.rows)} rows`, cap: "Explored", href: "explore.html", go: "Explore the data" },
    { short: "Prep", name: "Data preparation", lab: ["Data", "preparation"],
      is: "Clean, select and shape the data for modeling.",
      did: "Parsed dates and numbers, translated the Thai note, flagged closures, kept 2025 onward, labelled crowd levels from training data only, and split by time.",
      why: "A time-ordered split and training-only thresholds stop information from the future leaking into training.",
      fig: `${RB.fmt.int(raw.rows)} → ${RB.fmt.int(usable)}`, cap: "Rows before and after", href: "cleaning.html", go: "Data cleaning" },
    { short: "Modeling", name: "Modeling", lab: ["Modeling"],
      is: "Choose and train methods.",
      did: "Two baselines (most common level; line + weekday), a Decision Tree (depth 5) and a Random Forest (100 trees, depth 8).",
      why: "Trees suit calendar categories and are easy to explain; the forest adds stability. Baselines show whether the models add anything.",
      fig: "2 baselines + 2 models", cap: "Compared", href: "modeling.html", go: "Models" },
    { short: "Evaluation", name: "Evaluation", lab: ["Evaluation"],
      is: "Check the results against the goal.",
      did: `${D.cv.n_splits}-fold time-based cross-validation on the training period, then one final test on ${RB.fmt.date(M.test_period[0])} to ${RB.fmt.date(M.test_period[1])}: accuracy, precision, recall, F1 and AUC.`,
      why: "Scores on future days, not shuffled days, show how the model would behave in real use.",
      fig: `${RB.fmt.pct(bs.accuracy)} · AUC ${RB.fmt.dec(bs.auc_ovr_macro, 2)}`, cap: `${best}, test set`, href: "results.html", go: "Results" },
    { short: "Deploy", name: "Deployment", lab: ["Deployment"],
      is: "Put the result to use.",
      did: "A separate web app lets a user pick a date and a line and see the predicted level. The model is meant to be retrained as new months arrive.",
      why: "A model only helps when people can use it, and monitoring shows when crowd levels drift.",
      fig: null, cap: "Web app", href: "issues.html", go: "Open issues & next steps" }
  ];

  /* ----- cycle diagram ----- */
  const host = document.getElementById("cycle");
  const W = 560, H = 470, cx = W / 2, cy = 232, Rr = 150, nr = 27;
  const pos = (deg, r = Rr) => { const t = deg * Math.PI / 180; return [cx + r * Math.sin(t), cy - r * Math.cos(t)]; };
  const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "group").attr("aria-label", "CRISP-DM cycle with six phases");

  // arcs with arrow heads between stations (clockwise)
  const gap = (nr + 9) / Rr * 180 / Math.PI;
  phases.forEach((p, i) => {
    const a0 = i * 60 + gap, a1 = (i + 1) * 60 - gap;
    const arc = d3.arc().innerRadius(Rr - 1.5).outerRadius(Rr + 1.5).startAngle(a0 * Math.PI / 180).endAngle(a1 * Math.PI / 180);
    svg.append("path").attr("class", "arc").attr("transform", `translate(${cx},${cy})`).attr("d", arc());
    const [ax, ay] = pos(a1);
    svg.append("path").attr("class", "arc").attr("d", "M-1,-5.5 L9,0 L-1,5.5 Z").attr("transform", `translate(${ax},${ay}) rotate(${a1})`);
  });

  // centre label
  const core = svg.append("g").attr("class", "core");
  core.append("circle").attr("cx", cx).attr("cy", cy).attr("r", 48).attr("fill", "var(--surface)").attr("stroke", "var(--border)");
  core.append("text").attr("x", cx).attr("y", cy + 4).text("DATA");

  const nodes = phases.map((p, i) => {
    const deg = i * 60, [x, y] = pos(deg);
    const g = svg.append("g").attr("class", "node").attr("tabindex", 0).attr("role", "button")
      .attr("aria-label", `${i + 1}. ${p.name}`).style("--c", colors[i]);
    g.append("circle").attr("class", "ring").attr("cx", x).attr("cy", y).attr("r", nr);
    g.append("text").attr("class", "n").attr("x", x).attr("y", y).text(i + 1);
    const lab = g.append("text").attr("class", "lab");
    const right = deg > 0 && deg < 180, left = deg > 180, top = deg === 0;
    p.lab.forEach((line, k) => {
      const t = lab.append("tspan").text(line);
      if (right) t.attr("x", x + nr + 12).attr("text-anchor", "start");
      else if (left) t.attr("x", x - nr - 12).attr("text-anchor", "end");
      else t.attr("x", x).attr("text-anchor", "middle");
      const n = p.lab.length;
      const dy = right || left ? (k - (n - 1) / 2) * 16 + 5 : top ? -(nr + 14) - (n - 1 - k) * 16 : nr + 22 + k * 16;
      t.attr("y", y + dy);
    });
    g.on("click", () => select(i)).on("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(i); } });
    return g;
  });

  /* ----- one small evidence visual per phase ----- */
  const lines = M.line_order, F = RB.fmt;
  const weekdayIndex = () => {                       // each line scaled to its own average = 100, then averaged
    const out = Array(7).fill(0);
    lines.forEach((l) => { const v = D.eda.weekday_avg[l], m = d3.mean(v); v.forEach((x, k) => (out[k] += (x / m) * 100 / lines.length)); });
    return out;
  };
  const quieter = lines.filter((l) => D.eda.daytype_avg[l].Weekend < D.eda.daytype_avg[l].Weekday).length;
  const wf = D.cleaning.waterfall;
  const modelColors = { "Baseline: Majority class": "#66768a", "Baseline: Line + weekday": "#8aa0b8", "Decision Tree": "#b07cff", "Random Forest": "#4da3ff" };
  const viz = [
    { title: "Inputs to a crowd level",
      draw: (h) => { h.innerHTML = `<div class="flow" style="margin-top:0"><span class="node">Line</span><span class="node">Weekday</span><span class="node">Month</span><span class="node">Holiday?</span><span class="arrow">→</span><span class="node out"><span class="pill low">Low</span><span class="pill medium">Medium</span><span class="pill high">High</span></span></div>`; } },
    { title: `Weekday pattern: ${quieter} of ${lines.length} lines are quieter at weekends`,
      draw: (h) => RB.groupedBars(h, {
        categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], height: 190, yMax: 130, format: (v) => String(Math.round(v)),
        series: [{ name: "Index", color: RB.theme.accent, values: weekdayIndex() }],
        pointColors: Array(5).fill(RB.theme.accent).concat(["#8aa0b8", "#8aa0b8"]),
        ref: { value: 100, label: "line's own average" }, label: "Average passengers by weekday, each line indexed to its own average" }) },
    { title: "Rows kept at each step",
      draw: (h) => RB.hbar(h, [
        { label: "Raw file", value: wf[0].remaining, color: "#66768a" },
        { label: "From 2025", value: wf[1].remaining, color: RB.theme.accent },
        { label: "After cleaning", value: wf[wf.length - 1].remaining, color: RB.theme.accent },
        { label: "Train", value: M.rows.train, color: "#3d8bff" },
        { label: "Test", value: M.rows.test, color: RB.theme.board }
      ], { labelW: 108, valueW: 56, rowH: 28, label: "Rows remaining after each preparation step" }) },
    { title: "Four methods, same inputs",
      draw: (h) => { h.innerHTML = `<div class="ladder">
        <div class="step"><span class="n">1</span><div><b>Baseline</b><span>most common level</span></div></div>
        <div class="step"><span class="n">2</span><div><b>Baseline</b><span>most common level per line and weekday</span></div></div>
        <div class="step"><span class="n">3</span><div><b>Decision Tree</b><span>depth 5, easy to read</span></div></div>
        <div class="step"><span class="n">4</span><div><b>Random Forest</b><span>100 trees, depth 8</span></div></div></div>`; } },
    { title: "Test-period scores (Jul to Oct 2026)",
      draw: (h) => {
        h.innerHTML = '<div class="m-chart"></div><div class="m-legend"></div>';
        const names = R.models;
        RB.groupedBars(h.querySelector(".m-chart"), {
          categories: ["Accuracy", "Macro F1", "AUC"], height: 200, yMax: 1, format: (v) => F.dec(v, 2),
          series: names.map((n) => ({ name: n.replace("Baseline: ", "Base: "), color: modelColors[n],
            values: [R.test_scores[n].accuracy, R.test_scores[n].f1_macro, R.test_scores[n].auc_ovr_macro] })),
          label: "Accuracy, macro F1 and AUC of each method on the test period" });
        RB.legend(h.querySelector(".m-legend"), names.map((n) => ({ name: n.replace("Baseline: ", "Base: "), color: modelColors[n] })));
      } },
    null
  ];

  /* ----- phase pills and detail panel ----- */
  const pills = document.getElementById("phases");
  pills.innerHTML = phases.map((p, i) =>
    `<button type="button" role="tab" style="--c:${colors[i]}" data-i="${i}"><b>${i + 1}</b> ${p.short}</button>`).join("");
  pills.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) select(+b.dataset.i); });

  const detail = document.getElementById("detail");
  function select(i) {
    const p = phases[i];
    nodes.forEach((n, k) => n.classed("on", k === i));
    pills.querySelectorAll("button").forEach((b, k) => { b.setAttribute("aria-pressed", String(k === i)); b.setAttribute("aria-selected", String(k === i)); });
    detail.style.setProperty("--c", colors[i]);
    const fig = p.fig != null
      ? `<div class="fig">${RB.esc(p.fig)}</div>`
      : `<div class="fig fig-link">${RB.link(CFG.links.webapp, "Open the web app ↗")}</div>`;
    detail.innerHTML = `
      <div class="figcap">Phase ${i + 1} of 6</div>
      <h3>${p.name}</h3>
      <p class="is">${p.is}</p>
      ${fig}<div class="figcap">${RB.esc(p.cap)}</div>
      ${viz[i] ? `<div class="mini"><div class="mini-title">${RB.esc(viz[i].title)}</div><div class="mini-body"></div></div>` : ""}
      <dl>
        <div><dt>What we did</dt><dd>${p.did}</dd></div>
        <div><dt>Why it matters here</dt><dd>${p.why}</dd></div>
      </dl>
      <a class="btn go" href="${p.href}">${p.go} →</a>`;
    if (viz[i]) viz[i].draw(detail.querySelector(".mini-body"));
  }
  select(0);

  /* ----- loop-backs (numbers computed from the data) ----- */
  const ya = D.eda.yearly_avg["Red Line"];
  const tops = Object.entries(D.labels.shares.test).map(([l, s]) => [l, s.High]).sort((a, b) => b[1] - a[1])[0];
  const chip = (i, t) => `<span style="--c:${colors[i]}"><i></i>${t}</span>`;
  const loops = [
    { from: 1, to: 2,
      text: "Charts showed several lines stepping up in 2024, so levels from earlier years are not comparable. We kept 2025 onward.",
      ev: `Red Line daily average: ${RB.fmt.compact(ya["2023"])} (2023) → ${RB.fmt.compact(ya["2025"])} (2025)` },
    { from: 1, to: 2,
      text: "Launch-period spikes (likely free trials) and the March 2025 earthquake looked like exceptions, so they are flagged and kept out of training.",
      ev: `${raw.launch_period_rows_before_window} launch rows · ${raw.earthquake_rows_all_lines} earthquake rows` },
    { from: 4, to: 0,
      text: "The test-period level mix drifted from training. We report this as a limitation rather than re-tuning on the test set.",
      ev: `${tops[0]}: ${RB.fmt.pct(tops[1], 0)} of test days are High` }
  ];
  document.getElementById("loops").innerHTML = loops.map((l) => `
    <div class="loop">
      <div class="path">${chip(l.from, phases[l.from].short)}<span class="arrow">→</span>${chip(l.to, phases[l.to].short)}</div>
      <p>${l.text}</p>
      <div class="ev">${RB.esc(l.ev)}</div>
    </div>`).join("");
})();
