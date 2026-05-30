"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, Users, MapPin, Globe,
  Briefcase, ChevronDown, ChevronUp, Building2,
} from "lucide-react";
import { formatNumber, formatLargeNumber } from "@/lib/format";
import { getJpName } from "@/lib/jp-stocks";
import {
  translateExchange, translateMarketState,
  translateCountry, translateIndustry,
} from "@/lib/i18n";
import WatchlistButton from "@/components/WatchlistButton";
import HoldingButton from "@/components/HoldingButton";
import SectorBadge from "@/components/SectorBadge";

/* ─── Types ─── */
type Quote = {
  symbol: string;
  shortName?: string; longName?: string; displayName?: string; nameJa?: string | null;
  regularMarketPrice?: number; regularMarketChange?: number;
  regularMarketChangePercent?: number; regularMarketPreviousClose?: number;
  regularMarketDayHigh?: number; regularMarketDayLow?: number;
  regularMarketVolume?: number; fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number;
  currency?: string; fullExchangeName?: string; marketState?: string;
};

type Profile = {
  sector?: string | null; industry?: string | null;
  country?: string | null; city?: string | null; state?: string | null;
  website?: string | null; fullTimeEmployees?: number | null;
  longBusinessSummary?: string | null; longBusinessSummaryJa?: string | null;
};

/* ─── Helpers ─── */
function fmtJpy(v: number): string {
  if (v >= 100_000_000) return `¥${(v / 100_000_000).toFixed(2)}億`;
  if (v >= 10_000) return `¥${(v / 10_000).toFixed(1)}万`;
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

function hostname(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}

/* ─── Main Component ─── */
export default function QuoteHeader({ symbol }: { symbol: string }) {
  const [quote, setQuote]       = useState<Quote | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [jpyRate, setJpyRate]   = useState<number | null>(null);
  const [showJpy, setShowJpy]   = useState(false);
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const load = () => {
    fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(j => { if (j.error) setError(j.error); else setQuote(j.quote); })
      .catch(() => setError("株価の取得に失敗しました"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true); setError(null); setQuote(null);
    setShowJpy(false); setProfile(null); setProfileOpen(false);
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/profile?symbol=${encodeURIComponent(symbol)}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(j => { if (!j.error) setProfile(j); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [symbol]);

  useEffect(() => {
    if (quote?.currency !== "USD") return;
    fetch("/api/quote?symbol=JPY%3DX")
      .then(r => r.json())
      .then(j => { const rate = j.quote?.regularMarketPrice as number | undefined; if (rate) setJpyRate(rate); })
      .catch(() => {});
  }, [quote?.currency]);

  const jpName = getJpName(symbol);
  const name = jpName ?? quote?.nameJa ?? quote?.longName ?? quote?.shortName ?? quote?.displayName ?? symbol;
  const price    = quote?.regularMarketPrice;
  const change   = quote?.regularMarketChange;
  const changePct = quote?.regularMarketChangePercent;
  const up = (change ?? 0) >= 0;
  const Arrow = up ? TrendingUp : TrendingDown;

  const isUsd = quote?.currency === "USD";
  const canToggle = isUsd && jpyRate != null;
  const dispPrice = canToggle && showJpy && price != null ? price * jpyRate! : price;
  const dispCurrency = canToggle && showJpy ? "JPY" : quote?.currency;

  const fmtStat = (v: number | undefined) => {
    if (v == null) return "—";
    if (canToggle && showJpy) return fmtJpy(v * jpyRate!);
    return formatNumber(v);
  };

  /* Profile helpers */
  const location = profile
    ? [profile.city, profile.state, profile.country ? translateCountry(profile.country) : null]
        .filter(Boolean).join(", ")
    : null;
  const summaryJa = profile?.longBusinessSummaryJa ?? "";
  const summaryEn = profile?.longBusinessSummary ?? "";
  const summary = showOriginal || !summaryJa ? summaryEn : summaryJa;
  const hasTranslation = !!summaryJa && summaryJa !== summaryEn;
  const truncated = summary.length > 300 ? summary.slice(0, 300) + "…" : summary;
  const hasProfile = profile && (location || profile.industry || profile.website || profile.fullTimeEmployees || summary);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      {/* Background gradient */}
      <div className={`absolute inset-0 -z-0 opacity-50 pointer-events-none ${
        quote
          ? up
            ? "bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900"
            : "bg-gradient-to-br from-rose-50 via-white to-white dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900"
          : ""
      }`} />

      <div className="relative p-5 sm:p-6">

        {/* ── 銘柄名・ボタン ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{symbol}</span>
              {quote?.fullExchangeName && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  {translateExchange(quote.fullExchangeName)}
                </span>
              )}
              {quote?.marketState && (
                <span className="text-xs text-slate-500">{translateMarketState(quote.marketState)}</span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1.5">{name}</h1>
            <SectorBadge symbol={symbol} />
          </div>
          <div className="flex flex-wrap gap-2">
            <HoldingButton symbol={symbol} name={name} currency={quote?.currency} />
            <WatchlistButton symbol={symbol} name={name} />
          </div>
        </div>

        {/* ── 株価 ── */}
        <div className="mt-5">
          {loading && (
            <div className="h-12 flex items-end">
              <div className="text-sm text-slate-400">株価読み込み中…</div>
            </div>
          )}
          {error && <div className="text-sm text-rose-500">{error}</div>}
          {!loading && !error && quote && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-3">
                <div className="font-mono font-bold tracking-tight tabular-nums">
                  <span className="text-4xl md:text-5xl">
                    {canToggle && showJpy && dispPrice != null ? fmtJpy(dispPrice) : formatNumber(dispPrice)}
                  </span>
                  {!(canToggle && showJpy) && (
                    <span className="ml-2 text-base text-slate-500 font-medium">{dispCurrency}</span>
                  )}
                </div>
                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-semibold tabular-nums text-sm ${
                  up
                    ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
                }`}>
                  <Arrow className="w-4 h-4" />
                  {canToggle && showJpy && change != null
                    ? fmtJpy(Math.abs(change) * jpyRate!)
                    : formatNumber(Math.abs(change ?? 0))}{" "}
                  ({formatNumber(Math.abs(changePct ?? 0))}%)
                </div>
                {canToggle && (
                  <button
                    onClick={() => setShowJpy(v => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shadow-sm ${
                      showJpy
                        ? "bg-gradient-to-r from-red-500 to-rose-500 text-white border-red-400"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-red-400 hover:text-red-500"
                    }`}
                  >
                    <span>{showJpy ? "🇯🇵" : "🇺🇸"}</span>
                    <span>{showJpy ? "円表示中" : "円換算"}</span>
                    <span className="opacity-60">⇄</span>
                  </button>
                )}
              </div>
              {canToggle && (
                <div className="text-xs text-slate-400 font-mono">
                  {showJpy
                    ? `1 USD = ¥${jpyRate!.toFixed(2)} · 元値 ${formatNumber(price)} USD`
                    : `≈ ${price != null ? fmtJpy(price * jpyRate!) : "—"} （1USD=¥${jpyRate!.toFixed(2)}）`}
                </div>
              )}
            </div>
          )}
        </div>

        {!loading && !error && quote && (
          <>
            {/* ── 株価統計 ── */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-4">
              <Stat label="前日終値" value={fmtStat(quote.regularMarketPreviousClose)} />
              <Stat label="高値"     value={fmtStat(quote.regularMarketDayHigh)} />
              <Stat label="安値"     value={fmtStat(quote.regularMarketDayLow)} />
              <Stat label="出来高"   value={(quote.regularMarketVolume ?? 0).toLocaleString("ja-JP")} />
              <Stat label="52週高値" value={fmtStat(quote.fiftyTwoWeekHigh)} />
              <Stat label="52週安値" value={fmtStat(quote.fiftyTwoWeekLow)} />
            </div>

            {/* ── 購入シミュレーション ── */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
                購入金額シミュレーション（税引前概算）
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 100, 500, 1000].map(shares => {
                  const amt = price != null ? price * shares : null;
                  const dispAmt = canToggle && showJpy && amt != null
                    ? fmtJpy(amt * jpyRate!)
                    : amt != null ? formatNumber(amt) : "—";
                  const hi = shares === 100;
                  return (
                    <div key={shares} className={`px-2 py-1.5 rounded-lg border text-center ${
                      hi
                        ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                        : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                    }`}>
                      <div className="text-[10px] text-slate-500">{shares.toLocaleString("ja-JP")}株</div>
                      <div className={`font-mono font-bold text-xs tabular-nums ${
                        hi ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-200"
                      }`}>{dispAmt}</div>
                      {!(canToggle && showJpy) && (
                        <div className="text-[9px] text-slate-400">{quote.currency}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 企業情報 ── */}
            {hasProfile && (
              <div className="mt-4">
                {/* Toggle button — card style */}
                <button
                  onClick={() => setProfileOpen(o => !o)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    profileOpen
                      ? "bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-600"
                      : "bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">企業情報</div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {[
                        location,
                        profile?.industry ? translateIndustry(profile.industry) : null,
                        profile?.fullTimeEmployees != null
                          ? `従業員 ${formatLargeNumber(profile.fullTimeEmployees)}`
                          : null,
                      ].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                    profileOpen ? "bg-slate-200 dark:bg-slate-700" : "bg-transparent"
                  }`}>
                    {profileOpen
                      ? <ChevronUp className="w-4 h-4 text-slate-500" />
                      : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {/* Expanded panel */}
                {profileOpen && (
                  <div className="mt-2 space-y-3 px-1">
                    {/* Meta grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {profile?.fullTimeEmployees != null && (
                        <InfoChip
                          icon={<Users className="w-3.5 h-3.5" />}
                          label="従業員数"
                          value={`${formatLargeNumber(profile.fullTimeEmployees)}人`}
                          color="blue"
                        />
                      )}
                      {location && (
                        <InfoChip
                          icon={<MapPin className="w-3.5 h-3.5" />}
                          label="本社所在地"
                          value={location}
                          color="emerald"
                        />
                      )}
                      {profile?.industry && (
                        <InfoChip
                          icon={<Briefcase className="w-3.5 h-3.5" />}
                          label="業種"
                          value={translateIndustry(profile.industry)}
                          color="violet"
                        />
                      )}
                      {profile?.website && (
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col gap-0.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group"
                        >
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400">
                            <Globe className="w-3.5 h-3.5" />公式サイト
                          </div>
                          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:underline truncate">
                            {hostname(profile.website)}
                          </div>
                        </a>
                      )}
                    </div>

                    {/* Business summary */}
                    {summary && (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            📋 事業概要
                            {hasTranslation && !showOriginal && (
                              <span className="ml-1 normal-case tracking-normal px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                                自動翻訳
                              </span>
                            )}
                          </span>
                          {hasTranslation && (
                            <button
                              onClick={() => setShowOriginal(s => !s)}
                              className="text-xs text-blue-500 hover:underline"
                            >
                              {showOriginal ? "日本語" : "原文 (英語)"}
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {summaryExpanded ? summary : truncated}
                        </p>
                        {summary.length > 300 && (
                          <button
                            onClick={() => setSummaryExpanded(e => !e)}
                            className="mt-2 text-xs font-semibold text-blue-500 hover:text-blue-600"
                          >
                            {summaryExpanded ? "▲ 閉じる" : "▼ もっと見る"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2.5 py-2 rounded-xl bg-white/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className="font-mono font-semibold tabular-nums mt-0.5 text-slate-900 dark:text-slate-100 text-sm truncate">
        {value}
      </div>
    </div>
  );
}

const COLOR_MAP: Record<string, string> = {
  blue:    "from-blue-500 to-blue-600",
  emerald: "from-emerald-500 to-teal-600",
  violet:  "from-violet-500 to-purple-600",
};

function InfoChip({
  icon, label, value, color,
}: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  const gradient = COLOR_MAP[color] ?? "from-slate-500 to-slate-600";
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40">
      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 text-white`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">{value}</div>
      </div>
    </div>
  );
}
