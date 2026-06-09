"use client";

import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, CartesianGrid,
  ComposedChart, Line,
} from "recharts";

/* ══════════════════════════════════════════════════════════════════════════
 * 1. Annotated Candlestick SVG Chart
 * ══════════════════════════════════════════════════════════════════════════ */
export function CandleChartExample() {
  const candles = [
    { o: 1840, h: 1890, l: 1800, c: 1815, v: 45 },
    { o: 1815, h: 1848, l: 1770, c: 1778, v: 60 },
    { o: 1778, h: 1808, l: 1752, c: 1758, v: 72 },
    { o: 1758, h: 1802, l: 1748, c: 1795, v: 85 }, // hammer/bottom
    { o: 1795, h: 1848, l: 1790, c: 1840, v: 68 },
    { o: 1840, h: 1892, l: 1835, c: 1885, v: 56 }, // golden cross
    { o: 1885, h: 1948, l: 1880, c: 1940, v: 82 },
    { o: 1940, h: 2005, l: 1935, c: 1992, v: 90 },
    { o: 1992, h: 2048, l: 1985, c: 2038, v: 70 },
    { o: 2038, h: 2075, l: 2030, c: 2068, v: 60 },
    { o: 2068, h: 2098, l: 2060, c: 2090, v: 52 },
    { o: 2090, h: 2128, l: 2083, c: 2118, v: 56 },
  ];
  // Manually tuned MA lines — short crosses long between idx 4 and 5
  const shortMA = [1808, 1796, 1777, 1779, 1812, 1855, 1912, 1972, 2016, 2056, 2078, 2100];
  const longMA  = [1830, 1818, 1803, 1796, 1795, 1802, 1821, 1850, 1884, 1920, 1956, 1990];

  const W = 520; const chartH = 148; const volH = 28;
  const ml = 42; const mr = 12; const mt = 14; const mb = 16;
  const plotW = W - ml - mr;
  const allP = candles.flatMap(c => [c.h, c.l]);
  const minP = Math.min(...allP) - 12;
  const maxP = Math.max(...allP) + 12;
  const pRange = maxP - minP;
  const yP = (p: number) => mt + ((maxP - p) / pRange) * chartH;
  const n = candles.length;
  const slot = plotW / n;
  const bw = Math.max(7, slot * 0.48);
  const cx = (i: number) => ml + (i + 0.5) * slot;
  const volBase = mt + chartH + 4 + volH;
  const yV = (v: number) => mt + chartH + 4 + volH * (1 - v / 100);
  const svgH = mb + volBase;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-950 overflow-hidden">
      <div className="px-3 pt-2 pb-0.5 flex items-center justify-between">
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
          ローソク足 + 移動平均線の例（教育用モデルデータ）
        </span>
        <div className="flex gap-3 text-[8.5px]">
          <span className="flex items-center gap-1"><span className="inline-block w-5 h-0.5 bg-blue-400" />短期MA</span>
          <span className="flex items-center gap-1 text-zinc-400"><span className="inline-block w-5 h-0.5 bg-orange-400" />長期MA</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${svgH}`} className="w-full">
        <rect width={W} height={svgH} fill="#09090b" />

        {/* Horizontal grid */}
        {[1800, 1850, 1900, 1950, 2000, 2050, 2100].map(p => (
          yP(p) > mt && yP(p) < mt + chartH ? (
            <g key={p}>
              <line x1={ml} y1={yP(p)} x2={W - mr} y2={yP(p)} stroke="#27272a" strokeWidth={0.5} />
              <text x={ml - 4} y={yP(p) + 3} fontSize={7} fill="#52525b" textAnchor="end">{p}</text>
            </g>
          ) : null
        ))}

        {/* Support line */}
        <line x1={cx(3) - bw / 2} y1={yP(1758)} x2={cx(5)} y2={yP(1758)}
          stroke="#f59e0b" strokeWidth={1} strokeDasharray="3,2" opacity={0.7} />
        <text x={cx(2)} y={yP(1758) - 3} fontSize={7} fill="#f59e0b" textAnchor="middle" opacity={0.85}>
          サポートライン
        </text>

        {/* Long MA */}
        <polyline
          points={longMA.map((v, i) => `${cx(i)},${yP(v)}`).join(" ")}
          fill="none" stroke="#fb923c" strokeWidth={1.5} opacity={0.9}
        />
        {/* Short MA */}
        <polyline
          points={shortMA.map((v, i) => `${cx(i)},${yP(v)}`).join(" ")}
          fill="none" stroke="#60a5fa" strokeWidth={1.5} opacity={0.9}
        />

        {/* Candles */}
        {candles.map((c, i) => {
          const isUp = c.c >= c.o;
          const col = isUp ? "#22c55e" : "#ef4444";
          const bodyTop = yP(Math.max(c.o, c.c));
          const bodyBot = yP(Math.min(c.o, c.c));
          const bodyH = Math.max(1.5, bodyBot - bodyTop);
          return (
            <g key={i}>
              <line x1={cx(i)} y1={yP(c.h)} x2={cx(i)} y2={yP(c.l)} stroke={col} strokeWidth={1} />
              <rect
                x={cx(i) - bw / 2} y={bodyTop} width={bw} height={bodyH}
                fill={isUp ? col : "transparent"} stroke={col} strokeWidth={1} rx={0.5}
              />
              {/* Volume */}
              <rect
                x={cx(i) - bw / 2} y={yV(c.v)} width={bw} height={volBase - yV(c.v)}
                fill={col} opacity={0.35}
              />
            </g>
          );
        })}

        {/* Golden Cross annotation */}
        {(() => {
          const gcX = (cx(4) + cx(5)) / 2;
          const gcY = yP((shortMA[5] + longMA[5]) / 2) - 2;
          return (
            <g>
              <circle cx={gcX} cy={gcY} r={9} fill="none" stroke="#facc15" strokeWidth={1} opacity={0.9} />
              <line x1={gcX + 7} y1={gcY - 6} x2={gcX + 28} y2={gcY - 20} stroke="#facc15" strokeWidth={0.8} opacity={0.8} />
              <rect x={gcX + 28} y={gcY - 30} width={82} height={13} rx={3} fill="#422006" opacity={0.9} />
              <text x={gcX + 69} y={gcY - 20} fontSize={7.5} fill="#facc15" fontWeight="bold" textAnchor="middle">
                ゴールデンクロス
              </text>
            </g>
          );
        })()}

        {/* Downtrend label */}
        <text x={cx(1)} y={mt + 6} fontSize={7.5} fill="#ef4444" textAnchor="middle" opacity={0.8}>↓ 下落トレンド</text>

        {/* Uptrend label */}
        <text x={cx(9)} y={mt + 6} fontSize={7.5} fill="#22c55e" textAnchor="middle" opacity={0.8}>↑ 上昇トレンド</text>

        {/* Hammer label */}
        <text x={cx(3)} y={volBase - 1} fontSize={7} fill="#f59e0b" textAnchor="middle">底値</text>

        {/* Volume label */}
        <text x={ml} y={mt + chartH + 4 + 7} fontSize={6.5} fill="#3f3f46">出来高</text>

        {/* Bottom axis (day numbers) */}
        {[2, 5, 8, 11].map(i => (
          <text key={i} x={cx(i)} y={svgH - 3} fontSize={7} fill="#3f3f46" textAnchor="middle">
            {i + 1}日
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * 2. RSI Visualization (Recharts)
 * ══════════════════════════════════════════════════════════════════════════ */
const RSI_DATA = [
  { d: "1",  rsi: 58 }, { d: "2",  rsi: 63 }, { d: "3",  rsi: 70 },
  { d: "4",  rsi: 74 }, { d: "5",  rsi: 72 }, { d: "6",  rsi: 66 },
  { d: "7",  rsi: 58 }, { d: "8",  rsi: 49 }, { d: "9",  rsi: 40 },
  { d: "10", rsi: 33 }, { d: "11", rsi: 27 }, { d: "12", rsi: 31 },
  { d: "13", rsi: 38 }, { d: "14", rsi: 48 }, { d: "15", rsi: 56 },
  { d: "16", rsi: 62 }, { d: "17", rsi: 68 },
];

export function RSIVisualization() {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-zinc-900 p-3">
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
        RSI チャートの見方（教育用モデルデータ）
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={RSI_DATA} margin={{ top: 5, right: 10, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="d" tick={{ fontSize: 8 }} tickLine={false} />
          <YAxis domain={[0, 100]} ticks={[0, 30, 50, 70, 100]} tick={{ fontSize: 8 }} tickLine={false} />
          <Tooltip
            formatter={(v) => [`RSI: ${v}`, ""]}
            contentStyle={{ fontSize: 11, padding: "2px 8px" }}
          />
          {/* Zones */}
          <ReferenceArea y1={70} y2={100} fill="#fca5a5" fillOpacity={0.25} />
          <ReferenceArea y1={0}  y2={30}  fill="#86efac" fillOpacity={0.25} />
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4,2" strokeWidth={1}
            label={{ value: "70 買われすぎ", fontSize: 8, fill: "#ef4444", position: "insideTopLeft" }} />
          <ReferenceLine y={30} stroke="#16a34a" strokeDasharray="4,2" strokeWidth={1}
            label={{ value: "30 売られすぎ", fontSize: 8, fill: "#16a34a", position: "insideBottomLeft" }} />
          <ReferenceLine y={50} stroke="#a1a1aa" strokeDasharray="2,4" strokeWidth={0.8} />
          <Line type="monotone" dataKey="rsi" stroke="#8b5cf6" strokeWidth={2} dot={false} name="RSI" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 text-[10px] mt-1.5 text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-300/50 border border-red-400 inline-block" />
          RSI70以上 → 買われすぎ（売り検討）
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-300/50 border border-green-500 inline-block" />
          RSI30以下 → 売られすぎ（買い検討）
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * 3. Moving Average + Golden Cross (Recharts)
 * ══════════════════════════════════════════════════════════════════════════ */
const MA_DATA = (() => {
  const closes = [
    1815, 1778, 1758, 1795, 1840, 1885, 1940, 1992, 2038, 2068, 2090, 2118,
    2135, 2148, 2162, 2158, 2145, 2160, 2175, 2190,
  ];
  return closes.map((c, i) => {
    const ma5  = i >= 4  ? Math.round(closes.slice(i - 4, i + 1).reduce((a, b) => a + b, 0) / 5)  : undefined;
    const ma10 = i >= 9  ? Math.round(closes.slice(i - 9, i + 1).reduce((a, b) => a + b, 0) / 10) : undefined;
    return { day: `${i + 1}日`, price: c, ma5, ma10 };
  });
})();

export function MovingAverageChart() {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-zinc-900 p-3">
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
        移動平均線とゴールデンクロス（教育用モデルデータ）
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <ComposedChart data={MA_DATA} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis dataKey="day" tick={{ fontSize: 8 }} tickLine={false} interval={3} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 8 }} tickLine={false} />
          <Tooltip
            formatter={(v, name) => [
              v != null ? `¥${Number(v).toLocaleString()}` : "-",
              name === "price" ? "株価" : name === "ma5" ? "短期MA（5日）" : "長期MA（10日）",
            ]}
            contentStyle={{ fontSize: 11, padding: "2px 8px" }}
          />
          {/* Golden cross zone */}
          <ReferenceArea x1="5日" x2="6日" fill="#fef08a" fillOpacity={0.3} />
          <ReferenceLine x="5日" stroke="#facc15" strokeDasharray="3,2" strokeWidth={1}
            label={{ value: "ゴールデンクロス", fontSize: 7.5, fill: "#ca8a04", position: "insideTopLeft" }} />
          <Line type="monotone" dataKey="price" stroke="#94a3b8" strokeWidth={1.5} dot={false} name="price" />
          <Line type="monotone" dataKey="ma5"   stroke="#3b82f6" strokeWidth={2} dot={false} name="ma5" strokeDasharray="0" />
          <Line type="monotone" dataKey="ma10"  stroke="#f97316" strokeWidth={2} dot={false} name="ma10" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-4 text-[10px] mt-1 text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-blue-500 inline-block" />短期MA（5日）</span>
        <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-orange-500 inline-block" />長期MA（10日）</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-yellow-200 inline-block rounded-sm" />ゴールデンクロス発生</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * 4. Compound Growth Chart (Recharts)
 * ══════════════════════════════════════════════════════════════════════════ */
const COMPOUND_DATA = (() => {
  const rate = 0.07;
  const monthlyRate = rate / 12;
  const monthly = 3; // 万円
  return [0, 5, 10, 15, 20, 25, 30].map(y => {
    const lumpTotal   = Math.round(100 * Math.pow(1 + rate, y));
    const lumpGrowth  = lumpTotal - 100;
    const dcaMonths   = y * 12;
    const dcaTotal    = y === 0 ? 0 : Math.round(monthly * ((Math.pow(1 + monthlyRate, dcaMonths) - 1) / monthlyRate));
    const dcaPrincipal = y * 12 * monthly;
    const dcaGrowth   = Math.max(0, dcaTotal - dcaPrincipal);
    return {
      year: `${y}年`,
      一括元本: 100,
      一括複利: lumpGrowth,
      積立元本: dcaPrincipal,
      積立複利: dcaGrowth,
    };
  });
})();

const formatYen = (v: number) => `${v}万`;

export function CompoundGrowthChart() {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-zinc-900 p-3">
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
        複利シミュレーション（年率7%想定 / 教育目的）
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[9px] text-center text-zinc-400 mb-1">一括100万円投資</div>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={COMPOUND_DATA} margin={{ top: 5, right: 5, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 7.5 }} tickLine={false} />
              <YAxis tick={{ fontSize: 7.5 }} tickLine={false} tickFormatter={formatYen} />
              <Tooltip
                formatter={(v, name) => [`${v}万円`, name === "一括元本" ? "元本" : "複利増加"]}
                contentStyle={{ fontSize: 10, padding: "2px 6px" }}
              />
              <Area type="monotone" dataKey="一括元本" stackId="1" stroke="#94a3b8" fill="#e2e8f0" />
              <Area type="monotone" dataKey="一括複利" stackId="1" stroke="#22c55e" fill="#bbf7d0" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div className="text-[9px] text-center text-zinc-400 mb-1">月3万円積立</div>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={COMPOUND_DATA} margin={{ top: 5, right: 5, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 7.5 }} tickLine={false} />
              <YAxis tick={{ fontSize: 7.5 }} tickLine={false} tickFormatter={formatYen} />
              <Tooltip
                formatter={(v, name) => [`${v}万円`, name === "積立元本" ? "元本" : "複利増加"]}
                contentStyle={{ fontSize: 10, padding: "2px 6px" }}
              />
              <Area type="monotone" dataKey="積立元本" stackId="1" stroke="#94a3b8" fill="#e2e8f0" />
              <Area type="monotone" dataKey="積立複利" stackId="1" stroke="#22c55e" fill="#bbf7d0" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex gap-3 text-[9px] mt-1 justify-center text-zinc-500">
        <span className="flex items-center gap-1"><span className="w-3 h-2.5 bg-slate-200 inline-block rounded-sm" />元本</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2.5 bg-green-200 inline-block rounded-sm" />複利増加分</span>
        <span className="text-zinc-400">※ 実際の収益は保証されません</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * 5. Chart Pattern SVGs (W底 / 頭肩型 / ゴールデンクロス / デッドクロス)
 * ══════════════════════════════════════════════════════════════════════════ */
export function PatternWBottom() {
  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/20 p-3">
      <div className="font-bold text-[11px] text-blue-700 dark:text-blue-300 mb-2">
        ⬆️ W底（ダブルボトム）— 上昇転換サイン
      </div>
      <svg viewBox="0 0 240 90" className="w-full" style={{ maxHeight: 90 }}>
        {/* Grid */}
        <line x1={15} y1={10} x2={15} y2={72} stroke="#93c5fd" strokeWidth={0.5} />
        <line x1={15} y1={72} x2={235} y2={72} stroke="#93c5fd" strokeWidth={0.5} />
        {/* Price line: peak → bottom1 → recovery → bottom2 → breakout */}
        <polyline
          points="15,18 50,60 95,32 140,60 185,18 230,12"
          fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinejoin="round"
        />
        {/* Neckline */}
        <line x1={45} y1={30} x2={188} y2={30}
          stroke="#f97316" strokeWidth={1} strokeDasharray="4,2" opacity={0.85} />
        {/* Breakout arrow */}
        <line x1={185} y1={18} x2={185} y2={30} stroke="#22c55e" strokeWidth={1.5} markerEnd="url(#arrow)" />
        <text x={190} y={14} fontSize={8} fill="#22c55e" fontWeight="bold">↑ ブレイクアウト</text>
        {/* Labels */}
        <text x={46} y={82} fontSize={8} fill="#3b82f6" textAnchor="middle">底①</text>
        <text x={140} y={82} fontSize={8} fill="#3b82f6" textAnchor="middle">底②</text>
        <text x={100} y={27} fontSize={7.5} fill="#f97316">ネックライン</text>
        <circle cx={50} cy={60} r={3} fill="#3b82f6" opacity={0.7} />
        <circle cx={140} cy={60} r={3} fill="#3b82f6" opacity={0.7} />
      </svg>
      <div className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
        同じ価格水準で2回底を形成後、ネックラインを<strong>出来高増加を伴って上抜け</strong>ると上昇転換の強いシグナル。
      </div>
    </div>
  );
}

export function PatternHeadShoulders() {
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-3">
      <div className="font-bold text-[11px] text-amber-700 dark:text-amber-300 mb-2">
        ⬇️ 頭肩型（ヘッドアンドショルダーズ）— 下落転換サイン
      </div>
      <svg viewBox="0 0 240 90" className="w-full" style={{ maxHeight: 90 }}>
        <line x1={15} y1={10} x2={15} y2={72} stroke="#fcd34d" strokeWidth={0.5} />
        <line x1={15} y1={72} x2={235} y2={72} stroke="#fcd34d" strokeWidth={0.5} />
        {/* Price: left shoulder, head, right shoulder, breakdown */}
        <polyline
          points="15,68 40,40 60,52 100,18 140,52 162,40 185,60 215,72 235,76"
          fill="none" stroke="#f97316" strokeWidth={2.5} strokeLinejoin="round"
        />
        {/* Neckline */}
        <line x1={35} y1={54} x2={195} y2={54}
          stroke="#ef4444" strokeWidth={1} strokeDasharray="4,2" opacity={0.85} />
        {/* Breakdown arrow */}
        <text x={210} y={68} fontSize={8} fill="#ef4444" fontWeight="bold">↓ 下落</text>
        {/* Labels */}
        <text x={40} y={36} fontSize={7.5} fill="#94a3b8" textAnchor="middle">左肩</text>
        <text x={100} y={14} fontSize={7.5} fill="#f97316" textAnchor="middle" fontWeight="bold">頭</text>
        <text x={162} y={36} fontSize={7.5} fill="#94a3b8" textAnchor="middle">右肩</text>
        <text x={95} y={51} fontSize={7} fill="#ef4444">ネックライン</text>
        {/* Dots */}
        <circle cx={40} cy={40} r={2.5} fill="#94a3b8" opacity={0.7} />
        <circle cx={100} cy={18} r={2.5} fill="#f97316" />
        <circle cx={162} cy={40} r={2.5} fill="#94a3b8" opacity={0.7} />
      </svg>
      <div className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
        山が3つ（中央が最高値の「頭」）。ネックラインを<strong>下抜ける</strong>と下落転換。利確・空売りのサインとして使われる。
      </div>
    </div>
  );
}

export function PatternGoldenCross() {
  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 p-3">
      <div className="font-bold text-[11px] text-emerald-700 dark:text-emerald-300 mb-2">
        ⬆️ ゴールデンクロス — 買いサイン
      </div>
      <svg viewBox="0 0 240 85" className="w-full" style={{ maxHeight: 85 }}>
        <line x1={15} y1={10} x2={15} y2={70} stroke="#6ee7b7" strokeWidth={0.5} />
        <line x1={15} y1={70} x2={235} y2={70} stroke="#6ee7b7" strokeWidth={0.5} />
        {/* Long MA (orange): slowly rising */}
        <polyline points="15,62 60,58 100,54 140,48 180,42 230,36"
          fill="none" stroke="#f97316" strokeWidth={2} />
        {/* Short MA (blue): dips then rises sharply, crosses over */}
        <polyline points="15,68 50,65 80,60 110,52 140,44 170,36 210,26 230,22"
          fill="none" stroke="#3b82f6" strokeWidth={2} />
        {/* Cross point */}
        <circle cx={125} cy={49} r={4} fill="none" stroke="#facc15" strokeWidth={1.5} />
        <line x1={129} y1={45} x2={148} y2={32} stroke="#facc15" strokeWidth={0.8} />
        <text x={150} y={30} fontSize={8} fill="#facc15" fontWeight="bold">交差！</text>
        {/* Labels */}
        <text x={235} y={22} fontSize={7.5} fill="#3b82f6" textAnchor="end">短期MA</text>
        <text x={235} y={34} fontSize={7.5} fill="#f97316" textAnchor="end">長期MA</text>
        <text x={125} y={80} fontSize={7.5} fill="#facc15" textAnchor="middle">ゴールデンクロス</text>
      </svg>
      <div className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
        短期移動平均線が長期移動平均線を<strong>下から上に突き抜ける</strong>。上昇トレンド開始のシグナル。出来高増加を伴うと信頼性↑。
      </div>
    </div>
  );
}

export function PatternDeadCross() {
  return (
    <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 p-3">
      <div className="font-bold text-[11px] text-red-700 dark:text-red-300 mb-2">
        ⬇️ デッドクロス — 売りサイン
      </div>
      <svg viewBox="0 0 240 85" className="w-full" style={{ maxHeight: 85 }}>
        <line x1={15} y1={10} x2={15} y2={70} stroke="#fca5a5" strokeWidth={0.5} />
        <line x1={15} y1={70} x2={235} y2={70} stroke="#fca5a5" strokeWidth={0.5} />
        {/* Long MA (orange): slowly falling */}
        <polyline points="15,20 60,26 100,32 140,38 180,44 230,50"
          fill="none" stroke="#f97316" strokeWidth={2} />
        {/* Short MA (blue): peaks then drops sharply, crosses below */}
        <polyline points="15,14 50,18 80,22 110,30 140,40 170,52 210,62 230,66"
          fill="none" stroke="#3b82f6" strokeWidth={2} />
        {/* Cross point */}
        <circle cx={127} cy={38} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} />
        <line x1={131} y1={42} x2={150} y2={52} stroke="#ef4444" strokeWidth={0.8} />
        <text x={152} y={57} fontSize={8} fill="#ef4444" fontWeight="bold">交差！</text>
        {/* Labels */}
        <text x={235} y={48} fontSize={7.5} fill="#3b82f6" textAnchor="end">短期MA</text>
        <text x={235} y={36} fontSize={7.5} fill="#f97316" textAnchor="end">長期MA</text>
        <text x={127} y={80} fontSize={7.5} fill="#ef4444" textAnchor="middle">デッドクロス</text>
      </svg>
      <div className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
        短期移動平均線が長期移動平均線を<strong>上から下に突き抜ける</strong>。下落トレンド開始のシグナル。保有株の損切り・利確を検討。
      </div>
    </div>
  );
}
