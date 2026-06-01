"use client";

import { useState } from "react";
import Link from "next/link";
import { Rocket, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type IpoStatus = "upcoming" | "recent" | "priced";
type Market = "JP" | "US";

type IpoEntry = {
  symbol:      string | null;
  name:        string;
  nameEn:      string;
  market:      Market;
  status:      IpoStatus;
  ipoDate:     string;         // YYYY-MM-DD
  priceRange:  string | null;  // 例: "¥1,200〜¥1,500"
  offerPrice:  number | null;
  currency:    string;
  sector:      string;
  description: string;
  marketCap:   string | null;  // 例: "約2,000億円"
  underwriter: string | null;  // 主幹事証券
  url:         string | null;
};

// ── Static IPO データ ──────────────────────────────────────────────
const IPO_DATA: IpoEntry[] = [

  // ─── 🇺🇸 米国株 ─────────────────────────────────────────────────
  {
    symbol: "RDDT", name: "レディット", nameEn: "Reddit", market: "US",
    status: "recent", ipoDate: "2024-03-21", priceRange: null, offerPrice: 34,
    currency: "USD", sector: "SNS・コミュニティ",
    description: "世界最大のオンライン掲示板プラットフォーム。月間アクティブユーザー8億人超。AI学習データのライセンスビジネスも展開。",
    marketCap: "約$100億", underwriter: "Goldman Sachs", url: "https://www.reddit.com",
  },
  {
    symbol: "ALAB", name: "アステラ・ラボ", nameEn: "Astera Labs", market: "US",
    status: "recent", ipoDate: "2024-03-20", priceRange: null, offerPrice: 36,
    currency: "USD", sector: "AI・半導体接続",
    description: "AIデータセンター向け高速接続チップの設計企業。NVIDIAのGPUクラスタとの接続に特化。売上高急成長中。",
    marketCap: "約$200億", underwriter: "Morgan Stanley", url: "https://www.asteralabs.com",
  },
  {
    symbol: "RBRK", name: "ルブリク", nameEn: "Rubrik", market: "US",
    status: "recent", ipoDate: "2024-04-25", priceRange: null, offerPrice: 32,
    currency: "USD", sector: "サイバーセキュリティ",
    description: "クラウドデータセキュリティ＆バックアップのリーダー。ランサムウェア対策に強み。年間経常収益(ARR)が高成長。",
    marketCap: "約$60億", underwriter: "Goldman Sachs", url: "https://www.rubrik.com",
  },
  {
    symbol: "LNTH", name: "ラジオファーマ", nameEn: "Lantheus", market: "US",
    status: "recent", ipoDate: "2024-07-26", priceRange: null, offerPrice: 78,
    currency: "USD", sector: "ヘルスケア・放射線医薬",
    description: "がん診断用の放射性医薬品メーカー。PET画像診断薬で業界トップクラスのシェア。",
    marketCap: "約$35億", underwriter: "J.P. Morgan", url: null,
  },
  {
    symbol: "SOUN", name: "サウンドハウンドAI", nameEn: "SoundHound AI", market: "US",
    status: "recent", ipoDate: "2022-04-28", priceRange: null, offerPrice: 8.0,
    currency: "USD", sector: "音声AI",
    description: "NVIDIAが出資する音声AI企業。自動車・外食・ヘルスケア向けの音声アシスタント技術を提供。",
    marketCap: "約$20億", underwriter: null, url: "https://www.soundhound.com",
  },
  {
    symbol: null, name: "クラーナ", nameEn: "Klarna", market: "US",
    status: "upcoming", ipoDate: "2025-Q3予定", priceRange: "$15〜$20",
    offerPrice: null, currency: "USD", sector: "BNPL・フィンテック",
    description: "欧州最大のBNPL（後払い）サービス。EC決済で世界5億人以上が利用。黒字化を達成しNY上場を準備中。",
    marketCap: "約$200億", underwriter: "Goldman Sachs / Morgan Stanley", url: "https://www.klarna.com",
  },
  {
    symbol: null, name: "セラブラス・システムズ", nameEn: "Cerebras Systems", market: "US",
    status: "upcoming", ipoDate: "2025年内予定", priceRange: null,
    offerPrice: null, currency: "USD", sector: "AI専用チップ",
    description: "世界最大のAI専用チップ「WSE」を開発。NVIDIA対抗馬として注目。規制審査中。",
    marketCap: "約$70億（推定）", underwriter: "Citigroup", url: "https://www.cerebras.net",
  },
  {
    symbol: null, name: "アンソロピック", nameEn: "Anthropic", market: "US",
    status: "upcoming", ipoDate: "未定", priceRange: null,
    offerPrice: null, currency: "USD", sector: "生成AI",
    description: "Claude（クロード）を開発する生成AIスタートアップ。Amazon・Google等が出資。評価額$18B超。",
    marketCap: "推定$180億以上", underwriter: "未定", url: "https://www.anthropic.com",
  },

  // ─── 🇯🇵 日本株 ─────────────────────────────────────────────────
  {
    symbol: "219A.T", name: "GVA TECH", nameEn: "GVA TECH", market: "JP",
    status: "recent", ipoDate: "2024-03-28", priceRange: null, offerPrice: 720,
    currency: "JPY", sector: "リーガルテック・DX",
    description: "AI契約書レビューサービスのパイオニア。法律事務所・企業向けに契約DXを提供。成長市場のリーガルテック分野。",
    marketCap: "約100億円", underwriter: "SMBC日興証券", url: "https://gvatech.co.jp",
  },
  {
    symbol: "287A.T", name: "ブリッジコンサルティング", nameEn: "Bridge Consulting", market: "JP",
    status: "recent", ipoDate: "2024-06-27", priceRange: null, offerPrice: 950,
    currency: "JPY", sector: "ITコンサルティング",
    description: "中堅企業向けのDXコンサルティング。クラウド導入・業務改革支援を主軸に急成長中。",
    marketCap: "約120億円", underwriter: "野村證券", url: null,
  },
  {
    symbol: "298A.T", name: "ファインズ", nameEn: "FINES", market: "JP",
    status: "recent", ipoDate: "2024-09-25", priceRange: null, offerPrice: 1200,
    currency: "JPY", sector: "SaaS・BPO",
    description: "保険会社向けのSaaS＋BPOサービス。契約管理・保険金支払いのデジタル化で保険業界のDXを推進。",
    marketCap: "約200億円", underwriter: "大和証券", url: null,
  },
  {
    symbol: null, name: "スタートアップIPO予定（2025年）", nameEn: "2025 JP IPO Pipeline", market: "JP",
    status: "upcoming", ipoDate: "2025年下半期", priceRange: null,
    offerPrice: null, currency: "JPY", sector: "複数セクター",
    description: "2025年は東証グロース市場を中心に100社以上のIPOが予定。AI・SaaS・ヘルスケア分野での上場が活発化する見通し。",
    marketCap: null, underwriter: "各主幹事証券", url: null,
  },
  {
    symbol: "5243.T", name: "Appier Group", nameEn: "Appier Group", market: "JP",
    status: "recent", ipoDate: "2021-03-30", priceRange: null, offerPrice: 1720,
    currency: "JPY", sector: "AI・マーケティング",
    description: "AIを活用したマーケティングオートメーション。ソフトバンクが主要株主。Asia Pacific 地域でNo.1のAI SaaS企業を目指す。",
    marketCap: "約1,000億円", underwriter: "野村證券", url: "https://appier.com",
  },
  {
    symbol: "5253.T", name: "カバー（ホロライブ）", nameEn: "COVER Corp", market: "JP",
    status: "recent", ipoDate: "2023-03-27", priceRange: null, offerPrice: 1550,
    currency: "JPY", sector: "バーチャルYouTuber・IP",
    description: "ホロライブプロダクションを運営するVTuber事務所。グローバルIPビジネスで急成長中。グッズ・ライブ・コラボ等で収益多様化。",
    marketCap: "約3,000億円", underwriter: "三菱UFJモルガン・スタンレー証券", url: "https://cover-corp.com",
  },
];

// ── Helpers ────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<IpoStatus, { label: string; badge: string; dot: string }> = {
  upcoming: { label: "上場予定", badge: "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/40", dot: "bg-violet-400" },
  priced:   { label: "条件決定", badge: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40", dot: "bg-amber-400" },
  recent:   { label: "上場済み", badge: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40", dot: "bg-emerald-400" },
};

function IpoCard({ ipo }: { ipo: IpoEntry }) {
  const [open, setOpen] = useState(false);
  const sc = STATUS_CONFIG[ipo.status];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center shrink-0 text-lg font-bold text-zinc-600 dark:text-zinc-300">
          {ipo.market === "JP" ? "🇯🇵" : "🇺🇸"}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">{ipo.name}</span>
                {ipo.symbol && (
                  <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{ipo.symbol}</span>
                )}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">{ipo.nameEn} · {ipo.sector}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold inline-flex items-center gap-1 ${sc.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
            </div>
          </div>

          {/* Date + Price row */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
            <div className="flex items-center gap-1 text-zinc-500">
              <span>📅</span>
              <span>{ipo.ipoDate}</span>
            </div>
            {ipo.offerPrice != null && (
              <div className="flex items-center gap-1 text-zinc-500">
                <span>💴</span>
                <span>公募価格: <strong className="text-zinc-700 dark:text-zinc-300">
                  {ipo.currency === "JPY" ? `¥${ipo.offerPrice.toLocaleString("ja-JP")}` : `$${ipo.offerPrice}`}
                </strong></span>
              </div>
            )}
            {ipo.priceRange && (
              <div className="flex items-center gap-1 text-zinc-500">
                <span>📊</span>
                <span>仮条件: <strong className="text-zinc-700 dark:text-zinc-300">{ipo.priceRange}</strong></span>
              </div>
            )}
            {ipo.marketCap && (
              <div className="flex items-center gap-1 text-zinc-500">
                <span>🏢</span>
                <span>時価総額: <strong className="text-zinc-700 dark:text-zinc-300">{ipo.marketCap}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 展開詳細 */}
      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 bg-zinc-50/50 dark:bg-zinc-800/20 space-y-3">
          {/* 事業概要 */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-1">事業概要</div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{ipo.description}</p>
          </div>

          {/* メタ情報 */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {ipo.underwriter && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">主幹事証券</div>
                <div className="text-zinc-700 dark:text-zinc-300">{ipo.underwriter}</div>
              </div>
            )}
            {ipo.sector && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">セクター</div>
                <div className="text-zinc-700 dark:text-zinc-300">{ipo.sector}</div>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="flex items-center gap-3 pt-1">
            {ipo.symbol && (
              <Link
                href={`/stock/${encodeURIComponent(ipo.symbol)}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <TrendingUp className="w-3 h-3" />
                株価チャートを見る
              </Link>
            )}
            {ipo.url && (
              <a
                href={ipo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                <ExternalLink className="w-3 h-3" />
                公式サイト
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function IpoPage() {
  const [market, setMarket] = useState<Market>("JP");
  const [filter, setFilter] = useState<IpoStatus | "all">("all");

  const filtered = IPO_DATA.filter(
    ipo => ipo.market === market && (filter === "all" || ipo.status === filter)
  );

  const counts = {
    all:      IPO_DATA.filter(i => i.market === market).length,
    upcoming: IPO_DATA.filter(i => i.market === market && i.status === "upcoming").length,
    priced:   IPO_DATA.filter(i => i.market === market && i.status === "priced").length,
    recent:   IPO_DATA.filter(i => i.market === market && i.status === "recent").length,
  };

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <span className="inline-flex w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 items-center justify-center text-white shadow-lg shadow-violet-500/25">
            <Rocket className="w-5 h-5" />
          </span>
          IPO情報
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          注目の新規上場・上場予定銘柄を一覧で確認できます。
        </p>
      </header>

      {/* ── コントロール ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm space-y-3">
        {/* 市場 */}
        <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl gap-0.5">
          {(["JP", "US"] as Market[]).map(m => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                market === m
                  ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <span>{m === "JP" ? "🇯🇵" : "🇺🇸"}</span>
              <span>{m === "JP" ? "日本株" : "米株"}</span>
            </button>
          ))}
        </div>

        {/* ステータスフィルター */}
        <div className="flex gap-1.5 flex-wrap">
          {([
            ["all",      "すべて"],
            ["upcoming", "上場予定"],
            ["priced",   "条件決定"],
            ["recent",   "上場済み"],
          ] as [IpoStatus | "all", string][]).map(([key, label]) => {
            const cnt = counts[key];
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filter === key
                    ? "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 shadow-sm"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {label}
                <span className={`text-[10px] px-1 rounded-full ${filter === key ? "bg-white/20 dark:bg-black/20" : "bg-zinc-200 dark:bg-zinc-700"}`}>
                  {cnt}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-zinc-400 leading-relaxed">
          ⚠️ 掲載情報は参考目的です。上場日・価格は変更される場合があります。投資判断は必ず自己責任でお願いします。
        </p>
      </div>

      {/* ── IPOカード一覧 ── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
          <Rocket className="w-10 h-10 text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">該当するIPO情報がありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ipo, i) => (
            <IpoCard key={`${ipo.symbol ?? ipo.nameEn}-${i}`} ipo={ipo} />
          ))}
        </div>
      )}

      {/* ── IPO投資のポイント ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm shrink-0">💡</span>
          IPO投資の基礎知識
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-violet-50 dark:bg-violet-950/20 rounded-xl px-3.5 py-3 border border-violet-100 dark:border-violet-900/30">
            <div className="font-bold text-violet-800 dark:text-violet-300 mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 inline mr-1" />上場前後の注意点
            </div>
            <ul className="space-y-1 text-violet-700 dark:text-violet-400">
              <li>・公募価格での取得ができるのは抽選当選者のみ</li>
              <li>・初値が公募価格を下回るリスクあり（破れ窓）</li>
              <li>・ロックアップ解除後に大株主売りが入りやすい</li>
              <li>・事業計画の実現可能性を必ず確認する</li>
            </ul>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl px-3.5 py-3 border border-blue-100 dark:border-blue-900/30">
            <div className="font-bold text-blue-800 dark:text-blue-300 mb-1.5">
              <TrendingDown className="w-3.5 h-3.5 inline mr-1" />銘柄選定のチェックリスト
            </div>
            <ul className="space-y-1 text-blue-700 dark:text-blue-400">
              <li>・主幹事証券の格（大手か中小か）</li>
              <li>・業績の成長性と黒字化見通し</li>
              <li>・競合との差別化ポイント</li>
              <li>・創業者・経営陣の実績</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
