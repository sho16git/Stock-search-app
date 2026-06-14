import Link from "next/link";
import { GICS_SECTORS } from "@/lib/gics";

/** ホーム表示用の短縮ラベル */
const SHORT: Record<string, string> = {
  "energy":                   "エネルギー",
  "materials":                "素材",
  "industrials":              "資本財",
  "consumer-discretionary":  "消費財",
  "consumer-staples":         "必需品",
  "health-care":              "ヘルスケア",
  "financials":               "金融",
  "information-technology":  "情報技術",
  "communication-services":  "通信",
  "utilities":                "公益",
  "real-estate":              "不動産",
};

export default function SectorGrid() {
  return (
    /* 6列グリッド → 11個が6+5の2行に確実に収まる。md以上は1行 */
    <div className="grid grid-cols-6 md:grid-cols-11 gap-2">
      {GICS_SECTORS.map((s) => (
        <Link
          key={s.id}
          href={`/sector/${s.id}`}
          className="btn-press group flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:-translate-y-0.5 active:scale-95 shadow-sm transition-all duration-150"
        >
          <span className="text-xl leading-none">{s.emoji}</span>
          <span className="text-[9px] font-semibold text-center whitespace-nowrap text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {SHORT[s.id] ?? s.nameJa}
          </span>
        </Link>
      ))}
    </div>
  );
}
