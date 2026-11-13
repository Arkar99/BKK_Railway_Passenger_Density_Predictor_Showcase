(function () {
  const RB = window.RB, D = RB.data, M = D.meta, F = RB.fmt, $ = (id) => document.getElementById(id);
  const cfg = M.config || {}, MC = RB.modelColors;

  /* model cards */
  const cards = [
    ["Baseline: Majority class", "Step 1", "Always predicts the most common level.", "The floor. Any model should beat it easily."],
    ["Baseline: Line + weekday", "Step 2", "Predicts the most common level seen for that line on that weekday.", "A smart guess without machine learning. The real bar to beat."],
    ["Decision Tree", "Step 3", "Learns yes / no rules from the calendar. Depth limited to 5.", "Readable, and shows which inputs matter."],
    ["Random Forest", "Step 4", "100 trees vote, depth limited to 8.", "Steadier than one tree, usually more accurate."],
  ];
  $("mcards").innerHTML = cards.map(([n, s, what, why]) =>
    `<div class="panel" style="--c:${MC[n]}"><span class="step">${s}</span><b>${RB.modelShort[n]}</b><p>${what}</p><p class="why-line">${why}</p></div>`).join("");

  /* tree */
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const nice = (f, t) => {
    if (f === "DayOfWeek") return t === 4.5 ? "Mon to Fri?" : "Day ≤ " + DAYS[Math.floor(t)] + "?";
    if (f === "Month") return "Month ≤ " + MON[Math.floor(t) - 1] + "?";
    if (f === "is_holiday") return "Not a holiday?";
    return "Not " + f.replace("Line_", "").replace(" Line", "") + "?";
  };
  const T = D.tree;
  const drawTree = () => RB.tree($("tree"), T.root, { classNames: T.class_names, nice, label: "Small decision tree" });
  drawTree(); let tw = $("tree").clientWidth; window.addEventListener("resize", () => { if ($("tree").clientWidth !== tw) { tw = $("tree").clientWidth; drawTree(); } });
  RB.legend($("tree-legend"), T.class_names.map((n) => ({ name: n, color: RB.levelColors[n] })));

  /* importance */
  const imp = D.importance, pick = $("imp-pick"); let cur = "Random Forest";
  const GC = { Line: "#a78bfa", DayOfWeek: "#4da3ff", Month: "#3ecf8e", is_holiday: "#ffc861" };
  const NM = { Line: "Line", DayOfWeek: "Day of week", Month: "Month", is_holiday: "Holiday" };
  const drawImp = () => {
    const g = imp[cur].grouped;
    const items = Object.entries(g).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: NM[k], value: v, color: GC[k] }));
    RB.hbar($("imp"), items, { format: (v) => (v * 100).toFixed(0) + "%", labelW: 110, max: 0.6, label: cur + " feature importance" });
    $("imp-finding").innerHTML = `${cur}: <b>${items[0].label}</b> matters most (${(items[0].value * 100).toFixed(0)}%), then <b>${items[1].label.toLowerCase()}</b> (${(items[1].value * 100).toFixed(0)}%).`;
  };
  Object.keys(imp).forEach((m) => {
    const b = document.createElement("button"); b.type = "button"; b.style.setProperty("--c", MC[m]); b.innerHTML = `<i></i>${m}`; b.setAttribute("aria-pressed", m === cur);
    b.onclick = () => { cur = m; [...pick.children].forEach((x) => x.setAttribute("aria-pressed", x === b)); drawImp(); }; pick.appendChild(b);
  });
  drawImp();

  /* folds */
  const cv = D.cv, rf = cv.folds.filter((f) => f.model === "Random Forest");
  const rows = rf.map((f) => ({ label: "Fold " + f.fold, train: [f.train_start, f.train_end], val: [f.val_start, f.val_end] }));
  rows.push({ label: "Final test", final: true, train: M.train_period, val: M.test_period });
  RB.foldStrip($("folds"), rows, { domain: ["2025-01-01", M.test_period[1]], label: "Training and validation windows for each fold" });
  RB.legend($("fold-legend"), [{ name: "Train", color: RB.levelColors.Low }, { name: "Validate (CV)", color: "#4da3ff" }, { name: "Final test", color: "#ffc861" }]);
  $("fold-note").textContent = cv.scheme + ". Each fold trains on the past and is scored on the next block of dates; the final test is never touched during tuning.";
  const checks = [
    ["Time split", "Test = " + F.date(M.test_period[0]) + " to " + F.date(M.test_period[1]) + ", after all training days."],
    ["Thresholds from train", "Low / High cut-offs are computed from training rows only, again inside every fold."],
    ["No passengers input", "Only line, weekday, month and holiday are features."],
  ];
  $("checks").innerHTML = checks.map(([t, p]) => `<div class="tile"><div class="sub"><b style="font-family:var(--font)">${t}</b></div><div class="sub" style="margin-top:8px">${p}</div></div>`).join("");
})();
