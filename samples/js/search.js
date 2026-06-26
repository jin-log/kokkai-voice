/** Demo search data + sort + category filter for samples/search.html */
const CASES = [
  {
    slug: 'bouka-taisaku',
    href: 'case/bouka-taisaku.html',
    title: '物価高対策 — あの話どうなった？',
    summary: 'エネルギー支援延長はほぼ決定。給付金案は与野党で未決。',
    tags: ['経済', '国会'],
    categories: ['経済', '国会'],
    updated: '2026-06-26',
    started: '2026-03-01',
    heat: 1368,
    trend: 420,
    smile: 847,
    angry: 521,
  },
  {
    slug: 'tokyo-governor',
    href: '#',
    title: '東京都知事 — あの話どうなった？',
    summary: '都政・会派動向・記者会見をタイムライン追跡（準備中）。',
    tags: ['都政', '政治'],
    categories: ['都政'],
    updated: '2026-06-25',
    started: '2026-05-10',
    heat: 2100,
    trend: 890,
    smile: 412,
    angry: 1688,
  },
  {
    slug: 'tokyo-recall',
    href: '#',
    title: '都知事リコール — 署名と論点',
    summary: '署名状況・論点整理・各派 X（準備中）。',
    tags: ['リコール', '都政'],
    categories: ['リコール', '都政'],
    updated: '2026-06-24',
    started: '2026-06-01',
    heat: 1890,
    trend: 950,
    smile: 290,
    angry: 1600,
  },
  {
    slug: 'immigration',
    href: '#',
    title: '外国人政策 — 国会と世論',
    summary: '本会議発言と SNS の温度差を平易語で（準備中）。',
    tags: ['国会', '政策'],
    categories: ['国会'],
    updated: '2026-06-20',
    started: '2026-01-15',
    heat: 980,
    trend: 210,
    smile: 520,
    angry: 460,
  },
  {
    slug: 'diploma-scandal',
    href: '#',
    title: '学歴問題 — 誰が何を言った？',
    summary: '会見・X・削除投稿のスクショ記録（準備中）。',
    tags: ['政治', 'スキャンダル'],
    categories: ['国会'],
    updated: '2026-06-18',
    started: '2026-06-10',
    heat: 1560,
    trend: 780,
    smile: 180,
    angry: 1380,
  },
  {
    slug: 'pension-reform',
    href: '#',
    title: '年金制度改革 — あの話どうなった？',
    summary: '財源・支給開始年齢の論点を平易語で（準備中）。',
    tags: ['社会保障'],
    categories: ['社会保障'],
    updated: '2026-06-15',
    started: '2026-04-01',
    heat: 720,
    trend: 180,
    smile: 310,
    angry: 410,
  },
  {
    slug: 'us-summit',
    href: '#',
    title: '日米首脳会談 — 合意と論点',
    summary: '防衛・貿易・為替の合意内容をタイムライン追跡（準備中）。',
    tags: ['外交'],
    categories: ['外交'],
    updated: '2026-06-12',
    started: '2026-06-08',
    heat: 640,
    trend: 320,
    smile: 380,
    angry: 260,
  },
];

const SORT_LABELS = { heat: '関心順', trend: '話題順', new: '新着', chrono: '時系列' };

const SORT_DESC = {
  heat: '関心順 — 😊＋😠 の合計、承認コメント×2、直近7日のアクセス数（heat_score）で並べます。いま最も「国民の関心」が高い案件。',
  trend: '話題順 — 直近48時間・7日間の😊😠投票・タイムライン追記・X引用の伸びが大きい順。いま「盛り上がっている」案件。',
  new: '新着 — 案件ページの最終更新日が新しい順。最近動きがあった話題。',
  chrono: '時系列 — 案件の開始日が古い順。最初から順番に追いたいとき向け。',
};

function matchQuery(c, q) {
  if (!q) return true;
  const hay = [c.title, c.summary, ...c.tags, ...c.categories].join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

function matchCategory(c, cat) {
  if (!cat) return true;
  return c.categories.includes(cat) || c.tags.includes(cat);
}

function sortCases(list, sort) {
  const copy = [...list];
  switch (sort) {
    case 'trend':
      return copy.sort((a, b) => b.trend - a.trend);
    case 'new':
      return copy.sort((a, b) => b.updated.localeCompare(a.updated));
    case 'chrono':
      return copy.sort((a, b) => a.started.localeCompare(b.started));
    case 'heat':
    default:
      return copy.sort((a, b) => b.heat - a.heat);
  }
}

function renderResults() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q')?.trim() || '';
  const sort = params.get('sort') || 'heat';
  const category = params.get('cat') || '';
  const input = document.querySelector('[data-search-input]');
  const listEl = document.querySelector('[data-search-results]');
  const metaEl = document.querySelector('[data-search-meta]');
  const sortDescEl = document.querySelector('[data-sort-desc]');
  if (input) input.value = q;

  document.querySelectorAll('[data-sort]').forEach((btn) => {
    btn.classList.toggle('sort-tab--active', btn.dataset.sort === sort);
    btn.setAttribute('aria-selected', btn.dataset.sort === sort ? 'true' : 'false');
  });

  document.querySelectorAll('[data-category]').forEach((btn) => {
    btn.classList.toggle('category-chip--active', btn.dataset.category === category);
  });

  if (sortDescEl) {
    sortDescEl.textContent = SORT_DESC[sort] || SORT_DESC.heat;
  }

  const filtered = sortCases(
    CASES.filter((c) => matchQuery(c, q) && matchCategory(c, category)),
    sort,
  );

  if (metaEl) {
    const parts = [];
    if (q) parts.push(`「${q}」`);
    if (category) parts.push(category);
    const scope = parts.length ? parts.join(' · ') : '全案件';
    metaEl.textContent = `${scope} — ${filtered.length} 件 · ${SORT_LABELS[sort] || '関心順'}`;
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
      const ready = c.href !== '#';
      return `
        <${ready ? 'a' : 'article'} class="search-result ${ready ? 'search-result--link' : 'search-result--soon'}" ${ready ? `href="${c.href}"` : ''}>
          <div class="search-result__tags">${c.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
          <h2 class="search-result__title">${c.title}</h2>
          <p class="search-result__summary">${c.summary}</p>
          <div class="search-result__meta">
            <span>😊 ${pct}% · 関心 ${c.heat.toLocaleString()}</span>
            <span>更新 ${c.updated}</span>
          </div>
          ${ready ? '' : '<span class="search-result__badge">準備中</span>'}
        </${ready ? 'a' : 'article'}>
      `;
    })
    .join('');
}

function navigateWithParams(updates) {
  const params = new URLSearchParams(window.location.search);
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  window.location.search = params.toString();
}

document.querySelector('[data-search-form]')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = document.querySelector('[data-search-input]')?.value.trim() || '';
  const params = new URLSearchParams(window.location.search);
  navigateWithParams({
    q: q || null,
    sort: params.get('sort') || 'heat',
    cat: params.get('cat') || null,
  });
});

document.querySelectorAll('[data-sort]').forEach((btn) => {
  btn.addEventListener('click', () => {
    navigateWithParams({ sort: btn.dataset.sort });
  });
});

document.querySelectorAll('[data-category]').forEach((btn) => {
  btn.addEventListener('click', () => {
    navigateWithParams({ cat: btn.dataset.category || null });
  });
});

renderResults();
