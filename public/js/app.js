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

    function setSegment(bar, pct) {
      if (!bar) return;
      bar.style.width = pct + '%';
      let el = bar.querySelector('.reaction-bar__pct');
      if (pct > 0) {
        if (!el) {
          el = document.createElement('span');
          el.className = 'reaction-bar__pct';
          bar.appendChild(el);
        }
        el.textContent = pct + '%';
        el.hidden = pct < 8;
      } else if (el) {
        el.remove();
      }
    }

    function render() {
      const total = good + neutral + bad || 1;
      const goodPct = Math.round((good / total) * 100);
      const neutralPct = Math.round((neutral / total) * 100);
      const badPct = Math.round((bad / total) * 100);
      setSegment(goodBar, goodPct);
      setSegment(neutralBar, neutralPct);
      setSegment(badBar, badPct);
      const bar = document.querySelector('.reaction-bar');
      if (bar) {
        bar.setAttribute(
          'aria-label',
          `賛成${goodPct}%・中立${neutralPct}%・反対${badPct}%`,
        );
      }
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

  function measureCaseHeaderModes(header) {
    const wasScrolled = header.classList.contains('is-scrolled');
    header.classList.remove('is-scrolled');
    const expanded = header.offsetHeight;
    header.classList.add('is-scrolled');
    const collapsed = header.offsetHeight;
    header.classList.toggle('is-scrolled', wasScrolled);
    return { expanded, collapsed };
  }

  function measureSiteHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return null;

    const caseBar = document.querySelector('[data-header-case]');
    const isCaseHeader = header.hasAttribute('data-site-header') && caseBar;

    if (!isCaseHeader) {
      const h = header.offsetHeight;
      document.documentElement.style.setProperty('--header-offset', `${h}px`);
      return { expanded: h, collapsed: h };
    }

    return measureCaseHeaderModes(header);
  }

  function syncHeaderOffset() {
    const header = document.querySelector('.site-header');
    const spacer = document.querySelector('[data-header-spacer]');
    if (!header) return;

    const h = header.offsetHeight;
    document.documentElement.style.setProperty('--header-offset', `${h}px`);
    document.documentElement.style.setProperty('--header-spacer-h', `${h}px`);
    if (spacer) spacer.style.height = `${h}px`;
  }

  function initCaseHeader() {
    const header = document.querySelector('[data-site-header]');
    const caseBar = document.querySelector('[data-header-case]');
    const spacer = document.querySelector('[data-header-spacer]');
    const heroTitle = document.querySelector('.case-hero__title');
    if (!header || !caseBar || !heroTitle || !spacer) return;

    let metrics = measureCaseHeaderModes(header);
    let isScrolled = header.classList.contains('is-scrolled');

    function syncSpacer() {
      const h = header.offsetHeight;
      spacer.style.height = `${h}px`;
      document.documentElement.style.setProperty('--header-offset', `${h}px`);
      document.documentElement.style.setProperty('--header-spacer-h', `${h}px`);
    }

    function applyScrolled(next) {
      if (isScrolled === next) return;
      isScrolled = next;
      header.classList.toggle('is-scrolled', isScrolled);
      caseBar.setAttribute('aria-hidden', isScrolled ? 'false' : 'true');
      requestAnimationFrame(syncSpacer);
    }

    function update() {
      const rect = heroTitle.getBoundingClientRect();
      const enterAt = metrics.collapsed + 8;
      if (!isScrolled && rect.bottom < enterAt) {
        applyScrolled(true);
      } else if (isScrolled && (window.scrollY <= 32 || rect.bottom > metrics.expanded + 8)) {
        applyScrolled(false);
      }
    }

    syncSpacer();
    const headerResize = new ResizeObserver(syncSpacer);
    headerResize.observe(header);

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', () => {
      metrics = measureCaseHeaderModes(header);
      syncSpacer();
      update();
    }, { passive: true });
    update();
  }

  function getScrollOffset() {
    const gap = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--header-scroll-gap'),
      10,
    );
    const header = document.querySelector('.site-header');
    const headerH = header ? header.offsetHeight : 183;
    return headerH + (Number.isFinite(gap) ? gap : 12);
  }

  function scrollToAnchor(el, behavior = 'smooth') {
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - getScrollOffset();
    window.scrollTo({ top: Math.max(0, top), behavior });
  }

  function initToc() {
    syncHeaderOffset();
    window.addEventListener('resize', syncHeaderOffset, { passive: true });
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
        link.addEventListener('click', (e) => {
          const href = link.getAttribute('href');
          if (!href?.startsWith('#')) return;
          const target = document.querySelector(href);
          if (!target) return;
          e.preventDefault();
          scrollToAnchor(target);
          history.pushState(null, '', href);
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

      if (location.hash) {
        const hashTarget = document.querySelector(location.hash);
        if (hashTarget) {
          requestAnimationFrame(() => {
            scrollToAnchor(hashTarget, 'instant');
            onScroll();
          });
        }
      }
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

  function initTimelineX() {
    document.querySelectorAll('.x-post-text--collapsible').forEach((root) => {
      const more = root.querySelector('.x-post-text__toggle--more');
      const less = root.querySelector('.x-post-text__toggle--less');
      more?.addEventListener('click', () => {
        root.classList.add('is-expanded');
        more.setAttribute('aria-expanded', 'true');
        less?.focus();
      });
      less?.addEventListener('click', () => {
        root.classList.remove('is-expanded');
        more?.setAttribute('aria-expanded', 'false');
        more?.focus();
      });
    });

    const lightbox = document.getElementById('x-lightbox');
    const lightboxImg = lightbox?.querySelector('.x-lightbox__img');
    const closeBtn = lightbox?.querySelector('.x-lightbox__close');

    function openLightbox(src, alt) {
      if (!lightbox || !lightboxImg) return;
      lightboxImg.src = src;
      lightboxImg.alt = alt;
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      closeBtn?.focus();
    }

    function closeLightbox() {
      if (!lightbox || !lightboxImg) return;
      lightbox.hidden = true;
      lightboxImg.removeAttribute('src');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('[data-x-lightbox]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const full = btn.getAttribute('data-x-lightbox-full');
        const img = btn.querySelector('img');
        if (!full && !img) return;
        openLightbox(full || img.currentSrc || img.src, img?.alt || 'X投稿スクリーンショット');
      });
    });

    closeBtn?.addEventListener('click', closeLightbox);
    lightbox?.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox && !lightbox.hidden) closeLightbox();
    });
  }

  function initTermCaseCards() {
    let openBtn = null;
    let popover = null;
    let backdrop = null;

    function closePopover() {
      if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
      openBtn = null;
      popover?.remove();
      popover = null;
      backdrop?.remove();
      backdrop = null;
    }

    function positionPopover(btn, el) {
      if (window.matchMedia('(max-width: 640px)').matches) return;
      const rect = btn.getBoundingClientRect();
      const margin = 10;
      let left = rect.left;
      let top = rect.bottom + margin;
      const maxLeft = window.innerWidth - el.offsetWidth - margin;
      if (left > maxLeft) left = Math.max(margin, maxLeft);
      if (top + el.offsetHeight > window.innerHeight - margin) {
        top = rect.top - el.offsetHeight - margin;
      }
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    }

    function openPopover(btn) {
      closePopover();
      const title = btn.getAttribute('data-case-title') || '関連案件';
      const kicker = btn.getAttribute('data-case-kicker') || '';
      const stat = btn.getAttribute('data-case-stat') || '';
      const statLabel = btn.getAttribute('data-case-stat-label') || '';
      const href = btn.getAttribute('data-case-href') || '#';

      backdrop = document.createElement('div');
      backdrop.className = 'term-card__backdrop';
      backdrop.addEventListener('click', closePopover);

      popover = document.createElement('div');
      popover.className = 'term-card';
      popover.setAttribute('role', 'dialog');
      popover.setAttribute('aria-labelledby', 'term-card-title');
      popover.innerHTML = `
        <div class="term-card__head">
          <button type="button" class="term-card__close" aria-label="閉じる">×</button>
          <p class="term-card__title" id="term-card-title"></p>
          <p class="term-card__diff" hidden></p>
        </div>
        <div class="term-card__body">
          <p class="term-card__stat" hidden>
            <span class="term-card__stat-value"></span>
            <span class="term-card__stat-label"></span>
          </p>
          <a class="term-card__cta" href="#">案件を見る</a>
        </div>
      `;

      popover.querySelector('.term-card__title').textContent = title;
      const diff = popover.querySelector('.term-card__diff');
      if (kicker) {
        diff.textContent = kicker;
        diff.hidden = false;
      }
      const statEl = popover.querySelector('.term-card__stat');
      if (stat) {
        popover.querySelector('.term-card__stat-value').textContent = stat;
        popover.querySelector('.term-card__stat-label').textContent = statLabel;
        statEl.hidden = false;
      }

      const cta = popover.querySelector('.term-card__cta');
      cta.href = href;
      cta.addEventListener('click', () => closePopover());
      popover.querySelector('.term-card__close').addEventListener('click', closePopover);

      document.body.appendChild(backdrop);
      document.body.appendChild(popover);
      positionPopover(btn, popover);

      openBtn = btn;
      btn.setAttribute('aria-expanded', 'true');
      cta.focus();
    }

    document.querySelectorAll('[data-term-popover]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (btn.getAttribute('aria-expanded') === 'true') {
          closePopover();
        } else {
          openPopover(btn);
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && popover) closePopover();
    });

    window.addEventListener('resize', () => {
      if (openBtn && popover) positionPopover(openBtn, popover);
    });
  }

  initReactions();
  initComments();
  initTerms();
  initCaseHeader();
  initTermCaseCards();
  initToc();
  initTimeline();
  initTimelineX();
})();
