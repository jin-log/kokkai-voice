/** 国会議事録口調の検出・第三者平易語への変換 */

const DIET_VOICE =
  /お尋ねがありました|お尋ねがございました|伺います|お伺い|申し上げます|ございました|ございます|であります|いたします|おります|私自身|我が党|我が|御党|我々|進めてまいります|承知を|というふうに|でございます|わけであり|けれども、この|教えていただ|お聞き/;

const INCOMPLETE_END = /(今後|おりませんが|について|に対し|下|ともに|が、|を、|は、)。$/;

export function isDietVoice(text) {
  return DIET_VOICE.test(String(text || ""));
}

const SPEECH_FRAGMENT = /^(る|ない|○|私の|私は|そして|また|この|それ|ないん|高市総理も|参考人|は賛成|会派を代表|じゃ、|いうか|――――|本日の会議|〔本号|なぜか|まず確認|バックファイア|今、今日|加えて|昨今|先ほど)/;
const SPEECH_TAIL = /させていただ|望みまして|認識をしている|質疑とさせ|いたしまして|思っている。$/;

export function isSpeechFragment(text) {
  const s = String(text || "").trim();
  if (s.length > 88) return true;
  if (/…$|のでしょうか|でしょうか。|んでしょうか|入るんですか|含まれるんでしょうか/.test(s)) return true;
  if (SPEECH_FRAGMENT.test(s) || SPEECH_TAIL.test(s)) return true;
  return false;
}

/** 掲載可 — 経緯・根拠・〇×・TL要約の共通判定 */
export function isWriterReadyLine(text, maxLen = 88) {
  const s = String(text || "").trim();
  if (s.length < 14 || s.length > maxLen) return false;
  if (isDietVoice(s) || isSpeechFragment(s) || isIncompleteBullet(s)) return false;
  if (/^(置法|あと、これから|特に皇室)/.test(s)) return false;
  return true;
}

/** 〇×「行動」列 — 日付付きでやや長め可 */
export function isMatrixActionReady(text) {
  const s = String(text || "").trim();
  if (s.length < 18 || s.length > 110) return false;
  if (isDietVoice(s) || isSpeechFragment(s) || isIncompleteBullet(s)) return false;
  if (/…$|のでしょうか|主張：/.test(s)) return false;
  return true;
}

export function isIncompleteBullet(text) {
  return INCOMPLETE_END.test(String(text || "").trim());
}

export function normalizeFactPhrase(text) {
  let s = String(text || "")
    .replace(/\s+/g, " ")
    .replace(/^[　\s]+/, "")
    .trim();
  s = s
    .replace(/日本国旗損壊罪の制定についてお尋ねがありました/g, "国旗損壊罪の制定が国会で質疑された")
    .replace(/国旗損壊罪の制定について聞きます/g, "国旗損壊罪の制定が国会で質疑された")
    .replace(/今国会の政府提出予定法案には入っておりませんが/g, "今国会の政府提出予定法案には国旗損壊罪が含まれていない")
    .replace(/入っておりませんが/g, "含まれていない")
    .replace(/過去、私自身が/g, "過去、首相は")
    .replace(/私自身が/g, "当時の担当者は")
    .replace(/御党との/g, "与党との")
    .replace(/御党/g, "与党")
    .replace(/我が党/g, "与党")
    .replace(/我々/g, "与党側は")
    .replace(/ございました/g, "あった")
    .replace(/ございます/g, "ある")
    .replace(/いたします/g, "する")
    .replace(/おります/g, "いる")
    .replace(/進めてまいります/g, "進める方針")
    .replace(/お尋ねがありました/g, "国会で論点に上がった")
    .replace(/（拍手）/g, "");
  return s.replace(/\s+/g, " ").trim();
}

export function toThirdPersonBullet(raw, meta = {}) {
  const speaker = meta.speaker ? `${meta.speaker}氏` : "国会";
  let line = normalizeFactPhrase(raw);
  if (!line) return "";
  if (isDietVoice(line)) return "";
  if (/質疑された|含まれていない|連立.*合意|検討を進め|提出した|法案を提出/.test(line)) {
    if (meta.date && !line.includes(meta.date.slice(0, 7))) {
      line = `${line}（${meta.date}・${speaker}発言）`;
    }
  }
  if (!line.endsWith("。")) line += "。";
  return line;
}

export function bulletsDistinctFrom(a, b) {
  const keysA = (a || []).map((x) => String(x).replace(/[、。…\s]/g, "").slice(0, 20));
  const keysB = (b || []).map((x) => String(x).replace(/[、。…\s]/g, "").slice(0, 20));
  for (const ka of keysA) {
    for (const kb of keysB) {
      if (ka.length >= 12 && kb.length >= 12 && (ka.startsWith(kb.slice(0, 12)) || kb.startsWith(ka.slice(0, 12)))) {
        return false;
      }
    }
  }
  return true;
}
