/* Home page: stat board, line cards with sparklines, CRISP-DM route map, team card. */
(function () {
  const RB = window.RB, D = RB.data, CFG = RB.config;
  if (!D || !D.series) {
    document.getElementById("board").innerHTML = '<p class="stub">Data bundle not found. Run tools/make_data_js.py.</p>';
    return;
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----- departure-board tiles ----- */
  const r = D.results, best = r.best_model, bs = r.test_scores[best];
  const base = r.test_scores["Baseline: Line + weekday"];
  const raw = D.cleaning.raw_facts;
  const usable = D.meta.rows.train + D.meta.rows.test;
  const tiles = [
    { label: "Daily records", num: raw.rows, fmt: RB.fmt.int, sub: `${RB.fmt.date(raw.first_date)} to ${RB.fmt.date(raw.last_date)}` },
    { label: "Rail lines", num: raw.lines, fmt: RB.fmt.int, sub: "BTS · MRT · ARL · SRT" },
    { label: "Usable line-days", num: usable, fmt: RB.fmt.int, sub: `after cleaning, from ${RB.fmt.date(D.meta.config.window_start)}` },
    { label: "Test accuracy", num: bs.accuracy * 100, fmt: (v) => v.toFixed(1) + "%",
      sub: `${best} · baseline <b>${(base.accuracy * 100).toFixed(1)}%</b>` }
  ];
  const board = document.getElementById("board");
  board.innerHTML = tiles.map((t, i) => `
    <div class="tile">
      <div class="label">${t.label}</div>
      <div class="num" data-i="${i}">${t.fmt(t.num)}</div>
      <div class="sub">${t.sub}</div>
    </div>`).join("");
  if (!reduce) {
    board.querySelectorAll(".num").forEach((el) => {
      const t = tiles[+el.dataset.i], t0 = performance.now(), dur = 900;
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = t.fmt(t.num * e);
        if (k < 1) requestAnimationFrame(tick); else el.textContent = t.fmt(t.num);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ----- one card per line ----- */
  const cards = document.getElementById("cards");
  const order = D.meta.line_order;
  cards.innerHTML = order.map((line) => {
    const th = D.labels.thresholds[line];
    const s = D.series[line];
    return `
      <article class="card" style="--c:${RB.colorOf(line)}">
        <div class="name"><i></i>${RB.esc(line)}</div>
        <div class="big">${RB.fmt.int(RB.lastAvg(s, 30))}</div>
        <div class="cap">avg passengers per day, last 30 days</div>
        <div class="spark" data-line="${RB.esc(line)}"></div>
        <div class="levels">
          <span><b class="lv-low">Low</b> ≤ ${RB.fmt.compact(th.lower)}</span>
          <span><b class="lv-high">High</b> &gt; ${RB.fmt.compact(th.upper)}</span>
        </div>
      </article>`;
  }).join("");
  cards.querySelectorAll(".spark").forEach((el) => {
    const line = el.dataset.line;
    RB.sparkline(el, RB.weekly(D.series[line]), { color: RB.colorOf(line), label: `${line} weekly average ridership, Oct 2022 to Oct 2026` });
  });

  /* ----- CRISP-DM route map ----- */
  const stops = [
    { t: "Business understanding", d: "Question and goal", href: "problem.html", c: "--l-bts-green" },
    { t: "Data understanding", d: `${raw.lines} lines, 4 years`, href: "explore.html", c: "--l-mrt-blue" },
    { t: "Data preparation", d: "Clean, label, split", href: "cleaning.html", c: "--l-mrt-purple" },
    { t: "Modeling", d: "Baselines, tree, forest", href: "modeling.html", c: "--l-mrt-pink" },
    { t: "Evaluation", d: "CV, test set, AUC", href: "results.html", c: "--l-arl" },
    { t: "Deployment", d: "Web app, next steps", href: "issues.html", c: "--l-mrt-yellow" }
  ];
  document.getElementById("route").innerHTML = stops.map((s, i) => `
    <li><a href="${s.href}" style="--c:var(${s.c})">
      <span class="stop" aria-hidden="true">${i + 1}</span>
      <span class="t">${s.t}</span><span class="d">${s.d}</span>
    </a></li>`).join("");

  /* ----- team card ----- */
  const T = CFG.team, C = CFG.course;
  document.getElementById("team").innerHTML = `
    <div class="panel">
      <h3>Team</h3>
      <div class="team-name">${RB.esc(T.name)}<small>${RB.esc(T.type)}</small></div>
      ${T.members.map((m) => `
        <div class="member"><dl class="kv">
          <dt>Name</dt><dd>${RB.text(m.name)}</dd>
          <dt>Role</dt><dd>${RB.text(m.role)}</dd>
          <dt>Student ID</dt><dd>${RB.text(m.studentId)}</dd>
          <dt>Email</dt><dd>${RB.text(m.email)}</dd>
          <dt>GitHub</dt><dd>${RB.link(m.github, m.github)}</dd>
        </dl></div>`).join("")}
    </div>
    <div class="panel">
      <h3>Course</h3>
      <dl class="kv">
        <dt>University</dt><dd>${RB.text(C.university)}</dd>
        <dt>Program</dt><dd>${RB.text(C.program)}</dd>
        <dt>Course</dt><dd>${RB.text(C.course)}</dd>
        <dt>Instructor</dt><dd>${RB.text(C.instructor)}</dd>
        <dt>Milestone</dt><dd>${RB.text(C.milestone)}</dd>
        <dt>Term</dt><dd>${RB.text(C.term)}</dd>
      </dl>
    </div>`;
})();
