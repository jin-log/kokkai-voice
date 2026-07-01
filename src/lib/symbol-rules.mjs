/**
 * 公言と行動 — 記号 v2（正本）
 * ◎ 公約どおり実施 / 〇 言動一致（未実施含む） / ▲ 公言からブレ / × 方向逆 / ？ 未判定
 */

export const SYMBOL_METHODOLOGY = "v2-symbols";

export const SYMBOL_LEGEND = [
  { sym: "◎", label: "公約どおり実施（可決・執行など）" },
  { sym: "〇", label: "言動一致（未実施・野党の質疑等）" },
  { sym: "▲", label: "以前の公言からブレ（規模・期限のずれ）" },
  { sym: "×", label: "方向が逆、または明確な矛盾" },
  { sym: "？", label: "行動データ不足・未判定" },
];

const VALID_SYMBOLS = new Set(["◎", "〇", "○", "▲", "×", "❌", "？", "?"]);

export function normalizeSymbol(sym) {
  const s = String(sym || "").trim();
  if (s === "❌") return "×";
  if (s === "○") return "〇";
  if (s === "?") return "？";
  return s;
}

export function isValidSymbol(sym) {
  return VALID_SYMBOLS.has(String(sym || "").trim());
}

/** @returns {"achieved"|"match"|"partial"|"mismatch"|"unknown"} */
export function symbolTone(sym) {
  const s = normalizeSymbol(sym);
  if (s === "◎") return "achieved";
  if (s === "〇") return "match";
  if (s === "▲") return "partial";
  if (s === "×") return "mismatch";
  return "unknown";
}

function impliesPassed(text) {
  const s = String(text || "");
  if (!/可決|成立|採決.*可|施行|実施済|投入|支給を実施|使用決定|支出決定|配布|支給/.test(s)) return false;
  if (/可決.*(反対|してはなら|させるわけ|しない|できない|否決|棄権|反対票)/.test(s)) return false;
  if (/(反対|否決|棄権|慎重|懸念|問題|危険|許せ|打倒).{0,48}可決/.test(s)) return false;
  if (/可決.{0,24}(しない|できない|べきでは|してはいけ)/.test(s)) return false;
  return true;
}

function isRulingParty(label) {
  return /自由民主党|公明党|日本維新の会/.test(String(label || ""));
}

function hasPledge(party) {
  const url = String(party?.policyPledgeUrl || "").trim();
  const summary = String(party?.policyPledgeSummary || "");
  if (url) return true;
  if (/公約なし/.test(summary)) return false;
  return summary.length > 8 && !/発言ベースのみ/.test(summary);
}

function directionConflict(policy, action) {
  const p = String(policy || "");
  const a = String(action || "");
  if (/反対|慎重|懸念|批判|縮小|上限/.test(p) && /賛成|推進|拡大|増額|可決/.test(a)) return true;
  if (/推進|拡大|賛成/.test(p) && /反対|否決|棄権|縮小/.test(a)) return true;
  if (/反対|慎重|懸念/.test(p) && impliesPassed(a)) return true;
  return false;
}

function directionAligned(policy, action) {
  const joined = `${policy} ${action}`;
  if (/質疑|提出|表明|答弁|質問|発議|可決|成立|施行|検討を進め|継続|主張|と訴え|と指摘|使用決定|支出|委員会で|本会議で|国会で/.test(String(action || ""))) {
    if (directionConflict(policy, action)) return false;
    return true;
  }
  if (/一致|継続|一貫/.test(joined)) return true;
  return false;
}

function policyEchoedInAction(policy, action) {
  const core = String(policy || "")
    .replace(/[、。…\s]/g, "")
    .slice(0, 28);
  if (core.length < 10) return false;
  const act = String(action || "").replace(/[、。…\s\d年月日：:]/g, "");
  return act.includes(core.slice(0, Math.min(core.length, 18)));
}

function pledgeGap(policy, action, pledgeSummary) {
  const ps = String(pledgeSummary || "");
  const act = String(action || "");
  if (/ゼロベース|全面|0%|ゼロ/.test(ps) && /上限検討|検討中|一部|段階/.test(act)) return true;
  if (/未実施|未達|未着手|未成立|含まれていない/.test(act)) return true;
  if (/早期|年内|直ちに/.test(ps) && /検討|継続|これから|予定/.test(act) && !impliesPassed(act)) return true;
  return false;
}

/**
 * @param {object} party - policy-matrix parties[] 要素
 * @returns {{ symbol: string, symbolReason: string }}
 */
export function scorePartySymbol(party) {
  const policy = party?.stance?.text || "";
  const action = party?.action?.text || "";
  const excerpt = `${policy} ${action}`;
  const pledge = hasPledge(party);
  const pledgeSummary = party?.policyPledgeSummary || "";
  const label = party?.partyLabel || "";
  const noAction = !action || /未整理|データなし|未紐付け/.test(action);

  if (noAction) {
    return {
      symbol: "？",
      symbolReason: "行動データ未紐付け",
    };
  }

  if (directionConflict(policy, action)) {
    return {
      symbol: "×",
      symbolReason: `方針「${policy.slice(0, 24)}…」に対し行動「${action.slice(0, 28)}…」は方向が逆`,
    };
  }

  if (impliesPassed(action) || impliesPassed(excerpt)) {
    if (pledge && pledgeGap(policy, action, pledgeSummary)) {
      return {
        symbol: "▲",
        symbolReason: `公約「${pledgeSummary.slice(0, 22)}…」に対し実施はあるが規模・期限がずれ`,
      };
    }
    return {
      symbol: "◎",
      symbolReason: `公約・方針に沿った実施（${action.slice(0, 36)}）`,
    };
  }

  if (pledge && pledgeGap(policy, action, pledgeSummary)) {
    return {
      symbol: "▲",
      symbolReason: `公約「${pledgeSummary.slice(0, 22)}…」に対し国会実績は${action.slice(0, 30)}…（未達・ずれ）`,
    };
  }

  if (directionAligned(policy, action)) {
    if (pledge && isRulingParty(label) && /検討|進行|着手|設置|答弁/.test(action)) {
      return {
        symbol: "▲",
        symbolReason: `公約に対し${action.slice(0, 32)}…まで（実施・可決には至っていない）`,
      };
    }
    const prefix = pledge ? "" : "公約なし・発言ベース。";
    return {
      symbol: "〇",
      symbolReason: `${prefix}方針と国会行動は一致（未実施は野党の射程外）`,
    };
  }

  if (/検討|表明|答弁|質疑|提出/.test(action)) {
    return {
      symbol: "〇",
      symbolReason: pledge
        ? `方針と行動は近いが実施完了とは言えない（${action.slice(0, 28)}…）`
        : `公約なし・発言ベース。国会行動は方針と同方向（${action.slice(0, 24)}…）`,
    };
  }

  if (policyEchoedInAction(policy, action)) {
    return {
      symbol: "〇",
      symbolReason: pledge
        ? `方針と国会発言内容が一致（${action.slice(0, 28)}…）`
        : "公約なし・発言ベース。国会発言は方針表明と一致",
    };
  }

  return {
    symbol: "？",
    symbolReason: "方針と行動の対応が未判定",
  };
}

/** writer-synthesize 互換 */
export function inferSymbol(policy, action, excerpt, party = {}) {
  return scorePartySymbol({
    partyLabel: party.partyLabel || "",
    policyPledgeUrl: party.policyPledgeUrl || "",
    policyPledgeSummary: party.policyPledgeSummary || "",
    stance: { text: policy },
    action: { text: action },
  }).symbol;
}
