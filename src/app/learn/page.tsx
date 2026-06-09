import type { Metadata } from "next";
import Link from "next/link";
import {
  CandleChartExample,
  MovingAverageChart,
  RSIVisualization,
  CompoundGrowthChart,
  PatternWBottom,
  PatternHeadShoulders,
  PatternGoldenCross,
  PatternDeadCross,
} from "@/components/LearnCharts";

export const metadata: Metadata = {
  title: "投資学習 | Stock Search",
  description: "株式投資の基礎から実践まで、初心者向けにわかりやすく解説します。",
};

// ── Table of contents ─────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "basics",      emoji: "📈", title: "株式とは" },
  { id: "firststep",   emoji: "🚀", title: "はじめの一歩" },
  { id: "chart",       emoji: "🕯️",  title: "チャートの読み方" },
  { id: "technical",    emoji: "📐", title: "テクニカル分析" },
  { id: "tradingstyle", emoji: "⚡", title: "トレードスタイル" },
  { id: "fundamental",  emoji: "💹", title: "ファンダメンタルズ" },
  { id: "cycle",       emoji: "🔄", title: "景気サイクル" },
  { id: "sectors",     emoji: "🏭", title: "セクター投資" },
  { id: "strategy",    emoji: "🎯", title: "投資戦略" },
  { id: "tax",         emoji: "💴", title: "税金・NISA" },
  { id: "risk",        emoji: "🛡️",  title: "リスク管理" },
  { id: "faq",         emoji: "❓", title: "よくある質問" },
  { id: "glossary",    emoji: "📖", title: "用語集" },
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
    blue:   "bg-blue-50 dark:bg-blue-950/25 border-blue-200/60 dark:border-blue-800/40 text-blue-800 dark:text-blue-200",
    green:  "bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-200",
    amber:  "bg-amber-50 dark:bg-amber-950/25 border-amber-200/60 dark:border-amber-800/40 text-amber-800 dark:text-amber-200",
    red:    "bg-red-50 dark:bg-red-950/25 border-red-200/60 dark:border-red-800/40 text-red-800 dark:text-red-200",
    violet: "bg-violet-50 dark:bg-violet-950/25 border-violet-200/60 dark:border-violet-800/40 text-violet-800 dark:text-violet-200",
    sky:    "bg-sky-50 dark:bg-sky-950/25 border-sky-200/60 dark:border-sky-800/40 text-sky-800 dark:text-sky-200",
    pink:   "bg-pink-50 dark:bg-pink-950/25 border-pink-200/60 dark:border-pink-800/40 text-pink-800 dark:text-pink-200",
    zinc:   "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-white/[0.07] text-zinc-700 dark:text-zinc-300",
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
      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[13px] shrink-0 w-40">{word}</span>
      <span className="text-[13px] text-zinc-600 dark:text-zinc-400">{children}</span>
    </div>
  );
}

function StepCard({ num, title, children, color = "blue" }: {
  num: number; title: string; children: React.ReactNode; color?: string;
}) {
  const colors: Record<string, string> = {
    blue:    "bg-blue-600",
    emerald: "bg-emerald-600",
    violet:  "bg-violet-600",
    amber:   "bg-amber-500",
    rose:    "bg-rose-600",
  };
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${colors[color] ?? colors.blue} text-white text-sm font-black flex items-center justify-center shrink-0`}>
          {num}
        </div>
        <div className="w-0.5 flex-1 bg-zinc-200 dark:bg-zinc-700 mt-1" />
      </div>
      <div className="pb-5 flex-1">
        <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm mb-1">{title}</div>
        <div className="text-xs text-zinc-500 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function FAQItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/[0.07] p-4">
      <div className="flex gap-2.5 mb-2">
        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">Q</span>
        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{q}</span>
      </div>
      <div className="flex gap-2.5">
        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">A</span>
        <div className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">{children}</div>
      </div>
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

// ── Economic cycle ─────────────────────────────────────────────────────────────
function EconomyCycle() {
  const phases = [
    { label: "① 回復期", color: "bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800", textColor: "text-emerald-700 dark:text-emerald-300", icon: "🌱", desc: "景気が底打ちし上向き始める時期", strong: "金融・素材・一般消費財", weak: "公益・ヘルスケア" },
    { label: "② 拡張期", color: "bg-blue-100 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800", textColor: "text-blue-700 dark:text-blue-300", icon: "🚀", desc: "経済成長が加速、企業業績が好調", strong: "情報技術・資本財・エネルギー", weak: "債券・公益" },
    { label: "③ 後退期", color: "bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800", textColor: "text-amber-700 dark:text-amber-300", icon: "🍂", desc: "景気が鈍化し始める時期", strong: "ヘルスケア・生活必需品", weak: "一般消費財・資本財" },
    { label: "④ 不況期", color: "bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800", textColor: "text-red-700 dark:text-red-300", icon: "❄️", desc: "景気後退（リセッション）局面", strong: "公益・ヘルスケア・現金", weak: "銀行・不動産・エネルギー" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {phases.map((p) => (
        <div key={p.label} className={`rounded-xl border p-3.5 ${p.color}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{p.icon}</span>
            <span className={`font-bold text-sm ${p.textColor}`}>{p.label}</span>
          </div>
          <div className={`text-[11px] mb-2 ${p.textColor} opacity-80`}>{p.desc}</div>
          <div className="space-y-1">
            <div className="text-[10px]">
              <span className="font-bold text-emerald-700 dark:text-emerald-400">▲ 強いセクター: </span>
              <span className="text-zinc-600 dark:text-zinc-400">{p.strong}</span>
            </div>
            <div className="text-[10px]">
              <span className="font-bold text-rose-600 dark:text-rose-400">▼ 弱いセクター: </span>
              <span className="text-zinc-600 dark:text-zinc-400">{p.weak}</span>
            </div>
          </div>
        </div>
      ))}
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
            「投資って難しそう…」という方でも大丈夫。このページでは、株式の仕組みから口座開設・チャートの読み方・税金まで、
            実際に投資を始めるために必要な知識を順番に解説します。
          </p>
          <p className="mt-3 text-zinc-400 text-xs">
            ※ 投資には元本割れのリスクがあります。投資判断は自己責任でお願いします。
          </p>
        </div>
      </div>

      {/* ── Table of contents ── */}
      <div className="rounded-xl border border-zinc-200/60 dark:border-white/[0.07] bg-white dark:bg-zinc-900 p-5">
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">目次（クリックで移動）</div>
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
          <strong>株式（stock/share）</strong>とは、企業が資金を集めるために発行する「小さな所有権の証明書」です。
          たとえるなら<strong>「企業の会員権」</strong>のようなもの。トヨタの株を100株持つということは、
          「世界最大の自動車会社の超ごく一部のオーナー」になるということです。
        </p>

        <InfoBox color="blue" title="💡 株で利益を得る2つの方法">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            <div className="bg-white/50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="font-bold mb-1">① キャピタルゲイン（売却益）</div>
              <div className="text-[12px]">安く買って高く売る差益。<br/>例: 1,000円で買った株が1,300円になったら<strong className="text-emerald-600">+300円 × 株数</strong>の利益</div>
            </div>
            <div className="bg-white/50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="font-bold mb-1">② インカムゲイン（配当金）</div>
              <div className="text-[12px]">企業が利益の一部を株主に分配。<br/>例: 1株あたり年間50円配当 × 100株 = <strong className="text-emerald-600">年5,000円</strong>受取</div>
            </div>
          </div>
        </InfoBox>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoBox color="blue" title="🇯🇵 日本の主な市場">
            <ul className="space-y-1.5">
              <li><span className="font-mono font-bold">東証プライム</span> — 大型優良企業（旧東証1部）</li>
              <li><span className="font-mono font-bold">東証スタンダード</span> — 中堅企業</li>
              <li><span className="font-mono font-bold">東証グロース</span> — 成長期待の新興企業</li>
              <li><span className="font-mono font-bold">日経平均</span> — 代表的な225銘柄指数</li>
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
          <h3 className="font-bold text-base text-zinc-900 dark:text-white mb-2">🇯🇵 日本株 vs 🇺🇸 米国株</h3>
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
                  ["売買単位", "100株単位（1単元）", "1株から購入可（端株も可）"],
                  ["最低投資額", "株価×100円（例: 2,000円株→20万円）", "数百円〜（端株対応証券なら）"],
                  ["配当頻度", "年1〜2回が主流", "四半期（年4回）が主流"],
                  ["取引時間", "9:00〜15:30（昼休みあり）", "日本時間23:30〜翌6:00（夏時間）"],
                  ["通貨リスク", "なし（円建て）", "あり（USD/JPY変動の影響）"],
                  ["株主優待", "日本独自の制度。商品券・食事券等", "なし（配当・自社株買いが主）"],
                  ["市場の成長性", "成熟市場。人口減少が課題", "世界最大・高成長企業が多い"],
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
          <ul className="space-y-1.5">
            <li>📊 <strong>企業業績</strong> — 売上・利益の増減、決算発表。予想より良ければ上昇、悪ければ下落</li>
            <li>📰 <strong>経済指標</strong> — GDP・雇用統計・消費者物価指数（CPI）</li>
            <li>🏦 <strong>金融政策</strong> — 中央銀行の金利動向。利上げ→株価下落しやすい</li>
            <li>🌍 <strong>地政学リスク</strong> — 戦争・紛争・貿易摩擦が不確実性を高める</li>
            <li>💬 <strong>投資家心理</strong> — 需給バランス・センチメント（市場の雰囲気）</li>
            <li>💱 <strong>為替</strong> — 円安→輸出企業の業績向上、輸入企業はコスト増</li>
          </ul>
        </InfoBox>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 2. はじめの一歩                                                      */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="firststep" emoji="🚀" title="はじめの一歩：初めての株式投資">
        <p>
          実際に株式投資を始めるまでの流れを、順番に解説します。
          「難しそう」と思っている方も、手順を追えば意外とシンプルです。
        </p>

        <div className="rounded-xl border border-zinc-200/60 dark:border-white/[0.07] bg-zinc-50/50 dark:bg-zinc-800/30 px-4 pt-4 pb-1">
          <StepCard num={1} title="証券口座を開設する（無料）" color="blue">
            <p className="mb-2">銀行口座のように、株を買うための口座が必要です。以下のネット証券は口座開設・維持費が無料で、スマホで完結します。</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: "SBI証券", note: "国内最大手。手数料無料プランあり" },
                { name: "楽天証券", note: "楽天ポイントで投資可能" },
                { name: "マネックス証券", note: "米国株に強い" },
              ].map((b) => (
                <div key={b.name} className="bg-white dark:bg-zinc-700/50 rounded-lg p-2 border border-zinc-200 dark:border-white/[0.07]">
                  <div className="font-bold text-xs">{b.name}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{b.note}</div>
                </div>
              ))}
            </div>
          </StepCard>
          <StepCard num={2} title="NISA口座を同時に申込む（節税効果が大きい）" color="emerald">
            証券口座と同時にNISA口座を申し込みましょう。通常は利益の約20%が税金で引かれますが、
            NISA口座内の利益は<strong>非課税</strong>（税金ゼロ）になります。詳しくは「税金・NISA」セクションで解説します。
          </StepCard>
          <StepCard num={3} title="口座に入金する" color="violet">
            証券口座に資金を入金します。最初は<strong>余剰資金の範囲内</strong>で。
            「生活費の6ヶ月分」は絶対に手をつけない緊急資金として残しておきましょう。
            初めての方は<strong>1〜5万円</strong>程度から始めるのがおすすめです。
          </StepCard>
          <StepCard num={4} title="銘柄を選ぶ" color="blue">
            <p className="mb-2">最初は以下のような「わかりやすい企業」から始めるのが一般的です。</p>
            <ul className="space-y-1">
              <li>✅ <strong>自分がよく使う製品・サービスの企業</strong>（トヨタ、ソニー、任天堂など）</li>
              <li>✅ <strong>安定した大企業</strong>（日経225採用銘柄）</li>
              <li>✅ <strong>インデックスファンド・ETF</strong>（1銘柄で分散投資できる）</li>
              <li>❌ 聞いたことのない銘柄・急騰している銘柄への飛びつき買いは避ける</li>
            </ul>
          </StepCard>
          <StepCard num={5} title="注文を出す（指値 or 成行）" color="amber">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2">
                <div className="font-bold text-xs text-blue-700 dark:text-blue-300 mb-1">📌 指値注文</div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400">「〇〇円になったら買う」と価格を指定。希望価格で買えるが、約定しない可能性も。初心者向け。</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2">
                <div className="font-bold text-xs text-amber-700 dark:text-amber-300 mb-1">⚡ 成行注文</div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400">「今すぐ買う」と価格を指定しない。確実に約定するが、予想より高い価格になる場合も。</div>
              </div>
            </div>
          </StepCard>
          <StepCard num={6} title="保有・管理・売却" color="blue">
            購入後は定期的に企業の決算発表（年4回）や業績ニュースをチェック。
            あらかじめ「目標株価（例: +20%で利確）」と「損切りライン（例: -10%で売却）」を
            決めておくことで、感情的な判断を防げます。
          </StepCard>
        </div>

        <InfoBox color="green" title="✅ 初心者チェックリスト">
          <ul className="space-y-1">
            <li>☐ 証券口座（NISA口座含む）を開設した</li>
            <li>☐ 余剰資金（生活費6ヶ月分は残す）で投資額を決めた</li>
            <li>☐ 最初の銘柄（または積立インデックス）を決めた</li>
            <li>☐ 損切りラインを設定した（例: -10%で売る）</li>
            <li>☐ 長期的な目標（老後資金・5年後の目標額等）を設定した</li>
          </ul>
        </InfoBox>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 3. チャートの読み方                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="chart" emoji="🕯️" title="チャートの読み方">
        <p>
          チャートは株価の推移を視覚化したものです。最も広く使われるのが
          <strong>ローソク足チャート（キャンドルスティック）</strong>で、
          1本のローソクが「始値・高値・安値・終値」の4情報を表します。
          日本で江戸時代に米相場で発明され、現在は世界中の投資家が使っています。
        </p>

        <CandleDiagram />

        {/* 実際のチャート例 */}
        <CandleChartExample />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "始値 (Open)",  desc: "その日の最初の取引価格" },
            { label: "高値 (High)",  desc: "その日の最高値" },
            { label: "安値 (Low)",   desc: "その日の最安値" },
            { label: "終値 (Close)", desc: "その日の最後の取引価格" },
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
              { label: "分足・時間足",  badge: "デイトレード",    color: "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300", desc: "当日の細かい値動きを確認。経験者向け。1分・5分・15分足を使用。ノイズ（意味のない小さな動き）が多い。" },
              { label: "日足（デイリー）", badge: "スイングトレード", color: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300", desc: "1日1本のローソク足。数日〜数週間のトレンド分析に最適。多くの投資家が基本として使う。初心者はここから。" },
              { label: "週足・月足",    badge: "長期投資",       color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300", desc: "大きなトレンドや景気サイクルの確認用。細かい値動きに惑わされず、本質的なトレンドを把握できる。" },
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

        <div>
          <h3 className="font-bold text-base text-zinc-900 dark:text-white mb-3">よく見るチャートパターン</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PatternGoldenCross />
            <PatternDeadCross />
            <PatternWBottom />
            <PatternHeadShoulders />
          </div>
        </div>

        <InfoBox color="zinc" title="📌 サポート・レジスタンスとは">
          株価が反発しやすい価格帯のこと。<strong>サポートライン（下値支持線）</strong>は株価が下がりにくい価格帯（床の役割）、
          <strong>レジスタンスライン（上値抵抗線）</strong>は株価が上がりにくい価格帯（天井の役割）です。
          例えば「3,000円という節目で何度も反発している」という観察から買いタイミングを判断するために使います。
        </InfoBox>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 4. テクニカル分析                                                    */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="technical" emoji="📐" title="テクニカル分析">
        <p>
          テクニカル分析は「過去の株価・出来高のデータ」からパターンを読み取り、
          将来の価格動向を予測する手法です。
          <strong>「株価の動きはすべての情報を織り込んでいる」</strong>という考え方が基本です。
          アナリストや機関投資家も広く活用しています。
        </p>

        <div className="space-y-3">
          {[
            {
              name: "移動平均線（MA）",
              icon: "📉",
              color: "border-l-blue-500",
              easy: "一定期間の株価の平均を繋いだ線。株価のトレンドを滑らかに表示します",
              body: "5日・25日・75日・200日が一般的。短期線が長期線を上抜け（ゴールデンクロス）すると買いサイン、下抜け（デッドクロス）すると売りサイン。株価が移動平均線の上にある＝上昇トレンド。",
              tip: "初心者は25日線（約1ヶ月）と75日線（約3ヶ月）の2本だけ確認するところから始めましょう",
            },
            {
              name: "RSI（相対強弱指数）",
              icon: "⚡",
              color: "border-l-amber-500",
              easy: "「買われすぎ」か「売られすぎ」かを0〜100の数値で示す指標",
              body: "70以上で「買われすぎ（売りサイン）」、30以下で「売られすぎ（買いサイン）」と判断。過熱感・底打ちの確認に有効。急騰・急落後の逆張りに使われることが多い。",
              tip: "RSI30以下の時にファンダメンタルが良い株を買う、というシンプルな使い方が初心者向け",
            },
            {
              name: "MACD（マックディー）",
              icon: "📊",
              color: "border-l-violet-500",
              easy: "2本の移動平均線の差を使って、トレンドの転換点を見つける指標",
              body: "短期EMA（12日）と長期EMA（26日）の差がMACDライン。MACDがシグナルラインを上抜けると買い、下抜けると売りサイン。ヒストグラムが0を超えると強気。",
              tip: "「ゼロより上でMACDがシグナルを上抜け」= 強い買いサインとして多くの投資家が活用",
            },
            {
              name: "ボリンジャーバンド",
              icon: "〰️",
              color: "border-l-cyan-500",
              easy: "株価の「通常の動く範囲」を示すバンド。バンドの端に近づくと反転しやすい",
              body: "移動平均線の上下に標準偏差×2倍の幅を設けたバンド。株価がバンドの外に出ることは統計的に少なく（約5%）、バンド内に戻る傾向がある。スクイーズ（バンドが狭まる）後は大きな値動きに注意。",
              tip: "下のバンド（-2σ）に触れたら逆張りの買い検討、上のバンド（+2σ）に触れたら利確検討というシンプルな使い方",
            },
            {
              name: "出来高（Volume）",
              icon: "📦",
              color: "border-l-emerald-500",
              easy: "売買された株数。多いほど「たくさんの人が参加している」ということ",
              body: "株価変動の「信頼性」を表す。出来高が多い＝多くの投資家が確信を持って売買＝トレンドが継続しやすい。陽線＋大出来高は上昇の確認、陰線＋大出来高は下落の確認シグナル。",
              tip: "「出来高が急増した日に何が起きたか（決算・ニュース）」を確認する習慣をつけましょう",
            },
          ].map((item) => (
            <div key={item.name} className={`rounded-xl border-l-4 ${item.color} bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/[0.07] px-4 py-3`}>
              <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">{item.icon} {item.name}</div>
              <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 bg-white/60 dark:bg-zinc-700/40 rounded px-2 py-1">
                📌 簡単に言うと: {item.easy}
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed mb-1">{item.body}</p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400">💡 初心者向けTips: {item.tip}</p>
            </div>
          ))}
        </div>

        {/* 移動平均線チャート */}
        <MovingAverageChart />
        {/* RSI チャート */}
        <RSIVisualization />

        <InfoBox color="amber" title="⚠️ テクニカル分析の注意点">
          テクニカル分析は「過去のパターン」に基づくため、<strong>必ず当たるわけではありません</strong>。
          複数の指標が同じ方向を示している時（例: ゴールデンクロス + RSI上昇 + 出来高増加）ほど信頼性が高まります。
          また、ファンダメンタルズ分析と組み合わせることで精度がさらに上がります。
          <div className="mt-2 font-bold">「テクニカルだけで確信を持って投資するのは危険」が鉄則です。</div>
        </InfoBox>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 5. トレードスタイル別ガイド                                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="tradingstyle" emoji="⚡" title="トレードスタイル別ガイド">
        <p>
          株式投資には「どれだけの期間、株を持つか」によって大きく<strong>4つのスタイル</strong>があります。
          自分のライフスタイル・性格・目標に合ったスタイルを選ぶことが成功への近道です。
          スタイルが違えば使う指標も売買サインも変わります。
        </p>

        {/* 比較テーブル */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100 dark:bg-zinc-800">
                <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-left">スタイル</th>
                <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center">保有期間</th>
                <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center">主な時間足</th>
                <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center">1回の目標利幅</th>
                <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center">難易度</th>
                <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center">向き</th>
              </tr>
            </thead>
            <tbody>
              {[
                { style: "⚡ スキャルピング",       period: "数秒〜数分",     tf: "1分・5分足",   profit: "0.1〜0.5%",  diff: "★★★★★", suit: "専業・上級者" },
                { style: "🔄 スイングトレード",     period: "数日〜数週間",   tf: "日足・4時間足", profit: "5〜20%",     diff: "★★★",   suit: "会社員も可" },
                { style: "📈 ポジショントレード",   period: "数週間〜数ヶ月", tf: "週足・日足",   profit: "20〜50%",    diff: "★★",    suit: "初心者〜中級" },
                { style: "🌱 長期投資",             period: "数ヶ月〜数年以上", tf: "月足・週足", profit: "50%〜数倍",   diff: "★",     suit: "全員◎ NISA向" },
              ].map((r, i) => (
                <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 font-bold">{r.style}</td>
                  <td className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center">{r.period}</td>
                  <td className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center">{r.tf}</td>
                  <td className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center text-emerald-600 dark:text-emerald-400 font-semibold">{r.profit}</td>
                  <td className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center text-amber-500">{r.diff}</td>
                  <td className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center">{r.suit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* スキャルピング */}
        <div className="rounded-xl border-l-4 border-l-violet-500 border border-zinc-200/60 dark:border-white/[0.07] bg-violet-50 dark:bg-violet-950/20 overflow-hidden">
          <div className="px-4 py-3 bg-violet-100 dark:bg-violet-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span className="font-bold text-violet-800 dark:text-violet-200 text-sm">スキャルピング（超短期）</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">初心者非推奨・上級者向け</span>
          </div>
          <div className="px-4 py-3 space-y-3 text-xs">
            <p className="text-zinc-700 dark:text-zinc-300">
              1日の中で数秒〜数分単位の小さな値動きを狙い、<strong>何十回〜百回以上</strong>売買を繰り返して利益を積み上げるスタイル。
              プロのデイトレーダーが主に使う手法です。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-white/70 dark:bg-violet-900/20 rounded-lg p-3">
                <div className="font-bold text-violet-700 dark:text-violet-300 mb-1.5">📊 使うチャート・指標</div>
                <ul className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <li>🕐 <strong>1分足・5分足</strong>（超短期の値動き）</li>
                  <li>📋 <strong>板情報（オーダーブック）</strong> — 買い・売り注文の厚みを確認</li>
                  <li>📦 <strong>出来高スパイク</strong> — 急増する出来高でエントリーを確認</li>
                  <li>〰️ <strong>ボリンジャーバンド（1分）</strong> — バンド上下限でのリバーサル</li>
                  <li>⚡ <strong>Tick（歩み値）</strong> — 約定の勢いを読む</li>
                </ul>
              </div>
              <div className="bg-white/70 dark:bg-violet-900/20 rounded-lg p-3">
                <div className="font-bold text-violet-700 dark:text-violet-300 mb-1.5">🎯 代表的な売買サイン</div>
                <ul className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <li>✅ 大出来高＋価格ブレイクアウト → 順張り</li>
                  <li>✅ BB下限タッチ＋板に大量買い注文 → 逆張り</li>
                  <li>✅ 直近高値の明確なブレイク → 上昇加速</li>
                  <li>❌ ボラティリティが低い時間帯（昼休み等）は取引しない</li>
                </ul>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InfoBox color="green" title="✅ メリット">
                <ul className="space-y-1 text-[11px]">
                  <li>• 値動きが小さい日でも利益を狙える</li>
                  <li>• リスクを一晩抱えない（当日決済）</li>
                  <li>• 毎日結果が確認できる</li>
                </ul>
              </InfoBox>
              <InfoBox color="red" title="❌ デメリット">
                <ul className="space-y-1 text-[11px]">
                  <li>• 最高レベルの集中力・経験が必要</li>
                  <li>• 手数料・スプレッドが積み重なる</li>
                  <li>• 精神的消耗が激しい</li>
                </ul>
              </InfoBox>
            </div>
            <InfoBox color="violet" title="⚠️ 初心者へのアドバイス">
              スキャルピングは<strong>最も難しいスタイル</strong>です。テクニカルの習熟に加え、高速な判断力・感情コントロールが必要。
              まずはスイングトレード・長期投資で経験を積んでからチャレンジすることを強く推奨します。
            </InfoBox>
          </div>
        </div>

        {/* スイングトレード */}
        <div className="rounded-xl border-l-4 border-l-blue-500 border border-zinc-200/60 dark:border-white/[0.07] bg-blue-50 dark:bg-blue-950/20 overflow-hidden">
          <div className="px-4 py-3 bg-blue-100 dark:bg-blue-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔄</span>
              <span className="font-bold text-blue-800 dark:text-blue-200 text-sm">スイングトレード（短〜中期）</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">会社員・副業投資家に最適</span>
          </div>
          <div className="px-4 py-3 space-y-3 text-xs">
            <p className="text-zinc-700 dark:text-zinc-300">
              数日〜数週間単位でトレンドの<strong>「波」に乗る</strong>スタイル。夜に分析して翌日注文を出せるため、
              日中働きながらでも実践できます。個人投資家に最も普及している手法のひとつです。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-white/70 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="font-bold text-blue-700 dark:text-blue-300 mb-1.5">📊 使うチャート・指標</div>
                <ul className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <li>📅 <strong>日足（メイン）</strong>・4時間足（エントリー精度向上）</li>
                  <li>📉 <strong>移動平均線</strong>（25日・75日）— トレンド把握</li>
                  <li>📊 <strong>MACD</strong> — トレンド転換の確認</li>
                  <li>⚡ <strong>RSI（14日）</strong> — 過熱・売られすぎの判断</li>
                  <li>📦 <strong>出来高</strong> — ブレイクアウトの信頼性確認</li>
                </ul>
              </div>
              <div className="bg-white/70 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="font-bold text-blue-700 dark:text-blue-300 mb-1.5">🎯 代表的な売買サイン</div>
                <ul className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <li>✅ <strong>ゴールデンクロス</strong>（25日線が75日線を上抜け）→ 買い</li>
                  <li>✅ <strong>W底</strong>から反発＋出来高急増 → 強い買いサイン</li>
                  <li>✅ RSI30以下からの回復 → 売られすぎからの反発狙い</li>
                  <li>✅ MACDがゼロ上抜け＋シグナル上抜け → トレンド確認</li>
                  <li>❌ デッドクロス後 → 保有株の利確・損切りを検討</li>
                </ul>
              </div>
            </div>
            <div className="bg-white/60 dark:bg-blue-900/10 rounded-lg px-3 py-2.5 text-[11px]">
              <div className="font-bold text-blue-700 dark:text-blue-300 mb-1">💡 スイングトレードの基本ルール</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-zinc-600 dark:text-zinc-400">
                <div>📌 <strong>エントリー:</strong> サポートラインでの反発・ブレイクアウト直後</div>
                <div>🎯 <strong>目標利確:</strong> +10〜20%、または直近レジスタンスライン</div>
                <div>🛡️ <strong>損切り:</strong> 直近安値割れ（サポートブレイク）で即損切り</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InfoBox color="green" title="✅ メリット">
                <ul className="space-y-1 text-[11px]">
                  <li>• 夜に分析→翌日注文でOK（仕事と両立）</li>
                  <li>• 1回で5〜20%の値幅を狙える</li>
                  <li>• 取引頻度が少ないので手数料が少ない</li>
                </ul>
              </InfoBox>
              <InfoBox color="red" title="❌ デメリット">
                <ul className="space-y-1 text-[11px]">
                  <li>• 翌日のギャップ（夜間の急変）リスク</li>
                  <li>• 数日〜数週間待つ忍耐力が必要</li>
                  <li>• 方向感のない横ばい相場は苦手</li>
                </ul>
              </InfoBox>
            </div>
          </div>
        </div>

        {/* ポジショントレード */}
        <div className="rounded-xl border-l-4 border-l-amber-500 border border-zinc-200/60 dark:border-white/[0.07] bg-amber-50 dark:bg-amber-950/20 overflow-hidden">
          <div className="px-4 py-3 bg-amber-100 dark:bg-amber-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📈</span>
              <span className="font-bold text-amber-800 dark:text-amber-200 text-sm">ポジショントレード（中期）</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">初心者〜中級者向け</span>
          </div>
          <div className="px-4 py-3 space-y-3 text-xs">
            <p className="text-zinc-700 dark:text-zinc-300">
              数週間〜数ヶ月の<strong>大きなトレンド</strong>に乗るスタイル。週足などの大きな時間軸で方向性を見極め、
              業績（ファンダメンタルズ）とテクニカルを組み合わせるのが特徴です。
              スキャルピングのような高速判断は不要で、心理的余裕を持って取り組めます。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-white/70 dark:bg-amber-900/20 rounded-lg p-3">
                <div className="font-bold text-amber-700 dark:text-amber-300 mb-1.5">📊 使うチャート・指標</div>
                <ul className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <li>📅 <strong>週足（メイン）</strong>・日足（エントリー確認）</li>
                  <li>📉 <strong>移動平均線</strong>（13週・26週）— 中長期トレンド</li>
                  <li>📊 <strong>MACD（週足）</strong> — 大きなトレンド転換を確認</li>
                  <li>💹 <strong>PER・PBR</strong> — 割安・割高の判断</li>
                  <li>📋 <strong>決算発表</strong> — 業績トレンドの確認</li>
                </ul>
              </div>
              <div className="bg-white/70 dark:bg-amber-900/20 rounded-lg p-3">
                <div className="font-bold text-amber-700 dark:text-amber-300 mb-1.5">🎯 代表的な売買サイン</div>
                <ul className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <li>✅ <strong>週足ゴールデンクロス</strong>（強力な上昇シグナル）</li>
                  <li>✅ 長期サポートラインからの反発＋出来高増</li>
                  <li>✅ 好決算発表後の株価下落＝押し目買い</li>
                  <li>✅ PERが業種平均より大幅に低い割安局面</li>
                  <li>❌ 週足デッドクロス→中期トレンド転換で撤退</li>
                </ul>
              </div>
            </div>
            <InfoBox color="amber" title="🔑 ファンダ＋テクニカルの組み合わせ方">
              <div className="text-[11px] space-y-1">
                <div>① <strong>ファンダで銘柄を絞る</strong>（業績好調・割安なセクターの優良銘柄）</div>
                <div>② <strong>テクニカルでタイミングを計る</strong>（週足MAの上で日足がゴールデンクロスする局面でエントリー）</div>
                <div>③ <strong>決算で再評価</strong>（業績が予想を上回れば保有継続、下回れば縮小）</div>
              </div>
            </InfoBox>
            <div className="grid grid-cols-2 gap-2">
              <InfoBox color="green" title="✅ メリット">
                <ul className="space-y-1 text-[11px]">
                  <li>• 取引頻度が少なくストレスが低い</li>
                  <li>• 大きな値幅（20〜50%）を狙える</li>
                  <li>• テクニカル＋ファンダを両方学べる</li>
                </ul>
              </InfoBox>
              <InfoBox color="red" title="❌ デメリット">
                <ul className="space-y-1 text-[11px]">
                  <li>• 利確まで数ヶ月待つ忍耐が必要</li>
                  <li>• 含み損期間中の精神コントロール</li>
                  <li>• 業績・マクロ両方の把握が必要</li>
                </ul>
              </InfoBox>
            </div>
          </div>
        </div>

        {/* 長期投資 */}
        <div className="rounded-xl border-l-4 border-l-emerald-500 border border-zinc-200/60 dark:border-white/[0.07] bg-emerald-50 dark:bg-emerald-950/20 overflow-hidden">
          <div className="px-4 py-3 bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌱</span>
              <span className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">長期投資（バイ・アンド・ホールド）</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">初心者〜全員 NISA◎</span>
          </div>
          <div className="px-4 py-3 space-y-3 text-xs">
            <p className="text-zinc-700 dark:text-zinc-300">
              数ヶ月〜数年以上、<strong>優良企業や指数を保有し続ける</strong>スタイル。
              「企業の成長とともに資産が増える」という考え方が基本。
              チャートの細かい動きより企業の<strong>本質的な価値（ファンダメンタルズ）</strong>を重視します。
              NISAや積立投資と最も相性の良いスタイルです。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-white/70 dark:bg-emerald-900/20 rounded-lg p-3">
                <div className="font-bold text-emerald-700 dark:text-emerald-300 mb-1.5">📊 使うチャート・指標</div>
                <ul className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <li>📅 <strong>月足・週足</strong>（大きなトレンド確認）</li>
                  <li>💹 <strong>PER・PBR・ROE</strong> — 企業の割安・収益性</li>
                  <li>💰 <strong>配当利回り・配当性向</strong> — 還元姿勢の確認</li>
                  <li>📋 <strong>売上・利益の多年度トレンド</strong> — 成長持続性</li>
                  <li>🌍 <strong>景気サイクル・セクタートレンド</strong> — 大局観</li>
                </ul>
              </div>
              <div className="bg-white/70 dark:bg-emerald-900/20 rounded-lg p-3">
                <div className="font-bold text-emerald-700 dark:text-emerald-300 mb-1.5">🎯 買い場の見極め方</div>
                <ul className="space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <li>✅ <strong>PERが歴史的低水準</strong>（企業が割安）</li>
                  <li>✅ <strong>市場全体の暴落局面</strong>（優良株の大バーゲン）</li>
                  <li>✅ 月足RSIが30以下＋長期サポートからの反発</li>
                  <li>✅ 増配・自社株買いの発表（企業の自信の表れ）</li>
                  <li>✅ <strong>定期積立（ドルコスト平均法）</strong>で価格を気にせず買い続ける</li>
                </ul>
              </div>
            </div>
            {/* 複利グラフ */}
            <CompoundGrowthChart />
            <div className="grid grid-cols-2 gap-2">
              <InfoBox color="green" title="✅ メリット">
                <ul className="space-y-1 text-[11px]">
                  <li>• 複利効果で資産が指数関数的に増加</li>
                  <li>• NISA活用で利益が非課税</li>
                  <li>• 時間が味方（時間は最大の武器）</li>
                  <li>• 心理的負担が最小</li>
                </ul>
              </InfoBox>
              <InfoBox color="red" title="❌ デメリット">
                <ul className="space-y-1 text-[11px]">
                  <li>• すぐに大きな結果は出ない</li>
                  <li>• 暴落時に売りたくなる誘惑との戦い</li>
                  <li>• 企業の長期的変化を追う必要あり</li>
                </ul>
              </InfoBox>
            </div>
          </div>
        </div>

        {/* 自分に合ったスタイルの選び方 */}
        <InfoBox color="sky" title="🧭 自分に合ったスタイルの選び方">
          <div className="space-y-1.5 text-[12px]">
            <div className="flex items-start gap-2"><span className="shrink-0 font-bold text-sky-700 dark:text-sky-300">Q1.</span><span>毎日チャートを見る時間がある？ → <strong>YES</strong>ならスイング〜スキャル検討、<strong>NO</strong>なら長期・ポジションがおすすめ</span></div>
            <div className="flex items-start gap-2"><span className="shrink-0 font-bold text-sky-700 dark:text-sky-300">Q2.</span><span>損失が出ると夜眠れなくなる？ → <strong>YES</strong>ならポジション・長期投資で保有期間を長くして値動きを気にしない工夫を</span></div>
            <div className="flex items-start gap-2"><span className="shrink-0 font-bold text-sky-700 dark:text-sky-300">Q3.</span><span>投資の目的が老後・教育資金？ → <strong>長期投資＋NISA</strong>の積立が最適解。焦らず時間を味方に</span></div>
            <div className="flex items-start gap-2"><span className="shrink-0 font-bold text-sky-700 dark:text-sky-300">Q4.</span><span>投資経験がほぼゼロ？ → まず<strong>長期投資でインデックスファンドを積立</strong>。慣れてからスイングに挑戦</span></div>
          </div>
        </InfoBox>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 6. ファンダメンタルズ分析                                              */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="fundamental" emoji="💹" title="ファンダメンタルズ分析">
        <p>
          ファンダメンタルズ分析は「企業の本質的な価値（実力）」を財務データから評価する手法です。
          テクニカル分析が「株価の動き」を見るのに対し、ファンダメンタルズ分析は
          <strong>「企業そのものの強さ」</strong>を見ます。長期投資に特に重要です。
        </p>

        <div className="space-y-2">
          {[
            {
              term: "PER（株価収益率）", en: "Price Earnings Ratio",
              formula: "株価 ÷ EPS（1株利益）",
              example: "株価2,000円、EPS100円 → PER20倍",
              body: "「今の利益の何年分で買えるか」の目安。低いほど割安、高いほど割高。日本株平均15倍前後、成長株は30〜100倍以上も。ただし業種によって標準値が大きく異なります。",
              color: "blue"
            },
            {
              term: "PBR（株価純資産倍率）", en: "Price Book-value Ratio",
              formula: "株価 ÷ 1株純資産（BPS）",
              example: "PBR1倍 = 会社を今すぐ解散した場合の価値と同じ",
              body: "1倍割れは「解散価値より安い」状態でバリュー投資家が注目。日本株はPBR1倍割れ企業が多く、東証も改善要請中。ただし赤字企業はPBRが低くても危険なので注意。",
              color: "emerald"
            },
            {
              term: "ROE（自己資本利益率）", en: "Return on Equity",
              formula: "当期純利益 ÷ 自己資本 × 100",
              example: "純利益10億円、自己資本100億円 → ROE10%",
              body: "株主から預かったお金をどれだけ効率よく使っているか。10〜15%以上が優良企業の目安。日本株平均は約10%、米国株は約20%が多い。継続的に高ROEを維持する企業が長期的に株価上昇する傾向あり。",
              color: "violet"
            },
            {
              term: "EPS（1株あたり利益）", en: "Earnings Per Share",
              formula: "当期純利益 ÷ 発行済株式数",
              example: "純利益100億円、株式数1億株 → EPS100円",
              body: "EPSが継続的に増加している企業は株価上昇しやすい傾向。「EPS成長率」を確認し、過去3〜5年間で着実に増加しているか確認しましょう。EPSサプライズ（予想超過）は株価急騰の要因になることも。",
              color: "amber"
            },
            {
              term: "PEGレシオ", en: "Price/Earnings to Growth",
              formula: "PER ÷ EPS成長率（%）",
              example: "PER30倍、成長率30% → PEG1.0倍（適正）",
              body: "PERだけでは高成長企業を割高に見えてしまう問題を解決する指標。1.0以下は成長率を考慮すると割安とされる。高PERでも高成長なら「割高ではない」という判断ができる。",
              color: "sky"
            },
            {
              term: "FCF（フリーキャッシュフロー）", en: "Free Cash Flow",
              formula: "営業CF − 設備投資（CAPEX）",
              example: "営業CF200億円 − 設備投資50億円 = FCF150億円",
              body: "企業が実際に手元に残った現金。「利益は操作できるが現金は嘘をつかない」と言われる重要指標。FCFが多いほど配当・自社株買い・M&Aへの余力が大きい。FCFが常に赤字の企業は注意。",
              color: "pink"
            },
            {
              term: "配当利回り", en: "Dividend Yield",
              formula: "年間配当金 ÷ 株価 × 100",
              example: "年配当50円、株価1,000円 → 利回り5%",
              body: "株を保有するだけで得られる年間収益率。3〜5%以上は高配当銘柄。ただし配当利回りが高すぎる（8%超等）場合は業績悪化による株価急落の可能性も。「配当の継続性・成長性」の確認が大切。",
              color: "zinc"
            },
            {
              term: "時価総額", en: "Market Capitalization",
              formula: "株価 × 発行済株式数",
              example: "株価2,000円 × 1億株 = 時価総額2,000億円",
              body: "企業の市場での評価総額。大型株（1兆円超）は流動性が高く安定。中型株（1,000億〜1兆円）は成長余地とリスクのバランスが良い。小型株（1,000億以下）は大化け期待がある一方でリスクも高い。",
              color: "zinc"
            },
          ].map((item) => {
            const colorMap: Record<string, string> = {
              blue:   "bg-blue-50    dark:bg-blue-950/25   border-blue-200/60   dark:border-blue-800/40   text-blue-700   dark:text-blue-300",
              emerald:"bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300",
              violet: "bg-violet-50  dark:bg-violet-950/25  border-violet-200/60  dark:border-violet-800/40  text-violet-700  dark:text-violet-300",
              amber:  "bg-amber-50   dark:bg-amber-950/25   border-amber-200/60   dark:border-amber-800/40   text-amber-700   dark:text-amber-300",
              sky:    "bg-sky-50     dark:bg-sky-950/25     border-sky-200/60     dark:border-sky-800/40     text-sky-700     dark:text-sky-300",
              pink:   "bg-pink-50    dark:bg-pink-950/25    border-pink-200/60    dark:border-pink-800/40    text-pink-700    dark:text-pink-300",
              zinc:   "bg-zinc-50    dark:bg-zinc-800/40    border-zinc-200/60    dark:border-white/[0.07]   text-zinc-700    dark:text-zinc-300",
            };
            return (
              <div key={item.term} className={`rounded-xl border px-4 py-3 ${colorMap[item.color]}`}>
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="font-bold text-sm">{item.term}</span>
                  <span className="text-[10px] font-mono opacity-60">{item.en}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-1.5">
                  <span className="text-[10px] bg-white/60 dark:bg-zinc-700/50 px-2 py-0.5 rounded font-mono">{item.formula}</span>
                  <span className="text-[10px] bg-white/60 dark:bg-zinc-700/50 px-2 py-0.5 rounded">例: {item.example}</span>
                </div>
                <p className="text-[12px] leading-relaxed opacity-80">{item.body}</p>
              </div>
            );
          })}
        </div>

        <InfoBox color="green" title="📋 決算書の3つの基本">
          <ul className="space-y-1.5">
            <li>📄 <strong>損益計算書（P/L）</strong> — 売上高〜最終利益の流れ。「稼ぐ力」の確認。売上高成長率・利益率をチェック</li>
            <li>📊 <strong>貸借対照表（B/S）</strong> — 資産・負債・純資産のスナップショット。「財務の安定性」の確認。D/E比率・流動比率に注目</li>
            <li>💰 <strong>キャッシュフロー計算書（CF）</strong> — 現金の流れ。「実際の現金創出力」の確認。FCFが継続的にプラスかどうかが鍵</li>
          </ul>
        </InfoBox>

        <InfoBox color="amber" title="🔍 財務指標の見方のコツ">
          <ul className="space-y-1">
            <li>• <strong>単年ではなく過去3〜5年のトレンド</strong>で見ること（1年だけ良くても意味が薄い）</li>
            <li>• <strong>同業他社との比較</strong>が重要（業種によって標準値が全然違う）</li>
            <li>• <strong>会社予想 vs 実績の乖離</strong>を確認（コンセンサスを上回り続ける企業は成長株）</li>
            <li>• <strong>複数の指標を組み合わせる</strong>（PERが低くてもROEが低ければバリュートラップの可能性）</li>
          </ul>
        </InfoBox>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 6. 景気サイクル                                                      */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="cycle" emoji="🔄" title="景気サイクルと投資戦略">
        <p>
          経済は「回復→拡張→後退→不況」の<strong>景気サイクル（約3〜5年周期）</strong>を繰り返します。
          このサイクルを理解することで「今はどの局面か？」を考え、有利なセクターに投資する
          <strong>「セクターローテーション」</strong>戦略を取れます。
        </p>

        <EconomyCycle />

        <div>
          <h3 className="font-bold text-base text-zinc-900 dark:text-white mb-3">景気と資産の関係</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/60">
                  <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-left">資産クラス</th>
                  <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center">①回復期</th>
                  <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center">②拡張期</th>
                  <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center">③後退期</th>
                  <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center">④不況期</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["株式（成長株）", "◎", "◎", "△", "✗"],
                  ["株式（ディフェンシブ）", "○", "○", "◎", "○"],
                  ["債券（国債）", "△", "✗", "○", "◎"],
                  ["現金", "△", "△", "○", "◎"],
                  ["商品（原油・金）", "○", "◎", "○", "△"],
                  ["不動産（REIT）", "◎", "○", "△", "✗"],
                ].map(([asset, r1, r2, r3, r4]) => (
                  <tr key={asset} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="border border-zinc-200 dark:border-white/[0.07] px-3 py-1.5 font-medium">{asset}</td>
                    {[r1,r2,r3,r4].map((v, i) => (
                      <td key={i} className={`border border-zinc-200 dark:border-white/[0.07] px-3 py-1.5 text-center font-bold ${
                        v === "◎" ? "text-emerald-600" : v === "○" ? "text-blue-500" : v === "△" ? "text-amber-500" : "text-red-500"
                      }`}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 mt-1.5 text-[10px] text-zinc-400">
            <span>◎ 強い</span><span>○ 普通</span><span>△ 弱め</span><span>✗ 不利</span>
          </div>
        </div>

        <InfoBox color="sky" title="📌 景気サイクルの見極め方">
          <ul className="space-y-1">
            <li>📈 <strong>PMI（製造業景況感指数）</strong> — 50超 = 景気拡大、50未満 = 景気縮小のシグナル</li>
            <li>💼 <strong>雇用統計</strong> — 失業率・非農業部門雇用者数。改善なら回復・拡張期のサイン</li>
            <li>🏦 <strong>中央銀行の政策</strong> — 利下げ = 回復期サポート、利上げ = 拡張後半〜後退期の警告</li>
            <li>📦 <strong>ISM指数</strong> — 製造業・サービス業の景況感。50以上で拡張、50未満で収縮</li>
            <li>📊 <strong>長短金利差（逆イールド）</strong> — 短期金利 &gt; 長期金利になると景気後退の前兆とされる</li>
          </ul>
        </InfoBox>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 7. セクター投資                                                      */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="sectors" emoji="🏭" title="セクター投資">
        <p>
          株式市場はGICS（世界産業分類基準）により<strong>11のセクター</strong>に分類されます。
          景気サイクルによって強いセクターが変わるため、
          セクターの特性を理解することが投資の幅を広げます。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { emoji: "⛽", name: "エネルギー",       ex: "エクソンモービル, ENEOS",        note: "原油・天然ガス価格と連動。地政学リスクの影響大。インフレ局面で強い", type: "景気敏感" },
            { emoji: "🔩", name: "素材",             ex: "三菱ケミカル, Freeport-McMoRan",  note: "景気拡大時に需要増。資源価格と連動。インフレヘッジになることも", type: "景気敏感" },
            { emoji: "🏗️", name: "資本財・サービス", ex: "クボタ, ハネウェル, 三菱電機",    note: "設備投資が増える景気拡大期に強い。政府の公共事業の影響も受ける", type: "景気敏感" },
            { emoji: "🛍️", name: "一般消費財",       ex: "アマゾン, トヨタ, 任天堂",        note: "景気拡大・消費増加時に好調。不況・金利上昇時には消費が冷え込む", type: "景気敏感" },
            { emoji: "🛒", name: "生活必需品",       ex: "P&G, 花王, コストコ",             note: "食料品・日用品。景気に左右されにくい「ディフェンシブ株」の代表", type: "ディフェンシブ" },
            { emoji: "💊", name: "ヘルスケア",       ex: "ファイザー, 第一三共, 中外製薬",   note: "病院・製薬・医療機器。景気に関係なく需要が安定。高齢化で長期追い風", type: "ディフェンシブ" },
            { emoji: "🏦", name: "金融",             ex: "JPモルガン, 三菱UFJ, 東京海上",   note: "銀行・保険・証券。金利上昇時に利ざや拡大で恩恵。景気敏感な面も", type: "景気敏感" },
            { emoji: "💻", name: "情報技術（IT）",   ex: "NVIDIA, Apple, ソニー, NTT",     note: "AIやクラウドが牽引する成長セクター。高PERで金利上昇の影響を受けやすい", type: "成長" },
            { emoji: "📡", name: "通信サービス",     ex: "メタ, アルファベット, KDDI",       note: "インターネット・SNS・通信インフラ。安定的な収益とデジタル広告の成長", type: "ハイブリッド" },
            { emoji: "⚡", name: "公益事業（電力等）", ex: "東京電力, 関西電力, ネクステラ",  note: "電気・ガス・水道。高配当・安定収益。金利上昇で割高感が出やすい", type: "ディフェンシブ" },
            { emoji: "🏢", name: "不動産（REIT）",  ex: "三井不動産, アメリカンタワー",      note: "商業施設・オフィス・住宅。高配当が多いが金利上昇に弱い傾向", type: "ディフェンシブ" },
          ].map((s) => {
            const typeColor = s.type === "成長" ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
              : s.type === "ディフェンシブ" ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
              : s.type === "ハイブリッド" ? "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300"
              : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300";
            return (
              <div key={s.name} className="flex items-start gap-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/[0.07] px-3 py-2.5">
                <span className="text-xl shrink-0">{s.emoji}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{s.name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${typeColor}`}>{s.type}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{s.ex}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{s.note}</div>
                </div>
              </div>
            );
          })}
        </div>

        <Link
          href="/sectors"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
        >
          📊 セクター別ヒートマップを見る →
        </Link>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 8. 投資戦略                                                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="strategy" emoji="🎯" title="投資戦略">
        <p>
          投資スタイルは大きく3種類。<strong>自分の時間・性格・目標・資金量</strong>に合ったスタイルを選びましょう。
          まずは長期投資から始めて、慣れたら他のスタイルを試すのが定石です。
        </p>

        <div className="space-y-3">
          {[
            {
              title: "バイ・アンド・ホールド（長期投資）",
              badge: "🌱 初心者向け・最推奨",
              badgeColor: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300",
              icon: "🌱",
              horizon: "数年〜数十年",
              pros: ["時間を味方にできる（複利の力）", "税金・手数料コストが低い", "毎日チェック不要", "心理的負担が少ない", "歴史的に最も高いリターン"],
              cons: ["短期的な評価損に耐える必要がある", "急いで資金が必要な場合に困る"],
              desc: "優良企業やインデックスファンドを買って長期保有する戦略。「S&P500に毎月3万円積立」などが代表例。時間が解決してくれることが多い。",
            },
            {
              title: "スイングトレード（中期）",
              badge: "🎯 中級者向け",
              badgeColor: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300",
              icon: "🎯",
              horizon: "数日〜数週間",
              pros: ["比較的短期で利益確定できる", "長期より機会が多い", "決算イベントを狙える"],
              cons: ["テクニカル分析の知識が必要", "売買コストが増える", "1日数回チェックが必要"],
              desc: "数日〜数週間の値動きを狙う手法。決算発表前の期待買い、テクニカルのブレイクアウト等を活用。",
            },
            {
              title: "デイトレード（短期）",
              badge: "⚡ 上級者向け",
              badgeColor: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
              icon: "⚡",
              horizon: "当日中",
              pros: ["翌日のリスクを持たない", "高い資金回転率"],
              cons: ["常にモニター監視が必要", "手数料コストが高い", "心理的プレッシャーが大", "初心者の9割以上が損失"],
              desc: "当日中に売買を完結させる手法。高い技術・規律・資金管理が必要。初心者には推奨しない。",
            },
          ].map((s) => (
            <div key={s.title} className="rounded-xl border border-zinc-200/60 dark:border-white/[0.07] bg-zinc-50 dark:bg-zinc-800/40 p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xl">{s.icon}</span>
                <div>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{s.title}</span>
                  <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badgeColor}`}>{s.badge}</span>
                </div>
                <span className="ml-auto text-[10px] text-zinc-400 bg-zinc-200/60 dark:bg-zinc-700/50 px-2 py-0.5 rounded-full">保有期間: {s.horizon}</span>
              </div>
              <p className="text-xs text-zinc-500 mb-3 leading-relaxed">{s.desc}</p>
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

        <InfoBox color="blue" title="📌 ドル・コスト平均法（DCA）— 初心者に最おすすめ">
          毎月一定額を定期的に購入する手法。価格が高い時は少なく、低い時は多く買えるため、
          平均取得単価が自然に平準化されます。
          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <div className="bg-white/50 dark:bg-blue-900/20 rounded p-2 text-center">
              <div className="font-bold">毎月1万円積立</div>
              <div className="text-zinc-500">高い月は少なく買える</div>
            </div>
            <div className="bg-white/50 dark:bg-blue-900/20 rounded p-2 text-center">
              <div className="font-bold">安い月は多く買える</div>
              <div className="text-zinc-500">暴落時に口数が増える</div>
            </div>
            <div className="bg-white/50 dark:bg-blue-900/20 rounded p-2 text-center">
              <div className="font-bold">相場予測不要</div>
              <div className="text-zinc-500">ストレスフリー</div>
            </div>
          </div>
        </InfoBox>

        <InfoBox color="violet" title="📊 ポートフォリオの基本構成（例）">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
            {[
              { type: "20代〜30代", desc: "成長重視。株式比率を高く", alloc: "株式80% / 債券10% / 現金10%" },
              { type: "40代〜50代", desc: "バランス重視", alloc: "株式60% / 債券25% / 現金15%" },
              { type: "60代以降", desc: "安全性重視。インカム中心", alloc: "株式40% / 債券40% / 現金20%" },
            ].map((p) => (
              <div key={p.type} className="bg-white/50 dark:bg-violet-900/20 rounded-lg p-2">
                <div className="font-bold text-xs mb-0.5">{p.type}</div>
                <div className="text-[10px] text-zinc-500 mb-1">{p.desc}</div>
                <div className="text-[10px] font-medium">{p.alloc}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px]">※ あくまで目安。リスク許容度・目標によって調整してください。</div>
        </InfoBox>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 9. 税金・NISA                                                        */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="tax" emoji="💴" title="税金・NISA・iDeCo（日本の税制優遇）">
        <p>
          投資の利益には税金がかかります。しかし<strong>NISAやiDeCo</strong>を使えば、
          利益を<strong>非課税</strong>（税金ゼロ）にできます。
          これらを活用しないのは非常にもったいないので、最初に必ず設定しましょう。
        </p>

        <InfoBox color="red" title="💸 通常の税金（特定口座）">
          <div className="space-y-2">
            <div>株式の利益（売却益・配当金）には<strong>約20.315%（所得税15.315% + 住民税5%）</strong>の税金がかかります。</div>
            <div className="bg-white/50 dark:bg-red-900/20 rounded-lg p-3 font-mono text-xs">
              <div>利益100万円 × 20.315% = 税金<span className="font-bold text-red-600">約20万円</span></div>
              <div className="text-zinc-500 mt-0.5">→ 手元に残るのは約<strong>80万円</strong></div>
            </div>
          </div>
        </InfoBox>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/25 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🌱</span>
              <div>
                <div className="font-bold text-emerald-800 dark:text-emerald-200">NISA（少額投資非課税制度）</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">✨ 利益が非課税！</div>
              </div>
            </div>
            <div className="space-y-2 text-[12px] text-emerald-800 dark:text-emerald-300">
              <div><strong>つみたて投資枠</strong>: 年間120万円まで。長期積立向け。対象はインデックスファンド等</div>
              <div><strong>成長投資枠</strong>: 年間240万円まで。個別株・ETF等も対象</div>
              <div><strong>生涯投資枠</strong>: 合計1,800万円（うち成長投資枠は1,200万円）</div>
              <div className="bg-emerald-100 dark:bg-emerald-900/40 rounded p-2 mt-2">
                <div className="font-bold mb-0.5">💡 例</div>
                <div>NISA口座で100万円の利益 → 税金ゼロ、<strong>100万円まるまま手元に残る</strong></div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/25 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🏦</span>
              <div>
                <div className="font-bold text-blue-800 dark:text-blue-200">iDeCo（個人型確定拠出年金）</div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">✨ 掛金が所得控除に！</div>
              </div>
            </div>
            <div className="space-y-2 text-[12px] text-blue-800 dark:text-blue-300">
              <div><strong>対象者</strong>: 20歳以上65歳未満の国民年金被保険者</div>
              <div><strong>拠出限度額</strong>: 職業によって月1.2万〜6.8万円</div>
              <div><strong>メリット①</strong>: 掛金が全額所得控除（住民税・所得税が安くなる）</div>
              <div><strong>メリット②</strong>: 運用益が非課税</div>
              <div><strong>デメリット</strong>: 60歳まで原則引き出せない</div>
              <div className="bg-blue-100 dark:bg-blue-900/40 rounded p-2 mt-2">
                <div className="font-bold mb-0.5">💡 例（年収500万円の会社員）</div>
                <div>月2万円 × 年12ヶ月 = 24万円が所得控除 → <strong>約4〜5万円の節税</strong></div>
              </div>
            </div>
          </div>
        </div>

        <InfoBox color="amber" title="📋 NISAとiDeCo、どちらを優先する？">
          <ul className="space-y-1.5">
            <li>✅ <strong>まずNISAを優先</strong>: いつでも引き出せる柔軟性がある。老後以外の目的にも使える</li>
            <li>✅ <strong>節税効果が高い人はiDeCoも活用</strong>: 所得税率が高い人（年収600万円超）ほど節税額が大きい</li>
            <li>✅ <strong>余裕があれば両方</strong>: NISA（1,800万円）＋iDeCo（60歳まで積立）のダブル活用が最強</li>
            <li>⚠️ <strong>特定口座での損益通算</strong>: NISA以外の口座では損失を出した場合、他の利益と相殺できる（損益通算）</li>
          </ul>
        </InfoBox>

        <div className="rounded-xl border border-zinc-200/60 dark:border-white/[0.07] bg-zinc-50 dark:bg-zinc-800/40 p-4">
          <div className="font-bold text-sm mb-3">📊 3つの口座の比較</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-700/50">
                  <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-left">項目</th>
                  <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center">特定口座</th>
                  <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center">NISA</th>
                  <th className="border border-zinc-200 dark:border-white/[0.07] px-3 py-2 text-center">iDeCo</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["税金", "20.315%", "非課税 ✨", "受取時に課税（控除あり）"],
                  ["引き出し", "いつでも可", "いつでも可", "原則60歳以降"],
                  ["年間上限", "上限なし", "360万円", "14.4〜81.6万円"],
                  ["生涯上限", "上限なし", "1,800万円", "なし"],
                  ["損益通算", "可", "不可", "不可"],
                ].map(([item, ...vals]) => (
                  <tr key={item}>
                    <td className="border border-zinc-200 dark:border-white/[0.07] px-3 py-1.5 font-medium">{item}</td>
                    {vals.map((v, i) => (
                      <td key={i} className={`border border-zinc-200 dark:border-white/[0.07] px-3 py-1.5 text-center ${v.includes('✨') ? 'text-emerald-600 font-bold' : ''}`}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 10. リスク管理                                                       */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="risk" emoji="🛡️" title="リスク管理">
        <p>
          投資で最も重要なのは<strong>「損失を最小限に抑えること」</strong>です。
          「10%の損失を取り戻すには11.1%の利益が必要、50%の損失には100%の利益が必要」
          という非対称性を理解し、<strong>資産を守ることを最優先</strong>にしてください。
        </p>

        <div className="rounded-xl border border-zinc-200/60 dark:border-white/[0.07] bg-zinc-50 dark:bg-zinc-800/40 p-4">
          <div className="font-bold text-sm mb-3">📉 損失と回復に必要な利益の関係</div>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 text-center text-[11px]">
            {[
              { loss: "-5%",  recover: "+5.3%" },
              { loss: "-10%", recover: "+11.1%" },
              { loss: "-20%", recover: "+25%" },
              { loss: "-30%", recover: "+42.9%" },
              { loss: "-50%", recover: "+100%", highlight: true },
            ].map((x) => (
              <div key={x.loss} className={`rounded-lg p-2 border ${x.highlight ? "bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800" : "bg-white dark:bg-zinc-700/50 border-zinc-200 dark:border-white/[0.07]"}`}>
                <div className={`font-bold ${x.highlight ? "text-red-600 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"}`}>{x.loss}</div>
                <div className="text-zinc-400 text-[10px]">→</div>
                <div className={`font-bold text-emerald-600`}>{x.recover}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {[
            { icon: "📊", title: "分散投資（ポートフォリオ）", body: "「卵を一つのかごに盛るな」が基本原則。1銘柄に集中するのはNG。最低でも5〜10銘柄、できれば異なるセクター・地域に分散を。インデックスファンドは1本で数百銘柄に分散できるので超便利。" },
            { icon: "🛑", title: "損切りルールの設定（最重要）", body: "「-10%になったら売る」などのルールをあらかじめ決めておき、感情に左右されず機械的に実行。損失は小さいうちに確定するのが鉄則。「いつか戻るはず」という希望的観測は禁物。特に個別株はいつまでも戻らないことがある。" },
            { icon: "💰", title: "余剰資金での投資", body: "生活費（最低6ヶ月分）・緊急資金を確保した上での余剰資金で投資。投資目的での借金は絶対禁止。必要な時に売れない状況（強制売却）は最悪のタイミングで売ることになりやすい。" },
            { icon: "📏", title: "ポジションサイズの管理", body: "1銘柄への集中投資は避け、全体の20〜25%以下に抑えるのが目安。また「1回の取引で全資産の2%以上の損失を出さない」というルール（2%ルール）もプロが使う基本的なリスク管理法。" },
            { icon: "📅", title: "長期視点の維持", body: "短期的な価格変動（-20%でも）に一喜一憂しない。歴史的にS&P500は長期では上昇し続けてきた。暴落時も「セール（安売り）」と考え、パニック売りを避ける。「Time in the market beats timing the market（相場の中にいる時間が勝負）」" },
            { icon: "📚", title: "継続学習と情報収集", body: "信頼性の高い情報源（公式決算資料・証券会社のレポート）を活用。SNSの「○○株が10倍になる」「今すぐ買え」等の煽り情報に要注意。投資判断は必ず自己責任。" },
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

        <InfoBox color="red" title="🚨 初心者がやりがちな失敗TOP7">
          <ul className="space-y-1.5">
            <li>❌ <strong>FOMOで高値買い</strong> — 急騰した銘柄をニュースで知って飛びつく（もう遅い）</li>
            <li>❌ <strong>損切りできない</strong> — 含み損を抱えたまま「いつか戻る」と放置。ズルズル拡大</li>
            <li>❌ <strong>1〜2銘柄に全資産を集中</strong> — 企業倒産・不祥事で大打撃</li>
            <li>❌ <strong>信用取引・レバレッジの乱用</strong> — 少しの下落でも大きな損失。初心者は禁止</li>
            <li>❌ <strong>SNSの情報に振り回される</strong> — 「確実に上がる株」は存在しない</li>
            <li>❌ <strong>NISAを使わない</strong> — 特定口座で年間数万円の税金を無駄に払っている</li>
            <li>❌ <strong>生活費を投資に回す</strong> — 下落時に強制売却するハメになる</li>
          </ul>
        </InfoBox>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 11. よくある質問                                                     */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="faq" emoji="❓" title="よくある質問（FAQ）">
        <p>投資を始めようとしている方からよく聞かれる質問にお答えします。</p>

        <div className="space-y-3">
          <FAQItem q="いくらから始められますか？">
            証券会社によっては<strong>1株から購入できる「単元未満株（端株）」</strong>があり、数百円から始められます。
            日本株は通常100株単位（トヨタなら約30万円程度）ですが、SBI証券やマネックス証券では1株から購入可能。
            米国株は最初から1株単位なので、Appleなら数万円で始められます。
            <strong>まずは月1,000円〜のインデックス積立でも十分</strong>効果があります。
          </FAQItem>

          <FAQItem q="どの銘柄を最初に買えばいいですか？">
            初心者には<strong>①インデックスファンドの積立か②自分がよく使う製品の大企業</strong>がおすすめです。
            「eMAXIS Slim 全世界株式（オルカン）」や「eMAXIS Slim 米国株式（S&P500）」などの低コストインデックスファンドは、
            世界中の株に分散投資できて非常に効率的です。個別株は最低限の分析ができるようになってから。
          </FAQItem>

          <FAQItem q="株式投資とインデックス投資の違いは？">
            <strong>株式投資（個別株）</strong>: 特定の企業1社を選んで投資。大きなリターンもあるが、失敗すると大きな損失のリスクも。
            <br/>
            <strong>インデックス投資</strong>: S&P500などの指数に連動するファンドに投資。500社以上に自動分散され、低コスト。
            多くの研究で「個人投資家の約9割は長期的にインデックスに負ける」とされており、
            特に初心者はインデックスから始めることを強く推奨します。
          </FAQItem>

          <FAQItem q="配当金はいつ、どのように受け取れますか？">
            <strong>権利確定日（通常3月31日・9月30日）</strong>に株を保有していると配当金を受け取る権利が生まれます。
            実際の支払いは権利確定日から約2〜3ヶ月後。NISA口座で保有していれば配当も非課税。
            特定口座（源泉徴収あり）なら証券会社が税金を自動で処理してくれます。
            米国株の配当は通常四半期ごと（年4回）に支払われます。
          </FAQItem>

          <FAQItem q="株価が下がったらどうすればいいですか？">
            まず「なぜ下がったか」を確認しましょう。<strong>①企業固有の問題なら損切り検討、②市場全体の下落なら保有継続または買い増し</strong>が基本。
            あらかじめ設定した損切りラインに達したら感情なく売ること。
            長期のインデックス投資なら「暴落はバーゲンセール」と考えて積立を続けることが歴史的に最も有効です。
            パニック売りは最悪のタイミングで売ることになります。
          </FAQItem>

          <FAQItem q="確定申告は必要ですか？">
            <strong>特定口座（源泉徴収あり）</strong>を選ぶと、証券会社が税金を自動計算・納付してくれるため確定申告不要（通常）。
            <strong>NISA口座</strong>は非課税なので申告不要。
            ただし複数の証券会社を使って損益通算する場合や、一般口座・NISA以外で大きな利益がある場合は確定申告が必要になることも。
            迷ったら証券会社のカスタマーサポートへ。
          </FAQItem>

          <FAQItem q="ETFと投資信託の違いは何ですか？">
            <strong>投資信託</strong>: 1日1回の基準価額で購入・売却。1,000円から積立可能。NISA積立に最適。
            <br/>
            <strong>ETF（上場投資信託）</strong>: 株式市場でリアルタイムに売買できる。指数連動型が多い。
            どちらも多数の資産に分散投資できる点は同じ。長期積立なら投資信託、リアルタイム売買したいならETFが向いています。
          </FAQItem>

          <FAQItem q="暗号通貨（仮想通貨）と株式の違いは？">
            <strong>株式</strong>: 企業の業績・資産に裏付けられた有価証券。配当もある。法整備も整っている。
            <br/>
            <strong>暗号通貨</strong>: 企業のような実体的な裏付けがない。ボラティリティが非常に高く投機的。
            利益は「雑所得」として最大55%の税率。NISAの対象外。
            初心者はまず株式投資でリスク管理を学んでから、余裕があれば少額で挑戦するのが賢明です。
          </FAQItem>
        </div>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 12. 用語集                                                           */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionCard id="glossary" emoji="📖" title="用語集">
        <p>投資でよく出てくる基本用語をまとめました。わからない言葉が出てきたら参照してください。</p>

        <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
          <Term word="株式 / Stock">企業が発行する所有権の証明書。購入すると株主（オーナーの一人）になる。</Term>
          <Term word="配当金 / Dividend">企業が利益の一部を株主に分配するお金。年1〜4回支払われる。</Term>
          <Term word="キャピタルゲイン">株を安く買って高く売ったときの差益（売却益）。</Term>
          <Term word="インカムゲイン">配当金や利子など、保有中に受け取る定期的な収入。</Term>
          <Term word="時価総額">株価 × 発行済株式数。企業の市場での評価総額。</Term>
          <Term word="PER（株価収益率）">株価 ÷ EPS。何年分の利益で買えるかを示す。低いほど割安とされる。</Term>
          <Term word="PBR（株価純資産倍率）">株価 ÷ 1株純資産。1倍割れは解散価値以下を意味する。</Term>
          <Term word="ROE（自己資本利益率）">純利益 ÷ 自己資本。株主資本の効率性を示す。10〜15%以上が優良企業の目安。</Term>
          <Term word="EPS（1株利益）">当期純利益 ÷ 発行済株式数。増加トレンドかどうかが重要。</Term>
          <Term word="PEG レシオ">PER ÷ EPS成長率(%)。1.0以下は成長を考慮しても割安の目安。</Term>
          <Term word="FCF（フリーCF）">営業キャッシュフロー − 設備投資。実際に手元に残る現金。</Term>
          <Term word="配当利回り">年間配当金 ÷ 株価 × 100。3〜5%以上が高配当銘柄の目安。</Term>
          <Term word="移動平均線 / MA">一定期間の平均株価を線で結んだトレンド指標。</Term>
          <Term word="RSI">相対強弱指数。70超＝買われすぎ、30未満＝売られすぎ。</Term>
          <Term word="MACD">移動平均収束拡散法。トレンドの方向性と転換点を示す。</Term>
          <Term word="ゴールデンクロス">短期MAが長期MAを上抜け → 買いサイン。</Term>
          <Term word="デッドクロス">短期MAが長期MAを下抜け → 売りサイン。</Term>
          <Term word="出来高 / Volume">売買された株数。価格変動の信頼性を示す。</Term>
          <Term word="ボリンジャーバンド">移動平均±2σのバンド。バンド端で反転しやすい統計的性質を利用。</Term>
          <Term word="空売り / Short">株を借りて売り、値下がり後に買い戻して利益を得る手法。</Term>
          <Term word="信用取引">証拠金を担保に自己資金の数倍の取引ができる。レバレッジ取引。</Term>
          <Term word="ETF">上場投資信託。指数に連動し、株式のように売買できるファンド。</Term>
          <Term word="インデックスファンド">市場指数（S&P500等）に連動する低コストの投資信託。</Term>
          <Term word="REIT">不動産投資信託。不動産収益を分配。高配当が多い。</Term>
          <Term word="NISA">少額投資非課税制度。年間最大360万円まで利益が非課税になる。</Term>
          <Term word="iDeCo">個人型確定拠出年金。掛金が全額所得控除、運用益も非課税。60歳まで引き出し不可。</Term>
          <Term word="損切り / Stop Loss">損失確定のため保有株を売却すること。傷を広げないための重要な判断。</Term>
          <Term word="利確 / Take Profit">利益を確定するために保有株を売却すること。</Term>
          <Term word="ポートフォリオ">保有している全投資資産の組み合わせ・構成。</Term>
          <Term word="分散投資">リスクを減らすため、複数の銘柄・種類・地域に投資を分散すること。</Term>
          <Term word="ドル・コスト平均法">定期的に一定金額を購入し、平均取得単価を平準化する積立手法。</Term>
          <Term word="含み益 / 含み損">まだ売却していない状態での評価益・評価損。</Term>
          <Term word="流動性 / Liquidity">売買のしやすさ。出来高が多いほど流動性が高く、大きな価格変動なく売買できる。</Term>
          <Term word="ボラティリティ">価格変動の激しさ。VIXが高い = 市場の不安が高い。</Term>
          <Term word="VIX（恐怖指数）">S&P500オプションから算出される市場の不安度。20超 = 不安、30超 = 恐怖。</Term>
          <Term word="景気サイクル">回復→拡張→後退→不況の経済の波。約3〜5年周期で繰り返す。</Term>
          <Term word="セクターローテーション">景気サイクルに合わせて強いセクターへ資金を移動させる戦略。</Term>
          <Term word="ディフェンシブ株">景気に関わらず安定した需要がある銘柄（食品・医薬・公益など）。</Term>
          <Term word="逆イールド">短期金利 ＞ 長期金利の状態。景気後退の前兆とされることが多い。</Term>
        </div>
      </SectionCard>

      {/* ── Footer CTA ── */}
      <div className="rounded-xl border border-zinc-200/60 dark:border-white/[0.07] bg-gradient-to-br from-blue-50 to-violet-50 dark:from-zinc-900 dark:to-blue-950/20 px-6 py-6 text-center">
        <div className="text-2xl mb-2">🚀</div>
        <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">さあ、実際に銘柄を分析してみよう</h3>
        <p className="text-sm text-zinc-500 mb-4">学んだファンダメンタルズ・テクニカル・マクロ知識を活かして、気になる銘柄の分析を始めてみましょう</p>
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
          <Link href="/ai-ranking" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity">
            ✨ AI予想ランキング
          </Link>
        </div>
      </div>

    </div>
  );
}
