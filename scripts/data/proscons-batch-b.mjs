/**
 * prosCons 一括データ（batch B）
 * node scripts/apply-proscons-all.mjs で記事JSONへ適用
 */
export const PROSCONS_BATCH_B = {
  "kishida-resign": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "第221回国会で新政権が審議を開始",
        figure: "221回",
        text: "令和8年6月、第221回国会で高市内閣の閣僚が予算委員会・決算行政監視委員会等に出席し、新政権下の国会審議が本格化した。",
        sourceUrl:
          "https://kokkai.ndl.go.jp/txt/122104127X00220260603/44",
        sourceLabel: "国会議事録（2026-06-03）",
        sourceDate: "2026-06-03",
      },
      {
        headline: "財政改革と賃上げを同時に表明",
        figure: "2026-06-03",
        text: "片山さつき財務大臣は高市内閣でも賃上げ促進・実質賃金プラスを最大目標の一つとし、財政の持続可能性に配慮した予算編成改革を進めると答弁した。",
        sourceUrl:
          "https://kokkai.ndl.go.jp/txt/122104127X00220260603/44",
        sourceLabel: "国会議事録（決算行政監視委員会）",
        sourceDate: "2026-06-03",
      },
    ],
    demerits: [
      {
        headline: "臨時会召集の期限規定が未整備",
        figure: "4分の1以上",
        text: "憲法53条は議員4分の1超の要求で臨時会召集を義務付けるが、召集期限を定める規定はなく、参政党は憲法改正による期限設定が必要と主張した。",
        sourceUrl:
          "https://kokkai.ndl.go.jp/txt/122104183X00820260604/12",
        sourceLabel: "国会議事録（憲法審査会）",
        sourceDate: "2026-06-04",
      },
      {
        headline: "国民投票のネット世論操作リスク",
        figure: "8700万人",
        text: "和田政宗（参政党）は、ケンブリッジ・アナリティカ事件で8700万人分のFacebook個人情報が不正取得され選挙に影響した例を挙げ、国民投票法のネット規制整備の必要性を訴えた。",
        sourceUrl:
          "https://kokkai.ndl.go.jp/txt/122104183X00820260604/12",
        sourceLabel: "国会議事録（憲法審査会）",
        sourceDate: "2026-06-04",
      },
    ],
  },

  "komei-kokumin": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "5派超党派で教育法附帯決議",
        figure: "5派",
        text: "2026-06-09、参院文教科学委員会で自民・立憲・国民民主・公明・維新の5派が学校教育法改正に共同附帯決議を提出し、超党派合意が形成された。",
        sourceUrl:
          "https://kokkai.ndl.go.jp/txt/122115104X00920260609/73",
        sourceLabel: "国会議事録（文教科学委員会）",
        sourceDate: "2026-06-09",
      },
      {
        headline: "附帯決議16項目でデジタル教科書を具体化",
        figure: "16項目",
        text: "附帯決議はアクセシビリティ、教員支援、端末購入支援、通信環境整備など16項目を盛り込み、デジタル教科書導入の配慮事項を網羅した。",
        sourceUrl:
          "https://kokkai.ndl.go.jp/txt/122115104X00920260609/73",
        sourceLabel: "国会議事録（附帯決議案）",
        sourceDate: "2026-06-09",
      },
    ],
    demerits: [
      {
        headline: "国民投票法改正は4会派にとどまる",
        figure: "4会派",
        text: "2026-06-11、国民投票法三項目改正案は自民・維新・国民民主・参政党の4会派共同提案にとどまり、立憲・公明等は含まれない。",
        sourceUrl:
          "https://kokkai.ndl.go.jp/txt/122104183X00920260611/2",
        sourceLabel: "国会議事録（憲法審査会）",
        sourceDate: "2026-06-11",
      },
      {
        headline: "与党間の憲法9条論点に隔たり",
        figure: "3項目",
        text: "国民投票法改正は開票立会人・投票立会人・FM広報の3項目に限定され、玉木雄一郎（国民民主）は憲法改正論点を選挙制度整備に絞るべきと指摘した。",
        sourceUrl:
          "https://kokkai.ndl.go.jp/txt/122104183X00920260611/2",
        sourceLabel: "国会議事録（憲法審査会）",
        sourceDate: "2026-06-11",
      },
    ],
  },

  "shussho-budget-seika": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "3.6兆円規模の加速化プラン",
        figure: "3.6兆円",
        text: "2023年12月閣議決定「こども未来戦略」は、3.6兆円規模の「こども・子育て支援加速化プラン」を掲げ、2026年度まで集中実施する方針を示した。",
        sourceUrl: "https://www.cfa.go.jp/policies/kodomo-mirai/",
        sourceLabel: "子ども家庭庁（こども未来戦略）",
        sourceDate: "2023-12-22",
      },
      {
        headline: "令和6年度に1.3兆円程度を前倒し",
        figure: "1.3兆円程度",
        text: "参院調査室資料は、加速化プランのうち1.3兆円程度を令和6年度予算で前倒し実施すると整理している。",
        sourceUrl:
          "https://www8.cao.go.jp/cstp/whitepaper/r06/honpen/html/i1110000.html",
        sourceLabel: "内閣府（科学技術・イノベーション白書）",
        sourceDate: "2024-02-07",
      },
    ],
    demerits: [
      {
        headline: "2025年の合計特殊出生率は1.14",
        figure: "1.14",
        text: "厚労省公表の2025年人口動態統計では、合計特殊出生率は1.14（前年1.15から低下）と、出生率の改善は確認できない。",
        sourceUrl:
          "https://www8.cao.go.jp/cstp/whitepaper/r06/honpen/html/i1110000.html",
        sourceLabel: "内閣府（2025年人口動態）",
        sourceDate: "2026-02-01",
      },
      {
        headline: "出生数は67万1236人で1万4937人減",
        figure: "67万1236人",
        text: "2025年の出生数は67万1236人で、前年比1万4937人減。3.6兆円プラン公表から約2年6カ月経過しても出生数の増加は見られない。",
        sourceUrl:
          "https://www.mhlw.go.jp/stf/houdou/0000198851_00001.html",
        sourceLabel: "厚生労働省",
        sourceDate: "2026-02-01",
      },
    ],
  },

  "zeihikaku-kojo": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "2年間の食料品ゼロをつなぎ措置として検討",
        figure: "2年間",
        text: "片山財務大臣は2026-04-22、給付付き税額控除を整備するまでの「つなぎ」として2年間の食料品消費税ゼロを検討すると国会で表明した。",
        sourceUrl:
          "https://www.mof.go.jp/tax_policy/tax_reform/outline/index.html",
        sourceLabel: "財務省（税制改正大綱）",
        sourceDate: "2026-04-22",
      },
      {
        headline: "2026年夏前に中間まとめ予定",
        figure: "2026年夏",
        text: "社会保障国民会議では2026年夏前に中間まとめが予定され、給付付き税額控除の制度設計が議論される見込みである。",
        sourceUrl:
          "https://www.soumu.go.jp/main_sosiki/jichi_gyousei/covid19/kokumin_kaigi/index.html",
        sourceLabel: "総務省（社会保障国民会議）",
        sourceDate: "2026-06-27",
      },
    ],
    demerits: [
      {
        headline: "食料品消費税ゼロ公約は未実施",
        figure: "2026年6月",
        text: "2026年6月時点、食料品消費税ゼロの公約は未実施。政府は代替案として給付付き控除への移行を検討中と説明している。",
        sourceUrl:
          "https://www.kantei.go.jp/jp/headline/shouhizei/index.html",
        sourceLabel: "内閣府（消費税関連）",
        sourceDate: "2026-06-27",
      },
      {
        headline: "財源・制度設計は未確定",
        figure: "2023年10月",
        text: "2023年10月から与野党で「一律ゼロ」と「給付付き控除」が並行議論されているが、2026年6月時点で財源・制度設計・実施時期は確定していない。",
        sourceUrl:
          "https://www.kantei.go.jp/jp/headline/shouhizei/index.html",
        sourceLabel: "内閣府（消費税関連）",
        sourceDate: "2023-10-30",
      },
    ],
  },

  "expo2025-kessan": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "入場者約2850万人",
        figure: "約2850万人",
        text: "大阪・関西万博2025は2025年10月13日に閉幕し、入場者数は約2850万人（主催者発表）で、主催者目標を上回った。",
        sourceUrl:
          "https://www.kantei.go.jp/jp/headline/expo2025/index.html",
        sourceLabel: "内閣府（万博2025）",
        sourceDate: "2025-10-13",
      },
      {
        headline: "157日間の開催",
        figure: "157日間",
        text: "2025年4月13日から夢洲会場で157日間開催され、国際博覧会としての開催期間を完遂した。",
        sourceUrl: "https://www.expo2025.or.jp/",
        sourceLabel: "大阪・関西万博2025公式",
        sourceDate: "2025-04-13",
      },
    ],
    demerits: [
      {
        headline: "公費負担の最終確定額は未公表",
        figure: "2026年6月",
        text: "2026年6月時点、国・地方・協会が負担する公費の最終確定額は精算・決算報告が出揃うまで一本の数字にまとまらない。",
        sourceUrl:
          "https://www.mof.go.jp/policy/budget/budger_workflow/account/column/",
        sourceLabel: "財務省（会計）",
        sourceDate: "2026-06-27",
      },
      {
        headline: "事業収支は入場者数と別問題",
        figure: "2850万人",
        text: "入場者2850万人は主催者目標を上回ったが、協賛収入・工事費・運営費を踏まえた事業収支の最終赤字額は2025年度決算待ちである。",
        sourceUrl:
          "https://www.kantei.go.jp/jp/headline/expo2025/index.html",
        sourceLabel: "内閣府（万博2025）",
        sourceDate: "2025-10-13",
      },
    ],
  },

  "minimum-wage-2026": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "2025年度全国平均1,055円",
        figure: "1,055円",
        text: "2025年度（2025年10月〜）の全国加重平均最低賃金は1,055円に改定され、2024年度1,023円から32円引上げられた。",
        sourceUrl:
          "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/chingin/",
        sourceLabel: "厚生労働省",
        sourceDate: "2025-10-01",
      },
      {
        headline: "2023年度に初の1000円超",
        figure: "1,004円",
        text: "2023年度の全国加重平均最低賃金は1,004円で、初めて1000円を超えた。2024年度は1,023円（63円増）と段階的に引上げが続いている。",
        sourceUrl:
          "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/minimumichiran/",
        sourceLabel: "厚生労働省（最低賃金一覧）",
        sourceDate: "2023-10-01",
      },
    ],
    demerits: [
      {
        headline: "2026年度改定額は未決",
        figure: "2026年8〜9月",
        text: "2026年度（2026年10月〜）の改定額は2026年8〜9月の中央最低賃金審議会で決定予定で、2026年6月時点では未決である。",
        sourceUrl:
          "https://www.kantei.go.jp/jp/headline/chingin/index.html",
        sourceLabel: "内閣府（賃金関連）",
        sourceDate: "2026-09-01",
      },
      {
        headline: "都道府県間の格差が大きい",
        figure: "32円",
        text: "2025年度の全国平均引上げは32円だが、都道府県ごとに最低賃金は異なり、東京など都市部は1,200円前後、地方は900円台もあり格差が残る。",
        sourceUrl:
          "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/minimumichiran/",
        sourceLabel: "厚生労働省（最低賃金一覧）",
        sourceDate: "2025-10-01",
      },
    ],
  },

  "pension-kuriage-70": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "70歳開始で月額最大約42%増",
        figure: "約42%",
        text: "老齢年金を70歳まで繰下げた場合、日本年金機構の公表どおり最大で約42%程度月額が増える試算になる（年金種類・加入歴で異なる）。",
        sourceUrl:
          "https://www.nenkin.go.jp/service/kounen/kuriage/index.html",
        sourceLabel: "日本年金機構",
        sourceDate: "2026-06-27",
      },
      {
        headline: "繰下げ上限75歳まで選択可能",
        figure: "75歳",
        text: "2022年4月施行の年金制度改革関連法により、老齢年金の繰下げ受給は65歳以降最大75歳まで選択できる。",
        sourceUrl:
          "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/nenkin/nenkin/index.html",
        sourceLabel: "厚生労働省",
        sourceDate: "2022-04-01",
      },
    ],
    demerits: [
      {
        headline: "繰下げ1年ごとに約0.7%増",
        figure: "約0.7%",
        text: "繰下げ1年ごとに月額が約0.7%増加する制度上の増加率だが、受給開始が遅れる分、総受給額が必ずしも増えるとは限らない。",
        sourceUrl:
          "https://www.nenkin.go.jp/service/kounen/kuriage/index.html",
        sourceLabel: "日本年金機構",
        sourceDate: "2026-06-27",
      },
      {
        headline: "就労中は在職老齢年金で控除",
        figure: "65歳",
        text: "標準的な開始年齢は65歳。70歳まで繰下げると月額は増えるが受給期間は短くなり、就労中は在職老齢年金で一部減額される。",
        sourceUrl:
          "https://www.nenkin.go.jp/service/kounen/nenkinshurui/index.html",
        sourceLabel: "日本年金機構",
        sourceDate: "2026-06-27",
      },
    ],
  },

  "denki-gas-genmen": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "2022〜2024年に激変緩和を実施",
        figure: "2022〜2024年",
        text: "2022年からウクライナ情勢等を背景に電気・ガス料金激変緩和事業を拡大し、2022〜2024年にかけて政府が事業者経由の支援を実施した。",
        sourceUrl:
          "https://www.enecho.meti.go.jp/category/electricity_and_gas/electric/price_electricity/",
        sourceLabel: "資源エネルギー庁",
        sourceDate: "2022-01-01",
      },
      {
        headline: "2024年9月に予備費で燃料油対策",
        figure: "2024年9月",
        text: "2024年9月、物価対策予備費から燃料油価格激変緩和等に充当され、エネルギー関連の対策費が計上された。",
        sourceUrl:
          "https://www.meti.go.jp/policy/energy_environment/electric_gas/electric/price.html",
        sourceLabel: "経済産業省",
        sourceDate: "2024-09-01",
      },
    ],
    demerits: [
      {
        headline: "2023年を境に段階縮小・終了",
        figure: "2023年",
        text: "2023年1月以降、電気・ガス料金抑制のための激変緩和事業は段階的に縮小・終了方向に移行した。",
        sourceUrl:
          "https://www.kantei.go.jp/jp/headline/bouka_taisaku/index.html",
        sourceLabel: "内閣府（物価対策）",
        sourceDate: "2023-01-01",
      },
      {
        headline: "2026年は2022年型一律値下げ非継続",
        figure: "2026年6月",
        text: "2026年6月時点、2022年型の「全国一律の電気・ガス値下げ」は継続していない。家庭の光熱費は燃料費調整単価等に依存する。",
        sourceUrl:
          "https://www.enecho.meti.go.jp/category/electricity_and_gas/electric/price_electricity/",
        sourceLabel: "資源エネルギー庁",
        sourceDate: "2026-06-03",
      },
    ],
  },

  "gakushu-shien-75000": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "年上限7万5000円の学習支援",
        figure: "7万5000円",
        text: "子ども・子育て支援法に基づく学習支援給付は、高校生等に年最大7万5000円を自治体が支給する制度である。",
        sourceUrl: "https://www.cfa.go.jp/policies/gakushu_shien/",
        sourceLabel: "子ども家庭庁",
        sourceDate: "2024-04-01",
      },
      {
        headline: "2024年4月から本格運用",
        figure: "2024年4月",
        text: "2024年4月から年7万5000円上限の支援が本格運用され、2025年度も継続支給されている。",
        sourceUrl:
          "https://www.mext.go.jp/a_menu/shotou/gakushu_shien/",
        sourceLabel: "文部科学省",
        sourceDate: "2024-04-01",
      },
    ],
    demerits: [
      {
        headline: "実費支給のため上限に届かない場合あり",
        figure: "7万5000円",
        text: "7万5000円は上限であり、領収書等に基づく実費支給のため、学習支出が少ない世帯は上限に届かない場合がある。",
        sourceUrl: "https://www.cfa.go.jp/policies/gakushu_shien/",
        sourceLabel: "子ども家庭庁",
        sourceDate: "2024-04-01",
      },
      {
        headline: "2023年4月施行から運用まで約1年",
        figure: "2023年4月",
        text: "2023年4月に子ども・子育て支援法が施行され枠組みが整備されたが、7万5000円上限の本格運用は2024年4月からで、約1年の準備期間があった。",
        sourceUrl: "https://www.cfa.go.jp/policies/gakushu_shien/",
        sourceLabel: "子ども家庭庁",
        sourceDate: "2023-04-01",
      },
    ],
  },

  "noto-fukko-budget": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "2024年度予算・補正で復旧復興費を計上",
        figure: "2024年度",
        text: "2024年1月の能登半島地震後、政府は2024年度予算・補正予算等で能登関連の復旧・復興事業費を段階的に計上した。",
        sourceUrl:
          "https://www.mof.go.jp/policy/budget/budger_workflow/account/column/c20240201.html",
        sourceLabel: "財務省",
        sourceDate: "2024-04-01",
      },
      {
        headline: "2024年1月から復興庁が対応",
        figure: "2024年1月",
        text: "2024年1月1日の能登半島地震発生後、復興庁が対応体制を構築し、復旧・復興事業を開始した。",
        sourceUrl:
          "https://www.reconstruction.go.jp/topics/main-cat3/sub-cat3-1/20240101_ishikawa/",
        sourceLabel: "復興庁",
        sourceDate: "2024-01-01",
      },
    ],
    demerits: [
      {
        headline: "総額は単一数字に集約しにくい",
        figure: "2026年6月",
        text: "復興費は初動の緊急対応費＋中長期の復興事業費に分かれ、年度・補正を跨ぐため2026年6月時点で累計を一本化した公表数字はない。",
        sourceUrl:
          "https://www.mof.go.jp/policy/budget/budger_workflow/account/column/c20240201.html",
        sourceLabel: "財務省",
        sourceDate: "2026-06-27",
      },
      {
        headline: "2026年も追加支援の遅れを問題視",
        figure: "2026-06-03",
        text: "2026年6月3日の国会でも、能登半島地震への補正予算未編成や予備費依存をめぐる野党からの質疑が継続している。",
        sourceUrl: "https://www.kantei.go.jp/jp/headline/noto/index.html",
        sourceLabel: "内閣府（能登関連）",
        sourceDate: "2026-06-03",
      },
    ],
  },

  "boei-tokubetsuzei": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "2024年分から徴収開始",
        figure: "2024年分",
        text: "防衛特別所得税は2024年分の所得税から上乗せ徴収が開始され、2025年分の源泉徴収でも給与所得者に反映されている。",
        sourceUrl:
          "https://www.mof.go.jp/tax_policy/summary/income/b04.htm",
        sourceLabel: "財務省（所得税概要）",
        sourceDate: "2024-04-01",
      },
      {
        headline: "所得に応じた上乗せ税率1.0%〜",
        figure: "1.0%〜",
        text: "財務省の説明では、所得に応じた上乗せ税率（1.0%〜）が設定され、高所得ほど負担が大きくなる累進構造になっている。",
        sourceUrl:
          "https://www.mof.go.jp/tax_policy/summary/income/b04.htm",
        sourceLabel: "財務省（所得税概要）",
        sourceDate: "2024-04-01",
      },
    ],
    demerits: [
      {
        headline: "2022年12月に閣議決定された新税目",
        figure: "2022年12月",
        text: "防衛力強化のための財源確保として2022年12月に閣議決定され、国民の所得税に恒久的な上乗せ負担が生じた。",
        sourceUrl:
          "https://www.mof.go.jp/tax_policy/summary/income/b04.htm",
        sourceLabel: "財務省（所得税概要）",
        sourceDate: "2022-12-01",
      },
      {
        headline: "防衛費GDP比2%方向で追加財源議論継続",
        figure: "2%",
        text: "2022年6月から防衛費GDP比2%方向の議論が本格化し、2026年6月時点でも安保三文書改定に伴う追加財源の議論が国会で継続している。",
        sourceUrl: "https://www.kantei.go.jp/jp/headline/bouei/index.html",
        sourceLabel: "内閣府（防衛関連）",
        sourceDate: "2026-06-03",
      },
    ],
  },

  "invoice-menzei-2026": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "2026年10月31日まで登録義務を猶予",
        figure: "2026年10月31日",
        text: "年間売上1000万円以下の免税事業者は2割特例の届出をしていれば、2026年10月31日までインボイス登録義務を猶予できる。",
        sourceUrl:
          "https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/invoice_about.htm",
        sourceLabel: "国税庁",
        sourceDate: "2023-10-01",
      },
      {
        headline: "売上1000万円以下が対象",
        figure: "1000万円以下",
        text: "2割特例は年間売上1000万円以下の免税事業者が対象で、課税売上割合が2割以下なら経過措置を利用できる。",
        sourceUrl:
          "https://www.invoice-kohyo.mof.go.jp/about.html",
        sourceLabel: "適格請求書発行事業者公表サイト",
        sourceDate: "2023-10-01",
      },
    ],
    demerits: [
      {
        headline: "経過措置終了まで約4カ月",
        figure: "約4カ月",
        text: "2026年6月時点、2割特例の経過措置終了（2026年10月31日）まで約4カ月。届出・登録の確認が迫っている。",
        sourceUrl:
          "https://www.meti.go.jp/policy/it_policy/invoicing/invoice_about/index.html",
        sourceLabel: "経済産業省",
        sourceDate: "2026-06-27",
      },
      {
        headline: "2023年10月から本格運用",
        figure: "2023年10月1日",
        text: "2023年10月1日からインボイス制度が本格運用され、免税事業者にも登録・届出の対応が求められるようになった。",
        sourceUrl:
          "https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/invoice_about.htm",
        sourceLabel: "国税庁",
        sourceDate: "2023-10-01",
      },
    ],
  },

  "teigaku-kyufu-2024": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "世帯員に原則3万円",
        figure: "3万円",
        text: "2024年6月から全国の市区町村が定額給付金（3万円）の支給手続きを開始。対象世帯の世帯員に原則3万円が支給された。",
        sourceUrl:
          "https://www.soumu.go.jp/main_sosiki/jichi_gyousei/covid19/kyufukin/teigaku.html",
        sourceLabel: "総務省（定額給付金）",
        sourceDate: "2024-06-01",
      },
      {
        headline: "2024年4月に物価高対策として決定",
        figure: "2024年4月",
        text: "2024年度予算等を踏まえ、物価高対策として2024年定額給付（3万円）が決定された。",
        sourceUrl:
          "https://www.kantei.go.jp/jp/headline/bonus/index.html",
        sourceLabel: "内閣府（定額給付）",
        sourceDate: "2024-04-01",
      },
    ],
    demerits: [
      {
        headline: "2026年6月時点で受付終了",
        figure: "2026年6月",
        text: "2026年6月時点、2024年分の受付・支給は終了済み。未申請・未受領の救済は自治体の個別相談に依存する。",
        sourceUrl:
          "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000126907_00001.html",
        sourceLabel: "厚生労働省",
        sourceDate: "2026-06-27",
      },
      {
        headline: "2023年7万円から2024年3万円へ減額",
        figure: "7万円",
        text: "2023年の定額給付は7万円だったが、2024年は3万円に減額された。物価高対策としての手当感は前年度より弱い。",
        sourceUrl:
          "https://www.kantei.go.jp/jp/headline/bonus/index.html",
        sourceLabel: "内閣府（定額給付）",
        sourceDate: "2023-11-01",
      },
    ],
  },

  "fukushuto-koso": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "2011年震災後に首脳会談で再燃",
        figure: "2011年7月1日",
        text: "2011年7月1日、橋下大阪府知事と石原東京都知事が副首都構想で会談し、東日本大震災後に首都機能分散の議論が再燃した。",
        sourceUrl:
          "https://mainichi.jp/articles/20260613/k00/00m/010/024000c",
        sourceLabel: "毎日新聞",
        sourceDate: "2011-07-01",
      },
      {
        headline: "1999〜2003年に国会等移転を審議",
        figure: "1999〜2003年",
        text: "1999年から2003年まで国会等移転審議会が移転候補地答申を行い、首都機能の分散・バックアップ拠点整備の議論が30年近く続いている。",
        sourceUrl:
          "https://www.asahi.com/articles/ASTD30GM0TD3PTIL00RM.html",
        sourceLabel: "朝日新聞",
        sourceDate: "2003-12-20",
      },
    ],
    demerits: [
      {
        headline: "移転コスト4兆円超で停滞",
        figure: "4兆円超",
        text: "国会等移転のコスト試算は4兆円超とされ、2003年12月20日の国会等移転審議会答申後、約3年半で絞り込みは事実上断念された。",
        sourceUrl:
          "https://www.asahi.com/articles/ASTD30GM0TD3PTIL00RM.html",
        sourceLabel: "朝日新聞",
        sourceDate: "2003-12-20",
      },
      {
        headline: "2026年6月も付則論争で法案停滞リスク",
        figure: "2026-06-13",
        text: "2026年6月13日、維新・松沢参院議員が副首都法案への大阪都構想ドッキングへの懸念を表明し、自民党内でも付則をめぐる異論が出ている。",
        sourceUrl:
          "https://mainichi.jp/articles/20260613/k00/00m/010/024000c",
        sourceLabel: "毎日新聞",
        sourceDate: "2026-06-13",
      },
    ],
  },

  "osaka-to-metropolis": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "1度目投票は僅差49.62%",
        figure: "49.62%",
        text: "2015年5月17日の1度目住民投票では賛成49.62%で否決だったが、有権者の約半数が制度改革に賛成し、僅差だった。",
        sourceUrl:
          "https://business.nikkei.com/atcl/gen/19/00081/032400166/",
        sourceLabel: "日本経済新聞",
        sourceDate: "2015-05-17",
      },
      {
        headline: "2026年5月に法定協設置が全会一致",
        figure: "2026年5月20日",
        text: "2026年5月20日、維新市議団が法定協議会設置議案への賛成を全会一致で決定し、3度目の住民投票に向けた制度設計が動き出した。",
        sourceUrl:
          "https://mainichi.jp/articles/20260520/k00/00m/010/263000c",
        sourceLabel: "毎日新聞",
        sourceDate: "2026-05-20",
      },
    ],
    demerits: [
      {
        headline: "2度目投票も49.37%で否決",
        figure: "49.37%",
        text: "2020年11月1日の2度目住民投票も否決（賛成49.37%）。吉村知事・松井前市長は再挑戦しない意向を表明していた。",
        sourceUrl:
          "https://www.asahi.com/articles/ASTD30GM0TD3PTIL00RM.html",
        sourceLabel: "朝日新聞",
        sourceDate: "2020-11-01",
      },
      {
        headline: "否決から約6年で再始動",
        figure: "約6年",
        text: "2020年否決から約6年経過後の2026年6月に法定協議会設置が進み、2020年の「再挑戦しない」方針から方針転換した。",
        sourceUrl:
          "https://business.nikkei.com/atcl/gen/19/00081/032400166/",
        sourceLabel: "日本経済新聞",
        sourceDate: "2026-06-27",
      },
    ],
  },

  "fuhou-immin-trend": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "不法残留者は2年連続減",
        figure: "6375人（8.5%）減",
        text: "入管庁公表では、2026年1月1日時点の不法残留者は6万8488人で、前年比6375人（8.5%）減。2年連続の減少と説明されている。",
        sourceUrl:
          "https://www.moj.go.jp/isa/publications/press/13_00058.html",
        sourceLabel: "出入国在留管理庁",
        sourceDate: "2026-03-27",
      },
      {
        headline: "2026年7月1日時点で3634人減",
        figure: "3634人減",
        text: "2026年7月1日時点の不法残留者71229人は、1月1日比3634人減。政府は2025年5月策定のゼロプラン効果と分析している。",
        sourceUrl:
          "https://www.sankei.com/article/20260327-RTIGC3KW2ZCOTNQXGYWQYP72QQ",
        sourceLabel: "産経新聞",
        sourceDate: "2026-07-01",
      },
    ],
    demerits: [
      {
        headline: "在留外国人数412万人超で過去最多",
        figure: "412万5395人",
        text: "2025年末時点の在留外国人数は412万5395人で過去最多（前年比9.5%増）。不法残留者の減少と在留外国人の増加は別集計である。",
        sourceUrl:
          "https://www.jiji.com/jc/article?k=2026032700900&g=pol",
        sourceLabel: "時事通信",
        sourceDate: "2026-03-27",
      },
      {
        headline: "不法残留者は仍7万人超",
        figure: "6万8488人",
        text: "2026年1月1日時点で不法残留者は6万8488人（7月1日時点71229人）が残存。2025年5月23日策定のゼロプラン目標には未達である。",
        sourceUrl:
          "https://www.moj.go.jp/isa/publications/press/13_00058.html",
        sourceLabel: "出入国在留管理庁",
        sourceDate: "2026-03-27",
      },
    ],
  },

  "tokyo-solar-panel": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "2025年4月から制度施行",
        figure: "2025年4月",
        text: "東京都は2025年4月から、年間都内供給延床2万㎡以上の事業者に太陽光発電設備の設置等を義務付ける制度を開始した。",
        sourceUrl:
          "https://www.koho.metro.tokyo.lg.jp/2025/03/02.html",
        sourceLabel: "東京都広報",
        sourceDate: "2025-03-02",
      },
      {
        headline: "2030年カーボンハーフに向けた枠組み",
        figure: "2030年",
        text: "2023年1月4日の制度公表は2030年カーボンハーフ達成のための再生可能エネ拡大を目的とし、2025年3月時点でも施行予定どおり案内されている。",
        sourceUrl:
          "https://www.koho.metro.tokyo.lg.jp/2023/01/04.html",
        sourceLabel: "東京都広報",
        sourceDate: "2023-01-04",
      },
    ],
    demerits: [
      {
        headline: "対象は年間供給2万㎡以上の事業者",
        figure: "2万㎡",
        text: "義務の対象は「年間都内供給延床2万㎡以上」のハウスメーカー等事業者で、個人（施主）が直接義務を負う制度ではない。",
        sourceUrl:
          "https://www.metro.tokyo.lg.jp/governor/action/katsudo/2023/6/02_01",
        sourceLabel: "東京都",
        sourceDate: "2023-06-02",
      },
      {
        headline: "既存住宅は対象外",
        figure: "2023年1月4日",
        text: "2023年1月4日の公表から2025年4月施行まで約2年2カ月の準備期間があったが、既存建物・既存住宅は制度対象外のまま変更されていない。",
        sourceUrl:
          "https://www.koho.metro.tokyo.lg.jp/2023/01/04.html",
        sourceLabel: "東京都広報",
        sourceDate: "2023-01-04",
      },
    ],
  },

  "case-mqwdrley": {
    disclaimer:
      "公表・統計等の出典に基づく整理です。政治的主張の真偽はここでは断定しません。",
    merits: [
      {
        headline: "2024年7月7日に知事3選",
        figure: "2024年7月7日",
        text: "2024年6月18日の刑事告発後も東京都知事選（7月7日投開票）は実施され、小池知事が3選（報道）となった。",
        sourceUrl:
          "https://jbpress.ismedia.jp/articles/-/81616",
        sourceLabel: "JBpress",
        sourceDate: "2024-07-07",
      },
      {
        headline: "告発人が7つの証拠を主張",
        figure: "7つ",
        text: "2024年6月18日、小島敏郎氏は国会内記者会見で卒業証書の疑義など7つの証拠を主張し、東京地検に刑事告発状を提出した。",
        sourceUrl:
          "https://www.nikkei.com/article/DGXZQOUE193Z20Z10C24A6000000/",
        sourceLabel: "日本経済新聞",
        sourceDate: "2024-06-18",
      },
    ],
    demerits: [
      {
        headline: "告発から約2年、立件公表なし",
        figure: "約2年",
        text: "2024年6月18日の告発から2026年6月時点で約2年経過。公表されている検察の立件・起訴情報は本サイト整理時点では確認できない。",
        sourceUrl:
          "https://www.nikkei.com/article/DGXZQOUE193Z20Z10C24A6000000/",
        sourceLabel: "日本経済新聞",
        sourceDate: "2024-06-18",
      },
      {
        headline: "2024年6月12日に3期目出馬表明",
        figure: "2024年6月12日",
        text: "告発の6日前（2024年6月12日）に小池知事が都知事選への立候補意向を表明。告発後も選挙公報にカイロ大卒記載の意向を示した。",
        sourceUrl:
          "https://bunshun.jp/articles/-/71481",
        sourceLabel: "文春オンライン",
        sourceDate: "2024-06-12",
      },
    ],
  },
};
