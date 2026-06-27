/** Site-wide links (no operator personal name). */
export const SITE = {
  name: "日本の政治なう",
  domain: "https://seiji1192.site",
  xUrl: "https://x.com/seiji1192site",
  xHandle: "@seiji1192site",
  /** note トップ or メンバー加入ページ（オーナー設定後） */
  noteUrl: "https://note.com/seiji1192",
  noteMembershipUrl: "https://note.com/seiji1192/membership",
  /** プレリリースバナー表示。正式ローンチ時 false */
  preRelease: true,
  /** コメント投稿・表示（D1接続後に true。preRelease と独立） */
  commentsLive: false,
  /** Cloudflare Turnstile サイトキー（公開可）。未設定時はウィジェット非表示 */
  turnstileSiteKey: null,
  adsensePubId: "ca-pub-7197431000530819",
  /** 支援CTA A/B: "a" 感情 / "b" 価値 — docs/note-monetization-pdca.md */
  supportAbVariant: "a",
};
