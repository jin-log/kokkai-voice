/** GitHub 上の project-status に patrol-stall-state をマージ（CF Functions 用） */

const CHECK_HINTS = {
  B3_topic: "要約が searchKeyword と一致（2行以上）",
  B4_conclusion: "いまの結論が要点3行（重複・途中切れなし）",
  B5_writer_voice: "議事録口調を除去",
  D2_arc_topic: "経緯3行以上が案件キーワードと一致",
  E4_timeline_diet_topic: "タイムライン国会3件が案件と一致",
  Q1_conclusion_numbers: "結論に公表数値がない",
  Q2_template_conclusion: "「国会で議論」テンプレの繰り返し",
  Q3_plain_no_answer: "要約がタイトルの疑問に答えていない",
  Q8_x_numbers_not_in_summary: "X枠の数値が要約にない",
};

/**
 * @param {Record<string, unknown>} status
 * @param {Record<string, unknown>|null} snapshot
 */
export function enrichStatusWithPatrolStall(status, snapshot) {
  if (!status?.slugs || !snapshot?.slugStalls?.length) {
    return status;
  }

  const titleBySlug = new Map(
    status.slugs.map((s) => [s.slug, s.shortTitle ?? s.slug]),
  );
  const goldBySlug = new Map(status.slugs.map((s) => [s.slug, s.goldPct ?? 0]));

  const slugStalls = snapshot.slugStalls.map((row) => ({
    stalled: true,
    slug: row.slug,
    shortTitle: titleBySlug.get(row.slug) ?? row.slug,
    goldPct: goldBySlug.get(row.slug) ?? 0,
    checkId: row.checkId,
    checkLabel: row.checkId,
    ownerHint: CHECK_HINTS[row.checkId] ?? "",
    agent: "writer",
    attempts: row.attempts,
    lastAt: row.lastAt,
    loopLine: row.loopLine,
  }));

  const parts = [];
  if (snapshot.globalStall?.message) parts.push(snapshot.globalStall.message);
  parts.push(`${slugStalls.length} 記事が同じチェックで失敗ループ中`);

  const patrolHealth = {
    status: snapshot.status === "stalled" ? "stalled" : "progressing",
    statusLabel: "進行停止（ループ中）",
    paused: false,
    pauseReason: null,
    pauseDetail: null,
    globalStall: snapshot.globalStall ?? null,
    slugStalls,
    stalledCount: slugStalls.length,
    message: parts.join("。"),
    analyzedAt: snapshot.updatedAt ?? new Date().toISOString(),
    patrolRunning: false,
  };

  status.patrolHealth = patrolHealth;
  for (const s of status.slugs) {
    const hit = slugStalls.find((x) => x.slug === s.slug);
    s.stall = hit ?? null;
  }
  return status;
}
