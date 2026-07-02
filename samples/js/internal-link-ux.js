(function () {
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
    const kicker =
      btn.getAttribute('data-case-kicker') ||
      btn.getAttribute('data-case-desc')?.split('。')[0] ||
      '';
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
    if (e.key === 'Escape') closePopover();
  });

  window.addEventListener('resize', () => {
    if (openBtn && popover) positionPopover(openBtn, popover);
  });
})();
