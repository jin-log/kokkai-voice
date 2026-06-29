/** Site-wide links (no operator personal name). */
export const SITE = {
  name: "日本の政治なう",
  domain: "https://seiji1192.site",
  xUrl: "https://x.com/seiji1192site",
  xHandle: "@seiji1192site",
  /** はてブ管理（ホットエントリー一覧） */
  hatenaHotentryUrl: "https://b.hatena.ne.jp/seiji1192/hotentry",
  hatenaProfileUrl: "https://b.hatena.ne.jp/seiji1192/",
  /** note トップ or メンバー加入ページ（オーナー設定後） */
  noteUrl: "https://note.com/seiji1192",
  noteMembershipUrl: "https://note.com/seiji1192/membership",
  /** note メンバー公開済みなら true。未公開時はプロフィールへ誘導（/membership は404） */
  noteMembershipLive: false,
  /** プレリリースバナー表示。正式ローンチ時 false */
  preRelease: true,
  /** コメント投稿・表示（D1接続後に true。preRelease と独立） */
  commentsLive: false,
  /** Cloudflare Turnstile サイトキー（公開可）。未設定時はウィジェット非表示 */
  turnstileSiteKey: null,
  adsensePubId: "ca-pub-7197431000530819",
  /** 支援CTA A/B: "a" 感情 / "b" 価値 — docs/note-monetization-pdca.md */
  supportAbVariant: "a",
  /** IndexNow 検証キー — public/{key}.txt と一致 */
  indexNowKey: "a7f3c2e19b4d4f6a8e2d1c0b5a9e3f72",
};
