import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "投資学習 | Stock Search",
  description: "株式投資の基礎から実践まで、初心者向けにわかりやすく解説します。",
};

const SECTIONS = [
  { id: "stocks-basics",      emoji: "📈", title: "株式投資とは" },
  { id: "chart-reading",      emoji: "📊", title: "チャートの読み方" },
  { id: "technical-analysis", emoji: "📐", title: "テクニカル分析" },
  { id: "fundamentals",       emoji: "💹", title: "ファンダメンタルズ分析" },
  { id: "sectors",            emoji: "🏭", title: "セクター別投資" },
  { id: "risk-management",    emoji: "🛡️",  title: "リスク管理" },
  { id: "glossary",           emoji: "📖", title: "用語集" },
];

export default function LearnPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">📚</span>
          <h1 className="text-3xl font-extrabold tracking-tight">投資の基礎を学ぼう</h1>
        </div>
        <p className="text-green-100 text-lg leading-relaxed max-w-2xl">
          株式投資は難しくありません。基礎知識さえ身につければ、誰でも始められます。
          このページでは、チャートの読み方からリスク管理まで、体系的に学べます。
        </p>
        <p className="mt-3 text-green-200 text-sm">
          ※ 投資には元本割れのリスクがあります。投資判断は自己責任でお願いします。
        </p>
      </div>

      {/* Navigation */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">目次</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SECTIONS.map(s => (
            <Link
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-green-50 dark:hover:bg-green-950/30 border border-slate-200 dark:border-slate-700 hover:border-green-300 transition-all group"
            >
              <span className="text-lg">{s.emoji}</span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-green-700 dark:group-hover:text-green-300">{s.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Section 1: 株式投資とは */}
      <section id="stocks-basics" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm scroll-mt-20">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">📈</span>
          <h2 className="text-xl font-bold tracking-tight">株式投資とは</h2>
        </div>
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">株式とは何か？</h3>
            <p>
              株式（stock）とは、企業が資金調達のために発行する「所有権の証明書」です。株式を購入すると、その企業の一部オーナー（株主）になります。企業が利益を出すと、株主には「配当金」が支払われます。また、株価が上昇すれば売却益（キャピタルゲイン）を得られます。
            </p>
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">株式市場の仕組み</h3>
            <p>
              株式市場は、株式の売買が行われる「市場」です。買いたい人と売りたい人が出会い、需要と供給によって価格が決まります。株価は、企業の業績予想、経済指標、政治・地政学リスク、投資家心理など様々な要因で変動します。
            </p>
            <p className="mt-2">
              株価が上がるのは、その企業の将来性を多くの投資家が評価したとき。逆に悪材料が出たり、市場全体が悪化すると株価は下がります。短期的には感情的な売買も多く、長期的には企業の実力が反映されやすくなります。
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
              <div className="font-bold text-blue-800 dark:text-blue-200 mb-2">🇯🇵 日本の主な市場</div>
              <ul className="text-sm space-y-1 text-blue-700 dark:text-blue-300">
                <li><span className="font-mono font-bold">東証プライム</span> — 大型優良企業（旧東証一部）</li>
                <li><span className="font-mono font-bold">東証スタンダード</span> — 中堅企業（旧東証二部）</li>
                <li><span className="font-mono font-bold">東証グロース</span> — 成長期待の新興企業</li>
                <li><span className="font-mono font-bold">日経225</span> — 代表的な225銘柄指数</li>
                <li><span className="font-mono font-bold">TOPIX</span> — 東証全銘柄の時価総額加重指数</li>
              </ul>
            </div>
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-4">
              <div className="font-bold text-rose-800 dark:text-rose-200 mb-2">🇺🇸 米国の主な市場</div>
              <ul className="text-sm space-y-1 text-rose-700 dark:text-rose-300">
                <li><span className="font-mono font-bold">NYSE</span> — ニューヨーク証券取引所（老舗大企業中心）</li>
                <li><span className="font-mono font-bold">NASDAQ</span> — テック企業中心の電子取引所</li>
                <li><span className="font-mono font-bold">S&amp;P500</span> — 米国大型500銘柄指数</li>
                <li><span className="font-mono font-bold">ダウ平均</span> — 30銘柄の価格平均指数</li>
                <li><span className="font-mono font-bold">QQQ</span> — NASDAQ100連動ETF</li>
              </ul>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">日本株と米国株の違い</h3>
            <p>
              日本株は1単元が通常100株単位のため、株価×100円が最低投資額になります（例：株価1,000円なら10万円必要）。一方、米国株は1株から購入でき、初心者でも少額から分散投資しやすいのが特徴です。配当の受取頻度も異なり、日本株は年1〜2回が多く、米国株は四半期（年4回）配当が主流です。
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: チャートの読み方 */}
      <section id="chart-reading" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm scroll-mt-20">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">📊</span>
          <h2 className="text-xl font-bold tracking-tight">チャートの読み方</h2>
        </div>
        <div className="space-y-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">折れ線チャートとは</h3>
            <p>
              折れ線チャートは、各時点の「終値（その日の最後の取引価格）」を線で結んだものです。価格の大まかなトレンド（上昇・下落・横ばい）を素早く把握するのに適しています。長期的な価格推移を見るときによく使われます。
            </p>
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">ローソク足（キャンドルスティック）チャート</h3>
            <p className="mb-3">
              ローソク足チャートは、各時間足（1分、5分、1日など）の4つの価格情報（OHLC）を1本のローソクで表現します。折れ線より詳細な情報が読み取れるため、多くのトレーダーが使用します。
            </p>
            {/* OHLC Visual Diagram */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5">
              <div className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">ローソク足の構造</div>
              <div className="flex gap-8 items-start justify-center">
                {/* 陽線（上昇） */}
                <div className="flex flex-col items-center gap-2">
                  <div className="text-xs font-bold text-emerald-600 mb-1">陽線（上昇）</div>
                  <div className="relative flex flex-col items-center" style={{ height: 120 }}>
                    {/* Upper wick */}
                    <div className="w-0.5 bg-emerald-500" style={{ height: 24 }} />
                    {/* Body */}
                    <div className="w-8 border-2 border-emerald-500 bg-emerald-500" style={{ height: 56 }} />
                    {/* Lower wick */}
                    <div className="w-0.5 bg-emerald-500" style={{ height: 24 }} />
                    {/* Labels */}
                    <div className="absolute right-12 top-0 text-[10px] text-slate-500 whitespace-nowrap">高値 (High)</div>
                    <div className="absolute right-12 top-6 text-[10px] text-slate-500 whitespace-nowrap">始値 (Open)</div>
                    <div className="absolute right-12 bottom-6 text-[10px] text-slate-500 whitespace-nowrap">終値 (Close)</div>
                    <div className="absolute right-12 bottom-0 text-[10px] text-slate-500 whitespace-nowrap">安値 (Low)</div>
                  </div>
                  <p className="text-[10px] text-slate-500 text-center max-w-[80px]">終値 &gt; 始値<br/>塗り潰し</p>
                </div>
                {/* 陰線（下落） */}
                <div className="flex flex-col items-center gap-2">
                  <div className="text-xs font-bold text-rose-600 mb-1">陰線（下落）</div>
                  <div className="relative flex flex-col items-center" style={{ height: 120 }}>
                    {/* Upper wick */}
                    <div className="w-0.5 bg-rose-500" style={{ height: 24 }} />
                    {/* Body hollow */}
                    <div className="w-8 border-2 border-rose-500 bg-transparent" style={{ height: 56 }} />
                    {/* Lower wick */}
                    <div className="w-0.5 bg-rose-500" style={{ height: 24 }} />
                  </div>
                  <p className="text-[10px] text-slate-500 text-center max-w-[80px]">終値 &lt; 始値<br/>白抜き</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-300">始値 (Open)</span>
                  <p className="text-slate-500 mt-1">その時間足の最初の取引価格</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-300">高値 (High)</span>
                  <p className="text-slate-500 mt-1">その時間足で最も高かった価格</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-300">安値 (Low)</span>
                  <p className="text-slate-500 mt-1">その時間足で最も低かった価格</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-300">終値 (Close)</span>
                  <p className="text-slate-500 mt-1">その時間足の最後の取引価格</p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">時間足の種類と使い分け</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: "超短期（分足・時間足）", desc: "デイトレーダーが当日の売買タイミングを判断するために使用。1分〜1時間足が主流。" },
                { label: "短〜中期（日足）", desc: "スイングトレーダーや中期投資家が数日〜数週間のトレンドを分析するために使用。" },
                { label: "長期（週足・月足）", desc: "長期投資家が大きなトレンドや景気サイクルを確認するために使用。ノイズが少ない。" },
              ].map(item => (
                <div key={item.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3">
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">{item.label}</div>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: テクニカル分析 */}
      <section id="technical-analysis" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm scroll-mt-20">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">📐</span>
          <h2 className="text-xl font-bold tracking-tight">テクニカル分析</h2>
        </div>
        <div className="space-y-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            テクニカル分析とは、過去の価格・出来高データのパターンを分析して、将来の価格動向を予測する手法です。チャートや各種インジケーターを使い、売買タイミングを判断します。
          </p>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-3">単純移動平均線（SMA）</h3>
            <p className="mb-3">
              移動平均線（Moving Average）は、指定した期間の終値の平均値を結んだ線です。株価のノイズを除去し、トレンドを視覚化します。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  period: "SMA20",
                  color: "amber",
                  desc: "直近20日間の平均株価。短期トレンドを示す。株価がSMA20を上回れば短期上昇トレンド、下回れば下降トレンド。",
                  usage: "短期売買の基準線として使用"
                },
                {
                  period: "SMA50",
                  color: "emerald",
                  desc: "直近50日間の平均株価。中期トレンドを示す。SMA20がSMA50を上抜けると「ゴールデンクロス」（買いシグナル）。",
                  usage: "中期投資家の売買判断に活用"
                },
                {
                  period: "SMA200",
                  color: "rose",
                  desc: "直近200日間の平均株価。長期トレンドを示す「最重要MA」。機関投資家も重視する。株価がSMA200を上回る銘柄は強い。",
                  usage: "強気・弱気相場の判断基準"
                },
              ].map(item => (
                <div key={item.period} className={`rounded-xl border p-4 ${
                  item.color === "amber" ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" :
                  item.color === "emerald" ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" :
                  "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
                }`}>
                  <div className={`font-mono font-bold text-lg mb-2 ${
                    item.color === "amber" ? "text-amber-600" :
                    item.color === "emerald" ? "text-emerald-600" :
                    "text-rose-600"
                  }`}>{item.period}</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{item.desc}</p>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{item.usage}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">ゴールデンクロスとデッドクロス</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4">
                <div className="font-bold text-emerald-700 dark:text-emerald-300 mb-1">✨ ゴールデンクロス（買いシグナル）</div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  短期MA（例：SMA20）が長期MA（例：SMA50）を下から上に突き抜ける現象。上昇トレンドへの転換を示す買いシグナルとして広く使われます。
                </p>
              </div>
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 p-4">
                <div className="font-bold text-rose-700 dark:text-rose-300 mb-1">💀 デッドクロス（売りシグナル）</div>
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  短期MAが長期MAを上から下に突き抜ける現象。下降トレンドへの転換を示す売りシグナルとして使われます。ゴールデンクロスの逆。
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
            <div className="font-bold text-amber-800 dark:text-amber-200 mb-1">⚠️ テクニカル分析の限界</div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              テクニカル分析は過去データをもとにしており、必ずしも未来を正確に予測できるわけではありません。突発的なニュースや経済ショックには対応できないため、ファンダメンタルズ分析と組み合わせて使うことが重要です。
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: ファンダメンタルズ分析 */}
      <section id="fundamentals" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm scroll-mt-20">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">💹</span>
          <h2 className="text-xl font-bold tracking-tight">ファンダメンタルズ分析</h2>
        </div>
        <div className="space-y-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            ファンダメンタルズ分析とは、企業の財務状況・収益力・成長性を分析し、株式の本質的な価値（インリンジック・バリュー）を評価する手法です。「この株は今の価格で買う価値があるか？」を判断します。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                id: "PER",
                name: "株価収益率",
                formula: "株価 ÷ EPS（1株当たり利益）",
                explain: "投資家が1円の利益に対して何円支払っているか。低いほど割安だが、成長株は高めになりやすい。一般的に15〜20倍が標準、30倍超は高PER（成長期待）。",
                eg: "株価1,000円、EPS50円 → PER 20倍"
              },
              {
                id: "PBR",
                name: "株価純資産倍率",
                formula: "株価 ÷ BPS（1株当たり純資産）",
                explain: "企業の解散価値に対して何倍の株価がついているか。1倍割れは「資産以下の株価」で割安の目安。日本株に多い傾向がある。",
                eg: "株価800円、BPS1,000円 → PBR 0.8倍（割安）"
              },
              {
                id: "ROE",
                name: "自己資本利益率",
                formula: "純利益 ÷ 自己資本 × 100",
                explain: "株主から預かったお金をどれだけ効率よく利益に変えたか。10%以上が優良企業の目安。バフェットは15%以上を重視。",
                eg: "純利益100億円、自己資本800億円 → ROE 12.5%"
              },
              {
                id: "EPS",
                name: "1株当たり利益",
                formula: "純利益 ÷ 発行済株式数",
                explain: "1株が生み出す利益の大きさ。EPSが毎年増加している企業は収益力が高まっており、長期的な株価上昇が期待できる。",
                eg: "純利益50億円、株式数1,000万株 → EPS 500円"
              },
              {
                id: "配当利回り",
                name: "配当利回り",
                formula: "1株配当金 ÷ 株価 × 100",
                explain: "株価に対してどれだけの配当を受け取れるか。3〜5%以上が高配当の目安。ただし利回りが高すぎる場合は業績悪化のリスクも。",
                eg: "配当30円、株価600円 → 配当利回り 5%"
              },
              {
                id: "時価総額",
                name: "時価総額",
                formula: "株価 × 発行済株式数",
                explain: "企業の市場での総価値。大型株（1兆円超）は安定性が高く、小型株（300億円未満）は成長性があるがリスクも大きい。",
                eg: "株価2,000円、5,000万株 → 時価総額1,000億円"
              },
            ].map(item => (
              <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-mono font-black text-base text-violet-600 dark:text-violet-400">{item.id}</span>
                  <span className="text-xs text-slate-500">{item.name}</span>
                </div>
                <div className="font-mono text-xs bg-white dark:bg-slate-900 rounded-lg px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 mb-2">
                  {item.formula}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{item.explain}</p>
                <p className="text-[10px] text-slate-400 italic">{item.eg}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: セクター別投資 */}
      <section id="sectors" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm scroll-mt-20">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">🏭</span>
          <h2 className="text-xl font-bold tracking-tight">セクター別投資</h2>
        </div>
        <div className="space-y-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            GICSセクター（Global Industry Classification Standard）は、世界標準の産業分類で、株式市場を11のセクターに分類します。セクターごとに景気への感応度が異なるため、分散投資に活用できます。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { emoji: "💻", name: "情報技術", type: "景気敏感", desc: "GAFAM、半導体等。高成長だが景気後退時に大きく売られる傾向。", color: "blue" },
              { emoji: "🏥", name: "ヘルスケア", type: "ディフェンシブ", desc: "製薬、医療機器。景気に左右されにくい。高齢化社会で長期成長期待。", color: "green" },
              { emoji: "💳", name: "金融", type: "景気敏感", desc: "銀行、保険、証券。金利上昇局面で恩恵を受けやすい。", color: "yellow" },
              { emoji: "🛒", name: "一般消費財", type: "景気敏感", desc: "Amazon、テスラ等。景気拡大期に強く、後退期に弱い。", color: "orange" },
              { emoji: "🍎", name: "生活必需品", type: "ディフェンシブ", desc: "食品、日用品。不況でも需要が安定。高配当銘柄が多い。", color: "green" },
              { emoji: "⚡", name: "公益事業", type: "ディフェンシブ", desc: "電力、ガス。安定配当が魅力。金利上昇時には相対的に不利。", color: "green" },
              { emoji: "🏭", name: "資本財", type: "景気敏感", desc: "航空機、機械、物流。経済成長・インフラ投資の拡大で恩恵。", color: "gray" },
              { emoji: "📡", name: "通信サービス", type: "混合", desc: "メタ、グーグル、Netflixも含む広義の通信。成長と安定の中間。", color: "purple" },
              { emoji: "🛢️", name: "エネルギー", type: "景気敏感", desc: "石油・天然ガス。原油価格に大きく左右される。地政学リスクにも敏感。", color: "yellow" },
              { emoji: "🏗️", name: "素材", type: "景気敏感", desc: "鉄鋼、化学、金属。インフレ局面や建設ブームで強い。", color: "gray" },
              { emoji: "🏢", name: "不動産", type: "混合", desc: "REIT中心。高配当が特徴だが金利上昇に弱い。", color: "orange" },
            ].map(item => (
              <div key={item.name} className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <span className="text-xl shrink-0 mt-0.5">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                      item.type === "ディフェンシブ" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" :
                      item.type === "景気敏感" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" :
                      "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}>{item.type}</span>
                  </div>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 p-4">
            <div className="font-bold text-violet-800 dark:text-violet-200 mb-2">💡 セクターローテーション戦略</div>
            <p className="text-xs text-violet-700 dark:text-violet-300">
              景気サイクル（回復→拡大→後退→底打ち）に合わせてセクターを切り替える戦略。景気回復期は景気敏感株（テック・消費財）、後退期はディフェンシブ株（ヘルスケア・公益）が相対的に強い傾向があります。
            </p>
          </div>
        </div>
      </section>

      {/* Section 6: リスク管理 */}
      <section id="risk-management" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm scroll-mt-20">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">🛡️</span>
          <h2 className="text-xl font-bold tracking-tight">リスク管理</h2>
        </div>
        <div className="space-y-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            投資で最も重要なのは「利益を最大化すること」ではなく「損失を最小化すること」です。どんな優れた投資家も損失を出します。大切なのは損失を限定し、長期的に資産を増やすことです。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4">
              <div className="font-bold text-emerald-800 dark:text-emerald-200 mb-2">🌍 分散投資</div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                「卵は1つのかごに盛るな」。複数の銘柄・セクター・国・資産クラスに分散することで、1つの銘柄が急落しても全体への影響を抑えられます。インデックスファンド（S&P500等）は自動的に分散できるため、初心者に最適です。
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4">
              <div className="font-bold text-blue-800 dark:text-blue-200 mb-2">📅 ドルコスト平均法</div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                毎月決まった金額を定期購入する方法。高いときは少ない株数、安いときは多くの株数を買うため、平均取得単価を抑えられます。「毎月3万円積立」のような形で、市場タイミングを読む必要がなくなります。
              </p>
            </div>
            <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 p-4">
              <div className="font-bold text-violet-800 dark:text-violet-200 mb-2">📏 ポジションサイジング</div>
              <p className="text-xs text-violet-700 dark:text-violet-300">
                1銘柄への投資比率を総資産の5〜10%以内に抑えることが一般的なルール。「集中投資」はリターンを高めますが、リスクも急増します。初心者は10銘柄以上への分散が推奨されます。
              </p>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">損切りのルール</h3>
            <p>
              損切りとは、損失が一定水準を超えたら機械的に売却すること。多くのプロトレーダーは「買値から7〜8%下落したら売る」などのルールを設けています。損切りを躊躇すると、小さな損失が大きな損失に膨らむ可能性があります。
            </p>
            <div className="mt-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 p-3">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">💡 損切りと回復の関係</div>
              <div className="flex gap-4 text-xs font-mono">
                <span className="text-rose-500">-10%損失 → +11%で回復</span>
                <span className="text-rose-600">-20%損失 → +25%で回復</span>
                <span className="text-rose-700">-50%損失 → +100%必要</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
            <div className="font-bold text-amber-800 dark:text-amber-200 mb-2">⚠️ 投資の大原則</div>
            <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
              <li>• 生活費・緊急資金は株式に回さない（投資は余裕資金で）</li>
              <li>• 借金（信用取引）で株を買わない（初心者は特に）</li>
              <li>• 「絶対に上がる」という情報は疑う</li>
              <li>• 短期的な変動に一喜一憂せず、長期的視点を持つ</li>
              <li>• 自分が理解できる企業・ビジネスモデルに投資する</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 7: 用語集 */}
      <section id="glossary" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm scroll-mt-20">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">📖</span>
          <h2 className="text-xl font-bold tracking-tight">用語集</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {[
            { term: "陽線", def: "終値が始値より高いローソク足（緑・白）" },
            { term: "陰線", def: "終値が始値より低いローソク足（赤・黒）" },
            { term: "上髭（ひげ）", def: "ローソク足の上部に延びる細い線（高値〜実体）" },
            { term: "下髭", def: "ローソク足の下部に延びる細い線（安値〜実体）" },
            { term: "終値", def: "その日・時間帯の最後の取引価格" },
            { term: "出来高", def: "一定期間に売買された株式数の合計" },
            { term: "時価総額", def: "株価×発行済株式数。企業規模の指標" },
            { term: "浮動株", def: "市場で自由に売買できる株数（創業者保有分等を除く）" },
            { term: "IPO", def: "新規株式公開。未上場企業の株式市場への初上場" },
            { term: "ETF", def: "上場投資信託。指数等に連動し、株と同様に売買できる" },
            { term: "REIT", def: "不動産投資信託。不動産収益を投資家に分配" },
            { term: "信用取引", def: "証券会社から資金・株式を借りて行う取引（レバレッジ）" },
            { term: "空売り", def: "株を借りて売り、後で安く買い戻して差益を得る手法" },
            { term: "配当性向", def: "純利益のうち配当に充てる割合（%）" },
            { term: "増配", def: "1株当たり配当金額の増加" },
            { term: "自社株買い", def: "企業が市場で自社株を買い戻すこと。株主還元の一つ" },
            { term: "ストップ高/安", def: "株価が1日の変動制限幅の上限/下限に達した状態" },
            { term: "TOB", def: "株式公開買付。市場外で不特定多数から株式を買い集めること" },
            { term: "MBO", def: "経営陣による自社買収。非公開化のために行われることが多い" },
            { term: "M&A", def: "企業の合併・買収。相乗効果（シナジー）を狙う" },
            { term: "EBITDA", def: "利払い・税引き・減価償却前利益。企業の稼ぐ力の指標" },
            { term: "フリーキャッシュフロー", def: "設備投資後に残る現金。配当・自社株買いの源泉" },
            { term: "バリュー株", def: "PER・PBRが低い割安株。収益に比べ株価が低い" },
            { term: "グロース株", def: "高成長期待の銘柄。PERは高めだが将来性を重視" },
            { term: "ディフェンシブ株", def: "景気変動の影響を受けにくいインフラ・食品・医療等の株" },
            { term: "景気敏感株", def: "景気拡大で上がり、後退で大きく下がるシクリカル銘柄" },
            { term: "インデックス投資", def: "日経225・S&P500等の指数全体に連動するETF/投信への投資" },
            { term: "アクティブ投資", def: "指数を上回るリターンを狙い、銘柄を選択する投資手法" },
          ].map(item => (
            <div key={item.term} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2.5">
              <div className="font-bold text-slate-900 dark:text-white text-sm mb-0.5">{item.term}</div>
              <p className="text-xs text-slate-500">{item.def}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-6 text-white text-center shadow-xl">
        <h2 className="text-xl font-bold mb-2">実際に株価をチェックしてみよう</h2>
        <p className="text-violet-200 text-sm mb-4">学んだ知識を活かして、気になる銘柄を調べてみましょう。</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/" className="px-5 py-2 rounded-xl bg-white text-violet-700 font-bold text-sm hover:bg-violet-50 transition-colors">
            🏠 ホームへ
          </Link>
          <Link href="/screener" className="px-5 py-2 rounded-xl bg-violet-500/50 text-white font-bold text-sm hover:bg-violet-500/70 transition-colors border border-violet-400">
            🎯 銘柄を探す
          </Link>
          <Link href="/sectors" className="px-5 py-2 rounded-xl bg-violet-500/50 text-white font-bold text-sm hover:bg-violet-500/70 transition-colors border border-violet-400">
            📊 セクターを見る
          </Link>
        </div>
      </div>
    </div>
  );
}
