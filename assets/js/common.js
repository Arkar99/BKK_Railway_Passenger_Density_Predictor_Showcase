/* ==========================================================================
   Shared page shell: header (metro-style nav), footer, placeholder helpers.
   ========================================================================== */
(function () {
  const RB = (window.RB = window.RB || {});
  const CFG = window.SITE_CONFIG || {};
  RB.config = CFG;
  RB.data = window.SITE_DATA || {};

  const PAGES = [
    { id: "home", href: "index.html", label: "Home" },
    { id: "data", href: "problem.html", label: "Data" },
    { id: "crisp", href: "crisp-dm.html", label: "CRISP-DM" },
    { id: "cleaning", href: "cleaning.html", label: "Cleaning" },
    { id: "explore", href: "explore.html", label: "Explore" },
    { id: "models", href: "modeling.html", label: "Models" },
    { id: "results", href: "results.html", label: "Results" },
    { id: "issues", href: "issues.html", label: "Issues" }
  ];
  RB.pages = PAGES;

  /* ----- helpers for text that may still be a "[Placeholder]" ----- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isPh = (s) => /^\[.*\]$/.test(String(s || "").trim());
  RB.esc = esc;
  RB.isPlaceholder = isPh;
  RB.text = (s) => (isPh(s) ? `<span class="ph">${esc(s)}</span>` : esc(s || ""));
  // A link that only becomes clickable once the placeholder has been replaced with a real URL
  RB.link = (url, label) =>
    isPh(url) ? `<span class="ph">${esc(label || url)}</span>`
              : `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label || url)}</a>`;

  /* ----- header ----- */
  const page = document.body.dataset.page || "home";
  const header = document.getElementById("site-header");
  if (header) {
    header.className = "site-header";
    header.innerHTML = `
      <div class="wrap nav">
        <a class="brand" href="index.html" aria-label="${esc((CFG.team || {}).name || "Team")} home">
          <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="4" width="22" height="20" rx="6" fill="none" stroke="#4da3ff" stroke-width="2.2"/><rect x="9" y="8" width="14" height="7" rx="2" fill="#4da3ff" opacity=".9"/><circle cx="11" cy="19.5" r="1.7" fill="#ffc861"/><circle cx="21" cy="19.5" r="1.7" fill="#ffc861"/><path d="M9 28l3-4M23 28l-3-4" stroke="#4da3ff" stroke-width="2.2" stroke-linecap="round"/></svg>
          <span>${esc((CFG.team || {}).name || "Team RoBot")}<small>${esc((CFG.project || {}).short || "")}</small></span>
        </a>
        <button class="nav-toggle" aria-expanded="false" aria-controls="nav-list">Menu</button>
        <nav aria-label="Main">
          <ul class="nav-list" id="nav-list">
            ${PAGES.map((p) => `<li><a href="${p.href}"${p.id === page ? ' aria-current="page"' : ""}>${p.label}</a></li>`).join("")}
          </ul>
        </nav>
      </div>`;
    const btn = header.querySelector(".nav-toggle");
    const list = header.querySelector(".nav-list");
    btn.addEventListener("click", () => {
      const open = list.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
  }


  /* ----- previous / next page links (inner pages) ----- */
  const idx = PAGES.findIndex((p) => p.id === page);
  const main = document.getElementById("main");
  if (main && idx > 0) {
    const prev = PAGES[idx - 1], next = PAGES[idx + 1];
    const nav = document.createElement("nav");
    nav.className = "wrap pager";
    nav.setAttribute("aria-label", "Page navigation");
    nav.innerHTML =
      `<a href="${prev.href}"><small>Previous</small>← ${prev.label}</a>` +
      (next ? `<a class="next" href="${next.href}"><small>Next</small>${next.label} →</a>` : "");
    main.appendChild(nav);
  }

  /* ----- footer ----- */
  const footer = document.getElementById("site-footer");
  if (footer) {
    const L = CFG.links || {}, C = CFG.course || {}, T = CFG.team || {};
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="wrap foot">
        <div>
          <h4>${esc(T.name || "")}</h4>
          <p>${esc((CFG.project || {}).title || "")}</p>
          <p style="margin-top:8px">${RB.text(C.course)} · ${RB.text(C.university)}</p>
          <p>${esc(C.milestone || "")} · ${RB.text(C.term)}</p>
        </div>
        <div>
          <h4>Pages</h4>
          <ul>${PAGES.map((p) => `<li><a href="${p.href}">${p.label}</a></li>`).join("")}</ul>
        </div>
        <div>
          <h4>Code &amp; data</h4>
          <ul>
            <li>${RB.link(L.repo, "GitHub repository")}</li>
            <li>${RB.link(L.notebook, "Notebook (Colab)")}</li>
            <li>${RB.link(L.dataset, "Dataset source")}</li>
            <li>${RB.link(L.webapp, "Prediction web app")}</li>
          </ul>
        </div>
        <p class="fine">Data: daily passenger counts per rail line, Oct 2022 to Oct 2026. Crowd level means line-wide daily volume, not a single station or time of day. Charts are drawn with D3 (ISC licence).</p>
      </div>`;
  }
})();
