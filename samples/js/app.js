(function () {
  const goodBtn = document.querySelector('[data-react="good"]');
  const badBtn = document.querySelector('[data-react="bad"]');
  const goodBar = document.querySelector('[data-good-bar]');
  const goodNum = document.querySelector('[data-good-num]');
  const badNum = document.querySelector('[data-bad-num]');
  const floatGood = document.querySelector('[data-float-good]');
  const floatBad = document.querySelector('[data-float-bad]');
  const floatGoodNum = document.querySelector('[data-float-good-num]');
  const floatBadNum = document.querySelector('[data-float-bad-num]');

  if (!goodBtn) return;

  let good = parseInt(goodNum?.textContent || '0', 10);
  let bad = parseInt(badNum?.textContent || '0', 10);
  let voted = null;

  function render() {
    const total = good + bad || 1;
    const pct = Math.round((good / total) * 100);
    if (goodBar) goodBar.style.width = pct + '%';
    if (goodNum) goodNum.textContent = String(good);
    if (badNum) badNum.textContent = String(bad);
    if (floatGoodNum) floatGoodNum.textContent = String(good);
    if (floatBadNum) floatBadNum.textContent = String(bad);
  }

  function vote(type) {
    if (voted === type) return;
    if (voted === 'good') good -= 1;
    if (voted === 'bad') bad -= 1;
    if (type === 'good') good += 1;
    if (type === 'bad') bad += 1;
    voted = type;
    floatGood?.classList.toggle('is-voted', type === 'good');
    floatBad?.classList.toggle('is-voted', type === 'bad');
    render();
  }

  goodBtn.addEventListener('click', () => vote('good'));
  badBtn.addEventListener('click', () => vote('bad'));
  floatGood?.addEventListener('click', () => vote('good'));
  floatBad?.addEventListener('click', () => vote('bad'));

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

  document.querySelectorAll('.term').forEach((el) => {
    const tip = el.getAttribute('data-tip');
    if (tip) el.title = tip;
  });
})();
