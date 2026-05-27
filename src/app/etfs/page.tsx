import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getEtfs } from "@/lib/stocks-catalog";
import SectorStockTable from "@/components/SectorStockTable";

const CATEGORY_LABEL: Record<string, { label: string; emoji: string; desc: string }> = {
  broad: { label: "市場全体", emoji: "🌐", desc: "S&P500・NASDAQ・日経等の主要指数連動" },
  sector: { label: "セクター", emoji: "🏭", desc: "業種別 (テック・金融・エネルギー等)" },
  international: { label: "国際・海外", emoji: "🌏", desc: "先進国・新興国・米国株 (東証)" },
  thematic: { label: "テーマ型", emoji: "💡", desc: "AI・クリーンエネ・ロボティクス" },
  dividend: { label: "高配当", emoji: "💰", desc: "配当利回り重視" },
  bond: { label: "債券", emoji: "📜", desc: "国債・社債・ハイイールド" },
  commodity: { label: "コモディティ", emoji: "🪙", desc: "金・銀・原油" },
  leveraged: { label: "レバレッジ", emoji: "⚡", desc: "2倍/3倍ブル・ベア (短期向け)" },
};

const ORDER = [
  "broad",
  "sector",
  "international",
  "thematic",
  "dividend",
  "bond",
  "commodity",
  "leveraged",
];

export default function EtfsPage() {
  const all = getEtfs();
  const byCategory = new Map<string, typeof all>();
  for (const e of all) {
    const cat = e.etfCategory ?? "broad";
    const list = byCategory.get(cat) ?? [];
    list.push(e);
    byCategory.set(cat, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          トップ
        </Link>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-violet-50 via-white to-white dark:from-violet-950/30 dark:via-slate-900 dark:to-slate-900 p-6">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            ETF · 上場投信
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <span>📊</span>
            <span>ETF・投資信託</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            主要 ETF を分類別に一覧。各銘柄から詳細ページで保有銘柄・経費率等を確認できます。
          </p>
          <div className="text-xs text-slate-500 mt-3">
            掲載 {all.length} 銘柄
          </div>
        </div>
      </div>

      {ORDER.map((cat) => {
        const items = byCategory.get(cat);
        if (!items || items.length === 0) return null;
        const meta = CATEGORY_LABEL[cat];
        return (
          <section key={cat}>
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2">
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
              <span className="text-xs text-slate-400 font-normal">
                · {meta.desc} ({items.length})
              </span>
            </h2>
            <SectorStockTable stocks={items} />
          </section>
        );
      })}
    </div>
  );
}
