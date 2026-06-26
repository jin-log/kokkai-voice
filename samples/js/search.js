/** Demo search data + sort for samples/search.html */
const CASES = [
  {
    slug: 'bouka-taisaku',
    href: 'case/bouka-taisaku.html',
    title: '物価高対策 — 今どうなってる？',
    summary: 'エネルギー支援延長はほぼ決定。給付金案は与野党で未決。',
    tags: ['経済', '国会'],
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
    title: '東京都知事 — 今どうなってる？',
    summary: '都政・会派動向・記者会見をタイムライン追跡（準備中）。',
    tags: ['都政', '政治'],
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
    updated: '2026-06-18',
    started: '2026-06-10',
    heat: 1560,
    trend: 780,
    smile: 180,
    angry: 1380,
  },
];

function matchQuery(c, q) {
  if (!q) return true;
  const hay = [c.title, c.summary, ...c.tags].join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
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
  const input = document.querySelector('[data-search-input]');
  const listEl = document.querySelector('[data-search-results]');
  const metaEl = document.querySelector('[data-search-meta]');
  if (input) input.value = q;

  document.querySelectorAll('[data-sort]').forEach((btn) => {
    btn.classList.toggle('sort-tab--active', btn.dataset.sort === sort);
    btn.setAttribute('aria-selected', btn.dataset.sort === sort ? 'true' : 'false');
  });

  const filtered = sortCases(CASES.filter((c) => matchQuery(c, q)), sort);
  const sortLabels = { heat: '関心順', trend: '話題順', new: '新着', chrono: '時系列' };

  if (metaEl) {
    metaEl.textContent = q
      ? `「${q}」の結果 ${filtered.length} 件 · ${sortLabels[sort] || '関心順'}`
      : `全 ${filtered.length} 件 · ${sortLabels[sort] || '関心順'}`;
  }

  if (!listEl) return;
  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="search-empty">該当なし。キーワードを変えてみてください。</p>';
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

document.querySelector('[data-search-form]')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = document.querySelector('[data-search-input]')?.value.trim() || '';
  const sort = new URLSearchParams(window.location.search).get('sort') || 'heat';
  window.location.href = `search.html?q=${encodeURIComponent(q)}&sort=${sort}`;
});

document.querySelectorAll('[data-sort]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const params = new URLSearchParams(window.location.search);
    params.set('sort', btn.dataset.sort);
    window.location.search = params.toString();
  });
});

renderResults();
