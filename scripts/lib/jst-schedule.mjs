/**
 * JST の時刻指定 → ISO（YouTube publishAt 用）
 * @param {string} atStr "7:00" / "07:30" / ISO文字列
 * @param {Date} [now]
 */
export function parseJstAt(atStr, now = new Date()) {
  const raw = String(atStr || "").trim();
  const hm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!hm) {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) throw new Error(`時刻を解釈できません: ${atStr}`);
    return d.toISOString();
  }

  const hour = Number(hm[1]);
  const minute = Number(hm[2]);
  const jstParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(now)
    .reduce((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, /** @type {Record<string, string>} */ ({}));

  const y = jstParts.year;
  const mo = jstParts.month;
  const d = jstParts.day;
  let target = new Date(
    `${y}-${mo}-${d}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`,
  );
  if (target.getTime() <= now.getTime()) {
    target = new Date(target.getTime() + 24 * 60 * 60 * 1000);
  }
  return target.toISOString();
}
