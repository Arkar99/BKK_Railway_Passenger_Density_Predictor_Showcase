/* Problem & Data page: facts, coverage timeline, threshold histogram, label shares. */
(function () {
  const RB = window.RB, D = RB.data, M = D.meta, L = RB.config.links || {};
  const F = RB.fmt, lines = M.line_order, $ = (id) => document.getElementById(id);

  /* ----- fact tiles ----- */
  const raw = D.cleaning.raw_facts;
  const days = Math.max(...lines.map((l) => D.eda.stats[l].count));
  $("facts").innerHTML = [
    ["Rows", F.int(raw.rows), "line-days in the raw file"],
    ["Columns", "5", "before cleaning"],
    ["Rail lines", String(raw.lines), "BTS, MRT, ARL, SRT"],
    ["Days", F.int(days), "about 4 years of history"]
  ].map(([a, b, c]) => `<div class="tile"><div class="label">${a}</div><div class="num">${b}</div><div class="sub">${c}</div></div>`).join("");

  $("shape").textContent = `${F.int(raw.rows)} rows × 5 columns`;
  $("period").textContent = `${F.date(raw.first_date)} to ${F.date(raw.last_date)}`;
  $("source").innerHTML = `
    <dt>Dataset</dt><dd>${RB.link(L.dataset, L.dataset)}</dd>
    <dt>Owner</dt><dd>${RB.text(L.datasetOwner)}</dd>
    <dt>License</dt><dd>${RB.text(L.datasetLicense)}</dd>
    <dt>Accessed</dt><dd>${RB.text(L.datasetAccessed)}</dd>`;

  /* ----- coverage timeline ----- */
  const eq = M.annotations.earthquake;
  RB.coverage($("coverage"), lines.map((l) => ({
    label: l, start: D.eda.stats[l].first, end: D.eda.stats[l].last, color: RB.colorOf(l),
    tip: `<span class="m">${RB.esc(l)}</span><br>${F.date(D.eda.stats[l].first)} to ${F.date(D.eda.stats[l].last)}<br><b>${F.int(D.cleaning.rows_per_line[l])}</b> rows`
  })), {
    domain: [raw.first_date, raw.last_date],
    label: "Timeline of the date range covered by each rail line",
    bands: [
      { from: M.train_period[0], to: M.test_period[0], label: "Train", color: RB.theme.accent },
      { from: M.test_period[0], to: M.test_period[1], label: "Test", color: RB.theme.board }
    ],
    markers: [{ date: eq[0], tip: `<span class="m">Earthquake closure</span><br><b>${F.date(eq[0])}</b> to ${F.date(eq[2])}` }]
  });
  RB.legend($("coverage-legend"), [
    { name: `Train: ${F.date(M.train_period[0])} to ${F.date(M.train_period[1])}`, color: RB.theme.accent },
    { name: `Test: ${F.date(M.test_period[0])} to ${F.date(M.test_period[1])}`, color: RB.theme.board }
  ]);

  /* ----- threshold histogram with a line picker ----- */
  const eqSet = new Set([eq[0], eq[1], eq[2]]);
  const between = (s, from, to) => {
    const out = [];
    s.values.forEach((v, i) => {
      if (v == null) return;
      const d = RB.addDays(s.start, i);
      if (d >= from && d <= to && !eqSet.has(d)) out.push(v);
    });
    return out;
  };
  const seg = $("line-seg");
  seg.innerHTML = lines.map((l, i) =>
    `<button type="button" style="--c:${RB.colorOf(l)}" data-line="${RB.esc(l)}" aria-pressed="${i === 0}"><i></i>${RB.esc(l)}</button>`).join("");

  const drawHist = (line) => {
    const th = D.labels.thresholds[line], s = D.series[line];
    const tr = between(s, M.train_period[0], M.train_period[1]);
    const te = between(s, M.test_period[0], M.test_period[1]);
    RB.histogram($("hist"), tr, {
      thresholds: [th.lower, th.upper], overlay: te, bins: 30,
      label: `Histogram of daily passengers for ${line}, with Low and High thresholds`
    });
    const sh = D.labels.shares.test[line];
    $("hist-readout").innerHTML =
      `<span><b class="lv-low">Low</b> ≤ <b>${F.int(th.lower)}</b></span>` +
      `<span><b class="lv-high">High</b> &gt; <b>${F.int(th.upper)}</b></span>` +
      `<span>${tr.length} train days · ${te.length} test days</span>` +
      `<span>Test: <b class="lv-low">${F.pct(sh.Low, 0)}</b> Low · <b class="lv-medium">${F.pct(sh.Medium, 0)}</b> Medium · <b class="lv-high">${F.pct(sh.High, 0)}</b> High</span>`;
  };
  // The chart host is redrawn on width changes by RB.responsive, so only call it once per line choice.
  let current = lines[0];
  seg.addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    current = b.dataset.line;
    seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    // A fresh node drops the old resize observer, so each pick starts clean.
    $("hist").replaceWith($("hist").cloneNode(false));
    drawHist(current);
  });
  drawHist(current);

  /* ----- train vs test label shares for every line ----- */
  const rows = (which) => lines.map((l) => ({ label: l, parts: D.labels.shares[which][l] }));
  RB.shareBars($("share-train"), rows("train"), { label: "Share of Low, Medium and High days per line in the training period" });
  RB.shareBars($("share-test"), rows("test"), { label: "Share of Low, Medium and High days per line in the test period" });
  $("train-sub").textContent = `${F.date(M.train_period[0])} to ${F.date(M.train_period[1])} · ${F.int(M.rows.train)} line-days`;
  $("test-sub").textContent = `${F.date(M.test_period[0])} to ${F.date(M.test_period[1])} · ${F.int(M.rows.test)} line-days`;
  RB.legend($("share-legend"), RB.levels.map((n) => ({ name: n, color: RB.levelColors[n] })));
})();
