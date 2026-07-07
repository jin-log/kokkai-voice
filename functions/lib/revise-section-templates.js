/** ブロック修正UI — セクション別の記入テンプレ */

/** @type {Record<string, string>} */
export const REVISE_SECTION_TEMPLATES = {
  title_opening: `タイトル: {話題}の動向
1行目候補: {タイトルの疑問に数字で答える1文}`,

  nowSummary: `1. {結論 — タイトルへの直接回答}
2. {数字・主体・時点の事実}
3. {未確定・今後の論点}`,

  summaryBullets: `・{YYYY-MM-DD}：{発言者}— {事実（国会議事録）}
・{数字付きの制度・予算・法案要点}
・{読者が判断するための補足1行}`,

  arcSummary: `{YYYY-MM-DD} — {発言者}が{論点}について{質疑/答弁}。「{要約文}」
{YYYY-MM-DD} — {次の出来事}`,

  timeline: `{YYYY-MM-DD} [国会] {発言者}— {会議名}で「{平易な要約}」と答弁。
{YYYY-MM-DD} [X] {アカウント}— {投稿の要点}`,

  stance: `◎ {党名}
公言: {方針の平易語要約}
行動: {採決・法案・国会での行動要約}
判定: {◎○△×？の理由}
出典: {国会議事録または公表資料URL}

△ {別の党名}
公言: …
行動: …
判定: …
出典: …`,

  xPosts: `1. @{handle} — {投稿本文の要点（80字以内）}
2. @{handle} — {別投稿}`,

  glossary: `{用語1}: {平易な定義}
{用語2}: {平易な定義}`,

  prosCons: `＋ {メリットの要点}（{公表数値・出典}）
＋ {別のメリット}
− {デメリットの要点}（{公表数値・出典}）
− {別のデメリット}`,
};

/** @param {string} sectionId */
export function getSectionTemplate(sectionId) {
  return REVISE_SECTION_TEMPLATES[sectionId] || "";
}
