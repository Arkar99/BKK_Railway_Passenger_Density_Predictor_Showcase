(function () {
  const RB = window.RB, D = RB.data, R = D.results, L = RB.config.links || {}, F = RB.fmt, $ = (id) => document.getElementById(id);
  const lines = D.meta.line_order, sh = D.labels.shares, best = R.best_model;
  const pc = (v) => (v * 100).toFixed(0) + "%";

  /* drift numbers from the data */
  const hi = lines.map((l) => [l, sh.test[l].High]).sort((a, b) => b[1] - a[1]);
  const hiTop = hi.filter((x) => x[1] > 0.5), loTop = hi.filter((x) => x[1] < 0.2);
  const medLow = lines.filter((l) => sh.test[l].Medium < 0.1);
  const mr = R.per_class[best].Medium.recall;

  const issues = [
    ["high", "Test months have a different level mix", `Labels are fixed from training days, so they assume 'normal' stays normal. In Jul to Oct 2026, ${hiTop.map((x) => x[0].replace(" Line", "")).join(", ")} were High on over half of days, while ${loTop.map((x) => x[0].replace(" Line", "")).join(", ")} were High on under 20%. Part of the test score is drift, not model quality.`, "Not solved"],
    ["high", "Medium is rarely predicted", `The ${best} finds only ${pc(mr)} of true Medium days. It is safer at Low and High. Medium is the narrowest band, so small errors push days across its edges.`, "Not solved"],
    ["mid", "Short test window", `The test set is ${F.int(D.meta.rows.test)} line-days over 4 months (Jul to Oct 2026), so it cannot show a full year of seasons. CV folds are also small, which is why scores swing between folds.`, "Limitation"],
    ["mid", "Only calendar inputs", "The model sees line, weekday, month and holiday only. No weather, events, school terms, fares or service changes, so it cannot explain a surprise day.", "Limitation"],
    ["mid", "Launch-period end dates are inferred", "Yellow (to 2 Jul 2023) and Pink (to 23 Dec 2023) dates come from where counts level off. They are not confirmed by the operators. They fall before the 2025 window, so they do not affect the models today.", "Unverified"],
    ["low", "Baseline is hard to beat", `The 'line + weekday' baseline is already strong. The extra value of the forest is small on test, so we do not claim a large win.`, "Honest note"],
  ];
  const tag = { high: "High", mid: "Medium", low: "Low" };
  $("issues").innerHTML = issues.map(([sev, t, p, s]) => `<div class="issue ${sev}"><div class="head"><span class="pill ${sev === "high" ? "high" : sev === "mid" ? "medium" : "low"}">${s}</span></div><b>${RB.esc(t)}</b><p>${RB.esc(p)}</p></div>`).join("");

  /* evidence charts */
  const rows = (w) => lines.map((l) => ({ label: l, parts: sh[w][l] }));
  RB.shareBars($("share-train"), rows("train"), { label: "Share of levels per line in training" });
  RB.shareBars($("share-test"), rows("test"), { label: "Share of levels per line in test" });
  RB.legend($("share-legend"), RB.levels.map((n) => ({ name: n, color: RB.levelColors[n] })));
  $("drift-finding").innerHTML = `Training is an even split by design. In test, ${medLow.map((l) => l.replace(" Line", "")).join(" and ")} have almost no Medium days (under 10%): those lines moved up and stayed up.`;

  /* next steps */
  const steps = [
    ["Label against a recent baseline", "Define Low / High relative to the last few weeks instead of fixed training cut-offs, so level shifts stop distorting the labels."],
    ["Add outside information", "Weather, school calendar, big events and service changes as extra inputs."],
    ["Retrain on a schedule", "Re-fit monthly with fresh data and re-check on the newest weeks."],
    ["Verify the launch dates", "Ask the operators when free trials ended, or drop launch periods by rule."],
    ["Try a number forecast", "After the level model, predict the passenger count itself (regression) as a second view."],
  ];
  $("steps").innerHTML = steps.map(([t, p]) => `<li><b>${RB.esc(t)}</b><span>${RB.esc(p)}</span></li>`).join("");

  /* links + files */
  $("links").innerHTML = `<dt>Website</dt><dd>${RB.text(L.site || "[Published website URL]")}</dd>
    <dt>Code</dt><dd>${RB.link(L.repo, L.repo)}</dd>
    <dt>Notebook</dt><dd>${RB.link(L.notebook, L.notebook)}</dd>
    <dt>Dataset</dt><dd>${RB.link(L.dataset, L.dataset)}</dd>
    <dt>Web app</dt><dd>${RB.link(L.webapp, L.webapp)}</dd>`;
  const files = [["meta.json", "split sizes, dates, settings"], ["cleaning.json", "rows kept per step"], ["series.json", "daily counts per line"], ["eda.json", "weekday, month, holiday, yearly averages"], ["labels.json", "thresholds and label shares"], ["cv.json", "cross-validation folds"], ["results.json", "test scores, confusion, ROC"], ["importance.json", "feature importance"], ["tree.json", "small tree"]];
  $("files").innerHTML = files.map(([f, d]) => `<li><a href="data/json/${f}" target="_blank" rel="noopener"><b>${f}</b></a> ${d}</li>`).join("");

  /* review-form checklist */
  const a = (h, t) => `<a href="${h}">${t}</a>`;
  const check = [
    ["Team: all members, names and roles", a("index.html#team", "Home, team card"), "Done (fill placeholders)"],
    ["Problem and data: question, source, size, label", a("problem.html", "Data page"), "Done"],
    ["Data cleaning: missing values and errors documented", a("cleaning.html", "Cleaning page"), "Done"],
    ["Models: baseline, at least 2 models, results table", a("modeling.html", "Models") + " · " + a("results.html", "Results"), "Done"],
    ["Evaluation: CV, no leakage, precision, recall, F1, AUC", a("results.html", "Results") + " · " + a("modeling.html", "Models, leakage"), "Done"],
    ["Open issues: what fails, next steps", "This page", "Done"],
    ["Website: links work without login, code and data linked", "This page and footer", "Fill in URLs, then publish"],
  ];
  $("check").innerHTML = check.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("");
})();
