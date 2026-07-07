/** 利害・数値統計 — 管理画面修正UI用 */

export function formatImpactReviseText(meritsDemerits) {
  const md = meritsDemerits || {};
  const merits = md.merits ?? [];
  const demerits = md.demerits ?? [];
  if (!merits.length && !demerits.length) return "(利害整理なし)";

  const lines = [];
  if (md.disclaimer) lines.push(`注記: ${md.disclaimer}`, "");

  for (const item of merits) {
    lines.push(formatImpactItem("＋", item, "支持側"));
  }
  for (const item of demerits) {
    lines.push(formatImpactItem("−", item, "懸念側"));
  }
  return lines.join("\n").trim();
}

function formatImpactItem(sign, item, fallbackPerspective) {
  const who = item.perspective || fallbackPerspective;
  const headline = item.headline || "論点";
  const lines = [`${sign} [${who}] ${headline}`];
  lines.push(`  テキスト: ${item.text || "（未設定）"}`);
  if (item.figure) lines.push(`  数値: ${item.figure}`);
  const src = [item.sourceLabel, item.sourceDate].filter(Boolean).join(" · ");
  lines.push(`  出典: ${item.sourceUrl || "（URL未設定）"}${src ? `（${src}）` : ""}`);
  return lines.join("\n");
}

export function parseImpactApplyText(text) {
  const blocks = String(text || "").split(/\n(?=[＋+−\-])/).map((b) => b.trim()).filter(Boolean);
  /** @type {{ merits: object[], demerits: object[] }} */
  const out = { merits: [], demerits: [] };
  let disclaimer = "";

  for (const line of String(text || "").split("\n")) {
    const dm = line.match(/^注記[:：]\s*(.+)$/);
    if (dm) disclaimer = dm[1].trim();
  }

  for (const block of blocks) {
    const head = block.split("\n")[0] || "";
    const plus = /^[＋+]/.test(head);
    const minus = /^[−\-]/.test(head);
    if (!plus && !minus) continue;

    const headMatch = head.match(/^[＋+−\-]\s*\[([^\]]+)\]\s*(.+)$/);
    const perspective = headMatch?.[1]?.trim() || "";
    const headline = headMatch?.[2]?.trim() || "論点";

    const fields = {};
    for (const line of block.split("\n").slice(1)) {
      const m = line.match(/^\s*(テキスト|数値|出典)[:：]\s*(.+)$/);
      if (m) fields[m[1]] = m[2].trim();
    }

    const sourceUrl = (fields["出典"] || "").replace(/（[^）]+）$/, "").trim();
    const item = {
      headline,
      text: fields["テキスト"] || "",
      figure: fields["数値"] || "",
      sourceUrl,
      sourceLabel: "出典",
      ...(perspective ? { perspective } : {}),
    };
    if (!item.text) continue;
    if (plus) out.merits.push(item);
    if (minus) out.demerits.push(item);
  }

  if (!out.merits.length && !out.demerits.length) return null;
  return { disclaimer, ...out };
}

export function formatStatsReviseText(statsSeries) {
  const raw = statsSeries || {};
  const points = raw.chart?.points ?? [];
  if (!points.length) return "(数値統計なし)";

  const lines = [
    `タイトル: ${raw.title || "公表数値の推移"}`,
    raw.note ? `注記: ${raw.note}` : "",
    `グラフ単位: ${raw.chart?.unit || "—"}`,
    "ポイント:",
  ].filter(Boolean);

  for (const p of points) {
    lines.push(`  ${p.label}: ${p.value}${p.latest ? " [最新]" : ""}`);
  }

  const rows = raw.table?.rows ?? [];
  if (rows.length) {
    lines.push("表:");
    for (const row of rows) {
      lines.push(
        `  ${row.date} | ${row.value} | ${row.delta || "—"} | ${row.sourceLabel || "出典"} | ${row.sourceUrl || ""}`,
      );
    }
  }
  if (raw.footnote) lines.push(`脚注: ${raw.footnote}`);
  return lines.join("\n");
}

export function parseStatsApplyText(text) {
  const lines = String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  let title = "公表数値の推移";
  let note = "";
  let unit = "";
  let footnote = "";
  /** @type {{ label: string, value: number, latest?: boolean }[]} */
  const points = [];
  /** @type {object[]} */
  const rows = [];
  let inPoints = false;
  let inTable = false;

  for (const line of lines) {
    if (/^タイトル[:：]/.test(line)) {
      title = line.replace(/^タイトル[:：]\s*/, "");
      continue;
    }
    if (/^注記[:：]/.test(line)) {
      note = line.replace(/^注記[:：]\s*/, "");
      continue;
    }
    if (/^グラフ単位[:：]/.test(line)) {
      unit = line.replace(/^グラフ単位[:：]\s*/, "");
      continue;
    }
    if (/^脚注[:：]/.test(line)) {
      footnote = line.replace(/^脚注[:：]\s*/, "");
      continue;
    }
    if (line === "ポイント:") {
      inPoints = true;
      inTable = false;
      continue;
    }
    if (line === "表:") {
      inTable = true;
      inPoints = false;
      continue;
    }
    if (inPoints) {
      const m = line.match(/^(.+?):\s*([0-9.]+)(?:\s*\[最新\])?$/);
      if (m) {
        points.push({
          label: m[1].trim(),
          value: Number(m[2]),
          latest: /\[最新\]/.test(line),
        });
      }
      continue;
    }
    if (inTable) {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 4) {
        rows.push({
          date: parts[0],
          value: parts[1],
          delta: parts[2] === "—" ? "" : parts[2],
          sourceLabel: parts[3],
          sourceUrl: parts[4] || "",
        });
      }
    }
  }

  if (points.length < 2) return null;

  if (!points.some((p) => p.latest)) points[points.length - 1].latest = true;

  return {
    title,
    note,
    footnote,
    highlights: points.slice(0, 3).map((p, i) => ({
      label: p.label || `指標${i + 1}`,
      value: String(p.value),
      unit: unit || "",
      sub: rows[i]?.value || "",
    })),
    chart: {
      unit,
      ariaLabel: `${title}の棒グラフ`,
      points,
    },
    table: {
      columns: ["時点", "値", "前回比", "出典"],
      rows,
    },
  };
}

/** @param {import('../../src/lib/articles.mjs').Article} article */
export function buildStatsProposalText(article, before) {
  const existing = article.statsSeries;
  if (existing?.chart?.points?.length >= 2) {
    const after = formatStatsReviseText(existing);
    return {
      before,
      after,
      note: "既存の statsSeries を整形（棒グラフは chart.points から自動描画）",
      canApply: true,
    };
  }

  /** @type {{ label: string, value: number }[]} */
  const scraped = [];
  const corpus = [
    ...(article.summaryBullets ?? []),
    ...(article.nowSummary?.bullets ?? []),
    article.primarySpeech?.excerpt || "",
  ].join(" ");

  const pct = corpus.match(/([0-9０-９.．]+)\s*[％%]/g) || [];
  for (const m of pct.slice(0, 3)) {
    const n = parseFloat(m.replace(/[％%]/g, "").replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)));
    if (Number.isFinite(n)) scraped.push({ label: `指標${scraped.length + 1}`, value: n });
  }

  if (scraped.length < 2) {
    return {
      before,
      after: before,
      note: "記事内にグラフ用の数値が2点未満。ポイントを手入力してください",
      canApply: false,
      unchanged: true,
    };
  }

  const draft = {
    title: `${article.searchKeyword || article.title || "本件"}の公表数値`,
    note: "記事データから抽出した数値案。出典URLは表行に追記してください",
    chart: { unit: "%", points: scraped.map((p, i) => ({ ...p, latest: i === scraped.length - 1 })) },
    table: { columns: ["時点", "値", "前回比", "出典"], rows: [] },
  };

  return {
    before,
    after: formatStatsReviseText(draft),
    note: "記事内の％数値からグラフ用ポイント案を生成（2点以上で棒グラフ表示）",
    canApply: true,
  };
}

export function buildImpactProposalText(article, before) {
  const md = article.meritsDemerits;
  if (md?.merits?.length && md?.demerits?.length) {
    return {
      before,
      after: formatImpactReviseText(md),
      note: "既存の利害整理を表示形式に整形",
      canApply: true,
    };
  }

  const pc = article.prosCons;
  if (pc?.merits?.length || pc?.demerits?.length) {
    const draft = {
      disclaimer: "公表・試算に基づく利害整理です。賛否それぞれの主張であり、当サイトは賛成・反対を断定しません。",
      merits: (pc.merits ?? []).slice(0, 3).map((m) => ({
        headline: m.point || m.headline || "支持の論点",
        text: m.text || m.point || "",
        figure: m.figure || "",
        sourceUrl: m.sourceUrl || "",
        sourceLabel: m.sourceLabel || "出典",
        perspective: "支持側",
      })),
      demerits: (pc.demerits ?? []).slice(0, 3).map((m) => ({
        headline: m.point || m.headline || "懸念の論点",
        text: m.text || m.point || "",
        figure: m.figure || "",
        sourceUrl: m.sourceUrl || "",
        sourceLabel: m.sourceLabel || "出典",
        perspective: "懸念側",
      })),
    };
    return {
      before,
      after: formatImpactReviseText(draft),
      note: "メリデメと別枠の利害整理案（視点タグ付き）。メリデメで足りる場合は不要",
      canApply: draft.merits.length >= 1 && draft.demerits.length >= 1,
    };
  }

  return {
    before,
    after: formatImpactReviseText({
      disclaimer: "公表・試算に基づく利害整理です。",
      merits: [
        {
          headline: "支持側の論点",
          text: "（誰が何を得るか・制度のメリットを平易語で）",
          figure: "",
          sourceUrl: "",
          perspective: "支持側",
        },
      ],
      demerits: [
        {
          headline: "懸念側の論点",
          text: "（誰の負担・リスクかを平易語で）",
          figure: "",
          sourceUrl: "",
          perspective: "懸念側",
        },
      ],
    }),
    note: "利害整理のテンプレ。メリデメでくくれない視点差がある場合に使用",
    canApply: false,
    unchanged: true,
  };
}
