/** 管理画面 URL（HTML href に直書きしない — クローラー向けリンク回避） */
export const DEV_STATUS_PATH = "/dev/status/";

export function adminNavScript() {
  return `
document.querySelectorAll("[data-admin-nav]").forEach((el) => {
  el.addEventListener("click", () => {
    location.href = ${JSON.stringify(DEV_STATUS_PATH)};
  });
});
`.trim();
}
