(function () {
  function initReactions() {
    const goodBtn = document.querySelector('[data-react="good"]');
    if (!goodBtn) return;

    const neutralBtn = document.querySelector('[data-react="neutral"]');
    const badBtn = document.querySelector('[data-react="bad"]');
    const goodBar = document.querySelector('[data-good-bar]');
    const neutralBar = document.querySelector('[data-neutral-bar]');
    const badBar = document.querySelector('[data-bad-bar]');
    const goodNum = document.querySelector('[data-good-num]');
    const neutralNum = document.querySelector('[data-neutral-num]');
    const badNum = document.querySelector('[data-bad-num]');
    const floatGood = document.querySelector('[data-float-good]');
    const floatNeutral = document.querySelector('[data-float-neutral]');
    const floatBad = document.querySelector('[data-float-bad]');
    const floatGoodNum = document.querySelector('[data-float-good-num]');
    const floatNeutralNum = document.querySelector('[data-float-neutral-num]');
    const floatBadNum = document.querySelector('[data-float-bad-num]');

    let good = parseInt(goodNum?.textContent || '0', 10);
    let neutral = parseInt(neutralNum?.textContent || '0', 10);
    let bad = parseInt(badNum?.textContent || '0', 10);
    let voted = null;

    function render() {
      const total = good + neutral + bad || 1;
      const goodPct = Math.round((good / total) * 100);
      const neutralPct = Math.round((neutral / total) * 100);
      const badPct = Math.round((bad / total) * 100);
      if (goodBar) goodBar.style.width = goodPct + '%';
      if (neutralBar) neutralBar.style.width = neutralPct + '%';
      if (badBar) badBar.style.width = badPct + '%';
      if (goodNum) goodNum.textContent = String(good);
      if (neutralNum) neutralNum.textContent = String(neutral);
      if (badNum) badNum.textContent = String(bad);
      if (floatGoodNum) floatGoodNum.textContent = String(good);
      if (floatNeutralNum) floatNeutralNum.textContent = String(neutral);
      if (floatBadNum) floatBadNum.textContent = String(bad);
    }

    function vote(type) {
      if (voted === type) return;
      if (voted === 'good') good -= 1;
      if (voted === 'neutral') neutral -= 1;
      if (voted === 'bad') bad -= 1;
      if (type === 'good') good += 1;
      if (type === 'neutral') neutral += 1;
      if (type === 'bad') bad += 1;
      voted = type;
      floatGood?.classList.toggle('is-voted', type === 'good');
      floatNeutral?.classList.toggle('is-voted', type === 'neutral');
      floatBad?.classList.toggle('is-voted', type === 'bad');
      render();
    }

    goodBtn.addEventListener('click', () => vote('good'));
    neutralBtn?.addEventListener('click', () => vote('neutral'));
    badBtn?.addEventListener('click', () => vote('bad'));
    floatGood?.addEventListener('click', () => vote('good'));
    floatNeutral?.addEventListener('click', () => vote('neutral'));
    floatBad?.addEventListener('click', () => vote('bad'));
  }

  function initComments() {
    const form = document.querySelector('[data-comment-form]');
    const list = document.querySelector('[data-comment-list]');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.querySelector('[name="name"]')?.value.trim() || '匿名';
      const body = form.querySelector('[name="body"]')?.value.trim();
      if (!body) return;
      const li = document.createElement('li');
      li.className = 'comment';
      li.innerHTML =
        '<div class="comment__author"></div><p class="comment__body"></p><div class="comment__time">たった今（デモ）</div>';
      li.querySelector('.comment__author').textContent = name;
      li.querySelector('.comment__body').textContent = body;
      list?.prepend(li);
      form.reset();
    });
  }

  function initTerms() {
    document.querySelectorAll('.term').forEach((el) => {
      const tip = el.getAttribute('data-tip');
      if (tip) el.title = tip;
    });
  }

  function getScrollOffset() {
    const header = document.querySelector('.site-header');
    if (header) return Math.ceil(header.getBoundingClientRect().height) + 16;
    const root = getComputedStyle(document.documentElement);
    const v = parseFloat(root.getPropertyValue('--header-offset'));
    return Number.isFinite(v) ? v + 16 : 120;
  }

  function initToc() {
    const toc = document.querySelector('[data-float-toc]');
    const tocToggle = document.querySelector('[data-float-toc-toggle]');
    const tocPanel = document.getElementById('float-toc-panel');
    const tocLinks = document.querySelectorAll('.float-toc__link');
    const desktopMq = window.matchMedia('(min-width: 900px)');

    function isDesktopToc() {
      return desktopMq.matches;
    }

    function syncTocLayout() {
      if (!toc || !tocPanel) return;
      if (isDesktopToc()) {
        toc.classList.remove('is-open');
        tocPanel.hidden = false;
      } else {
        tocPanel.hidden = !toc.classList.contains('is-open');
      }
    }

    if (tocToggle && tocPanel && toc) {
      tocToggle.addEventListener('click', () => {
        if (isDesktopToc()) return;
        const open = !toc.classList.contains('is-open');
        toc.classList.toggle('is-open', open);
        tocPanel.hidden = !open;
        tocToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      tocLinks.forEach((link) => {
        link.addEventListener('click', () => {
          if (isDesktopToc()) return;
          toc.classList.remove('is-open');
          tocPanel.hidden = true;
          tocToggle.setAttribute('aria-expanded', 'false');
        });
      });

      desktopMq.addEventListener('change', syncTocLayout);
      syncTocLayout();
    }

    if (tocLinks.length) {
      const sections = Array.from(tocLinks)
        .map((link) => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);

      const onScroll = () => {
        let current = sections[0];
        const offset = getScrollOffset();
        for (const section of sections) {
          if (section.getBoundingClientRect().top <= offset) current = section;
        }
        tocLinks.forEach((link) => {
          const active = link.getAttribute('href') === `#${current.id}`;
          link.classList.toggle('is-active', active);
        });
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  function initTimeline() {
    const timelineList = document.querySelector('[data-timeline-list]');
    const timelineMore = document.querySelector('[data-timeline-more]');
    const sortButtons = document.querySelectorAll('[data-timeline-sort]');
    if (!timelineList) return;

    function insertYearHeaders(items, order) {
      timelineList.querySelectorAll('[data-timeline-year]').forEach((y) => y.remove());
      let lastYear = null;
      items.forEach((el) => {
        const y = (el.getAttribute('data-timeline-date') || '').slice(0, 4) || '日付不明';
        if (y !== lastYear) {
          const label = document.createElement('p');
          label.className = 'timeline-year';
          label.textContent = y;
          label.setAttribute('data-timeline-year', y);
          timelineList.insertBefore(label, el);
          lastYear = y;
        }
      });
    }

    function applyTimelineSort(order) {
      const items = Array.from(timelineList.querySelectorAll('[data-timeline-item]'));
      items.sort((a, b) => {
        const da = a.getAttribute('data-timeline-date') || '0000-01-01';
        const db = b.getAttribute('data-timeline-date') || '0000-01-01';
        const cmp = da.localeCompare(db);
        return order === 'desc' ? -cmp : cmp;
      });
      items.forEach((el) => timelineList.appendChild(el));
      insertYearHeaders(items, order);
    }

    if (timelineMore) {
      timelineMore.addEventListener('click', () => {
        timelineList.querySelectorAll('[data-timeline-item]').forEach((el) => {
          el.hidden = false;
          el.classList.remove('timeline-item--hidden');
        });
        timelineMore.hidden = true;
      });
    }

    sortButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const order = btn.getAttribute('data-timeline-sort') || 'desc';
        sortButtons.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        applyTimelineSort(order);
      });
    });

    const defaultOrder = timelineList.getAttribute('data-timeline-default-sort') || 'desc';
    applyTimelineSort(defaultOrder);
  }

  initReactions();
  initComments();
  initTerms();
  initToc();
  initTimeline();
})();
