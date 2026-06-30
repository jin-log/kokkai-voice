/** Site-wide links (no operator personal name). */
export const SITE = {
  name: "日本の政治now.",
  /** 略称・SNSハッシュタグ用 */
  shortLabel: "政治now",
  hashtag: "#政治now",
  domain: "https://seiji1192.site",
  xUrl: "https://x.com/seiji1192site",
  xHandle: "@seiji1192site",
  /** はてブ管理（ホットエントリー一覧） */
  hatenaHotentryUrl: "https://b.hatena.ne.jp/seiji1192/hotentry",
  hatenaProfileUrl: "https://b.hatena.ne.jp/seiji1192/",
  /** note トップ or メンバー加入ページ（オーナー設定後） */
  noteUrl: "https://note.com/seiji1192",
  /** メンバー説明・加入ページ（応援導線の正） */
  noteMembershipUrl: "https://note.com/seiji1192/membership/info",
  /** note チップ（単発応援）— 管理プレビュー: /dev/links/ */
  noteTipUrl:
    "https://note.com/a/purchase/support?k=n4d92d9d86b96&at=support",
  /** メンバーシップ公開済み */
  noteMembershipLive: true,
  /** プレリリースバナー表示。正式ローンチ時 false */
  preRelease: false,
  /** コメント投稿・表示（D1接続後に true。preRelease と独立） */
  commentsLive: true,
  /** Cloudflare Turnstile サイトキー（公開可）。未設定時はウィジェット非表示 */
  turnstileSiteKey: "0x4AAAAAADs2uqvcjXJRBjAz",
  adsensePubId: "ca-pub-7197431000530819",
  /** GA4 測定ID（公開ページのみ BaseLayout で読み込み。/dev は除外） */
  gaMeasurementId: "G-N8JV8MKMNJ",
  /** GA4 プロパティ ID（jin92.net - GA4 ＝ 政治なう）。管理画面から直リンク用 */
  gaPropertyId: "397089537",
  gaRealtimeUrl: "https://analytics.google.com/analytics/web/#/p397089537/realtime/overview",
  gaPagesUrl: "https://analytics.google.com/analytics/web/#/p397089537/reports/reportinghub?params=_u..nav%3Dmaui-reporting-hub",
  /** 支援CTA A/B: "a" 感情 / "b" 価値 — docs/note-monetization-pdca.md */
  supportAbVariant: "a",
  /** IndexNow 検証キー — public/{key}.txt と一致 */
  indexNowKey: "a7f3c2e19b4d4f6a8e2d1c0b5a9e3f72",
};
