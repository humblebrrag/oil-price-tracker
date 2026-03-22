/**
 * API Route: Historical WTI price data for chart (CL=F front-month futures)
 * Single source: Yahoo Finance — same as /api/price for consistency
 */

const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/CL=F";

export interface HistoryPoint {
  date: string;
  price: number;
  time: number;
}

export async function GET() {
  try {
    const url = `${YAHOO_CHART}?range=1mo&interval=1d`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OilTracker/1.0)" },
    });
    const json = await res.json();

    const result = json?.chart?.result?.[0];
    if (!result) {
      console.error("History API: No result in Yahoo response", json?.chart?.error);
      return Response.json(
        { success: false, error: "No chart data from Yahoo Finance" },
        { status: 503 }
      );
    }

    const timestamps = result.timestamp;
    const quotes = result.indicators?.quote?.[0];
    const closes = quotes?.close;
    const currentPrice = result.meta?.regularMarketPrice;

    if (
      !Array.isArray(timestamps) ||
      !Array.isArray(closes) ||
      timestamps.length !== closes.length
    ) {
      console.error("History API: Invalid chart structure", {
        tsLen: timestamps?.length,
        closeLen: closes?.length,
      });
      return Response.json(
        { success: false, error: "Invalid chart structure from Yahoo Finance" },
        { status: 503 }
      );
    }

    const data: HistoryPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close == null || typeof close !== "number" || close <= 0) continue;
      const ts = timestamps[i] * 1000;
      const d = new Date(ts);
      data.push({
        date: d.toISOString().split("T")[0],
        price: Math.round(close * 100) / 100,
        time: ts,
      });
    }

    if (data.length === 0) {
      return Response.json(
        { success: false, error: "No valid price points from Yahoo Finance" },
        { status: 503 }
      );
    }

    // Sort by time ascending
    data.sort((a, b) => a.time - b.time);

    const latestChartPrice = data[data.length - 1]?.price ?? 0;
    const diff = currentPrice != null ? Math.abs(latestChartPrice - currentPrice) : 0;

    console.log(
      "[History API] latestChartPrice:",
      latestChartPrice.toFixed(2),
      "| meta.regularMarketPrice:",
      currentPrice?.toFixed(2),
      "| diff:",
      diff.toFixed(2)
    );

    if (currentPrice != null && diff > 5) {
      console.warn(
        "[History API] Validation: chart price differs from current by >$5, data may be stale"
      );
    }

    return Response.json({
      success: true,
      data,
      source: "Yahoo Finance",
      currentPrice: currentPrice ?? undefined,
    });
  } catch (error) {
    console.error("Price history API error:", error);
    return Response.json(
      { success: false, error: "Network error fetching chart data" },
      { status: 500 }
    );
  }
}
