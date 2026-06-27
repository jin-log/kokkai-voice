#!/usr/bin/env node
/**
 * バッチ5記事を kokkai-writer Skill 準拠で差し替え
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const WRITER = {
  "tokyo-solar-panel": {
    nowSummary: {
      bullets: [
        "東京都は2023年1月に新築住宅等への太陽光設置義務化制度を公表し、2025年4月施行を予告。2026年6月時点で制度は実施済み（公表から約2年5カ月）。",
        "義務の対象は「年間都内供給延床2万㎡以上」のハウスメーカー等事業者で、個人（施主）が直接義務を負う制度ではない（都環境局Q&A）。",
        "都は2030年カーボンハーフ達成のため再生可能エネ拡大を掲げ、2025年3月時点でも「4月から始まる」と案内。既存住宅は対象外のまま変更なし。",
      ],
    },
    arcSummary: [
      { date: "2026-06-27", text: "制度施行から約2カ月。都公式は2025年3月告知どおり2025年4月開始を案内。個人義務化ではない点は変更なし" },
      { date: "2025-03-02", text: "都広報：2025年4月から新築への太陽光設置等を義務付ける制度が始まると告知" },
      { date: "2023-06-02", text: "小池知事、太陽光普及の3者連携協定締結式で「令和7年4月施行」に向けた条例成立を説明" },
      { date: "2023-01-04", text: "都、新築住宅等への太陽光設置義務化制度を創設すると公表。2030年カーボンハーフに向けた枠組み" },
    ],
    summaryBullets: [
      "争点は「全戸義務か」「誰が義務を負うか」。都の答えは大手事業者（年間2万㎡以上供給）に限定",
      "2025年4月施行は予告どおり実施。既存建物・個人直接義務は対象外",
      "屋根条件により設置しない建物もあり得ると都は説明。補助・リース支援は別途",
    ],
    plainExplanation:
      "東京都は2023年、新築の住宅・建物に太陽光パネル等を設ける仕組みを法制化し、2025年4月から運用を始めました。\n\n「全ての家に義務」ではなく、都内で一定規模以上の新築を供給するハウスメーカー等が対象です。個人が直接罰則を受ける類の「義務」ではない、と都はQ&Aで説明しています。\n\n2026年6月時点では、2023年の公表から約2年5カ月、2025年4月の施行予告どおり制度は動いています。既存住宅は当初から対象外で、ここは変更されていません。",
    glossary: [
      { term: "カーボンハーフ", definition: "2030年までに温室効果ガスを2013年比50%削減する、東京都の目標" },
      { term: "特定供給事業者", definition: "年間2万㎡以上の新築を都内で供給するハウスメーカー等。太陽光設置義務の主な対象" },
      { term: "設置基準", definition: "供給する建物全体で達成する太陽光設置の目安。個々の屋根条件で柔軟に判断される" },
    ],
    primarySpeech: {
      date: "2025-03-02",
      nameOfMeeting: "都広報・制度案内",
      speaker: "東京都",
      speakerGroup: "東京都環境局",
      excerpt:
        "2025年4月から、年間一定規模以上の新築を供給する事業者に太陽光発電設備の設置等を義務付ける制度が始まる。既存建物は対象外。",
    },
    timeline: [
      {
        id: "tokyo-20230104",
        date: "2023-01-04",
        summaryPlain: "都が新築住宅等への太陽光設置義務化制度を創設すると公表。2030年カーボンハーフに向けた枠組み。",
      },
      {
        id: "tokyo-20230602",
        date: "2023-06-02",
        summaryPlain: "小池知事が太陽光普及の3者連携協定締結式で、改正条例成立と令和7年4月施行に言及。",
      },
      {
        id: "tokyo-20250302",
        date: "2025-03-02",
        summaryPlain: "都広報が「2025年4月から制度開始」を案内。大手ハウスメーカー等事業者が対象と説明。",
      },
    ],
    matrix: {
      parties: [
        {
          partyLabel: "東京都（実施側）",
          stance: {
            text: "2030年カーボンハーフに向け、2025年4月から新築供給事業者に太陽光設置等を義務付ける制度を開始",
            sourceUrl: "https://www.koho.metro.tokyo.lg.jp/2025/03/02.html",
          },
          action: {
            text: "2023年制度公表→2025年4月施行。Q&Aで義務者は年間2万㎡以上供給の事業者と明記",
            speechUrl: "https://www.kankyo.metro.tokyo.lg.jp/climate/solar/portal/index.html",
          },
          symbol: "◎",
          symbolReason: "公表（2023年）に対し2025年4月施行を実施。個人義務ではない説明は一貫",
        },
        {
          partyLabel: "制度の適用範囲（都説明）",
          stance: {
            text: "全戸義務ではなく、立地・屋根形状により設置しない建物もあり得る。既存住宅は対象外",
            sourceUrl: "https://www.koho.metro.tokyo.lg.jp/2023/01/04.html",
          },
          action: {
            text: "2026年6月時点、既存住宅対象外・事業者義務の整理は変更なし",
            speechUrl: "https://www.koho.metro.tokyo.lg.jp/2023/01/04.html",
          },
          symbol: "▲",
          symbolReason: "「義務化」と受け取られやすいが、実際は限定的な事業者義務。都はQ&Aで範囲を限定説明",
        },
      ],
    },
  },

  "fuhou-immin-trend": {
    nowSummary: {
      bullets: [
        "政府は2025年5月「不法滞在者ゼロプラン」を策定し、在留期限超過者の削減・送還強化を掲げた。2026年6月時点でプラン公表から約1カ月。",
        "入管庁：2026年1月1日時点の不法残留者は6万8488人（前年比6375人・8.5%減）。2026年7月1日時点では7万1229人（半年で3634人減）。2年連続の減少と入管庁は説明。",
        "一方、在留外国人数は2025年末412万5395人で過去最多（前年比9.5%増）。「不法移民」単独の公式統計はなく、入管庁は「不法残留者」「在留外国人」を別集計。",
      ],
    },
    arcSummary: [
      { date: "2026-07-01", text: "不法残留71229人（7/1時点）。1/1比3634人減。政府はゼロプラン効果と分析" },
      { date: "2026-03-27", text: "在留外国人412万人超・不法残留6.8万人（1/1時点）を発表。残留は2年連続減" },
      { date: "2025-05-23", text: "政府「不法滞在者ゼロプラン」策定。送還促進・入国審査強化等" },
      { date: "2023-01", text: "在留管理制度の運用継続。不法残留は7万人前後で推移（入管庁過去資料）" },
    ],
    summaryBullets: [
      "メディアの「不法移民」と、統計上の「不法残留者（オーバーステイ）」は一致しない場合がある",
      "2025〜2026年、不法残留者数は減少方向。在留外国人総数は増加",
      "短期滞在ビザからの残留が不法残留の約6割（2026年7月公表資料）",
    ],
    plainExplanation:
      "この記事では、入管庁が公表する「不法残留者」（在留期限を過ぎて日本にいる人）と、合法的な在留外国人数の推移を整理します。\n\n2025年5月、政府は削減目標を掲げた「不法滞在者ゼロプラン」を示しました。その後2026年に入り、不法残留者数は前年・前回公表比で減少し、入管庁は取り組みの効果と説明しています。\n\n同時期、ビザ等で合法に中長期滞在する外国人は412万人超と増え続けています。数字の見方は「残留の減」と「在留総数の増」を分けて見る必要があります。",
    glossary: [
      { term: "不法残留者", definition: "在留期限を過ぎて日本に滞在している人。入管庁が推計公表" },
      { term: "在留外国人", definition: "中長期在留者・特別永住者など。短期観光は含まない" },
      { term: "オーバーステイ", definition: "許可された在留期間を超えて滞在すること。不法残留の原因の一つ" },
    ],
    primarySpeech: {
      date: "2026-03-27",
      nameOfMeeting: "入管庁報道発表",
      speaker: "出入国在留管理庁",
      speakerGroup: "法務省",
      excerpt:
        "2025年末時点の在留外国人数は412万5395人で過去最多。2026年1月1日時点の不法残留者は6万8488人で2年連続減。",
    },
    timeline: [
      {
        id: "fuhou-202505",
        date: "2025-05-23",
        summaryPlain: "政府が「国民の安全・安心のための不法滞在者ゼロプラン」を策定。送還・入国審査強化を掲げる。",
      },
      {
        id: "fuhou-20260327",
        date: "2026-03-27",
        summaryPlain: "入管庁が2025年末の在留412万人超・不法残留6.8万人（1/1時点）を発表。残留は2年連続減。",
      },
      {
        id: "fuhou-20260701",
        date: "2026-07-01",
        summaryPlain: "不法残留71229人（7/1時点）を公表。1/1比3634人減。短期滞在が約6割。",
      },
    ],
    matrix: {
      parties: [
        {
          partyLabel: "政府・入管庁",
          stance: {
            text: "不法滞在者ゼロプランに基づき送還・審査を強化。2026年は不法残留が2年連続減",
            sourceUrl: "https://www.moj.go.jp/isa/publications/press/13_00058.html",
          },
          action: {
            text: "2026年7/1時点71229人（半年3634人減）。国費送還318人は過去最多",
            speechUrl: "https://www.jiji.com/jc/article?k=2026032700900&g=pol",
          },
          symbol: "◎",
          symbolReason: "ゼロプラン（2025年5月）に対し2026年公表数値で残留減少。政府説明どおりの方向",
        },
        {
          partyLabel: "在留外国人総数（統計）",
          stance: {
            text: "2025年末412万人超で過去最多。特定技能・留学生等の増加が牽引",
            sourceUrl: "https://www.jiji.com/jc/article?k=2026032700900&g=pol",
          },
          action: {
            text: "不法残留減と並行し、合法在留者は増加。別指標として並存",
            speechUrl: "https://www.sankei.com/article/20260327-RTIGC3KW2ZCOTNQXGYWQYP72QQ",
          },
          symbol: "▲",
          symbolReason: "残留削減の公約に対し総数は増加。読者が混同しやすい2つの数字が同時進行",
        },
      ],
    },
  },

  "osaka-to-metropolis": {
    nowSummary: {
      bullets: [
        "大阪維新の会は2010年代から「大阪都構想」（大阪市廃止・特別区再編）を看板に掲げ、2015年・2020年の住民投票はいずれも否決（賛成約49%）。",
        "2026年6月、府議会で法定協議会設置が可決。3度目の住民投票に向けた制度設計が動き出した（2026年6月27日時点）。",
        "否決から約6年。吉村知事は2020年否決後「再挑戦しない」と述べていたが、2026年に再始動。副首都構想とのセット議論も並行。",
      ],
    },
    arcSummary: [
      { date: "2026-06-27", text: "法定協議会設置後、区割り・財源配分の議論開始。投票時期は統一地方選同日が目標と報道" },
      { date: "2026-05-20", text: "維新市議団が法定協設置議案への賛成を全会一致決定。3度目住民投票の議論本格化" },
      { date: "2020-11-01", text: "2度目住民投票否決（賛成49.37%）。松井前市長・吉村知事は再挑戦しない意向を表明" },
      { date: "2015-05-17", text: "1度目住民投票否決（賛成49.62%）。特別区5区案" },
    ],
    summaryBullets: [
      "「大阪都」という名称は自動的には変わらない。実態は大阪市廃止と特別区再編",
      "維新は二重行政解消・副首都機能を訴え、反対派は財源吸い上げ・サービス低下を指摘",
      "過去2回は僅差否決。2026年は法定協議会から再設計",
    ],
    plainExplanation:
      "大阪都構想は、政令指定都市である大阪市をやめ、複数の特別区に分ける制度改革です。維新の会は2015年と2020年に住民投票を実施しましたが、どちらも反対が僅差で上回りました。\n\n2026年6月、府・市の議会で法定協議会の設置が進み、3度目の投票に向けた区割りや財源の話し合いが始まっています。2020年の否決後に「再挑戦しない」としていた吉村知事が再び構想を前面に出している点が、2026年時点の大きな変化です。",
    glossary: [
      { term: "大阪都構想", definition: "大阪市を廃止し特別区に再編する制度改革。府への権限・財源集約が争点" },
      { term: "法定協議会", definition: "大都市地域特別区設置法に基づく府・市の協議体。制度案をまとめる" },
      { term: "二重行政", definition: "大阪府と大阪市が同分野で行政を担うこと。維新は無駄と主張、反対派は否定" },
    ],
    primarySpeech: {
      date: "2026-05-20",
      nameOfMeeting: "報道・維新市議団",
      speaker: "大阪維新の会",
      speakerGroup: "地方政党",
      excerpt:
        "法定協議会設置議案に全会一致で賛成。3度目の住民投票に向けた議論を本格化。来春の統一地方選との同日実施を目指す方針。",
    },
    timeline: [
      {
        id: "osaka-20150517",
        date: "2015-05-17",
        summaryPlain: "1度目住民投票。大阪市廃止・特別区5区案は否決（賛成49.62%）。",
      },
      {
        id: "osaka-20201101",
        date: "2020-11-01",
        summaryPlain: "2度目住民投票否決（賛成49.37%）。吉村知事・松井前市長は再挑戦しない意向。",
      },
      {
        id: "osaka-20260520",
        date: "2026-05-20",
        summaryPlain: "維新市議団が法定協設置議案に賛成を全会一致決定。3度目投票へ。",
      },
    ],
    matrix: {
      parties: [
        {
          partyLabel: "大阪維新の会（推進）",
          stance: {
            text: "二重行政解消と副首都機能のため大阪市を特別区に再編。2026年に法定協議会を設置",
            sourceUrl: "https://business.nikkei.com/atcl/gen/19/00081/032400166/",
          },
          action: {
            text: "2015・2020年投票は僅差否決。2026年5月、市議団が法定協設置に全会一致賛成",
            speechUrl: "https://mainichi.jp/articles/20260520/k00/00m/010/263000c",
          },
          symbol: "▲",
          symbolReason: "構想推進の公言に対し2回否決後6年で再始動。2020年「再挑戦しない」発言との時間差",
        },
        {
          partyLabel: "反対・懐疑（報道整理）",
          stance: {
            text: "市廃止で財源・権限が府に移り、特別区の住民サービスが低下する恐れ",
            sourceUrl: "https://www.asahi.com/articles/ASTD30GM0TD3PTIL00RM.html",
          },
          action: {
            text: "2026年6月時点、府議会可決も自民大阪系など反対論旨は継続",
            speechUrl: "https://www.asahi.com/articles/ASTD30GM0TD3PTIL00RM.html",
          },
          symbol: "❌",
          symbolReason: "維新が訴える効率化に対し、反対派はサービス低下リスクを指摘。2026年も論点は継続",
        },
      ],
    },
  },

  "fukushuto-koso": {
    nowSummary: {
      bullets: [
        "「副首都構想」は首都機能のバックアップ拠点を整備する考え方。1990年代から国会で議論され、2011年東日本大震災後は棚上げされた経緯がある。",
        "2026年、自民・維新の連立合意で副首都法案の成立が目標に。維新は大阪を副首都候補として位置づけ、大阪都構想とのセット議論も進む。",
        "2026年6月、自民党内で付則（都構想・住民投票範囲）をめぐる異論。維新は付則修正に賛同し、投票対象は大阪市民に限定する方向（2020年否決時と同様）。",
      ],
    },
    arcSummary: [
      { date: "2026-06-13", text: "維新・松沢参院議員ら、副首都法案に都構想ドッキングへの懸念を表明（毎日新聞）" },
      { date: "2026-06-05", text: "自民部会で付則（府全域への投票拡大）に異論。維新は修正に賛同" },
      { date: "2011-07-01", text: "橋下知事・石原都知事が副首都構想で会談。震災後の議論再燃" },
      { date: "1999-2003", text: "国会等移転審議会が移転候補地答申。最終絞り込みは断念" },
    ],
    summaryBullets: [
      "副首都＝首都機能のバックアップ。大阪都構想＝大阪の統治機構改革。別概念だが2026年は法案で接続",
      "移転コスト4兆円超の試算で国会移転は停滞した歴史",
      "2026年法案では「都」への名称変更手続きを大都市法改正で可能にする付則が論点",
    ],
    plainExplanation:
      "副首都構想は、東京に大規模災害等が起きたときに首都機能を代替する拠点を整備しようという考え方です。1990年代から国会で議論がありましたが、コスト試算等で進まない時期もありました。\n\n2026年、自民党と日本維新の会の連立政権下で関連法案の審議が進んでいます。維新は大阪を副首都に位置づける一方、付則で大阪都構想（特別区・名称変更）と結びつける議論もあり、党内・党外で異論も出ています。",
    glossary: [
      { term: "副首都", definition: "首都のバックアップ機能を担う広域拠点。災害時の機能移転が主目的" },
      { term: "国会等移転", definition: "1992年法に基づく東京圏外への国会・行政移転検討。2003年に絞り込み断念" },
      { term: "付則", definition: "法案本文外の補足規定。2026年案では大都市法改正・都構想との接続が盛られた" },
    ],
    primarySpeech: {
      date: "2026-06-13",
      nameOfMeeting: "報道・論考",
      speaker: "松沢成文",
      speakerGroup: "日本維新の会（参院）",
      excerpt:
        "副首都構想と大阪都構想は別物。副首都法案に都構想をドッキングさせるのは法体系上問題がある、との趣旨で異論を表明（毎日新聞）。",
    },
    timeline: [
      {
        id: "fuku-2003",
        date: "2003-12-20",
        summaryPlain: "国会等移転審議会が移転候補地答申。約3年半後、国会は絞り込みを事実上断念。",
      },
      {
        id: "fuku-20110701",
        date: "2011-07-01",
        summaryPlain: "橋下大阪府知事と石原東京都知事が副首都構想で会談。震災後の議論再燃。",
      },
      {
        id: "fuku-20260613",
        date: "2026-06-13",
        summaryPlain: "維新・松沢参院議員が副首都法案の都構想ドッキングへの懸念を表明（毎日新聞）。",
      },
    ],
    matrix: {
      parties: [
        {
          partyLabel: "自民・維新（推進）",
          stance: {
            text: "2026年通常国会で副首都法案成立を目指す。首都一極集中の是正とバックアップ拠点",
            sourceUrl: "https://www.asahi.com/articles/ASTD30GM0TD3PTIL00RM.html",
          },
          action: {
            text: "2026年6月、付則修正で投票対象を大阪市民限定へ。都構想との接続は維新内でも異論",
            speechUrl: "https://mainichi.jp/articles/20260613/k00/00m/010/024000c",
          },
          symbol: "▲",
          symbolReason: "長年の構想に対し2026年に法案審議へ。付則・都構想セットで党内・維新内の温度差",
        },
        {
          partyLabel: "懐疑・異論（報道）",
          stance: {
            text: "副首都法だけでなく首都法との整合、コスト・法体系への疑問",
            sourceUrl: "https://mainichi.jp/articles/20260613/k00/00m/010/024000c",
          },
          action: {
            text: "2026年6月、自民大阪系・維新松沢氏らが付則・都構想接続に異論",
            speechUrl: "https://www.nri.com/jp/media/column/kiuchi/20251020_2.html",
          },
          symbol: "❌",
          symbolReason: "法案本文の行動データは審議中。付則・都構想接続への懐疑が報道で確認",
        },
      ],
    },
  },

  "shussho-budget-seika": {
    nowSummary: {
      bullets: [
        "2023年12月閣議決定「こども未来戦略」で3.6兆円規模の「こども・子育て支援加速化プラン」を掲げた。2026年6月時点、公表から約2年6カ月。",
        "2025年（令和7年）の合計特殊出生率は1.14（前年1.15から低下）。出生数67万1236人（前年比1万4937人減）。予算拡大と出生率の改善は未確認。",
        "政府は2026年度まで集中取組期間と位置づけ。経済財政諮問会議でも「効果検証と政策見直し」を求める意見あり（2025年5月資料）。",
      ],
    },
    arcSummary: [
      { date: "2026-06-27", text: "2025年出生率1.14・出生数67万人。3.6兆プラン公表から約2年6カ月、出生率上昇は未確認" },
      { date: "2025-05-26", text: "経済財政諮問会議資料：少子化予算の効果検証・見直しを求める論点" },
      { date: "2024-02-07", text: "参院調査室資料：加速化プラン1.3兆円程度を令和6年度予算で前倒し実施と整理" },
      { date: "2023-12-22", text: "「こども未来戦略」閣議決定。3.6兆円規模の加速化プラン" },
    ],
    summaryBullets: [
      "争点は「いくら使ったか」より「出生率・出生数が動いたか」",
      "児童手当拡大・出産応援交付金等は実施方向。2025年統計はまだ低下",
      "2030年代初頭までが「ラストチャンス」と政府資料に記載",
    ],
    plainExplanation:
      "2023年末、政府は異次元の少子化対策として3.6兆円規模の「こども・子育て支援加速化プラン」を示しました。児童手当の拡大や出産・子育て支援の制度化が柱です。\n\n一方、2025年の出生率（1.14）と出生数（約67万人）は前年より減少しています。予算と施策が始まってから約2年6カ月経った2026年6月時点では、統計上の出生率改善は確認できません。政府は2026年度までを集中取組期間とし、効果検証を求める声も出ています。",
    glossary: [
      { term: "合計特殊出生率", definition: "1人の女性が生涯に産む子どもの数の推計。1.14は2025年公表値" },
      { term: "加速化プラン", definition: "こども未来戦略に基づく3.6兆円規模の具体施策。2026年度まで集中実施" },
      { term: "こども未来戦略", definition: "2023年12月閣議決定。少子化対策の全体方針" },
    ],
    primarySpeech: {
      date: "2023-12-22",
      nameOfMeeting: "閣議決定",
      speaker: "政府",
      speakerGroup: "こども未来戦略",
      excerpt:
        "こども未来戦略を閣議決定。3.6兆円規模のこども・子育て支援加速化プランを掲げ、2026年度まで集中実施。",
    },
    timeline: [
      {
        id: "shussho-20231222",
        date: "2023-12-22",
        summaryPlain: "「こども未来戦略」閣議決定。3.6兆円規模の加速化プランを掲げる。",
      },
      {
        id: "shussho-20250526",
        date: "2025-05-26",
        summaryPlain: "経済財政諮問会議資料が、少子化予算の効果検証・見直しの必要性に言及。",
      },
      {
        id: "shussho-202602",
        date: "2026-02-01",
        summaryPlain: "厚労省が2025年人口動態統計を公表。合計特殊出生率1.14、出生数67万1236人。",
      },
    ],
    matrix: {
      parties: [
        {
          partyLabel: "政府（こども未来戦略）",
          stance: {
            text: "2023年12月、3.6兆円規模の加速化プランで少子化トレンド反転を目指す",
            sourceUrl: "https://www.cfa.go.jp/policies/kodomo-mirai/",
          },
          action: {
            text: "2026年度まで集中実施。令和6年度予算で1.3兆円程度を前倒しと参院調査室整理",
            speechUrl: "https://www.mhlw.go.jp/stf/houdou/0000198851_00001.html",
          },
          symbol: "▲",
          symbolReason: "公言（3.6兆・反転目標）に対し2025年出生率1.14で前年より低下。施策は進むが成果数値は未改善",
        },
        {
          partyLabel: "統計（成果指標）",
          stance: {
            text: "2025年合計特殊出生率1.14、出生数67万1236人。いずれも前年減",
            sourceUrl: "https://www.mhlw.go.jp/stf/houdou/0000198851_00001.html",
          },
          action: {
            text: "2026年6月時点、出生率改善の公式統計は確認できず",
            speechUrl: "https://www8.cao.go.jp/cstp/whitepaper/r06/honpen/html/i1110000.html",
          },
          symbol: "❌",
          symbolReason: "予算拡大の公約に対し、出生率・出生数は2025年時点で悪化方向。効果検証待ち",
        },
      ],
    },
  },
};

const DISCLAIMER =
  "AI補助による平易語要約です。解釈を含みます。数字・引用の正本は各出典リンクをご確認ください。国会議事録以外の案件です。";

function runNode(script, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", script), ...args], {
      cwd: root,
      stdio: "inherit",
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

for (const [slug, w] of Object.entries(WRITER)) {
  const articlePath = path.join(root, "data/articles", `${slug}.json`);
  const article = JSON.parse(await readFile(articlePath, "utf8"));
  const urls = article.sourceUrls ?? [];

  article.nowSummary = {
    label: "いまの結論",
    bullets: w.nowSummary.bullets,
    disclaimer: DISCLAIMER,
    updatedAt: new Date().toISOString(),
  };
  article.arcSummary = w.arcSummary;
  article.summaryBullets = w.summaryBullets;
  article.plainExplanation = w.plainExplanation;
  article.glossary = w.glossary;
  article.fetchedAt = new Date().toISOString();

  article.primarySpeech = {
    ...article.primarySpeech,
    ...w.primarySpeech,
    speechID: null,
    issueID: null,
    nameOfHouse: article.category,
    speechURL: urls[0] ?? article.primarySpeech?.speechURL,
    meetingURL: urls[1] ?? null,
    speechFull: null,
  };

  article.timeline = w.timeline.map((t, i) => ({
    id: t.id ?? `${slug}-tl-${i}`,
    type: "source",
    date: t.date,
    summaryPlain: t.summaryPlain,
    sourceUrl: urls[i] ?? urls[0],
  }));

  const matrixPath = path.join(root, "data/policy-matrix", `${slug}.json`);
  const matrix = {
    policySlug: slug,
    policyLabel: article.title?.replace(/ — あの話どうなった？$/, "") ?? slug,
    relatedArticleSlug: slug,
    updatedAt: new Date().toISOString(),
    methodologyVersion: "v1-writer",
    disclaimer: "党の公式評価ではなく、公言と行動の整理表です。",
    excerpt: { parties: "ライターSkill準拠", politicians: "" },
    parties: w.matrix.parties.map((p) => ({
      ...p,
      stance: {
        ...p.stance,
        sourceType: "報道・公表",
        capturedAt: new Date().toISOString().slice(0, 10),
      },
      action: {
        ...p.action,
        capturedAt: new Date().toISOString().slice(0, 10),
      },
    })),
  };
  await writeFile(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");

  article.stanceMatrix = {
    policySlug: slug,
    dataPath: `data/policy-matrix/${slug}.json`,
    disclaimer: "出典付きの事実整理です。",
  };

  article.publishReady = true;
  article.pageReady = false;
  await writeFile(articlePath, `${JSON.stringify(article, null, 2)}\n`, "utf8");
  console.log(`✅ writer applied: ${slug}`);

  await runNode("legal-check.mjs", ["--slug", slug, "--fix"]);
  const code = await runNode("check-case-page.mjs", ["--slug", slug]);
  if (code !== 0) console.warn(`⚠️ check-case-page: ${slug} exit ${code}`);
}

await import("../src/lib/project-status.mjs").then((m) => m.refreshProjectStatus());
console.log("\ndone");
