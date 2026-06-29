(function () {
  const TOAST_ID = "dev-chrome-toast";

  function showToast(message) {
    let el = document.getElementById(TOAST_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = TOAST_ID;
      el.className = "dev-chrome-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove("is-visible"), 4500);
  }

  document.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-chrome-url]");
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();

    const url = btn.getAttribute("data-chrome-url");
    if (!url) return;

    const defaultLabel = btn.getAttribute("data-chrome-label") || btn.textContent.trim();

    try {
      await navigator.clipboard.writeText(url);
      btn.textContent = "コピー済";
      btn.classList.add("dev-chrome-open--copied");
      showToast(
        "URLをコピーしました。Chromeを開いてアドレスバー（Ctrl+L）に貼付（Ctrl+V）してください。",
      );
      setTimeout(() => {
        btn.textContent = defaultLabel;
        btn.classList.remove("dev-chrome-open--copied");
      }, 2500);
    } catch {
      showToast("コピーに失敗しました。下のURLを手動で選択してコピーしてください。");
    }
  });
})();
