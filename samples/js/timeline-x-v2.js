/** X タイムライン v2 — 全文トグル + lightbox */
(function () {
  const EXCERPT_LEN = 72;

  document.querySelectorAll("[data-x-post-text]").forEach((root) => {
    const full = root.dataset.xPostText || "";
    if (full.length <= EXCERPT_LEN) {
      root.innerHTML = `<p class="x-post-text__excerpt">${escapeHtml(full)}</p>`;
      return;
    }
    const excerpt = full.slice(0, EXCERPT_LEN).trim() + "…";
    root.innerHTML = `
      <p class="x-post-text__excerpt">${escapeHtml(excerpt)}</p>
      <p class="x-post-text__full">${escapeHtml(full)}</p>
      <button type="button" class="x-post-text__toggle x-post-text__toggle--more" aria-expanded="false">全文を見る ↓</button>
      <button type="button" class="x-post-text__toggle x-post-text__toggle--less" aria-expanded="true">閉じる ↑</button>
    `;
    const more = root.querySelector(".x-post-text__toggle--more");
    const less = root.querySelector(".x-post-text__toggle--less");
    more?.addEventListener("click", () => {
      root.classList.add("is-expanded");
      more.setAttribute("aria-expanded", "true");
      less?.focus();
    });
    less?.addEventListener("click", () => {
      root.classList.remove("is-expanded");
      more?.setAttribute("aria-expanded", "false");
      more?.focus();
    });
  });

  const lightbox = document.getElementById("x-lightbox");
  const lightboxImg = lightbox?.querySelector(".x-lightbox__img");
  const closeBtn = lightbox?.querySelector(".x-lightbox__close");

  function openLightbox(src, alt) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    closeBtn?.focus();
  }

  function closeLightbox() {
    if (!lightbox || !lightboxImg) return;
    lightbox.hidden = true;
    lightboxImg.src = "";
    document.body.style.overflow = "";
  }

  document.querySelectorAll("[data-x-lightbox]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const full = btn.dataset.xLightboxFull;
      const img = btn.querySelector("img");
      if (!img && !full) return;
      openLightbox(full || img.currentSrc || img.src, img?.alt || "X投稿スクリーンショット");
    });
  });

  closeBtn?.addEventListener("click", closeLightbox);
  lightbox?.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox && !lightbox.hidden) closeLightbox();
  });

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
