import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";
import { mapYahooSectorToGics } from "@/lib/gics";
import { translateToJa } from "@/lib/translate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Officer = {
  name: string;
  title: string | null;
  age: number | null;
  yearBorn: number | null;
  totalPay: number | null;
};

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ["assetProfile", "summaryProfile"],
    });
    const profile = (summary.assetProfile ??
      summary.summaryProfile ??
      null) as Record<string, unknown> | null;

    const sector = (profile?.sector as string | undefined) ?? null;
    const officers = Array.isArray(profile?.companyOfficers)
      ? ((profile?.companyOfficers as unknown[]).slice(0, 8).map((o) => {
          const x = o as Record<string, unknown>;
          return {
            name: String(x.name ?? ""),
            title: (x.title as string | undefined) ?? null,
            age: (x.age as number | undefined) ?? null,
            yearBorn: (x.yearBorn as number | undefined) ?? null,
            totalPay: (x.totalPay as number | undefined) ?? null,
          } satisfies Officer;
        }) as Officer[])
      : [];

    const businessSummary =
      (profile?.longBusinessSummary as string | undefined) ?? null;
    const businessSummaryJa = businessSummary
      ? await translateToJa(businessSummary)
      : null;

    return NextResponse.json({
      sector,
      industry: (profile?.industry as string | undefined) ?? null,
      gicsId: mapYahooSectorToGics(sector),
      country: (profile?.country as string | undefined) ?? null,
      city: (profile?.city as string | undefined) ?? null,
      state: (profile?.state as string | undefined) ?? null,
      address1: (profile?.address1 as string | undefined) ?? null,
      zip: (profile?.zip as string | undefined) ?? null,
      phone: (profile?.phone as string | undefined) ?? null,
      website: (profile?.website as string | undefined) ?? null,
      irWebsite: (profile?.irWebsite as string | undefined) ?? null,
      fullTimeEmployees:
        (profile?.fullTimeEmployees as number | undefined) ?? null,
      longBusinessSummary: businessSummary,
      longBusinessSummaryJa: businessSummaryJa,
      officers,
    });
  } catch (err) {
    console.error("profile error", err);
    return NextResponse.json(
      { error: "プロフィール取得に失敗しました" },
      { status: 500 },
    );
  }
}
