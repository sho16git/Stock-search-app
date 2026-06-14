import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "@/lib/yfinance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: [
        "majorHoldersBreakdown",
        "institutionOwnership",
        "fundOwnership",
      ],
    });

    const breakdown = summary.majorHoldersBreakdown as
      | {
          insidersPercentHeld?: number;
          institutionsPercentHeld?: number;
          institutionsFloatPercentHeld?: number;
          institutionsCount?: number;
        }
      | undefined;

    const instOwn = (summary.institutionOwnership as
      | { ownershipList?: unknown[] }
      | undefined)?.ownershipList ?? [];

    const fundOwn = (summary.fundOwnership as
      | { ownershipList?: unknown[] }
      | undefined)?.ownershipList ?? [];

    const formatHolder = (h: unknown) => {
      const o = h as Record<string, unknown>;
      const dt = o.reportDate;
      return {
        organization: String(o.organization ?? ""),
        pctHeld: (o.pctHeld as number | undefined) ?? null,
        position: (o.position as number | undefined) ?? null,
        value: (o.value as number | undefined) ?? null,
        reportDate:
          dt instanceof Date
            ? dt.toISOString()
            : typeof dt === "string"
              ? dt
              : null,
        pctChange: (o.pctChange as number | undefined) ?? null,
      };
    };

    return NextResponse.json({
      breakdown: {
        insidersPercentHeld: breakdown?.insidersPercentHeld ?? null,
        institutionsPercentHeld: breakdown?.institutionsPercentHeld ?? null,
        institutionsFloatPercentHeld:
          breakdown?.institutionsFloatPercentHeld ?? null,
        institutionsCount: breakdown?.institutionsCount ?? null,
      },
      institutions: instOwn.slice(0, 10).map(formatHolder),
      funds: fundOwn.slice(0, 10).map(formatHolder),
    }, {
    headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=172800" },
  });
  } catch (err) {
    console.error("holders error", err);
    return NextResponse.json(
      { error: "大株主情報の取得に失敗しました" },
      { status: 500 },
    );
  }
}
