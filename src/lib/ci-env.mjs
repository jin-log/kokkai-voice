/** GitHub Actions / CI 実行判定 */
export const isCi = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);

/** はてな/note Playwright — CI は headless、ローカルは表示あり */
export function promoHeadless(explicit) {
  if (explicit !== undefined) return explicit;
  return isCi;
}
