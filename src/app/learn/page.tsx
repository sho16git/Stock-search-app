import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "投資学習 | Stock Search",
  description: "株式投資の基礎から実践まで、初心者向けにわかりやすく解説します。",
};

// ── Table of contents ─────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "basics",      emoji: "📈", title: "株式とは",         color: "from-blue-500 to-blue-600"     },
  { id: "chart",       emoji: "🕯️",  title: "チャートの読み方", color: "from-violet-500 to-violet-600" },
  { id: "technical",   emoji: "📐", title: "テクニカル分析",   color: "from-cyan-500 to-cyan-600"     },
  { id: "fundamental", emoji: "💹", title: "ファンダメンタルズ", color: "from-emerald-500 to-emerald-600" },
  { id: "sectors",     emoji: "🏭", title: "セクター投資",     color: "from-orange-500 to-orange-600" },
  { id: "strategy",    emoji: "🎯", title: "投資戦略",         color: "from-pink-500 to-pink-600"     },
  { id: "risk",        emoji: "🛡️",  title: "リスク管理",      color: "from-red-500 to-red-600"       },
  { id: "glossary",    emoji: "📖", title: "用語集",           color: "from-zinc-500 to-zinc-600"     },
];

// ── Reusable components ───────────────────────────────────────────────────────
function SectionCard({ id, children, emoji, title }: {
  id: string; children: React.ReactNode; emoji: string; title: string;
}) {
  return (
    <section
      id={id}
      className="rounded-xl border border-zinc-200/60 dark:border-white/[0.07] bg-white dark:bg-zinc-900 overflow-hidden scroll-mt-20"
    >
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/[0.05] flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h2>
      </div>
      <div className="px-5 py-5 space-y-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </section>
  );
}

function InfoBox({ color, title, children }: { color: string; title: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    blue:    "bg-blue-50 dark:bg-blue-950/25 border-blue-200/60 dark:border-blue-800/40 text-blue-800 dark:text-blue-200",
    green:   "bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-200",
    amber:   "bg-amber-50 dark:bg-amber-950/25 border-amber-200/60 dark:border-amber-800/40 text-amber-800 dark:text-amber-200",
    red:     "bg-red-50 dark:bg-red-950/25 border-red-200/60 dark:border-red-800/40 text-red-800 dark:text-red-200",
    violet:  "bg-violet-50 dark:bg-violet-950/25 border-violet-200/60 dark:border-violet-800/40 text-violet-800 dark:text-violet-200",
    zinc:    "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-white/[0.07] text-zinc-700 dark:text-zinc-300",
  };
  return (
    <div className={`rounded-xl border p-4 ${styles[color] ?? styles.zinc}`}>
      <div className="font-bold mb-2">{title}</div>
      <div className="text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}

function Term({ word, children }: { word: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-zinc-100 dark:border-white/[0.04] last:border-0">
      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[13px] shrink-0 w-36">{word}</span>
      <span className="text-[13px] text-zinc-600 dark:text-zinc-400">{children}</span>
    </div>
  );
}

// ── Candle diagram ─────────────────────────────────────────────────────────────
function CandleDiagram() {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50 dark:bg-zinc-800/50 p-5">
      <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-5">ローソク足の構造</div>
      <div className="flex gap-12 items-start justify-center">
        {/* 陽線 */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs font-bold text-emerald-600 mb-1">陽線（上昇）</div>
          <div className="relative flex flex-col items-center" style={{ height: 130 }}>
            <div className="w-0.5 bg-emerald-500" style={{ height: 22 }} />
            <div className="w-9 bg-emerald-500 rounded-sm" style={{ height: 64 }} />
            <div className="w-0.5 bg-emerald-500" style={{ height: 22 }} />
            <div className="absolute -right-28 top-0 text-[10px] text-zinc-400 whitespace-nowrap">— 高値 (High)</div>
            <div className="absolute -right-28 top-[22px] text-[10px] text-zinc-400 whitespace-nowrap">— 終値 (Close)</div>
            <div className="absolute -right-28 bottom-[22px] text-[10px] text-zinc-400 whitespace-nowrap">— 始値 (Open)</div>
            <div className="absolute -right-28 bottom-0 text-[10px] text-zinc-400 whitespace-nowrap">— 安値 (Low)</div>
          </div>
          <div className="text-[10px] text-zinc-400 text-center">終値 &gt; 始値</div>
        </div>
        {/* 陰線 */}
        <div className="flex flex-col items-center gap-2 ml-16">
          <div className="text-xs font-bold text-red-500 mb-1">陰線（下落）</div>
          <div className="relative flex flex-col items-center" style={{ height: 130 }}>
            <div className="w-0.5 bg-red-500" style={{ height: 22 }} />
            <div className="w-9 border-2 border-red-500 bg-transparent rounded-sm" style={{ height: 64 }} />
            <div className="w-0.5 bg-red-500" style={{ height: 22 }} />
          </div>
          <div className="text-[10px] text-zinc-400 text-center">終値 &lt; 始値</div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LearnPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-200/80 dark:border-white/[0.07] bg-gradient-to-br from-white via-blue-50/30 to-violet-50/40 dark:from-zinc-900 dark:via-zinc-900 dark:to-blue-950/20 px-6 py-8 md:px-10">
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-blue-200/30 dark:bg-blue-900/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/70 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-medium mb-4">
            <span>📚</span> 投資学習センター
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
            株式投資の基礎を学ぼう
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base max-w-2xl leading-relaxed">
            株式投資は難しくありません。正しい知識と戦略があれば、誰でも始められます。
            チャートの読み方・テクニカル分析・リスク管理まで体系的に解説します。
          </p>
          <p className="mt-3 text-zinc-400 text-xs">
            ※ 投資には元本割れのリスクがあります。投資判断は自己責任でお願いします。
          </p>
        </div>
      </div>

      {/* ── Table of contents ── */}
      <div className="rounded-xl border border-zinc-200/60 dark:border-white/[0.07] bg-white dark:bg-zinc-900 p-5">
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">目次</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-white/[0.06] transition-all group"
            >
              <span className="text-base">{s.emoji}</span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 leading-tight">{s.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 1. 株式とは                                                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="basics" emoji="📈" title="株式とは">
        <p>
          <strong>株式（stock/share）</strong>とは、企業が資金調達のために発行する「所有権の証明書」です。
          株を購入すると、その企業の<strong>株主（オーナーの一人）</strong>になります。
          企業が利益を出せば「配当金」が受け取れ、株価が上昇すれば「売却益（キャピタルゲイン）」を得られます。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoBox color="blue" title="🇯🇵 日本の主な市場">
            <ul className="space-y-1.5">
              <li><span className="font-mono font-bold">東証プライム</span> — 大型優良企業（旧東証1部）</li>
              <li><span className="font-mono font-bold">東証スタンダード</span> — 中堅企業（旧東証2部）</li>
              <li><span className="font-mono font-bold">東証グロース</span> — 成長期待の新興企業</li>
              <li><span className="font-mono font-bold">日経225</span> — 代表的な225銘柄指数</li>
              <li><span className="font-mono font-bold">TOPIX</span> — 東証全銘柄の時価総額加重指数</li>
            </ul>
          </InfoBox>
          <InfoBox color="red" title="🇺🇸 米国の主な市場">
            <ul className="space-y-1.5">
              <li><span className="font-mono font-bold">NYSE</span> — ニューヨーク証券取引所（老舗大企業）</li>
              <li><span className="font-mono font-bold">NASDAQ</span> — テック企業中心の電子取引所</li>
              <li><span className="font-mono font-bold">S&amp;P500</span> — 米国大型500銘柄指数</li>
              <li><span className="font-mono font-bold">ダウ平均</span> — 30銘柄の価格平均指数</li>
              <li><span className="font-mono font-bold">QQQ</span> — NASDAQ100連動ETF</li>
            </ul>
          </InfoBox>
        </div>

        <div>
          <h3 className="font-bold text-base text-zinc-900 dark:text-white mb-2">日本株 vs 米国株</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                  <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-left font-semibold">項目</th>
                  <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-left font-semibold">🇯🇵 日本株</th>
                  <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-left font-semibold">🇺🇸 米国株</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["売買単位", "100株単位（1単元）", "1株から購入可"],
                  ["最低投資額", "株価×100円（例: 1,000円株→10万円）", "1株分（例: 500円の株も可）"],
                  ["配当頻度", "年1〜2回が主流", "四半期（年4回）が主流"],
                  ["取引時間（現地）", "9:00〜15:30（昼休みあり）", "9:30〜16:00（NY時間）"],
                  ["通貨リスク", "なし（円建て）", "あり（為替変動の影響）"],
                  ["情報量", "日本語資料豊富", "英語資料が多い"],
                ].map(([item, jp, us]) => (
                  <tr key={item} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="border border-zinc-200 dark:border-white/[0.07] px-3 py-1.5 font-medium text-zinc-700 dark:text-zinc-300">{item}</td>
                    <td className="border border-zinc-200 dark:border-white/[0.07] px-3 py-1.5">{jp}</td>
                    <td className="border border-zinc-200 dark:border-white/[0.07] px-3 py-1.5">{us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <InfoBox color="amber" title="💡 株価が動く主な要因">
          <ul className="space-y-1">
            <li>📊 <strong>企業業績</strong>: 売上・利益の増減、決算発表</li>
            <li>📰 <strong>経済指標</strong>: GDP・雇用統計・CPI（物価指数）</li>
            <li>🏦 <strong>金融政策</strong>: 中央銀行の金利動向（利上げ・利下げ）</li>
            <li>🌍 <strong>地政学リスク</strong>: 戦争・紛争・貿易摩擦</li>
            <li>💬 <strong>投資家心理</strong>: 需給バランス・センチメント</li>
          </ul>
        </InfoBox>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 2. チャートの読み方                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="chart" emoji="🕯️" title="チャートの読み方">
        <p>
          チャートは株価の推移を視覚化したものです。最も広く使われるのが
          <strong>ローソク足チャート（キャンドルスティック）</strong>で、
          各時間の「始値・高値・安値・終値」の4情報を1本のローソクで表します。
        </p>

        <CandleDiagram />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "始値 (Open)",  desc: "その時間足の最初の取引価格" },
            { label: "高値 (High)",  desc: "その時間足で最も高かった価格" },
            { label: "安値 (Low)",   desc: "その時間足で最も低かった価格" },
            { label: "終値 (Close)", desc: "その時間足の最後の取引価格" },
          ].map((x) => (
            <div key={x.label} className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-white/[0.07] p-3">
              <div className="font-bold text-zinc-800 dark:text-zinc-200 text-xs mb-1">{x.label}</div>
              <div className="text-[11px] text-zinc-500">{x.desc}</div>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-bold text-base text-zinc-900 dark:text-white mb-3">時間足の使い分け</h3>
          <div className="space-y-2">
            {[
              { label: "分足・時間足",  badge: "デイトレード", color: "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300", desc: "当日の売買タイミングを判断。1分・5分・15分・1時間足を使用。ノイズが多い。" },
              { label: "日足（デイリー）", badge: "スイングトレード", color: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300", desc: "数日〜数週間の中期トレンド分析に最適。多くの投資家が標準として使用。" },
              { label: "週足・月足",    badge: "長期投資", color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300", desc: "大きなトレンドや景気サイクルの確認に使用。ノイズが少なく長期投資家向け。" },
            ].map((x) => (
              <div key={x.label} className="flex items-start gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/[0.07] px-4 py-3">
                <div className="shrink-0">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">{x.label}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${x.color}`}>{x.badge}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">{x.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <InfoBox color="zinc" title="📌 サポート・レジスタンスとは">
          株価が反発しやすい価格帯。<strong>サポートライン</strong>（下値支持線）は株価が下がりにくいライン、
          <strong>レジスタンスライン</strong>（上値抵抗線）は株価が上がりにくいラインです。
          これらを意識して売買タイミングを判断します。
        </InfoBox>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 3. テクニカル分析                                                    */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="technical" emoji="📐" title="テクニカル分析">
        <p>
          テクニカル分析は「過去の株価・出来高のデータ」からパターンを読み取り、
          将来の価格動向を予測する手法です。アナリストや機関投資家も広く活用しています。
        </p>

        <div className="space-y-3">
          {[
            {
              name: "移動平均線（MA）",
              icon: "📉",
              color: "border-l-blue-500",
              body: "一定期間の終値の平均を線で結んだもの。5日・25日・75日・200日が一般的。短期線が長期線を上抜け（ゴールデンクロス）すると買いサイン、下抜け（デッドクロス）すると売りサイン。",
            },
            {
              name: "RSI（相対強弱指数）",
              icon: "⚡",
              color: "border-l-amber-500",
              body: "0〜100の範囲で表されるオシレーター。70以上で「買われすぎ（売りサイン）」、30以下で「売られすぎ（買いサイン）」と判断。過熱感・底打ちの確認に有効。",
            },
            {
              name: "MACD",
              icon: "📊",
              color: "border-l-violet-500",
              body: "短期EMA（12日）と長期EMA（26日）の差。MACDラインがシグナルラインを上抜けると買い、下抜けると売りサイン。トレンドの方向性と勢いを確認する。",
            },
            {
              name: "ボリンジャーバンド",
              icon: "〰️",
              color: "border-l-cyan-500",
              body: "移動平均線の上下に標準偏差×2倍の幅を設けたバンド。株価がバンドの外に出ることは統計的に少なく、バンド内に戻る傾向がある。スクイーズ（バンドが狭まる）後の急騰・急落に注意。",
            },
            {
              name: "出来高（Volume）",
              icon: "📦",
              color: "border-l-emerald-500",
              body: "売買された株数。株価変動の「信頼性」を表す。出来高が多い=市場参加者が多い=トレンドが確かという解釈。陽線＋大出来高は上昇トレンド継続、陰線＋大出来高は下落トレンド継続の可能性が高い。",
            },
          ].map((item) => (
            <div key={item.name} className={`rounded-xl border-l-4 ${item.color} bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/[0.07] px-4 py-3`}>
              <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">{item.icon} {item.name}</div>
              <p className="text-xs text-zinc-500 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <InfoBox color="amber" title="⚠️ テクニカル分析の注意点">
          テクニカル分析は「過去のパターン」に基づくため、<strong>必ず当たるわけではありません</strong>。
          複数の指標を組み合わせてシグナルを確認する「複合条件」と、
          ファンダメンタルズ分析と組み合わせることで精度が上がります。
        </InfoBox>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 4. ファンダメンタルズ分析                                              */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="fundamental" emoji="💹" title="ファンダメンタルズ分析">
        <p>
          ファンダメンタルズ分析は「企業の本質的な価値」を財務諸表や事業内容から評価する手法です。
          長期投資や割安株を探す際に重要です。
        </p>

        <div className="space-y-2">
          {[
            { term: "PER（株価収益率）", en: "Price Earnings Ratio", body: "株価 ÷ 1株あたり利益（EPS）。割安・割高の判断基準。業種平均と比較し、低いほど割安と解釈されることが多い。日本株平均は15倍前後、成長株は30〜100倍以上も。", color: "blue" },
            { term: "PBR（株価純資産倍率）", en: "Price Book-value Ratio", body: "株価 ÷ 1株あたり純資産。1倍割れ＝株価が解散価値より低い状態。財務の安定性を示す指標。バリュー投資家が重視。", color: "emerald" },
            { term: "ROE（自己資本利益率）", en: "Return on Equity", body: "当期純利益 ÷ 自己資本。企業が株主資本をどれだけ効率的に活用しているか。10〜15%以上が優良企業の目安。", color: "violet" },
            { term: "EPS（1株あたり利益）", en: "Earnings Per Share", body: "当期純利益 ÷ 発行済株式数。EPSが継続的に増加している企業は株価上昇しやすい傾向。", color: "amber" },
            { term: "配当利回り", en: "Dividend Yield", body: "年間配当金 ÷ 株価 × 100。定期的な収入（インカムゲイン）を重視する投資家が注目。3〜5%以上は高配当銘柄とみなされることが多い。", color: "pink" },
            { term: "時価総額", en: "Market Cap", body: "株価 × 発行済株式数。企業規模の目安。大型株（1兆円超）は流動性が高く安定、小型株は成長余地が大きいがリスクも高い。", color: "zinc" },
          ].map((item) => {
            const colorMap: Record<string, string> = {
              blue:   "bg-blue-50    dark:bg-blue-950/25   border-blue-200/60   dark:border-blue-800/40   text-blue-700   dark:text-blue-300",
              emerald:"bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300",
              violet: "bg-violet-50  dark:bg-violet-950/25  border-violet-200/60  dark:border-violet-800/40  text-violet-700  dark:text-violet-300",
              amber:  "bg-amber-50   dark:bg-amber-950/25   border-amber-200/60   dark:border-amber-800/40   text-amber-700   dark:text-amber-300",
              pink:   "bg-pink-50    dark:bg-pink-950/25    border-pink-200/60    dark:border-pink-800/40    text-pink-700    dark:text-pink-300",
              zinc:   "bg-zinc-50    dark:bg-zinc-800/40    border-zinc-200/60    dark:border-white/[0.07]   text-zinc-700    dark:text-zinc-300",
            };
            return (
              <div key={item.term} className={`rounded-xl border px-4 py-3 ${colorMap[item.color]}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-sm">{item.term}</span>
                  <span className="text-[10px] font-mono opacity-60">{item.en}</span>
                </div>
                <p className="text-[12px] leading-relaxed opacity-80">{item.body}</p>
              </div>
            );
          })}
        </div>

        <InfoBox color="green" title="📋 決算書の3つの基本">
          <ul className="space-y-1">
            <li>📄 <strong>損益計算書（PL）</strong>: 売上〜最終利益まで。稼ぐ力を確認</li>
            <li>📊 <strong>貸借対照表（BS）</strong>: 資産・負債・純資産のバランス。財務安定性を確認</li>
            <li>💰 <strong>キャッシュフロー計算書（CF）</strong>: 現金の流れ。実際のキャッシュ創出力を確認</li>
          </ul>
        </InfoBox>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 5. セクター投資                                                      */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="sectors" emoji="🏭" title="セクター投資">
        <p>
          株式市場はGICS（世界産業分類基準）により<strong>11のセクター</strong>に分類されます。
          景気サイクルによって強いセクターが変わるため、セクターローテーションを意識することが重要です。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { emoji: "⛽", name: "エネルギー",    ex: "エクソンモービル, ENEOS",    note: "原油・ガス価格と連動。インフレ局面で強い" },
            { emoji: "🔩", name: "素材",          ex: "三菱ケミカル, FCX",          note: "景気敏感。資源需要と連動" },
            { emoji: "🏗️", name: "資本財・サービス", ex: "クボタ, ハネウェル",      note: "設備投資増加局面で強い" },
            { emoji: "🛍️", name: "一般消費財",    ex: "アマゾン, トヨタ",          note: "景気拡大時に好調。不況期に弱い" },
            { emoji: "🛒", name: "生活必需品",    ex: "P&G, 花王",                 note: "景気に左右されにくいディフェンシブ株" },
            { emoji: "💊", name: "ヘルスケア",    ex: "ファイザー, 第一三共",       note: "景気に関わらず安定。高齢化で長期追い風" },
            { emoji: "🏦", name: "金融",          ex: "JPモルガン, 三菱UFJ",       note: "金利上昇時に利ざや拡大。景気敏感" },
            { emoji: "💻", name: "情報技術",      ex: "NVIDIA, ソニー",            note: "成長株中心。低金利時に高バリュエーション" },
            { emoji: "📡", name: "通信サービス",  ex: "メタ, KDDI",               note: "インフラ的安定性＋成長性のハイブリッド" },
            { emoji: "⚡", name: "公益事業",      ex: "東京電力, ネクステラ",       note: "高配当・安定収益。金利上昇時に割高感" },
            { emoji: "🏢", name: "不動産（REIT）", ex: "三井不動産, アメリカンタワー", note: "高配当。金利上昇に弱い傾向" },
          ].map((s) => (
            <div key={s.name} className="flex items-start gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/[0.07] px-3 py-2.5">
              <span className="text-xl shrink-0">{s.emoji}</span>
              <div>
                <div className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{s.name}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">{s.ex}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">{s.note}</div>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/sectors"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
        >
          📊 セクター一覧を見る →
        </Link>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 6. 投資戦略                                                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="strategy" emoji="🎯" title="投資戦略">
        <p>投資スタイルは大きく3種類。自分の時間・性格・目標に合ったスタイルを選びましょう。</p>

        <div className="space-y-3">
          {[
            {
              title: "バイ・アンド・ホールド（長期投資）",
              badge: "初心者向け",
              badgeColor: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300",
              icon: "🌱",
              pros: ["時間を味方にできる", "税金・手数料コストが低い", "心理的負担が少ない"],
              cons: ["短期的な評価損に耐える必要がある", "機会損失の可能性"],
              desc: "優良企業の株を長期保有し、複利の恩恵と配当を享受する戦略。S&P500や優良インデックスへの積立投資が代表例。",
            },
            {
              title: "スイングトレード（中期）",
              badge: "中級者向け",
              badgeColor: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300",
              icon: "🎯",
              pros: ["短〜中期で利益確定が可能", "長期投資より資金効率が高い"],
              cons: ["テクニカル分析の理解が必要", "売買コストが増える"],
              desc: "数日〜数週間の値動きを狙う手法。チャートパターンや決算イベントを活用。",
            },
            {
              title: "デイトレード（短期）",
              badge: "上級者向け",
              badgeColor: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
              icon: "⚡",
              pros: ["翌日のリスクがない", "高い資金効率"],
              cons: ["多くの時間と集中力が必要", "コストが高い", "心理的プレッシャーが大きい"],
              desc: "当日中に売買を完結させる手法。高い技術と規律が必要。初心者には推奨しない。",
            },
          ].map((s) => (
            <div key={s.title} className="rounded-xl border border-zinc-200/60 dark:border-white/[0.07] bg-zinc-50 dark:bg-zinc-800/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{s.icon}</span>
                <div>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{s.title}</span>
                  <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badgeColor}`}>{s.badge}</span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mb-2">{s.desc}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] font-bold text-emerald-600 mb-1">✓ メリット</div>
                  <ul className="space-y-0.5">
                    {s.pros.map((p) => <li key={p} className="text-[11px] text-zinc-500">• {p}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-red-500 mb-1">✗ デメリット</div>
                  <ul className="space-y-0.5">
                    {s.cons.map((c) => <li key={c} className="text-[11px] text-zinc-500">• {c}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <InfoBox color="blue" title="📌 ドル・コスト平均法（DCA）">
          毎月一定額を定期的に購入する手法。価格が高い時は少なく、低い時は多く買えるため、
          平均取得単価が自然に平準化されます。インデックス積立に最適。
          「相場を読む」必要がなく、心理的な安定性も高い。
        </InfoBox>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 7. リスク管理                                                        */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="risk" emoji="🛡️" title="リスク管理">
        <p>
          投資で最も重要なのは<strong>「損失を最小限に抑えること」</strong>。
          利益を最大化することより、資産を守ることを優先してください。
        </p>

        <div className="space-y-2">
          {[
            { icon: "📊", title: "分散投資（ポートフォリオ）", body: "一つの銘柄・業種・地域に集中せず、複数に分散。「卵を一つのかごに盛るな」が基本原則。株式・債券・不動産・現金を組み合わせることでリスクを低減。" },
            { icon: "🛑", title: "損切りルールの設定", body: "あらかじめ「-10%になったら売る」などの損切りラインを設定し、感情に左右されず機械的に実行。損失は小さいうちに確定するのが重要。" },
            { icon: "💰", title: "余剰資金での投資", body: "生活費・緊急資金（生活費6ヶ月分）を確保した上での余剰資金で投資。投資目的で借金は絶対禁止。" },
            { icon: "📅", title: "長期視点の維持", body: "短期的な価格変動に一喜一憂しない。歴史的に株式市場は長期では上昇してきた。暴落時も「セール」と考え、パニック売りを避ける。" },
            { icon: "📚", title: "情報収集と継続学習", body: "信頼性の高い情報源（公式決算資料・信頼できる媒体）を活用。SNSの煽り情報に注意。投資判断は自己責任。" },
          ].map((item) => (
            <div key={item.title} className="rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/[0.07] px-4 py-3 flex gap-3">
              <span className="text-xl shrink-0">{item.icon}</span>
              <div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-0.5">{item.title}</div>
                <p className="text-xs text-zinc-500 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        <InfoBox color="red" title="🚨 初心者がやりがちな失敗">
          <ul className="space-y-1">
            <li>❌ <strong>FOMOで高値買い</strong>: 急騰した銘柄をニュースで知って飛びつく</li>
            <li>❌ <strong>損切りできない</strong>: 含み損を抱えたまま「いつか戻る」と放置</li>
            <li>❌ <strong>集中投資</strong>: 1〜2銘柄に全資産を突っ込む</li>
            <li>❌ <strong>信用取引の乱用</strong>: レバレッジで損失が膨らむ</li>
            <li>❌ <strong>情報過多による迷走</strong>: SNSの情報に振り回される</li>
          </ul>
        </InfoBox>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 8. 用語集                                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="glossary" emoji="📖" title="用語集">
        <p>投資でよく出てくる基本用語をまとめました。</p>

        <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
          <Term word="株式 / Stock">企業が発行する所有権の証明書。購入すると株主になる。</Term>
          <Term word="配当金 / Dividend">企業が利益の一部を株主に分配するお金。通常年1〜4回支払われる。</Term>
          <Term word="キャピタルゲイン">株を安く買って高く売ったときの差益（売却益）。</Term>
          <Term word="インカムゲイン">配当金や利子など、保有中に受け取る定期的な収入。</Term>
          <Term word="時価総額">株価 × 発行済株式数。企業の市場での評価額。</Term>
          <Term word="PER（株価収益率）">株価 ÷ EPS。高いほど割高、低いほど割安とされる。</Term>
          <Term word="PBR（株価純資産倍率）">株価 ÷ 1株純資産。1倍割れは清算価値以下。</Term>
          <Term word="ROE（自己資本利益率）">利益 ÷ 自己資本。企業の効率性を示す。</Term>
          <Term word="EPS（1株利益）">当期純利益 ÷ 発行済株式数。成長率が重要。</Term>
          <Term word="移動平均線 / MA">一定期間の平均株価を線で結んだトレンド指標。</Term>
          <Term word="RSI">相対強弱指数。70超＝買われすぎ、30未満＝売られすぎ。</Term>
          <Term word="MACD">移動平均収束拡散法。買い・売りサインを示す。</Term>
          <Term word="ゴールデンクロス">短期MA が長期MA を上抜け → 買いサイン。</Term>
          <Term word="デッドクロス">短期MA が長期MA を下抜け → 売りサイン。</Term>
          <Term word="出来高 / Volume">売買された株数。価格変動の信頼性を示す。</Term>
          <Term word="空売り / Short">株を借りて売り、値下がり後に買い戻して利益を得る手法。</Term>
          <Term word="信用取引 / Margin">証拠金を担保に自己資金の数倍の取引ができる。レバレッジ取引。</Term>
          <Term word="ETF">上場投資信託。指数に連動し、株式のように売買できるファンド。</Term>
          <Term word="REIT">不動産投資信託。不動産収益を分配。高配当が多い。</Term>
          <Term word="損切り / Stop Loss">損失確定のため保有株を売却すること。</Term>
          <Term word="利確 / Take Profit">利益を確定するために保有株を売却すること。</Term>
          <Term word="ポートフォリオ">保有している全投資資産の組み合わせ・構成。</Term>
          <Term word="分散投資">リスクを減らすため、複数の銘柄・種類に投資を分散すること。</Term>
          <Term word="ドル・コスト平均法">定期的に一定金額を購入し、平均取得単価を平準化する手法。</Term>
          <Term word="含み益 / 含み損">まだ売却していない状態での評価益・評価損。</Term>
          <Term word="流動性 / Liquidity">売買のしやすさ。出来高が多いほど流動性が高い。</Term>
          <Term word="ボラティリティ">価格変動の激しさ。高いほどリスクも高く、リターンの振れ幅も大きい。</Term>
        </div>
      </SectionCard>

      {/* ── Footer CTA ── */}
      <div className="rounded-xl border border-zinc-200/60 dark:border-white/[0.07] bg-gradient-to-br from-blue-50 to-violet-50 dark:from-zinc-900 dark:to-blue-950/20 px-6 py-6 text-center">
        <div className="text-2xl mb-2">🚀</div>
        <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">さあ、投資を始めよう</h3>
        <p className="text-sm text-zinc-500 mb-4">学んだ知識を活かして、気になる銘柄を検索してみましょう</p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Link href="/" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">
            🔍 銘柄を検索
          </Link>
          <Link href="/sectors" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-semibold text-sm hover:border-blue-400 transition-colors">
            🏭 セクターから探す
          </Link>
          <Link href="/screener" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-semibold text-sm hover:border-violet-400 transition-colors">
            🎯 スクリーナーを使う
          </Link>
        </div>
      </div>

    </div>
  );
}
