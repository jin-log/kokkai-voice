/** Search page — uses build-time article index from window.__SEARCH_CASES__ */
const CASES = window.__SEARCH_CASES__ || [];

const SORT_LABELS = { heat: "関心順", trend: "話題順", new: "新着", chrono: "時系列" };

const SORT_DESC = {
  heat: "関心順 — 😊＋😠 の合計、承認コメント×2、直近7日のアクセス数（heat_score）で並べます。いま最も「国民の関心」が高い案件。",
  trend: "話題順 — 直近48時間・7日間の😊😠投票・タイムライン追記・X引用の伸びが大きい順。いま「盛り上がっている」案件。",
  new: "新着 — 案件ページの最終更新日が新しい順。最近動きがあった話題。",
  chrono: "時系列 — 案件の開始日が古い順。最初から順番に追いたいとき向け。",
};

function matchQuery(c, q) {
  if (!q) return true;
  const hay = [c.title, c.summary, ...c.tags, ...c.categories].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

function matchCategory(c, cat) {
  if (!cat) return true;
  return c.categories.includes(cat) || c.tags.includes(cat);
}

function sortCases(list, sort) {
  const copy = [...list];
  switch (sort) {
    case "trend":
      return copy.sort((a, b) => b.trend - a.trend);
    case "new":
      return copy.sort((a, b) => b.updated.localeCompare(a.updated));
    case "chrono":
      return copy.sort((a, b) => a.started.localeCompare(b.started));
    case "heat":
    default:
      return copy.sort((a, b) => b.heat - a.heat);
  }
}

function renderResults() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q")?.trim() || "";
  const sort = params.get("sort") || "heat";
  const category = params.get("cat") || "";
  const input = document.querySelector("[data-search-input]") || document.querySelector("#header-q");
  const listEl = document.querySelector("[data-search-results]");
  const metaEl = document.querySelector("[data-search-meta]");
  const sortDescEl = document.querySelector("[data-sort-desc]");
  if (input) input.value = q;

  document.querySelectorAll("[data-sort]").forEach((btn) => {
    btn.classList.toggle("sort-tab--active", btn.dataset.sort === sort);
    btn.setAttribute("aria-selected", btn.dataset.sort === sort ? "true" : "false");
  });

  document.querySelectorAll("[data-category]").forEach((btn) => {
    btn.classList.toggle("category-chip--active", btn.dataset.category === category);
  });

  if (sortDescEl) {
    sortDescEl.textContent = SORT_DESC[sort] || SORT_DESC.heat;
  }

  const filtered = sortCases(
    CASES.filter((c) => matchQuery(c, q) && matchCategory(c, category)),
    sort
  );

  if (metaEl) {
    const parts = [];
    if (q) parts.push(`「${q}」`);
    if (category) parts.push(category);
    const scope = parts.length ? parts.join(" · ") : "全案件";
    metaEl.textContent = `${scope} — ${filtered.length} 件 · ${SORT_LABELS[sort] || "関心順"}`;
  }

  if (!listEl) return;
  if (filtered.length === 0) {
    listEl.innerHTML =
      '<p class="search-empty">該当なし。キーワードやカテゴリを変えてみてください。</p>';
    return;
  }

  listEl.innerHTML = filtered
    .map((c) => {
      const pct = Math.round((c.smile / (c.smile + c.angry || 1)) * 100);
      const ready = c.href && c.href !== "#";
      return `
        <${ready ? "a" : "article"} class="search-result ${ready ? "search-result--link" : "search-result--soon"}" ${ready ? `href="${c.href}"` : ""}>
          <div class="search-result__tags">${c.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
          <h2 class="search-result__title">${c.title}</h2>
          <p class="search-result__summary">${c.summary}</p>
          <div class="search-result__meta">
            <span>😊 ${pct}% · 関心 ${c.heat.toLocaleString()}</span>
            <span>更新 ${c.updated}</span>
          </div>
          ${ready ? "" : '<span class="search-result__badge">準備中</span>'}
        </${ready ? "a" : "article"}>
      `;
    })
    .join("");
}

function navigateWithParams(updates) {
  const params = new URLSearchParams(window.location.search);
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  window.location.search = params.toString();
}

document.querySelector("[data-search-form]")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const q =
    document.querySelector("[data-search-input]")?.value.trim() ||
    document.querySelector("#header-q")?.value.trim() ||
    "";
  const params = new URLSearchParams(window.location.search);
  navigateWithParams({
    q: q || null,
    sort: params.get("sort") || "heat",
    cat: params.get("cat") || null,
  });
});

document.querySelectorAll("[data-sort]").forEach((btn) => {
  btn.addEventListener("click", () => {
    navigateWithParams({ sort: btn.dataset.sort });
  });
});

document.querySelectorAll("[data-category]").forEach((btn) => {
  btn.addEventListener("click", () => {
    navigateWithParams({ cat: btn.dataset.category || null });
  });
});

renderResults();
