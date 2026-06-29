/** kokkai-writer Skill 文案 — batch10 */
export const WRITER_BATCH10 = {
  "teigaku-kyufu-2024": {
    nowSummary: {
      bullets: [
        "2024年6月から全国の市区町村が「定額給付金（3万円）」の支給手続きを開始。対象は世帯全員に原則3万円（税・社保の状況で調整あり）",
        "2026年6月時点、2024年分の受付・支給は終了済み。未申請・未受領の救済は自治体の個別相談・特例対応に依存",
        "もらえなかった主なケース：申請期限経過、口座・住所不備、非居住・国外転出、世帯情報の不一致等（総務省・自治体案内）",
      ],
    },
    arcSummary: [
      { date: "2024-10-01", text: "多くの自治体で2024年度分の支給・申請受付が完了または終了間近" },
      { date: "2024-06-01", text: "定額給付金2024（3万円）の支給開始。内閣府・総務省が自治体向け手続きを通知" },
      { date: "2024-04-01", text: "2024年度予算等を踏まえ、物価高対策として定額給付を決定" },
      { date: "2023-11-01", text: "2023年定額給付（7万円）の経験を踏まえ、2024年は3万円案へ" },
    ],
    summaryBullets: [
      "原則3万円/人だが、所得税・住民税・社保の状況で減額・調整される",
      "申請不要の自治体と、申請が必要な自治体があった（案内は自治体差）",
      "期限後は原則支給なし。不支給理由は自治体への問合せが必要",
    ],
    plainExplanation:
      "結論から言うと、2024年の定額給付3万円は、2024年6月以降に自治体から支給され、2024年内に手続きが終了した制度です。2026年6月時点で未受領の場合、原則として新規支給はありません。\n\nもらえなかった典型は、(1)申請・受取期限の経過、(2)振込口座・住所の不備、(3)世帯構成の確認が取れない、(4)国外転出等です。詳細は当時お住まいの市区町村の案内が正本です。\n\n2023年の7万円給付とは金額・手続きが異なります。2024年分を逃した場合の全国共通の再給付制度は、本記事整理時点では確認できません。",
    glossary: [
      { term: "定額給付金", definition: "物価高対策等として、世帯員に一律額を支給する給付" },
      { term: "調整給付", definition: "所得税・住民税等の状況に応じて給付額を調整する仕組み" },
      { term: "自治体実施", definition: "市区町村が受付・支払いを行う。手続き期限は自治体案内が正本" },
    ],
    primarySpeech: {
      date: "2024-06-01",
      nameOfMeeting: "政府・自治体案内",
      speaker: "内閣府",
      speakerGroup: "物価高対策",
      excerpt: "2024年定額給付金（3万円）の支給を開始。市区町村が手続きを実施。",
    },
    timeline: [
      { id: "tk-202404", date: "2024-04-01", summaryPlain: "2024年度定額給付（3万円）を物価高対策として決定。" },
      { id: "tk-202406", date: "2024-06-01", summaryPlain: "自治体による3万円給付の支給・受付開始。" },
      { id: "tk-202410", date: "2024-10-01", summaryPlain: "多くの自治体で2024年度分の受付・支給が終了または終了間近。" },
    ],
    matrix: {
      parties: [
        {
          partyLabel: "政府（実施）",
          stance: { text: "2024年定額給付3万円を全国の市区町村経由で支給", sourceUrl: "https://www.kantei.go.jp/jp/headline/bonus/index.html" },
          action: { text: "2024年6月開始。2024年内に手続き完了が前提", speechUrl: "https://www.soumu.go.jp/main_sosiki/jichi_gyousei/covid19/kyufukin/teigaku.html" },
          symbol: "◎",
          symbolReason: "公表（2024年4〜6月）に対し自治体支給を実施。2026年時点は2024年分は終了",
        },
        {
          partyLabel: "未受領者（制度上）",
          stance: { text: "期限・不備等で不支給となった場合、原則追給なし", sourceUrl: "https://www.soumu.go.jp/main_sosiki/jichi_gyousei/covid19/kyufukin/teigaku.html" },
          action: { text: "2026年6月時点、全国一律の再申請制度は案内されていない", speechUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000126907_00001.html" },
          symbol: "▲",
          symbolReason: "給付は実施されたが、期限後の救済は自治体個別対応に限られる",
        },
      ],
    },
  },

  "invoice-menzei-2026": {
    nowSummary: {
      bullets: [
        "インボイス制度下、年間売上1000万円以下の免税事業者は「2割特例」を選べば2026年10月31日まで登録義務を猶予できる（国税庁）",
        "2026年6月時点、特例利用の届出期限・経過措置の終了日（2026年10月）まで約4カ月",
        "2026年11月以降は原則、免税のまま取引を続けると取引先の仕入税額控除に影響。登録か税率変更の選択が必要",
      ],
    },
    arcSummary: [
      { date: "2026-06-27", text: "2割特例の経過措置終了まで約4カ月。免税事業者は登録・届出の確認が必要" },
      { date: "2023-10-01", text: "インボイス制度本格運用。免税事業者向けに2割特例等の経過措置を設定" },
      { date: "2023-01-01", text: "インボイス制度開始。適格請求書発行事業者の登録制度がスタート" },
      { date: "2022-06-01", text: "制度設計・経過措置が財務省・国税庁で段階的に公表" },
    ],
    summaryBullets: [
      "2割特例＝売上の2割以下が課税対象取引なら、2026年10月まで登録義務を延期可能",
      "届出を怠ると特例が使えない場合がある（国税庁案内）",
      "2026年11月以降は免税のままだと取引先に負担が及ぶ設計",
    ],
    plainExplanation:
      "結論：売上1000万円以下の免税事業者は、2割特例の届出をしていれば2026年10月31日までインボイス登録を猶予できます。2026年6月時点、終了まで約4カ月です。\n\n2026年11月以降に免税のまま取引すると、取引先が仕入税額控除を受けられない可能性があります。選択肢は(1)適格請求書発行事業者に登録、(2)免税を維持し取引条件を調整、などです。\n\n詳細は国税庁の「インボイス制度について」と経過措置のページが正本です。",
    glossary: [
      { term: "免税事業者", definition: "消費税の課税売上が一定以下等で、納税義務が免除される事業者" },
      { term: "2割特例", definition: "課税売上割合が2割以下なら、一定期間登録義務を猶予する経過措置" },
      { term: "適格請求書", definition: "インボイス登録事業者が発行する、仕入税額控除に必要な請求書" },
    ],
    primarySpeech: {
      date: "2023-10-01",
      nameOfMeeting: "国税庁案内",
      speaker: "国税庁",
      speakerGroup: "税制",
      excerpt: "免税事業者向け2割特例等の経過措置。2026年10月31日までの猶予を設定。",
    },
    timeline: [
      { id: "inv-202301", date: "2023-01-01", summaryPlain: "インボイス制度開始。" },
      { id: "inv-202310", date: "2023-10-01", summaryPlain: "本格運用。2割特例等の経過措置を適用。" },
      { id: "inv-202610", date: "2026-10-31", summaryPlain: "2割特例の経過措置終了予定日（国税庁案内）。" },
    ],
    matrix: {
      parties: [
        {
          partyLabel: "政府（税制）",
          stance: { text: "免税事業者向け2割特例で2026年10月まで登録猶予", sourceUrl: "https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/invoice_about.htm" },
          action: { text: "2023年運用開始。2026年10月31日で経過措置終了予定", speechUrl: "https://www.invoice-kohyo.mof.go.jp/about.html" },
          symbol: "◎",
          symbolReason: "公表スケジュールどおり経過措置を運用。2026年10月終了予定は変更なし（2026年6月時点）",
        },
        {
          partyLabel: "免税事業者（選択）",
          stance: { text: "届出・登録の有無で2026年11月以降の取引条件が変わる", sourceUrl: "https://www.meti.go.jp/policy/it_policy/invoicing/invoice_about/index.html" },
          action: { text: "2026年6月時点、個別の届出状況は事業者ごと", speechUrl: "https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/invoice_about.htm" },
          symbol: "▲",
          symbolReason: "制度は明確だが、事業者ごとの届出・登録は未確認。期限前の対応が必要",
        },
      ],
    },
  },

  "boei-tokubetsuzei": {
    nowSummary: {
      bullets: [
        "防衛特別所得税は2024年分から所得税に上乗せ。税率は所得に応じて1.0%〜（防衛費財源）",
        "2026年6月時点、2024年分の確定申告・2025年分の源泉徴収で実際の負担が国民に反映",
        "政府は2026年中の安保三文書改定と防衛費水準の議論を継続。追加財源の議論も国会で継続",
      ],
    },
    arcSummary: [
      { date: "2026-06-03", text: "片山財務大臣、防衛特別所得税創設済み・三文書改定に向け財源を検討と国会答弁" },
      { date: "2024-04-01", text: "2024年分から防衛特別所得税を所得税に上乗せして徴収開始" },
      { date: "2022-12-01", text: "防衛力強化のための財源確保として特別所得税を閣議決定" },
      { date: "2022-06-01", text: "防衛費GDP比2%方向の議論が本格化" },
    ],
    summaryBullets: [
      "給与所得者は源泉徴収で天引き。年収・控除で負担額は変わる",
      "具体的な年間負担は所得・家族構成で試算が必要",
      "三文書改定に伴い、追加財源議論が続く",
    ],
    plainExplanation:
      "結論：2024年分の所得税から、防衛費財源として「防衛特別所得税」が上乗せされています。給与所得者は毎月の源泉徴収で天引きされ、年間の負担額は年収・控除・他の所得税と合算で決まります。\n\n財務省の説明では、所得に応じた上乗せ税率（1.0%〜）が設定されています。例えば課税所得が300万円の場合と600万円の場合では負担額が異なります。正確な試算は国税庁の税率表か確定申告資料を参照してください。\n\n2026年、政府は安保三文書の前倒し改定と防衛費水準の議論を続けており、将来の負担増の議論も国会で続いています。",
    glossary: [
      { term: "防衛特別所得税", definition: "防衛力強化財源として所得税に上乗せする特別税" },
      { term: "源泉徴収", definition: "給与から天引きで所得税を徴収する仕組み" },
      { term: "安保三文書", definition: "国家安全保障戦略等。防衛費水準の根拠文書" },
    ],
    primarySpeech: {
      date: "2026-06-03",
      nameOfMeeting: "国会答弁",
      speaker: "片山さつき",
      speakerGroup: "自由民主党",
      excerpt: "防衛特別所得税は創設済み。三文書改定に向け安定的財源を検討。",
    },
    timeline: [
      { id: "bt-202212", date: "2022-12-01", summaryPlain: "防衛特別所得税を含む財源確保を閣議決定。" },
      { id: "bt-202404", date: "2024-04-01", summaryPlain: "2024年分所得税から防衛特別所得税を徴収開始。" },
      { id: "bt-202606", date: "2026-06-03", summaryPlain: "国会で三文書改定・防衛費財源の議論継続。" },
    ],
    matrix: {
      parties: [
        {
          partyLabel: "政府（実施）",
          stance: { text: "2024年分から防衛特別所得税を創設・徴収", sourceUrl: "https://www.mof.go.jp/tax_policy/summary/income/b04.htm" },
          action: { text: "2024年4月から源泉・確定申告で反映", speechUrl: "https://www.mod.go.jp/j/policy/budget/budget.html" },
          symbol: "◎",
          symbolReason: "公表（2022年閣議）に対し2024年分から徴収を実施",
        },
        {
          partyLabel: "野党・懸念（国会）",
          stance: { text: "防衛費増大が国民負担・増税につながる懸念", sourceUrl: "https://www.kantei.go.jp/jp/headline/bouei/index.html" },
          action: { text: "2026年国会で財源・三文書改定を質疑", speechUrl: "https://www.mof.go.jp/tax_policy/summary/income/b04.htm" },
          symbol: "▲",
          symbolReason: "特別所得税は実施済みだが、三文書改定に伴う追加財源は議論中",
        },
      ],
    },
  },

  "noto-fukko-budget": {
    nowSummary: {
      bullets: [
        "2024年1月能登半島地震後、政府は復旧・復興費を複数回の補正予算・予備費で計上（復興庁・財務省）",
        "2026年6月時点、復興・復旧は継続。具体的な総額は歳出科目・年度を跨ぐため単一数字に集約しにくい",
        "国会では能登への追加支援の遅れ・予備費依存をめぐる質疑が2026年も継続",
      ],
    },
    arcSummary: [
      { date: "2026-06-03", text: "野党から能登半島地震への補正予算未編成等を問題視する質疑" },
      { date: "2024-04-01", text: "2024年度予算・補正で能登復旧復興費を計上" },
      { date: "2024-01-01", text: "能登半島地震発生。復興庁が対応体制を構築" },
      { date: "2023-01-01", text: "前例として東日本大震災復興予算の積み上げ方式を参考に議論" },
    ],
    summaryBullets: [
      "復興費は初動の緊急対応費＋中長期の復興事業費に分かれる",
      "総額は年度・補正ごとに公表。一つの数字だけでは全体像が欠ける",
      "自治体交付金・インフラ復旧が中心",
    ],
    plainExplanation:
      "結論：能登半島地震（2024年1月）後、政府は2024年度以降の予算・補正予算・予備費など複数の枠で復旧・復興費を計上しています。総額は「初動＋復旧＋復興事業」と年度を跨ぐため、一つの公式数字だけでは全体を表しません。\n\n復興庁・財務省の資料では、2024年度の補正予算等で能登関連の歳出が段階的に計上されたと整理できます。2026年6月時点でも復旧工事・仮設住宅・産業支援等は継続中です。\n\n正確な累計額は、復興庁の事業別資料と各補正予算の概要が正本です。",
    glossary: [
      { term: "復興庁", definition: "2012年設置。大規模災害の復興を統括する組織" },
      { term: "補正予算", definition: "年度途中で追加する予算。災害対応で使われる" },
      { term: "予備費", definition: "事前に確保し、閣議決定で使途を決める経費" },
    ],
    primarySpeech: {
      date: "2024-04-01",
      nameOfMeeting: "予算・復興",
      speaker: "復興庁",
      speakerGroup: "政府",
      excerpt: "能登半島地震の復旧・復興事業費を2024年度予算等に計上。",
    },
    timeline: [
      { id: "nt-202401", date: "2024-01-01", summaryPlain: "能登半島地震発生。" },
      { id: "nt-202404", date: "2024-04-01", summaryPlain: "2024年度予算・補正で復旧復興費を計上。" },
      { id: "nt-202606", date: "2026-06-03", summaryPlain: "国会で能登支援・予備費をめぐる質疑継続。" },
    ],
    matrix: {
      parties: [
        {
          partyLabel: "政府（復興）",
          stance: { text: "能登半島地震の復旧・復興費を段階的に予算計上", sourceUrl: "https://www.reconstruction.go.jp/topics/main-cat3/sub-cat3-1/20240101_ishikawa/" },
          action: { text: "2024年度以降、補正・予備費等で継続投入", speechUrl: "https://www.mof.go.jp/policy/budget/budger_workflow/account/column/c20240201.html" },
          symbol: "▲",
          symbolReason: "復興費は投入されているが、野党は追加補正の遅れ等を指摘。総額の見え方は複雑",
        },
        {
          partyLabel: "野党（国会）",
          stance: { text: "能登への追加支援・補正編成の遅れを問題視", sourceUrl: "https://www.kantei.go.jp/jp/headline/noto/index.html" },
          action: { text: "2026年6月国会で予備費依存等を質疑", speechUrl: "https://www.reconstruction.go.jp/topics/main-cat3/sub-cat3-1/20240101_ishikawa/" },
          symbol: "❌",
          symbolReason: "政府の投入に対し、野党は速度・規模不足と国会で対立",
        },
      ],
    },
  },

  "gakushu-shien-75000": {
    nowSummary: {
      bullets: [
        "子ども・子育て支援法に基づく「子どもの学習・生活支援給付（学習支援費）」は、高校生等に年最大7万5000円（自治体が支給）",
        "2026年6月時点、制度は運用中。使途は学習教材・通信教育・塾・受験料等（子ども家庭庁・文部科学省案内）",
        "申請は原則オンライン（こども家庭庁システム）または自治体窓口。年度・学年で対象が異なる",
      ],
    },
    arcSummary: [
      { date: "2025-04-01", text: "2025年度も学習支援費を継続支給。対象学年・金額は案内どおり" },
      { date: "2024-04-01", text: "高校生等への年7万5000円上限の支援を本格運用" },
      { date: "2023-04-01", text: "子ども・子育て支援法の施行に伴い、学習支援給付の枠組みを整備" },
      { date: "2022-12-01", text: "こども未来戦略で学習支援の拡充を閣議決定" },
    ],
    summaryBullets: [
      "7万5000円は上限。実際の支給は申請内容・領収書等に基づく",
      "使えるもの：教材・通信教育・塾・受験料等（省庁ガイド参照）",
      "使えないもの：生活費全般・指定外の支出（要確認）",
    ],
    plainExplanation:
      "結論：高校生などを対象に、年最大7万5000円の「学習支援費」が自治体から支給される制度です。2026年6月時点も運用中です。\n\n使えるのは学習に直接関わる支出（教材、通信教育、塾、受験料等）が中心で、子ども家庭庁・文部科学省のガイドが正本です。申請はこども家庭庁のオンラインシステムまたは市区町村窓口から行います。\n\n金額は「上限7万5000円」であり、領収書等に基づき実費が支給されます。学年・年度で対象が異なるため、在籍校・自治体の案内を確認してください。",
    glossary: [
      { term: "学習支援費", definition: "子どもの学習・生活支援給付の通称。年上限7万5000円" },
      { term: "こども家庭庁", definition: "子ども・子育て政策を統括する中央省庁" },
      { term: "実費支給", definition: "領収書等に基づき、認められた支出を上限まで支給" },
    ],
    primarySpeech: {
      date: "2024-04-01",
      nameOfMeeting: "省庁案内",
      speaker: "子ども家庭庁",
      speakerGroup: "政府",
      excerpt: "高校生等への学習支援給付。年上限7万5000円。",
    },
    timeline: [
      { id: "gs-202304", date: "2023-04-01", summaryPlain: "子ども・子育て支援法施行。学習支援給付の枠組み。" },
      { id: "gs-202404", date: "2024-04-01", summaryPlain: "年7万5000円上限の支援を本格運用。" },
      { id: "gs-202504", date: "2025-04-01", summaryPlain: "2025年度も継続。申請・使途ガイド更新。" },
    ],
    matrix: {
      parties: [
        {
          partyLabel: "政府（実施）",
          stance: { text: "高校生等に年上限7万5000円の学習支援給付", sourceUrl: "https://www.cfa.go.jp/policies/gakushu_shien/" },
          action: { text: "2023年法施行→2024年本格運用。2026年も継続", speechUrl: "https://www.mext.go.jp/a_menu/shotou/gakushu_shien/" },
          symbol: "◎",
          symbolReason: "閣議・法に基づき制度を運用。上限・使途は案内どおり",
        },
        {
          partyLabel: "利用者（手続）",
          stance: { text: "申請・領収書提出が必要。自治体・年度で窓口が異なる", sourceUrl: "https://www.kantei.go.jp/jp/headline/kodomo_gakushu/index.html" },
          action: { text: "未申請の場合は支給なし", speechUrl: "https://www.cfa.go.jp/policies/gakushu_shien/" },
          symbol: "▲",
          symbolReason: "制度はあるが、申請・書類不備で受け取れないケースあり",
        },
      ],
    },
  },

  "denki-gas-genmen": {
    nowSummary: {
      bullets: [
        "2022〜2024年、電気・ガス料金の激変緩和として政府が事業者経由の支援（補助）を実施",
        "2026年6月時点、2024年9月に物価対策予備費から燃料油・エネルギー関連に充当した経緯あり（片山大臣国会答弁）",
        "2026年度の新規「一律値下げ」プログラムは、本記事整理時点で2023年型の継続とは限らない。省庁最新案内要確認",
      ],
    },
    arcSummary: [
      { date: "2024-09-01", text: "物価対策予備費から燃料油価格激変緩和等に充当（2024年9月使用決定）" },
      { date: "2023-01-01", text: "電気・ガス料金抑制のための支援事業を段階的に縮小・終了" },
      { date: "2022-01-01", text: "ウクライナ情勢等を背景に電気・ガス料金激変緩和事業を拡大" },
      { date: "2026-06-03", text: "国会で物価高止まり下のエネルギー対策・予備費使途を説明" },
    ],
    summaryBullets: [
      "2022〜23年の「激変緩和」は原則終了。2024年は予備費等の別枠",
      "家庭の請求額は契約・使用量・燃料費調整単価で変動",
      "2026年は個別の省庁・事業者キャンペーンを要確認",
    ],
    plainExplanation:
      "結論：2022〜2024年にかけて、政府は電気・ガス料金の急騰を抑える支援（激変緩和事業等）を実施しましたが、2023年を境に段階的に縮小・終了しています。2024年9月には物価対策予備費から燃料油関連の対策費が充当されました。\n\n2026年6月時点で、2022年型の「全国一律の電気・ガス値下げ」が継続しているわけではありません。家庭の光熱費は燃料費調整単価・契約プラン・使用量に依存します。\n\n最新の支援有無は経済産業省・資源エネルギー庁の料金・支援案内が正本です。",
    glossary: [
      { term: "激変緩和", definition: "電気・ガス料金の急激な値上がりを抑える政府支援事業" },
      { term: "燃料費調整", definition: "燃料価格変動を電気・ガス料金に反映する仕組み" },
      { term: "予備費", definition: "年度途中の急な支出に使う予算枠" },
    ],
    primarySpeech: {
      date: "2024-09-01",
      nameOfMeeting: "予算執行",
      speaker: "政府",
      speakerGroup: "物価対策",
      excerpt: "2024年9月、物価対策予備費を燃料油価格激変緩和等に充当。",
    },
    timeline: [
      { id: "dg-202201", date: "2022-01-01", summaryPlain: "電気・ガス激変緩和事業を拡大。" },
      { id: "dg-202301", date: "2023-01-01", summaryPlain: "激変緩和を段階縮小・終了方向へ。" },
      { id: "dg-202409", date: "2024-09-01", summaryPlain: "予備費から燃料油・エネルギー関連対策に充当。" },
    ],
    matrix: {
      parties: [
        {
          partyLabel: "政府（過去支援）",
          stance: { text: "2022〜23年電気・ガス激変緩和を実施し段階終了", sourceUrl: "https://www.enecho.meti.go.jp/category/electricity_and_gas/electric/price_electricity/" },
          action: { text: "2024年9月予備費で燃料油関連に追加", speechUrl: "https://www.kantei.go.jp/jp/headline/bouka_taisaku/index.html" },
          symbol: "▲",
          symbolReason: "大規模緩和は終了。2024年は別枠の対策のみ。2026年の継続型支援は限定",
        },
        {
          partyLabel: "家庭（請求）",
          stance: { text: "2026年の光熱費は契約・使用量・燃料費調整で変動", sourceUrl: "https://www.meti.go.jp/policy/energy_environment/electric_gas/electric/price.html" },
          action: { text: "一律値下げの継続は2022年型とは異なる", speechUrl: "https://www.enecho.meti.go.jp/category/electricity_and_gas/electric/price_electricity/" },
          symbol: "❌",
          symbolReason: "2022年型の全国一律支援は終了。個別契約・市場要因が支配的",
        },
      ],
    },
  },

  "pension-kuriage-70": {
    nowSummary: {
      bullets: [
        "老齢年金の「繰下げ受給」は、開始年齢を65歳以降（最大75歳）まで遅らせると、月額が増える制度（日本年金機構）",
        "70歳まで繰下げた場合、増加率は公表表により最大約42%増（開始年齢・種類で異なる）",
        "2026年6月時点、制度は継続。就労収入との関係・健康リスクは個人判断",
      ],
    },
    arcSummary: [
      { date: "2026-06-27", text: "繰下げ制度は継続。70歳開始の試算は年金機構シミュレーターが正本" },
      { date: "2022-04-01", text: "年金制度改革関連法で繰下げ上限75歳等を整備" },
      { date: "2013-04-01", text: "繰下げ受給の増加率を段階的に引き上げる改革" },
      { date: "2004-04-01", text: "年金制度改革で繰下げ・繰上げの選択肢を拡充" },
    ],
    summaryBullets: [
      "繰下げ1年ごとに月額が約0.7%増（制度上の増加率。詳細は年金機構表）",
      "70歳開始は65歳開始比で月額が大幅増だが、受給期間は短くなる",
      "就労中は在職老齢年金で一部控除あり",
    ],
    plainExplanation:
      "結論：年金を65歳より遅く受け取る「繰下げ」を選ぶと、月額が増えます。70歳まで繰下げた場合、日本年金機構の公表どおり最大で約42%程度月額が増える試算になります（年金種類・加入歴で異なります）。\n\nただし受給開始が遅れる分、総受給額が必ずしも増えるとは限りません。健康状態・就労の有無・配偶者の年金も影響します。\n\n正確な試算は日本年金機構の「ねんきん定期便」付表またはシミュレーションが正本です。",
    glossary: [
      { term: "繰下げ受給", definition: "老齢年金の開始を65歳以降に遅らせ、月額を増やす選択" },
      { term: "在職老齢年金", definition: "就労中に年金を受け取ると、収入に応じて一部減額される制度" },
      { term: "老齢基礎年金", definition: "国民年金ベースの老齢年金。繰下げ対象" },
    ],
    primarySpeech: {
      date: "2022-04-01",
      nameOfMeeting: "制度案内",
      speaker: "日本年金機構",
      speakerGroup: "公的制度",
      excerpt: "繰下げ受給。開始年齢を遅らせるほど月額が増加。",
    },
    timeline: [
      { id: "pk-200404", date: "2004-04-01", summaryPlain: "繰下げ・繰上げ選択肢を拡充。" },
      { id: "pk-202204", date: "2022-04-01", summaryPlain: "繰下げ上限75歳等を整備。" },
      { id: "pk-202606", date: "2026-06-27", summaryPlain: "繰下げ制度継続。試算は年金機構が正本。" },
    ],
    matrix: {
      parties: [
        {
          partyLabel: "公的制度",
          stance: { text: "繰下げで月額増。70歳開始で最大約42%増（公表表）", sourceUrl: "https://www.nenkin.go.jp/service/kounen/kuriage/index.html" },
          action: { text: "2026年も制度継続。シミュレーターで試算可能", speechUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/nenkin/nenkin/index.html" },
          symbol: "◎",
          symbolReason: "制度は公表どおり運用。増加率は法・表に基づき確定",
        },
        {
          partyLabel: "受給者（選択）",
          stance: { text: "長生きリスク・就労収入で総額は個人差", sourceUrl: "https://www.nenkin.go.jp/service/kounen/nenkinshurui/index.html" },
          action: { text: "繰下げは任意。開始後の取り消し不可", speechUrl: "https://www.nenkin.go.jp/service/kounen/kuriage/index.html" },
          symbol: "▲",
          symbolReason: "月額増だが受給期間短縮。就労中は控除あり",
        },
      ],
    },
  },

  "minimum-wage-2026": {
    nowSummary: {
      bullets: [
        "2025年度（2025年10月〜）の全国加重平均最低賃金は1,055円（2024年度1,023円から32円引上げ）",
        "2026年度（2026年10月〜）の改定額は2026年8〜9月の中央最低賃金審議会で決定予定（2026年6月時点未決）",
        "政府は「賃上げ・最低賃金引上げ」を成長戦略の柱として継続表明",
      ],
    },
    arcSummary: [
      { date: "2025-10-01", text: "2025年度最低賃金改定を各都道府県が適用。全国平均1,055円" },
      { date: "2024-10-01", text: "2024年度は全国平均1,023円（63円増）" },
      { date: "2023-07-01", text: "2023年度は全国平均1,004円。初の1000円超" },
      { date: "2026-06-03", text: "国会で賃上げ・物価対策をめぐる議論継続" },
    ],
    summaryBullets: [
      "都道府県ごとに最低賃金が異なる（東京最高・地方は低め）",
      "2026年度額は2026年8月頃の審議会目安",
      "アルバイト・パートの時給に直接影響",
    ],
    plainExplanation:
      "結論：2025年度（2025年10月から）の全国平均最低賃金は1,055円です。2026年6月時点、2026年度（2026年10月開始）の新しい額はまだ決まっておらず、2026年8〜9月の最低賃金審議会で議論・決定される見込みです。\n\n最低賃金は都道府県ごとに異なり、東京など都市部は1,200円前後、地方は900円台もあります。自分の勤務地は都道府県労働局の一覧が正本です。\n\n2024年度は1,023円、2023年度は1,004円と、ここ数年は30〜60円程度の引上げが続いています。",
    glossary: [
      { term: "最低賃金", definition: "法律で定める賃金の下限。都道府県ごとに異なる" },
      { term: "加重平均", definition: "労働者数で重み付けした全国平均" },
      { term: "審議会", definition: "労使・公益代表で最低賃金改定額を議論する機関" },
    ],
    primarySpeech: {
      date: "2025-10-01",
      nameOfMeeting: "厚労省公表",
      speaker: "厚生労働省",
      speakerGroup: "政府",
      excerpt: "2025年度全国加重平均最低賃金1,055円。",
    },
    timeline: [
      { id: "mw-202310", date: "2023-10-01", summaryPlain: "2023年度全国平均1,004円。初の1000円超。" },
      { id: "mw-202510", date: "2025-10-01", summaryPlain: "2025年度全国平均1,055円に改定。" },
      { id: "mw-202609", date: "2026-09-01", summaryPlain: "2026年度改定額の決定予定（2026年6月時点未決）。" },
    ],
    matrix: {
      parties: [
        {
          partyLabel: "政府・審議会",
          stance: { text: "2025年度全国平均1,055円。2026年度は審議会で決定予定", sourceUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/minimumichiran/" },
          action: { text: "2025年10月改定済み。2026年度は2026年8〜9月が目安", speechUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/chingin/" },
          symbol: "▲",
          symbolReason: "2025年度は実施済み。2026年度額は2026年6月時点未決で「これから」",
        },
        {
          partyLabel: "労使（要求）",
          stance: { text: "労側は大幅引上げ、資側は負担増を懸念", sourceUrl: "https://www.kantei.go.jp/jp/headline/chingin/index.html" },
          action: { text: "2026年審議会で交渉予定", speechUrl: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/minimumichiran/" },
          symbol: "▲",
          symbolReason: "毎年の引上げは継続傾向だが、幅は審議会次第",
        },
      ],
    },
  },

  "expo2025-kessan": {
    nowSummary: {
      bullets: [
        "大阪・関西万博2025は2025年4月13日〜10月13日開催。入場者数は約2850万人（主催者発表）",
        "2026年6月時点、最終的な事業収支・公費負担の確定値は主催者・国の精算報告待ち",
        "当初予算からの超過・協賛収入・入場者数の報道値は時点で変動。確定は決算資料が正本",
      ],
    },
    arcSummary: [
      { date: "2025-10-13", text: "万博2025閉幕。入場者約2850万人（主催者）" },
      { date: "2025-04-13", text: "開幕。夢洲会場で157日間開催" },
      { date: "2018-11-01", text: "巴黎万博で大阪の開催が決定" },
      { date: "2026-06-27", text: "閉幕後の精算・公費負担額は段階的に公表予定" },
    ],
    summaryBullets: [
      "公費は国・大阪府・大阪市・民間協賛等の組合せ",
      "入場者2850万人は主催者目標を上回ったが、収支は別問題",
      "最終赤字額は2025年度決算・協会報告待ち",
    ],
    plainExplanation:
      "結論：大阪・関西万博2025は2025年10月に閉幕し、入場者数は約2850万人でした（主催者発表）。2026年6月時点、国・地方・協会が負担する公費の「最終確定額」は、精算・決算報告が出揃うまで一本の数字にまとまりません。\n\n開催前に報道された事業費・公費負担の試算は、その後の入場者数・協賛収入・工事費で変動します。確定値は万博協会の決算と国の会計検査院資料が正本です。\n\n「公費は最終いくらか」への答えは、2026年6月時点では「確定報告待ち。2850万人入場は事実」と整理するのが正確です。",
    glossary: [
      { term: "夢洲", definition: "大阪・関西万博2025の会場（人工島）" },
      { term: "協賛収入", definition: "企業・団体からのスポンサー収入。事業費を下げる" },
      { term: "事業収支", definition: "入場料・協賛等の収入と建設・運営費の差" },
    ],
    primarySpeech: {
      date: "2025-10-13",
      nameOfMeeting: "閉幕",
      speaker: "日本協会2025大阪・関西万博",
      speakerGroup: "主催者",
      excerpt: "万博2025閉幕。入場者約2850万人。",
    },
    timeline: [
      { id: "ex-202504", date: "2025-04-13", summaryPlain: "大阪・関西万博2025開幕。" },
      { id: "ex-202510", date: "2025-10-13", summaryPlain: "閉幕。入場者約2850万人（主催者）。" },
      { id: "ex-202606", date: "2026-06-27", summaryPlain: "事業収支・公費負担の精算報告待ち。" },
    ],
    matrix: {
      parties: [
        {
          partyLabel: "主催者",
          stance: { text: "2850万人入場で閉幕。収支精算中", sourceUrl: "https://www.expo2025.or.jp/" },
          action: { text: "2025年10月閉幕。決算公表は段階的", speechUrl: "https://www.kantei.go.jp/jp/headline/expo2025/index.html" },
          symbol: "▲",
          symbolReason: "開催は完了。公費最終額は2026年6月時点で未確定",
        },
        {
          partyLabel: "国・会計",
          stance: { text: "公費負担は一般会計・補正等から。最終額は決算待ち", sourceUrl: "https://www.mof.go.jp/policy/budget/budger_workflow/account/column/" },
          action: { text: "精算・監査後に確定公表", speechUrl: "https://www.expo2025.or.jp/" },
          symbol: "❌",
          symbolReason: "入場者数は公表済みだが、最終公費負担額は2026年6月時点で確定報告前",
        },
      ],
    },
  },

  "zeihikaku-kojo": {
    nowSummary: {
      bullets: [
        "「給付付き税額控除」は、消費税を下げる代わりに、所得に応じて給付と税額控除を組み合わせる案（与野党で議論）",
        "2026年6月時点、食料品消費税ゼロ公約は未実施。政府は「ゼロまでのつなぎ」として2年間ゼロ＋給付付き控除への移行を検討中と説明",
        "社会保障国民会議で2026年夏前に中間まとめ予定。制度設計・財源は未確定",
      ],
    },
    arcSummary: [
      { date: "2026-06-27", text: "消費税ゼロ公約は未実施。給付付き控除は検討中" },
      { date: "2026-04-22", text: "片山財務大臣、2年間の食料品ゼロを「つなぎ」として検討と国会表明" },
      { date: "2023-10-30", text: "与野党で食料品ゼロと給付付き控除を並行議論" },
      { date: "2022-01-01", text: "物価高を契機に消費税減税・給付の議論が再燃" },
    ],
    summaryBullets: [
      "ゼロ公約の「代替」として政府が説明する選択肢の一つ",
      "低所得者への給付＋全世帯への控除を組み合わせるイメージ",
      "財源・制度設計・実施時期は2026年夏の中間まとめ待ち",
    ],
    plainExplanation:
      "結論：「給付付き税額控除」とは、消費税率を下げる代わりに、所得に応じて現金給付と税額控除を組み合わせ、手取りを増やす制度案です。2026年6月時点、食料品消費税ゼロの公約は未実施で、政府は「給付付き控除を整備するまでのつなぎ」として2年間の食料品ゼロを検討中と国会で説明しています。\n\n2023年から与野党で「一律ゼロ」と「給付付き控除」の両方が議論されています。社会保障国民会議で2026年夏前に中間まとめが予定され、詳細はそこが分岐点です。\n\n正本は財務省・内閣府の国民会議資料と国会答弁です。",
    glossary: [
      { term: "給付付き税額控除", definition: "給付と税額控除を組み合わせ、実質負担を下げる制度案" },
      { term: "社会保障国民会議", definition: "社会保障と税の一体改革を議論する場" },
      { term: "つなぎ措置", definition: "本制度整備までの暫定策。2年間ゼロ案が該当" },
    ],
    primarySpeech: {
      date: "2026-04-22",
      nameOfMeeting: "国会",
      speaker: "片山さつき",
      speakerGroup: "自由民主党",
      excerpt: "給付付き税額控除までのつなぎとして2年間の食料品消費税ゼロを検討。",
    },
    timeline: [
      { id: "zk-202310", date: "2023-10-30", summaryPlain: "与野党で食料品ゼロと給付付き控除を議論。" },
      { id: "zk-202604", date: "2026-04-22", summaryPlain: "政府、2年間ゼロをつなぎ措置として検討と表明。" },
      { id: "zk-202606", date: "2026-06-27", summaryPlain: "国民会議で夏前中間まとめ予定。ゼロ公約は未実施。" },
    ],
    matrix: {
      parties: [
        {
          partyLabel: "政府",
          stance: { text: "給付付き控除を整備。其の前のつなぎとして2年間ゼロを検討", sourceUrl: "https://www.kantei.go.jp/jp/headline/shouhizei/index.html" },
          action: { text: "2026年夏前に国民会議中間まとめ予定", speechUrl: "https://www.mof.go.jp/tax_policy/tax_reform/outline/index.html" },
          symbol: "▲",
          symbolReason: "公約（ゼロ）未実施。代替案として給付付き控除を説明するが制度未成立",
        },
        {
          partyLabel: "野党（要求）",
          stance: { text: "早期の食料品消費税ゼロまたは同等の手取り増を要求", sourceUrl: "https://www.soumu.go.jp/main_sosiki/jichi_gyousei/covid19/kokumin_kaigi/index.html" },
          action: { text: "2026年国会で減税時期を質疑", speechUrl: "https://www.kantei.go.jp/jp/headline/shouhizei/index.html" },
          symbol: "❌",
          symbolReason: "公約・要求に対し2026年6月時点で税率変更・給付付き控除成立なし",
        },
      ],
    },
  },
};
