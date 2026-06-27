#!/usr/bin/env node
/** 残り5案件 — timeline / arcSummary / nowSummary / summaryBullets を国会API原文ベースで付与 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function speechMeta(s) {
  return {
    speechID: s.speechID,
    issueID: s.issueID,
    date: s.date,
    nameOfHouse: s.nameOfHouse,
    nameOfMeeting: s.nameOfMeeting,
    session: s.session,
    issue: s.issue,
    speaker: s.speaker,
    speakerGroup: s.speakerGroup,
    speechURL: s.speechURL,
    meetingURL: s.meetingURL,
  };
}

const patches = {
  "komei-kokumin": {
    nowSummary: {
      label: "いまの結論",
      bullets: [
        "参院文教科学委員会（2026-06-09）で、自民・立憲・国民民主・公明・維新の五派が学校教育法改正に共同附帯決議を提出",
        "衆院憲法審査会（2026-06-11）で、自民・維新・国民民主・参政党が国民投票法三項目改正案を共同再提出",
        "公明党下野六太は超党派で教育議論を進める必要性を表明し、義務教育無償化の歴史を踏まえ給食無償化を評価"
      ],
      disclaimer:
        "AI補助による平易語要約です。解釈を含みます。数字・引用・発言内容の正本は primarySpeech.speechFull（国会議事録原文）をご確認ください。",
      updatedAt: "2026-06-27T12:00:00.000Z",
    },
    summaryBullets: [
      "2026-06-09、古賀千景（立憲）が自民・立憲・国民民主・公明・維新の五派共同附帯決議を参院文教科学委員会で提出（デジタル教科書等16項目）。",
      "2026-06-11、新藤義孝（自民）が国民投票法三項目改正案を自民・維新・国民民主・参政党の共同提案として説明（令和四年案の再提出）。",
      "2026-06-09、下野六太（公明）は超党派で子どもの教育環境を築く必要性を表明し、給食無償化開始を評価。",
      "2026-06-11、玉木雄一郎（国民民主）は憲法改正を選挙制度整備に絞るべきとし、与党間の九条論点の隔たりを指摘。",
      "2026-06-04、浅野哲（国民民主）は国民投票法のインターネット広告規制・広告ライブラリー法制化を早期に求めた。"
    ],
    arcSummary: [
      { date: "2026-06-11", text: "新藤義孝（自民）が国民投票法三項目改正案を自民・維新・国民民主・参政党で共同再提出" },
      { date: "2026-06-09", text: "古賀千景（立憲）が五派共同附帯決議を参院文教科学委員会で提出（国民民主・公明含む）" },
      { date: "2026-06-09", text: "下野六太（公明）が超党派教育協力と義務教育無償化の進展を表明" },
    ],
    timeline: [
      {
        id: "kk-20260611-shindo",
        type: "speech",
        date: "2026-06-11",
        summaryPlain:
          "新藤義孝（自民）は、自民・維新・国民民主・参政党の共同提案として国民投票法三項目改正案（開票立会人・投票立会人・FM広報）を説明した。",
        speech: speechMeta({
          speechID: "122104183X00920260611_002",
          issueID: "122104183X00920260611",
          date: "2026-06-11",
          nameOfHouse: "衆議院",
          nameOfMeeting: "憲法審査会",
          session: 221,
          issue: "第9号",
          speaker: "新藤義孝",
          speakerGroup: "自由民主党・無所属の会",
          speechURL: "https://kokkai.ndl.go.jp/txt/122104183X00920260611/2",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122104183X00920260611",
        }),
      },
      {
        id: "kk-20260609-koga",
        type: "speech",
        date: "2026-06-09",
        summaryPlain:
          "古賀千景（立憲）は、学校教育法改正案に対し自民・立憲・国民民主・公明・維新の五派共同附帯決議案を参院文教科学委員会で提出した。",
        speech: speechMeta({
          speechID: "122115104X00920260609_073",
          issueID: "122115104X00920260609",
          date: "2026-06-09",
          nameOfHouse: "参議院",
          nameOfMeeting: "文教科学委員会",
          session: 221,
          issue: "第9号",
          speaker: "古賀千景",
          speakerGroup: "立憲民主・無所属",
          speechURL: "https://kokkai.ndl.go.jp/txt/122115104X00920260609/73",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122115104X00920260609",
        }),
      },
      {
        id: "kk-20260609-shimono",
        type: "speech",
        date: "2026-06-09",
        summaryPlain:
          "下野六太（公明）は、超党派で子どもの教育環境を築く必要性を表明し、2026年度から始まった公立小学校の給食無償化を評価した。",
        speech: speechMeta({
          speechID: "122115104X00920260609_005",
          issueID: "122115104X00920260609",
          date: "2026-06-09",
          nameOfHouse: "参議院",
          nameOfMeeting: "文教科学委員会",
          session: 221,
          issue: "第9号",
          speaker: "下野六太",
          speakerGroup: "公明党",
          speechURL: "https://kokkai.ndl.go.jp/txt/122115104X00920260609/5",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122115104X00920260609",
        }),
      },
      {
        id: "kk-20260604-asano",
        type: "speech",
        date: "2026-06-04",
        summaryPlain:
          "浅野哲（国民民主）は、国民投票法のインターネット有料広告規制と広告ライブラリー法制化を今国会中の具体作業として求めた。",
        speech: speechMeta({
          speechID: "122104183X00820260604_008",
          issueID: "122104183X00820260604",
          date: "2026-06-04",
          nameOfHouse: "衆議院",
          nameOfMeeting: "憲法審査会",
          session: 221,
          issue: "第8号",
          speaker: "浅野哲",
          speakerGroup: "国民民主党・無所属クラブ",
          speechURL: "https://kokkai.ndl.go.jp/txt/122104183X00820260604/8",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122104183X00820260604",
        }),
      },
    ],
  },

  "kishida-resign": {
    nowSummary: {
      label: "いまの結論",
      bullets: [
        "令和八年6月の国会で高市内閣が本格稼働し、予算委員会・決算行政監視委員会等で閣僚が答弁",
        "片山さつき財務大臣は高市内閣の危機管理投資・成長投資と財政改革を説明",
        "2026-06-11に衆院で国家公務員任命（審査会委員等）の同意案が上程された"
      ],
      disclaimer:
        "AI補助による平易語要約です。解釈を含みます。数字・引用・発言内容の正本は primarySpeech.speechFull（国会議事録原文）をご確認ください。",
      updatedAt: "2026-06-27T12:00:00.000Z",
    },
    summaryBullets: [
      "2026-06-03予算委員会の出席者欄に高市早苗総理が記録され、新内閣下の国会審議が本格化。",
      "片山さつき財務大臣（2026-06-03）は高市内閣の賃上げ促進・財政改革・危機管理投資を表明。",
      "2026-06-11、山口俊一委員長が国家公務員任命（情報公開審査会委員等）の同意を求める案を上程。",
      "2026-06-04補正予算討論で、臼木秀剛（国民民主）が賛成、福重隆浩（中道改革連合）らが反対。",
      "和田政宗（参政党・2026-06-04）は臨時会召集期限・解散権制限の憲法改正と国民投票法整備を主張。"
    ],
    arcSummary: [
      { date: "2026-06-11", text: "衆院議院運営委員会で国家公務員任命（審査会委員等）の同意案が上程" },
      { date: "2026-06-04", text: "令和八年度補正予算案が衆院本会議で緊急上程・討論（各党の賛否が記録）" },
      { date: "2026-06-03", text: "予算委員会に高市内閣の閣僚が出席し、片山財務大臣が新政権の経済財政方針を答弁" },
    ],
    timeline: [
      {
        id: "kr-20260611-appointment",
        type: "speech",
        date: "2026-06-11",
        summaryPlain:
          "山口俊一委員長（衆院議院運営委員会）は、内閣から国家公務員任命（情報公開審査会委員・土地鑑定委員会委員等）の同意を求める案を上程した。",
        speech: speechMeta({
          speechID: "122104024X02820260611_003",
          issueID: "122104024X02820260611",
          date: "2026-06-11",
          nameOfHouse: "衆議院",
          nameOfMeeting: "議院運営委員会",
          session: 221,
          issue: "第28号",
          speaker: "山口俊一",
          speakerGroup: "自由民主党・無所属の会",
          speechURL: "https://kokkai.ndl.go.jp/txt/122104024X02820260611/3",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122104024X02820260611",
        }),
      },
      {
        id: "kr-20260604-budget",
        type: "speech",
        date: "2026-06-04",
        summaryPlain:
          "築山事務総長は、令和八年度一般会計・特別会計補正予算案の討論通告を読み上げ、中道改革連合・参政党・共産等が反対、自民・国民民主・チームみらい等が賛成と記録した。",
        speech: speechMeta({
          speechID: "122104024X02720260604_006",
          issueID: "122104024X02720260604",
          date: "2026-06-04",
          nameOfHouse: "衆議院",
          nameOfMeeting: "議院運営委員会",
          session: 221,
          issue: "第27号",
          speaker: "築山信彦",
          speakerGroup: null,
          speechURL: "https://kokkai.ndl.go.jp/txt/122104024X02720260604/6",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122104024X02720260604",
        }),
      },
      {
        id: "kr-20260603-katayama",
        type: "speech",
        date: "2026-06-03",
        summaryPlain:
          "片山さつき財務大臣は、高市内閣でも賃上げ促進と実質賃金プラスを最大目標の一つとし、財政の持続可能性に配慮した予算編成改革を進めると答弁した。",
        speech: speechMeta({
          speechID: "122104127X00220260603_044",
          issueID: "122104127X00220260603",
          date: "2026-06-03",
          nameOfHouse: "衆議院",
          nameOfMeeting: "決算行政監視委員会",
          session: 221,
          issue: "第2号",
          speaker: "片山さつき",
          speakerGroup: "自由民主党・無所属の会",
          speechURL: "https://kokkai.ndl.go.jp/txt/122104127X00220260603/44",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122104127X00220260603",
        }),
      },
      {
        id: "kr-20260604-wada",
        type: "speech",
        date: "2026-06-04",
        summaryPlain:
          "和田政宗（参政党）は、臨時会召集期限と解散権制限の憲法改正、国民投票法三項目改正への賛同、外国勢力介入防止等の整備を主張した。",
        speech: speechMeta({
          speechID: "122104183X00820260604_012",
          issueID: "122104183X00820260604",
          date: "2026-06-04",
          nameOfHouse: "衆議院",
          nameOfMeeting: "憲法審査会",
          session: 221,
          issue: "第8号",
          speaker: "和田政宗",
          speakerGroup: "参政党",
          speechURL: "https://kokkai.ndl.go.jp/txt/122104183X00820260604/12",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122104183X00820260604",
        }),
      },
    ],
  },

  "chiho-sosei": {
    nowSummary: {
      label: "いまの結論",
      bullets: [
        "井原巧（自民・愛媛）は地方分権だけでは創生にならず、国主導の総力戦が必要と指摘",
        "黄川田仁志地方創生担当大臣は高市内閣の地域未来戦略・三類型クラスター計画を説明",
        "令和六年の政府総括でも、人口減少・東京一極集中の改善は五十年たっても未達とされる"
      ],
      disclaimer:
        "AI補助による平易語要約です。解釈を含みます。数字・引用・発言内容の正本は primarySpeech.speechFull（国会議事録原文）をご確認ください。",
      updatedAt: "2026-06-27T12:00:00.000Z",
    },
    summaryBullets: [
      "井原巧（自民・2026-05-08）は、地方分権は手段にすぎず、分権だけでは地方創生にならないと指摘。",
      "政府の令和六年総括でも、人口減少・東京一極集中の改善は五十年たっても至っていないとされる（井原発言）。",
      "井原は医療・福祉・教育・公共交通は国が全国一律で担うべきとし、富める自治体先行の格差拡大を懸念。",
      "黄川田仁志大臣（2026-05-08）は高市内閣の地域未来戦略と三類型クラスター計画を説明。",
      "井原は人口減少を「変化」ではなく地域の「進化」に捉え、補助制度の抜本転換を求めた。"
    ],
    arcSummary: [
      { date: "2026-05-08", text: "井原巧（自民）が特別委員会で地方分権と地方創生の役割分担を質問、黄川田大臣が地域未来戦略を答弁" },
      { date: "2026-05-08", text: "井原は三位一体改革・地財ショック等の歴史を振り返り、分権の目的化を批判" },
      { date: "2026-05-26", text: "松下英樹（自民）がふるさと納税の仲介手数料（最大11.5%）の適正化を総務省に質問" },
    ],
    timeline: [
      {
        id: "cs-20260508-iihara-q",
        type: "speech",
        date: "2026-05-08",
        summaryPlain:
          "井原巧（自民）は、消滅可能性都市の危機を踏まえ、地方分権は手段にすぎず国主導の総力戦が必要だとし、医療・福祉・教育は全国一律の国の責任とすべきだと主張した。",
        speech: speechMeta({
          speechID: "122105367X00520260508_006",
          issueID: "122105367X00520260508",
          date: "2026-05-08",
          nameOfHouse: "衆議院",
          nameOfMeeting: "地域活性化・こども政策・デジタル社会形成に関する特別委員会",
          session: 221,
          issue: "第5号",
          speaker: "井原巧",
          speakerGroup: "自由民主党・無所属の会",
          speechURL: "https://kokkai.ndl.go.jp/txt/122105367X00520260508/6",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122105367X00520260508",
        }),
      },
      {
        id: "cs-20260508-kikawada",
        type: "speech",
        date: "2026-05-08",
        summaryPlain:
          "黄川田仁志地方創生担当大臣は、高市内閣の地域未来戦略として三類型のクラスター計画を進め、国も一歩前に出て地域構造の再設計を支援すると答弁した。",
        speech: speechMeta({
          speechID: "122105367X00520260508_007",
          issueID: "122105367X00520260508",
          date: "2026-05-08",
          nameOfHouse: "衆議院",
          nameOfMeeting: "地域活性化・こども政策・デジタル社会形成に関する特別委員会",
          session: 221,
          issue: "第5号",
          speaker: "黄川田仁志",
          speakerGroup: "自由民主党・無所属の会",
          speechURL: "https://kokkai.ndl.go.jp/txt/122105367X00520260508/7",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122105367X00520260508",
        }),
      },
      {
        id: "cs-20260526-matsushita",
        type: "speech",
        date: "2026-05-26",
        summaryPlain:
          "松下英樹（自民）は、ふるさと納税のポータルサイト等の仲介手数料が寄附金額の最大11.5%に達するとの指摘を踏まえ、手数料の引下げ・適正化を総務省に求めた。",
        speech: speechMeta({
          speechID: "122104601X01120260526_022",
          issueID: "122104601X01120260526",
          date: "2026-05-26",
          nameOfHouse: "衆議院",
          nameOfMeeting: "総務委員会",
          session: 221,
          issue: "第11号",
          speaker: "松下英樹",
          speakerGroup: "自由民主党・無所属の会",
          speechURL: "https://kokkai.ndl.go.jp/txt/122104601X01120260526/22",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122104601X01120260526",
        }),
      },
    ],
  },

  "boeeihi": {
    nowSummary: {
      label: "いまの結論",
      bullets: [
        "松田学（参政党）は防衛費増大が増税につながる懸念を示し、投資国債型の財源を提案",
        "片山さつき財務大臣は防衛特別所得税創設済み、三文書改定に向け安定的財源を検討すると答弁",
        "小泉進次郎防衛大臣は2026年中の安保三文書前倒し改定と防衛費水準の積み上げ議論を表明"
      ],
      disclaimer:
        "AI補助による平易語要約です。解釈を含みます。数字・引用・発言内容の正本は primarySpeech.speechFull（国会議事録原文）をご確認ください。",
      updatedAt: "2026-06-27T12:00:00.000Z",
    },
    summaryBullets: [
      "松田学（参政党・2026-05-26）は、防衛費増大が国民の増税不安につながるとし、投資国債型財源を提案。",
      "片山さつき財務大臣は、防衛力整備計画に基づく財源として歳出改革・税外収入・防衛特別所得税を確保済みと答弁。",
      "松田はドイツの債務ブレーキ撤廃、イタリアのNEC条項、カナダの防衛融資銀行等の海外事例を引用。",
      "2026-04-14、小泉進次郎防衛大臣（参院外交防衛委員会）は、高市内閣が三文書を前倒しで年内改定すると表明。",
      "田島麻衣子（立憲・2026-05-12）は防衛増税と三文書改定の透明性・議事録公開を求めた。",
    ],
    arcSummary: [
      { date: "2026-05-26", text: "松田学（参政党）が参院財政金融委員会で防衛費財源と六十年償還ルール緩和を質問" },
      { date: "2026-05-26", text: "片山さつき財務大臣が防衛特別所得税と三文書改定に向けた安定的財源検討を答弁" },
      { date: "2026-05-12", text: "田島麻衣子（立憲）が参院外交防衛委員会で防衛増税と三文書改定の財政影響を質問" },
      { date: "2026-04-14", text: "小泉進次郎防衛大臣が三文書前倒し改定と防衛費積み上げ方針を表明" },
    ],
    timeline: [
      {
        id: "be-20260526-matsuda",
        type: "speech",
        date: "2026-05-26",
        summaryPlain:
          "松田学（参政党）は、防衛費の顕著な増大が増税につながる懸念を示し、国家を守る投資として起債対象とすべきだと質問。六十年償還ルールの国際標準への緩和も求めた。",
        speech: speechMeta({
          speechID: "122114370X00920260526_078",
          issueID: "122114370X00920260526",
          date: "2026-05-26",
          nameOfHouse: "参議院",
          nameOfMeeting: "財政金融委員会",
          session: 221,
          issue: "第9号",
          speaker: "松田学",
          speakerGroup: "参政党",
          speechURL: "https://kokkai.ndl.go.jp/txt/122114370X00920260526/78",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122114370X00920260526",
        }),
      },
      {
        id: "be-20260526-katayama",
        type: "speech",
        date: "2026-05-26",
        summaryPlain:
          "片山さつき財務大臣は、防衛力整備計画の財源として歳出改革・税外収入・防衛特別所得税を確保し、三文書改定に向け安定的財源を検討すると答弁した。",
        speech: speechMeta({
          speechID: "122114370X00920260526_079",
          issueID: "122114370X00920260526",
          date: "2026-05-26",
          nameOfHouse: "参議院",
          nameOfMeeting: "財政金融委員会",
          session: 221,
          issue: "第9号",
          speaker: "片山さつき",
          speakerGroup: "自由民主党・無所属の会",
          speechURL: "https://kokkai.ndl.go.jp/txt/122114370X00920260526/79",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122114370X00920260526",
        }),
      },
      {
        id: "be-20260414-koizumi",
        type: "speech",
        date: "2026-04-14",
        summaryPlain:
          "小泉進次郎防衛大臣は、高市内閣が国家安全保障戦略等の三文書を前倒しで今年中に改定し、安全保障環境の変化に対応する議論を積み上げると表明した。",
        speech: speechMeta({
          speechID: "122113950X00420260414_026",
          issueID: "122113950X00420260414",
          date: "2026-04-14",
          nameOfHouse: "参議院",
          nameOfMeeting: "外交防衛委員会",
          session: 221,
          issue: "第4号",
          speaker: "小泉進次郎",
          speakerGroup: "自由民主党・無所属の会",
          speechURL: "https://kokkai.ndl.go.jp/txt/122113950X00420260414/26",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122113950X00420260414",
        }),
      },
    ],
  },

  "casino-ir": {
    nowSummary: {
      label: "いまの結論",
      bullets: [
        "あかま二郎国家公安委員長は、カジノ管理委員会による暴力団排除審査と厳格な規制実施を表明",
        "鬼木誠（立憲）は違法オンラインカジノ対策の実効性強化と決済手段規制を求めている",
        "大阪IRは2030年秋頃開業予定で、区域整備計画に年間約1060億円の財政効果が見込まれる（政府参考人答弁）"
      ],
      disclaimer:
        "AI補助による平易語要約です。解釈を含みます。数字・引用・発言内容の正本は primarySpeech.speechFull（国会議事録原文）をご確認ください。",
      updatedAt: "2026-06-27T12:00:00.000Z",
    },
    summaryBullets: [
      "あかま二郎大臣（2026-04-08）は、カジノ事業免許審査で暴力団排除・社会的信用を確認し、厳格な規制を実施すると答弁。",
      "鬼木誠（立憲・2026-04-21）は違法オンラインカジノ対策の実効性と決済代行業者への規制強化を求めた。",
      "大津力（参政党・2026-04-21）はIRカジノ設置がギャンブル依存症増加の懸念があると質問。",
      "政府参考人（2026-04-08）は大阪IRの開業を2030年秋頃、年間納付金等合計約1060億円の財政効果を見込むと説明。",
      "改正ギャンブル等依存症対策基本法（2025年9月施行）でオンラインカジノ誘導情報の発信が違法化された（あかま答弁）。"
    ],
    arcSummary: [
      { date: "2026-04-21", text: "鬼木誠（立憲）が参院内閣委員会で違法オンラインカジノ対策と決済規制を質問" },
      { date: "2026-04-08", text: "あかま二郎大臣が衆院内閣委員会でカジノ管理委員会の厳格規制を表明" },
      { date: "2025-09-01", text: "改正ギャンブル等依存症対策基本法施行（オンラインカジノ誘導情報の違法化）", milestone: { label: "ギャンブル等依存症対策基本法改正施行", sourceUrl: null } },
    ],
    timeline: [
      {
        id: "ci-20260421-oniki",
        type: "speech",
        date: "2026-04-21",
        summaryPlain:
          "鬼木誠（立憲）は、違法オンラインカジノ対策の実効性強化と、決済代行業者・資金決済法上の規制について政府に質問した。",
        speech: speechMeta({
          speechID: "122114889X00520260421_005",
          issueID: "122114889X00520260421",
          date: "2026-04-21",
          nameOfHouse: "参議院",
          nameOfMeeting: "内閣委員会",
          session: 221,
          issue: "第5号",
          speaker: "鬼木誠",
          speakerGroup: "立憲民主・無所属",
          speechURL: "https://kokkai.ndl.go.jp/txt/122114889X00520260421/5",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122114889X00520260421",
        }),
      },
      {
        id: "ci-20260408-akama",
        type: "speech",
        date: "2026-04-08",
        summaryPlain:
          "あかま二郎国家公安委員長は、カジノ事業の免許審査で暴力団員等の排除と社会的信用の確認を行い、カジノ管理委員会が厳格な規制を実施すると答弁した。",
        speech: speechMeta({
          speechID: "122104889X00220260408_046",
          issueID: "122104889X00220260408",
          date: "2026-04-08",
          nameOfHouse: "衆議院",
          nameOfMeeting: "内閣委員会",
          session: 221,
          issue: "第2号",
          speaker: "あかま二郎",
          speakerGroup: "自由民主党・無所属の会",
          speechURL: "https://kokkai.ndl.go.jp/txt/122104889X00220260408/46",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122104889X00220260408",
        }),
      },
      {
        id: "ci-20260408-osaka-ir",
        type: "speech",
        date: "2026-04-08",
        summaryPlain:
          "政府参考人（観光庁審議官・田中賢二）は、大阪IRの区域整備計画を2023年4月に認定し、2030年秋頃の開業に向け建設を進め、納付金等合計で年間約1060億円の財政効果を見込むと説明した。",
        speech: speechMeta({
          speechID: "122104889X00220260408_044",
          issueID: "122104889X00220260408",
          date: "2026-04-08",
          nameOfHouse: "衆議院",
          nameOfMeeting: "内閣委員会",
          session: 221,
          issue: "第2号",
          speaker: "田中賢二",
          speakerGroup: null,
          speechURL: "https://kokkai.ndl.go.jp/txt/122104889X00220260408/44",
          meetingURL: "https://kokkai.ndl.go.jp/txt/122104889X00220260408",
        }),
      },
      {
        id: "ci-202509-law-milestone",
        type: "milestone",
        date: "2025-09-01",
        summaryPlain:
          "改正ギャンブル等依存症対策基本法が施行され、オンラインカジノサイトへの誘導情報発信が違法とされた。",
        milestone: {
          label: "改正ギャンブル等依存症対策基本法施行",
          sourceUrl: null,
        },
      },
    ],
  },
};

for (const [slug, patch] of Object.entries(patches)) {
  const p = path.join(root, "data/articles", `${slug}.json`);
  const article = JSON.parse(await readFile(p, "utf8"));
  Object.assign(article, patch);
  article.publishReady = false;
  await writeFile(p, JSON.stringify(article, null, 2) + "\n", "utf8");
  console.log(`OK ${slug}: timeline=${article.timeline.length}`);
}
