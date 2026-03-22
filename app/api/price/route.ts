/**
 * API Route: Live WTI Crude Oil price (CL=F front-month futures)
 * Single source: Yahoo Finance — aligns with Polymarket CME settlement
 */

const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/CL=F";

export async function GET() {
  try {
    const url = `${YAHOO_CHART}?range=1d&interval=5m`;
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OilTracker/1.0)" },
    });
    const json = await res.json();

    const result = json?.chart?.result?.[0];
    if (!result) {
      console.error("Price API: No result in Yahoo response", json?.chart?.error);
      return Response.json(
        { success: false, error: "No data from Yahoo Finance" },
        { status: 503 }
      );
    }

    const price = result.meta?.regularMarketPrice;
    if (price == null || typeof price !== "number" || price <= 0) {
      console.error("Price API: Invalid regularMarketPrice", result.meta);
      return Response.json(
        { success: false, error: "Invalid price from Yahoo Finance" },
        { status: 503 }
      );
    }

    console.log("[Price API] Current price:", price.toFixed(2));

    return Response.json({
      success: true,
      price,
      symbol: "CL=F",
      source: "Yahoo Finance",
      note: "WTI front-month futures (aligns with Polymarket CME)",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Price API error:", error);
    return Response.json(
      { success: false, error: "Network error fetching oil price" },
      { status: 500 }
    );
  }
}
