/**
 * API Route: Fetch live WTI crude oil price from TwelveData
 * Updates every 5 seconds on the client side
 */

const TWELVE_DATA_API = "https://api.twelvedata.com/price";
// Use demo key for development - replace with your own for production
const API_KEY = process.env.TWELVE_DATA_API_KEY || "demo";

export async function GET() {
  try {
    const url = `${TWELVE_DATA_API}?symbol=CL/USD&apikey=${API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();

    // TwelveData returns { price: "XX.XX" } or { code: ..., message: ... } on error
    if (data.price) {
      const price = parseFloat(data.price);
      return Response.json({
        success: true,
        price,
        symbol: "CL/USD",
        timestamp: new Date().toISOString(),
      });
    }

    // Demo key may have rate limits - return mock price for demo
    if (data.code === 429 || data.message?.includes("demo")) {
      // Fallback: use a realistic mock price when demo is rate-limited
      const mockPrice = 78.5 + Math.random() * 4;
      return Response.json({
        success: true,
        price: Math.round(mockPrice * 100) / 100,
        symbol: "CL/USD",
        timestamp: new Date().toISOString(),
        note: "Demo rate limit - showing simulated price",
      });
    }

    return Response.json(
      { success: false, error: data.message || "Failed to fetch price" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Price API error:", error);
    return Response.json(
      {
        success: false,
        error: "Network error fetching oil price",
        // Fallback for development when API is unavailable
        price: 79.25,
      },
      { status: 500 }
    );
  }
}
