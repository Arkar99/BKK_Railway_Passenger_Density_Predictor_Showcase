(function () {
  const RB = window.RB, D = RB.data, C = D.cleaning, M = D.meta, F = RB.fmt, $ = (id) => document.getElementById(id);
  const A = M.annotations, R = C.raw_facts, W = C.waterfall;
  const HIGH = RB.levelColors.High, AMB = "#ffc861", GREY = "#8fa1b3";

  /* fact tiles */
  const kept = W[W.length - 1].remaining;
  const tiles = [
    [F.int(R.rows), "raw rows"], [F.int(kept), "rows kept after cleaning"], [R.dash_values_made_missing, "“-” values made missing"],
    [R.closures_with_thai_note, "closures (Thai note, translated)"], [R.earthquake_rows_all_lines, "earthquake rows removed"], [R.launch_period_rows_before_window, "launch-period rows (flagged)"],
  ];
  $("facts").innerHTML = tiles.map(([v, l]) => `<div class="tile"><div class="num">${v}</div><div class="sub">${l}</div></div>`).join("");

  /* waterfall */
  const labels = ["Raw rows", "Before 2025 (level shifts)", "Earthquake days", "Other missing counts", "Closure days", "Launch period"];
  const notes = [
    "All rows in daily_passenger.csv", "Counts moved to different levels in earlier years, so only 2025 onward is used",
    "28–30 Mar 2025, all 9 lines", "The remaining “-” values fall in the earthquake days or before 2025",
    "Thai closure notes were inside the earthquake days", "Launch rows fall before 2025, already removed",
  ];
  RB.waterfall($("waterfall"), W.map((d, i) => ({
    label: labels[i], remaining: d.remaining, removed: i ? d.removed : 0, dim: i > 1 && !d.removed, note: notes[i],
    color: i === 0 ? GREY : RB.levelColors.Low,
  })), { label: "Rows remaining after each cleaning step", max: R.rows });

  /* flag map */
  const lines = M.line_order;
  const eq = A.earthquake, eqTip = `<b>Earthquake, 28–30 Mar 2025</b><br><span class="m">27 rows removed (3 days × 9 lines)</span>`;
  const dash = {
    "MRT Yellow Line": [["2024-01-03", "“-” with no note: left missing"], ["2025-03-29", "“-” with Thai closure note: translated, flagged"]],
    "MRT Pink Line": [["2025-03-29", "“-” with Thai closure note: translated, flagged"], ["2025-03-30", "“-” with Thai closure note: translated, flagged"]],
  };
  const rows = lines.map((l) => ({
    label: l,
    segs: A.launch_end[l] ? [{ from: l === "MRT Yellow Line" ? "2023-06-03" : "2023-11-21", to: A.launch_end[l], color: AMB,
      tip: `<b>${l}</b><br>Launch / free-trial period<br><span class="m">to ${F.date(A.launch_end[l])} (inferred)</span>` }] : [],
    pts: (dash[l] || []).map(([date, t]) => ({ date, color: HIGH, tip: `<b>${l}</b> · ${F.date(date)}<br><span class="m">${t}</span>` })),
  }));
  const span = { "MRT Yellow Line": ["2023-06-03", "2026-10-31"], "MRT Pink Line": ["2023-11-21", "2026-10-31"] };
  RB.flagMap($("flagmap"), rows, {
    domain: ["2022-10-01", "2026-10-31"], span, labelW: 124, label: "Timeline of missing values, closures and launch periods per line",
    bands: [{ from: eq[0], to: eq[2], color: "#4da3ff", tip: eqTip }],
    markers: [{ date: "2025-01-01", label: "Window starts" }],
  });
  RB.legend($("flag-legend"), [
    { name: "Missing “-” value", color: HIGH }, { name: "Launch period (inferred)", color: AMB }, { name: "Earthquake days", color: "#4da3ff" },
  ]);

  /* decision table */
  const items = [
    ["Counts stored as text with commas (“1,234,567”)", "Converted to whole numbers", "Models and charts need numbers, not strings"],
    ["“-” in the passenger column (4 cells)", "Set to missing and flagged, not 0 and not averaged", "Zero would say “nobody rode”; an average would hide a closure"],
    ["Thai note on 3 closure days", "Translated to English with a small dictionary", "Keeps the reason readable and lets us group closures"],
    ["Mixed date formats", "Parsed to one ISO date (YYYY-MM-DD)", "Dates are the join key for weekday, month and holidays"],
    ["Earthquake, 28–30 Mar 2025 (27 rows)", "Removed from modelling", "Unusual one-off event, not a pattern the model can learn from calendar inputs"],
    ["Launch / free-trial spikes (63 rows, Yellow and Pink)", "Flagged; they fall before the 2025 window", "Free rides inflate counts; end dates are inferred and unverified"],
    ["Level shifts in 2022 to 2024", "Use only 2025 onward (" + F.int(kept) + " rows)", "Old counts sit at different levels and would distort Low / High labels"],
    ["Lines that opened late (Yellow, Pink)", "Not filled backwards", "No ridership existed, so there is nothing to impute"],
  ];
  $("decisions").innerHTML = items.map((r) => `<tr>${r.map((c) => `<td>${RB.esc(c)}</td>`).join("")}</tr>`).join("");
})();
