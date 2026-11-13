(function () {
  const RB = window.RB, D = RB.data, R = D.results, CV = D.cv, F = RB.fmt, $ = (id) => document.getElementById(id);
  const MC = RB.modelColors, MS = RB.modelShort, models = R.models, best = R.best_model, cls = R.class_names;
  const base2 = "Baseline: Line + weekday", T = R.test_scores;
  const pc = (v) => (v * 100).toFixed(1) + "%", d3f = (v) => v.toFixed(3);
  const segs = (host, items, cur, on) => items.forEach(([key, name, color]) => {
    const b = document.createElement("button"); b.type = "button"; if (color) b.style.setProperty("--c", color);
    b.innerHTML = (color ? "<i></i>" : "") + RB.esc(name); b.setAttribute("aria-pressed", key === cur);
    b.onclick = () => { [...host.children].forEach((x) => x.setAttribute("aria-pressed", x === b)); on(key); }; host.appendChild(b);
  });
  const modelItems = models.map((m) => [m, MS[m], MC[m]]);

  /* headline + honest note */
  const rf = T[best], b2 = T[base2], cvs = CV.summary;
  $("headline").innerHTML = [
    [pc(rf.accuracy), `test accuracy (${MS[best]}), baseline ${pc(b2.accuracy)}`],
    [d3f(rf.f1_macro), `test macro F1, baseline ${d3f(b2.f1_macro)}`],
    [d3f(rf.auc_ovr_macro), `test AUC, baseline ${d3f(b2.auc_ovr_macro)}`],
  ].map(([n, s]) => `<div class="tile"><div class="num">${n}</div><div class="sub">${s}</div></div>`).join("");
  const mr = R.per_class[best].Medium.recall;
  $("honest").innerHTML = `<p><b>Honest reading:</b> in cross-validation the Random Forest clearly beats the line + weekday baseline (F1 ${d3f(cvs[best].f1_macro.mean)} vs ${d3f(cvs[base2].f1_macro.mean)}, AUC ${d3f(cvs[best].auc_ovr_macro.mean)} vs ${d3f(cvs[base2].auc_ovr_macro.mean)}). On the final test months the gain shrinks: accuracy is higher, but macro F1 and AUC are about the same as the baseline. The forest finds <b>Low</b> and <b>High</b> days well but rarely predicts <b>Medium</b> (recall ${pc(mr)}). The test months also have a different mix of levels than training (see Open issues).</p>`;

  /* table */
  const cols = [["accuracy", "Accuracy"], ["precision_macro", "Precision"], ["recall_macro", "Recall"], ["f1_macro", "F1"], ["auc_ovr_macro", "AUC"], ["off_by_two", "Off by two ↓"]];
  const drawTbl = (mode) => {
    const val = (m, k) => (mode === "test" ? T[m][k] : cvs[m][k].mean), sd = (m, k) => (mode === "test" ? null : cvs[m][k].std);
    const bestOf = (k) => (k === "off_by_two" ? d3.min : d3.max)(models, (m) => val(m, k));
    $("tbl").innerHTML = `<thead><tr><th>Model</th>${cols.map((c) => `<th>${c[1]}</th>`).join("")}</tr></thead><tbody>` +
      models.map((m) => `<tr><td><span class="dot" style="background:${MC[m]}"></span> ${RB.esc(MS[m])}</td>` + cols.map(([k]) => {
        const v = val(m, k), s = sd(m, k), isBest = Math.abs(v - bestOf(k)) < 1e-9;
        return `<td class="${isBest ? "best" : ""}">${d3f(v)}${s != null ? `<span class="sd"> ±${s.toFixed(2)}</span>` : ""}</td>`; }).join("") + "</tr>").join("") + "</tbody>";
    $("tbl-note").textContent = mode === "test" ? "Final test: " + F.int(D.meta.rows.test) + " line-days, never used for tuning. Highlighted = best in column. 'Off by two' = a Low day called High or the reverse (lower is better)."
      : "Mean ± standard deviation over " + CV.n_splits + " expanding-window folds. Highlighted = best mean in column.";
  };
  segs($("tbl-pick"), [["test", "Test set"], ["cv", "Cross-validation"]], "test", drawTbl); drawTbl("test");

  /* CV folds */
  const mets = [["f1_macro", "Macro F1"], ["accuracy", "Accuracy"], ["auc_ovr_macro", "AUC"]];
  const folds = [...new Set(CV.folds.map((f) => f.fold))];
  const drawCV = (k) => RB.groupedBars($("cv"), { categories: folds.map((f) => "Fold " + f), yMax: 1, height: 250, format: (v) => v.toFixed(2),
    label: "Score per fold for each model",
    series: models.map((m) => ({ name: MS[m], color: MC[m], values: folds.map((f) => CV.folds.find((x) => x.fold === f && x.model === m)[k]) })) });
  segs($("cv-pick"), mets, "f1_macro", drawCV); drawCV("f1_macro");
  RB.legend($("cv-legend"), models.map((m) => ({ name: MS[m], color: MC[m] })));

  /* confusion + per-class */
  let cm = best;
  const drawCM = () => {
    RB.confusion($("cm"), R.confusion[cm], cls, { label: "Confusion matrix for " + cm });
    const P = R.per_class[cm];
    RB.groupedBars($("pc"), { categories: cls, yMax: 1, height: 230, format: (v) => v.toFixed(2), label: "Per-level precision, recall and F1",
      series: [["precision", "Precision", "#a78bfa"], ["recall", "Recall", "#4da3ff"], ["f1", "F1", "#ffc861"]].map(([k, n, c]) => ({ name: n, color: c, values: cls.map((l) => P[l][k]) })) });
    const worst = cls.reduce((a, l) => (P[l].recall < P[a].recall ? l : a), cls[0]);
    $("cm-finding").innerHTML = `${MS[cm]}: weakest level is <b>${worst}</b> (recall ${pc(P[worst].recall)}, only ${F.int(Math.round(P[worst].recall * P[worst].support))} of ${F.int(P[worst].support)} days found). ${pc(R.test_scores[cm].off_by_two)} of all test days are off by two levels (Low called High or the reverse); most misses land in the neighbouring level.`;
  };
  segs($("cm-pick"), modelItems.slice(1), cm, (m) => { cm = m; drawCM(); }); drawCM();
  RB.legend($("pc-legend"), [{ name: "Precision", color: "#a78bfa" }, { name: "Recall", color: "#4da3ff" }, { name: "F1", color: "#ffc861" }]);

  /* ROC */
  let rc = "High";
  const drawROC = () => {
    const curves = {}; models.forEach((m) => (curves[m] = R.roc.curves[m][rc]));
    RB.roc($("roc"), R.roc.fpr_grid, curves, { best, label: "ROC curves for " + rc + " versus rest" });
    RB.hbar($("auc"), models.map((m) => ({ label: MS[m], value: curves[m].auc, color: MC[m] })), { format: (v) => v.toFixed(3), max: 1, labelW: 110, rowH: 38 });
  };
  segs($("roc-pick"), cls.map((c) => [c, c + " vs rest", RB.levelColors[c]]), rc, (c) => { rc = c; drawROC(); }); drawROC();

  /* accuracy by group */
  const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const groups = {
    line: ["By line", (k) => k.replace(" Line", ""), R.accuracy_by_line],
    weekday: ["By weekday", (k) => WD[+k], R.accuracy_by_weekday],
    holiday: ["Holiday or not", (k) => (k === "1" ? "Public holiday" : "Normal day"), R.accuracy_by_holiday],
  };
  const gm = models.filter((m) => m !== "Baseline: Majority class" && R.accuracy_by_line[m]);
  const drawGrp = (g) => {
    const [, nm, data] = groups[g], keys = Object.keys(data[gm[0]]);
    RB.groupedBars($("grp"), { categories: keys.map(nm), yMax: 1, height: 260, format: (v) => (v * 100).toFixed(0) + "%", label: "Accuracy " + groups[g][0],
      ref: { value: 1 / 3, label: "guess" },
      series: gm.map((m) => ({ name: MS[m], color: MC[m], values: keys.map((k) => data[m][k].accuracy) })) });
  };
  segs($("grp-pick"), Object.entries(groups).map(([k, v]) => [k, v[0]]), "line", drawGrp); drawGrp("line");
  RB.legend($("grp-legend"), gm.map((m) => ({ name: MS[m], color: MC[m] })));

  /* worst mistakes */
  $("worst").innerHTML = `<thead><tr><th>Date</th><th>Line</th><th>Actual</th><th>Predicted</th><th>Confidence</th></tr></thead><tbody>` +
    R.worst_mistakes.slice(0, 8).map((w) => `<tr><td>${F.date(w.date)}</td><td>${RB.esc(w.line)}</td><td><span class="pill ${w.true.toLowerCase()}">${w.true}</span></td><td><span class="pill ${w.predicted.toLowerCase()}">${w.predicted}</span></td><td>${(w.confidence * 100).toFixed(0)}%</td></tr>`).join("") + `</tbody>`;
})();
