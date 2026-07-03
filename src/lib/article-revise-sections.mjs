/**
 * 記事ブロック修正 UI — セクション定義（モック／将来 API の正本）
 */

/** @typedef {{ id: string, label: string, desc: string, checkIds: string[], agent: string }} ReviseSection */

/** @type {ReviseSection[]} */
export const REVISE_SECTIONS = [
  {
    id: "title_opening",
    label: "タイトル・1行目",
    desc: "タイトルと冒頭1行（タイトルの疑問に答える行）",
    checkIds: ["A1_title", "A1b_title_placeholder", "P1_opening_missing"],
    agent: "writer",
  },
  {
    id: "nowSummary",
    label: "いまの結論",
    desc: "nowSummary 3行・話題一致・第三者目線",
    checkIds: ["B1_nowSummary", "B3_topic", "B4_conclusion", "B5_writer_voice"],
    agent: "writer",
  },
  {
    id: "summaryBullets",
    label: "要点",
    desc: "summaryBullets・根拠の独自性",
    checkIds: ["C1_summaryBullets", "C2_evidence_distinct"],
    agent: "writer",
  },
  {
    id: "arcSummary",
    label: "経緯",
    desc: "日付付き経緯・案件キーワード一致",
    checkIds: ["D1_arcSummary", "D2_arc_topic"],
    agent: "writer",
  },
  {
    id: "timeline",
    label: "タイムライン",
    desc: "国会・X の出来事並び。答弁だけ並んでないか",
    checkIds: ["E1_timeline_count", "E2_timeline_x", "E3_timeline_diet", "E4_timeline_diet_topic"],
    agent: "writer",
  },
  {
    id: "stance",
    label: "〇×・公言と行動",
    desc: "各党の立場・記号・出典",
    checkIds: ["G1_stanceMatrix_ref", "G3_parties_min", "G4_parties_source", "G5_parties_symbol", "G6_matrix_topic"],
    agent: "writer",
  },
  {
    id: "xPosts",
    label: "X投稿",
    desc: "検証済み URL・話題一致",
    checkIds: ["H1_xPosts", "H2_x_topic"],
    agent: "x-researcher",
  },
  {
    id: "glossary",
    label: "用語解説",
    desc: "glossary 2語以上",
    checkIds: ["F1_glossary"],
    agent: "writer",
  },
  {
    id: "prosCons",
    label: "メリデメ",
    desc: "公表数値付きメリット・デメリット",
    checkIds: ["J1_prosCons"],
    agent: "writer",
  },
];

/** @param {import('./articles.mjs').Article} article @param {object|null} [stance] */
export function sectionContent(article, sectionId, stance = null) {
  switch (sectionId) {
    case "title_opening": {
      const opening = article.summaryBullets?.[0] || article.nowSummary?.bullets?.[0] || "";
      return [`タイトル: ${article.title || "(未設定)"}`, `1行目候補: ${opening || "(未設定)"}`].join(
        "\n",
      );
    }
    case "nowSummary":
      return (article.nowSummary?.bullets ?? []).map((b, i) => `${i + 1}. ${b}`).join("\n") || "(空)";
    case "summaryBullets":
      return (article.summaryBullets ?? []).map((b, i) => `・${b}`).join("\n") || "(空)";
    case "arcSummary":
      return (article.arcSummary ?? [])
        .map((row) => `${row.date} — ${row.text}`)
        .join("\n") || "(空)";
    case "timeline":
      return (article.timeline ?? [])
        .map((row) => {
          const kind = row.type === "x" ? "X" : row.type === "speech" ? "国会" : row.type || "?";
          return `${row.date} [${kind}] ${row.summaryPlain || row.summary || ""}`;
        })
        .join("\n") || "(空)";
    case "stance": {
      const parties = stance?.matrix?.parties ?? [];
      if (!parties.length) return "(〇×表なし)";
      return parties
        .map((p) => `${p.symbol || "—"} ${p.partyLabel}: ${p.stanceLabel || p.summary || ""}`)
        .join("\n");
    }
    case "xPosts":
      return (article.xPosts ?? [])
        .map((p, i) => `${i + 1}. ${p.author || "?"} — ${(p.text || "").slice(0, 80)}…`)
        .join("\n") || "(X投稿なし)";
    case "glossary":
      return (article.glossary ?? [])
        .map((g) => `${g.term}: ${g.definition}`)
        .join("\n") || "(用語なし)";
    case "prosCons": {
      const m = (article.prosCons?.merits ?? []).map((x) => `＋ ${x.point}（${x.figure || "—"}）`);
      const d = (article.prosCons?.demerits ?? []).map((x) => `− ${x.point}（${x.figure || "—"}）`);
      return [...m, ...d].join("\n") || "(メリデメなし)";
    }
    default:
      return "";
  }
}

/** モック用 — 指示から提案文を生成 */
export function mockProposal(sectionId, instruction, current) {
  const hint = String(instruction || "").trim();
  if (!hint) return { after: current, note: "指示が空です" };

  if (sectionId === "timeline" && /答弁|並んで|並び/.test(hint)) {
    const lines = String(current).split("\n").filter(Boolean);
    const reordered = [...lines].sort((a, b) => {
      const ax = a.includes("[X]") ? 0 : 1;
      const bx = b.includes("[X]") ? 0 : 1;
      return ax - bx;
    });
    return {
      after: reordered.join("\n"),
      note: "国会答弁の連続を避け、Xと国会を交互に並べ替え（モック提案）",
    };
  }

  if (sectionId === "nowSummary") {
    if (/答弁|質疑|並ん|何が明らか|分からない|タイトル/.test(hint)) {
      return {
        after:
          "1. 国会では賃上げについて複数の議員が質疑したが、現時点で新しい制度決定や具体策が明らかになったわけではない。\n" +
          "2. 各答弁は、賃上げの必要性や政府の認識を確認する内容にとどまり、読者が知りたい「何が変わるのか」はまだ未確定である。\n" +
          "3. この記事では、答弁の列挙ではなく、国会で確認された点と残っている論点を整理する。",
        note: "指示を問題指摘として解釈し、答弁列挙から「何が明らかか／未確定か」へ書き換え（モック）",
      };
    }
    return {
      after: `1. ${hint.replace(/^[・\d.\s]+/, "").slice(0, 120)}\n2. （根拠）国会答弁・一次ソースに基づく整理\n3. 今後の国会・与党協議の行方を追う`,
      note: "指示を1行目に反映し、残り2行はテンプレ（モック）",
    };
  }

  if (sectionId === "arcSummary") {
    return {
      after: `${current}\n2026-07-01 — ${hint.slice(0, 80)}（オーナー指示を反映・モック）`,
      note: "経緯末尾に指示内容を1行追加（モック）",
    };
  }

  return {
    after: `${current}\n\n【修正案】${hint}`,
    note: "指示を末尾に追記（モック — 本番はライターが該当フィールドのみ再生成）",
  };
}

/** @type {{ sectionId: string, instruction: string, applied: boolean }[]} */
export const MOCK_RULE_HISTORY = [
  {
    sectionId: "timeline",
    instruction: "答弁だけ並んでる。Xと国会を混ぜて時系列で",
    applied: true,
  },
  {
    sectionId: "nowSummary",
    instruction: "高市答弁は1行にまとめず、法案未収載を先に書く",
    applied: true,
  },
];
